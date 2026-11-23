import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { issueBookSchema } from '@/lib/validation';
import { Role, BookStatus, BorrowStatus, QueueStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== Role.LIBRARIAN && user.role !== Role.SUPER_ADMIN)) {
      return NextResponse.json({ error: "Faqat kutubxonachi yoki administrator kitob bera oladi" }, { status: 403 });
    }

    const body = await req.json();
    const validation = issueBookSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Ma'lumotlar to'liq kiritilmagan" },
        { status: 400 }
      );
    }

    const { book_id, student_id, class_name, parent_telegram_chat_id, deadline_days } = validation.data;
    const libraryId = user.library_id || (await prisma.library.findFirst({ where: { status: 'ACTIVE' } }))?.id;
    if (!libraryId) {
      return NextResponse.json({ error: "Kutubxona topilmadi" }, { status: 400 });
    }

    // Tranzaksiya: kitobni berish va holatini yangilash
    const result = await prisma.$transaction(async (tx) => {
      // 1. Kitobni tekshirish (ID bo'yicha yoki pen code bo'yicha qidirish)
      const book = await tx.book.findFirst({
        where: {
          library_id: libraryId,
          OR: [
            { id: book_id },
            { code: { equals: book_id.trim(), mode: 'insensitive' } },
          ],
        },
      });

      if (!book) {
        throw new Error("BOOK_NOT_FOUND");
      }

      if (book.status === BookStatus.BORROWED) {
        throw new Error("BOOK_ALREADY_BORROWED");
      }

      // 2. O'quvchini tekshirish (ID yoki login bo'yicha qidirish)
      let student = await tx.user.findFirst({
        where: {
          role: Role.STUDENT,
          OR: [
            { id: student_id },
            { login: { equals: student_id.trim().toLowerCase() } },
          ],
        },
      });

      if (!student) {
        throw new Error("STUDENT_NOT_FOUND");
      }

      // Agar o'quvchi boshqa maktabga birikmagan bo'lsa yoki library_id null bo'lsa, ushbu kutubxonaga bog'laymiz
      if (!student.library_id) {
        student = await tx.user.update({
          where: { id: student.id },
          data: { library_id: libraryId },
        });
      } else if (student.library_id !== libraryId) {
        throw new Error("STUDENT_DIFFERENT_LIBRARY");
      }

      // 3. Qaytarish muddatini hisoblash
      const now = new Date();
      const days = Number(deadline_days) || 14;
      const deadline = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

      // 4. Kitob holatini BORROWED qilish
      await tx.book.update({
        where: { id: book.id },
        data: { status: BookStatus.BORROWED },
      });

      // 5. Qarz yozuvini yaratish
      const borrowRecord = await tx.borrowRecord.create({
        data: {
          library_id: libraryId,
          book_id: book.id,
          student_id: student.id,
          class_name: class_name && class_name.trim() ? class_name.trim() : (student.class_name || 'Kitobxon'),
          parent_telegram_chat_id: parent_telegram_chat_id && parent_telegram_chat_id.trim()
            ? parent_telegram_chat_id.trim()
            : (student.telegram_chat_id || null),
          borrowed_at: now,
          deadline_at: deadline,
          status: BorrowStatus.BORROWED,
        },
      });

      // 6. Agar o'quvchi navbatda bo'lsa, navbatni FULFILLED qilish
      await tx.bookQueue.updateMany({
        where: {
          book_id: book.id,
          student_id: student.id,
          status: { in: [QueueStatus.WAITING, QueueStatus.NOTIFIED] },
        },
        data: {
          status: QueueStatus.FULFILLED,
        },
      });

      // 7. Agar Telegram ID kiritilgan bo'lsa va profilda bo'sh bo'lsa, saqlash
      if (parent_telegram_chat_id && parent_telegram_chat_id.trim() && !student.telegram_chat_id) {
        await tx.user.update({
          where: { id: student.id },
          data: { telegram_chat_id: parent_telegram_chat_id.trim() },
        });
      }

      return { book, student, borrowRecord, deadline };
    });

    return NextResponse.json({
      success: true,
      message: `'${result.book.title}' kitobi ${result.student.full_name}ga muvaffaqiyatli berildi. Qaytarish muddati: ${result.deadline.toLocaleDateString('uz-UZ')}`,
      borrowRecord: result.borrowRecord,
    });
  } catch (error: any) {
    if (error.message === 'BOOK_NOT_FOUND') {
      return NextResponse.json({ error: "Tanlangan kitob topilmadi yoki bu kutubxonaga tegishli emas" }, { status: 400 });
    }
    if (error.message === 'BOOK_ALREADY_BORROWED') {
      return NextResponse.json({ error: "Ushbu kitob allaqachon boshqa o'quvchiga berilgan!" }, { status: 409 });
    }
    if (error.message === 'STUDENT_NOT_FOUND') {
      return NextResponse.json({ error: "Tanlangan o'quvchi topilmadi. Avval 'O'quvchilar' bo'limida o'quvchini ro'yxatga oling." }, { status: 400 });
    }
    if (error.message === 'STUDENT_DIFFERENT_LIBRARY') {
      return NextResponse.json({ error: "Bu o'quvchi boshqa maktab/kutubxonada ro'yxatdan o'tgan" }, { status: 400 });
    }

    console.error('Kitob berish xatosi:', error);
    return NextResponse.json({ error: "Kitob berishda xatolik yuz berdi" }, { status: 500 });
  }
}
