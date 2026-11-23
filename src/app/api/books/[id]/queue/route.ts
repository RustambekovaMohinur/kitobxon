import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { BookStatus, Role, BorrowStatus, QueueStatus } from '@prisma/client';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Avval tizimga kiring" }, { status: 401 });
    }

    if (user.role !== Role.STUDENT) {
      return NextResponse.json({ error: "Faqat kitobxon/o'quvchilar navbatga yozila oladi" }, { status: 403 });
    }

    const bookId = params.id;

    // Tranzaksiya orqali navbatga yozilish
    const queueRecord = await prisma.$transaction(async (tx) => {
      const book = await tx.book.findUnique({
        where: { id: bookId },
      });

      if (!book) {
        throw new Error("BOOK_NOT_FOUND");
      }

      // Agar kitob bo'sh bo'lsa, to'g'ridan-to'g'ri bron qilish mumkin
      if (book.status === BookStatus.AVAILABLE) {
        throw new Error("BOOK_IS_AVAILABLE");
      }

      // O'quvchi ushbu kitobni ayni vaqtda o'qiyaptimi?
      const activeBorrow = await tx.borrowRecord.findFirst({
        where: {
          book_id: bookId,
          student_id: user.id,
          status: { in: [BorrowStatus.BORROWED, BorrowStatus.OVERDUE] },
        },
      });

      if (activeBorrow) {
        throw new Error("ALREADY_HOLDING_BOOK");
      }

      // O'quvchi allaqachon navbatdami?
      const existingQueue = await tx.bookQueue.findFirst({
        where: {
          book_id: bookId,
          student_id: user.id,
          status: QueueStatus.WAITING,
        },
      });

      if (existingQueue) {
        throw new Error("ALREADY_IN_QUEUE");
      }

      // Oxirgi navbat o'rnini aniqlash
      const lastQueueItem = await tx.bookQueue.findFirst({
        where: {
          book_id: bookId,
          status: QueueStatus.WAITING,
        },
        orderBy: { position: 'desc' },
      });

      const nextPosition = (lastQueueItem?.position || 0) + 1;

      const createdItem = await tx.bookQueue.create({
        data: {
          book_id: bookId,
          student_id: user.id,
          position: nextPosition,
          status: QueueStatus.WAITING,
        },
      });

      return createdItem;
    });

    return NextResponse.json({
      success: true,
      message: `Navbatga muvaffaqiyatli yozildingiz! Sizning navbatingiz: #${queueRecord.position}. Kitob topshirilganda Telegram orqali xabar olasiz.`,
      position: queueRecord.position,
    });
  } catch (error: any) {
    if (error.message === 'BOOK_NOT_FOUND') {
      return NextResponse.json({ error: "Kitob topilmadi" }, { status: 404 });
    }
    if (error.message === 'BOOK_IS_AVAILABLE') {
      return NextResponse.json({ error: "Ushbu kitob hozir mavjud! Navbatga yozilish o'rniga 'Bron qilish' tugmasini bosing." }, { status: 400 });
    }
    if (error.message === 'ALREADY_HOLDING_BOOK') {
      return NextResponse.json({ error: "Siz hozirda bu kitobni olgansiz!" }, { status: 400 });
    }
    if (error.message === 'ALREADY_IN_QUEUE') {
      return NextResponse.json({ error: "Siz allaqachon ushbu kitob navbatidasiz!" }, { status: 409 });
    }

    console.error('Navbatga yozilish xatosi:', error);
    return NextResponse.json({ error: "Navbatga yozilishda xatolik yuz berdi" }, { status: 500 });
  }
}
