import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { returnBookSchema } from '@/lib/validation';
import { Role, BookStatus, BorrowStatus, QueueStatus } from '@prisma/client';
import { formatQueueReadyMessage, sendTelegramMessage } from '@/lib/telegram';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== Role.LIBRARIAN && user.role !== Role.SUPER_ADMIN)) {
      return NextResponse.json({ error: "Faqat kutubxonachi yoki administrator kitobni qabul qila oladi" }, { status: 403 });
    }

    const body = await req.json();
    const validation = returnBookSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Ma'lumotlar noto'g'ri" },
        { status: 400 }
      );
    }

    const { borrow_record_id } = validation.data;
    const libraryId = user.library_id || (await prisma.library.findFirst({ where: { status: 'ACTIVE' } }))?.id;
    if (!libraryId) {
      return NextResponse.json({ error: "Kutubxona topilmadi" }, { status: 400 });
    }

    // Tranzaksiya orqali kitobni qaytarish va navbatdagi o'quvchini aniqlash
    const result = await prisma.$transaction(async (tx) => {
      const record = await tx.borrowRecord.findFirst({
        where: {
          id: borrow_record_id,
          library_id: libraryId,
        },
        include: {
          book: true,
          student: true,
          library: true,
        },
      });

      if (!record) {
        throw new Error("RECORD_NOT_FOUND");
      }

      if (record.status === BorrowStatus.RETURNED) {
        throw new Error("ALREADY_RETURNED");
      }

      const now = new Date();

      // 1. Qarz yozuvini RETURNED qilish
      await tx.borrowRecord.update({
        where: { id: record.id },
        data: {
          status: BorrowStatus.RETURNED,
          returned_at: now,
        },
      });

      // 2. Navbatda kutayotgan o'quvchi bormi?
      const nextStudentInQueue = await tx.bookQueue.findFirst({
        where: {
          book_id: record.book_id,
          status: QueueStatus.WAITING,
        },
        orderBy: { position: 'asc' },
        include: {
          student: true,
        },
      });

      if (nextStudentInQueue) {
        // Navbatdagi o'quvchini NOTIFIED holatiga o'tkazish
        await tx.bookQueue.update({
          where: { id: nextStudentInQueue.id },
          data: { status: QueueStatus.NOTIFIED },
        });

        // Kitobni u uchun RESERVED (bron) holatiga qo'yish
        await tx.book.update({
          where: { id: record.book_id },
          data: { status: BookStatus.RESERVED },
        });

        return {
          record,
          nextStudent: nextStudentInQueue.student,
          bookStatus: BookStatus.RESERVED,
        };
      } else {
        // Navbatda hech kim yo'q, kitob bo'sh (AVAILABLE) bo'ladi
        await tx.book.update({
          where: { id: record.book_id },
          data: { status: BookStatus.AVAILABLE },
        });

        return {
          record,
          nextStudent: null,
          bookStatus: BookStatus.AVAILABLE,
        };
      }
    });

    // Telegram orqali navbatdagi o'quvchini xabardor qilish
    let notificationSent = false;
    if (result.nextStudent) {
      const studentChatId = result.nextStudent.telegram_chat_id;
      if (studentChatId) {
        const msg = formatQueueReadyMessage({
          studentName: result.nextStudent.full_name,
          bookTitle: result.record.book.title,
          bookCode: result.record.book.code,
          libraryName: result.record.library.name,
        });
        const tgRes = await sendTelegramMessage(studentChatId, msg);
        notificationSent = tgRes.ok;
      }
    }

    return NextResponse.json({
      success: true,
      message: `'${result.record.book.title}' kitobi qabul qilindi!`,
      bookStatus: result.bookStatus,
      nextStudentInQueue: result.nextStudent
        ? {
            name: result.nextStudent.full_name,
            notified: notificationSent,
          }
        : null,
    });
  } catch (error: any) {
    if (error.message === 'RECORD_NOT_FOUND') {
      return NextResponse.json({ error: "Qarz yozuvi topilmadi" }, { status: 404 });
    }
    if (error.message === 'ALREADY_RETURNED') {
      return NextResponse.json({ error: "Ushbu kitob allaqachon qaytarilgan" }, { status: 400 });
    }

    console.error('Kitob qaytarish xatosi:', error);
    return NextResponse.json({ error: "Kitobni qaytarib olishda xatolik yuz berdi" }, { status: 500 });
  }
}
