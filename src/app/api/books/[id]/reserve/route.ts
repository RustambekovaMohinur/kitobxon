import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { BookStatus, Role } from '@prisma/client';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Avval tizimga kiring" }, { status: 401 });
    }

    if (user.role !== Role.STUDENT) {
      return NextResponse.json({ error: "Faqat kitobxon/o'quvchilar bron qila oladi" }, { status: 403 });
    }

    const bookId = params.id;

    // Tranzaksiya bilan bron qilish (Race condition oldini olish)
    const result = await prisma.$transaction(async (tx) => {
      const book = await tx.book.findUnique({
        where: { id: bookId },
      });

      if (!book) {
        throw new Error("BOOK_NOT_FOUND");
      }

      if (book.status !== BookStatus.AVAILABLE) {
        throw new Error("BOOK_NOT_AVAILABLE");
      }

      // Kitob holatini RESERVED ga o'zgartiramiz
      const updatedBook = await tx.book.update({
        where: { id: bookId },
        data: {
          status: BookStatus.RESERVED,
        },
      });

      // Navbat jadvaliga 1-o'rinda bron qilingan holatda yozamiz
      const queueItem = await tx.bookQueue.create({
        data: {
          book_id: bookId,
          student_id: user.id,
          position: 1,
          status: 'NOTIFIED', // Olib ketishi kutilmoqda
        },
      });

      return { updatedBook, queueItem };
    });

    return NextResponse.json({
      success: true,
      message: "Kitob muvaffaqiyatli bron qilindi! 24 soat ichida kutubxonadan olib ketishingiz mumkin.",
      book: result.updatedBook,
    });
  } catch (error: any) {
    if (error.message === 'BOOK_NOT_FOUND') {
      return NextResponse.json({ error: "Kitob topilmadi" }, { status: 404 });
    }
    if (error.message === 'BOOK_NOT_AVAILABLE') {
      return NextResponse.json({ error: "Kechirasiz, bu kitob allaqachon band yoki bron qilingan" }, { status: 409 });
    }
    console.error('Bron qilish xatosi:', error);
    return NextResponse.json({ error: "Bron qilishda xatolik yuz berdi" }, { status: 500 });
  }
}
