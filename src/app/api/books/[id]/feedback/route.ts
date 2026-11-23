import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { feedbackSchema } from '@/lib/validation';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Fikr qoldirish uchun tizimga kiring" }, { status: 401 });
    }

    const bookId = params.id;
    const body = await req.json();

    const validation = feedbackSchema.safeParse({
      ...body,
      book_id: bookId,
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Noto'g'ri ma'lumotlar kiritildi" },
        { status: 400 }
      );
    }

    const { rating, comment } = validation.data;

    const book = await prisma.book.findUnique({
      where: { id: bookId },
    });

    if (!book) {
      return NextResponse.json({ error: "Kitob topilmadi" }, { status: 404 });
    }

    const newFeedback = await prisma.bookFeedback.create({
      data: {
        book_id: bookId,
        student_id: user.id,
        rating,
        comment,
      },
      include: {
        student: {
          select: {
            full_name: true,
            class_name: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Fikr va tavsiyangiz muvaffaqiyatli qabul qilindi!",
      feedback: {
        id: newFeedback.id,
        rating: newFeedback.rating,
        comment: newFeedback.comment,
        created_at: newFeedback.created_at,
        student_name: newFeedback.student.full_name,
        class_name: newFeedback.student.class_name,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Fikr qoldirish xatosi:', error);
    return NextResponse.json({ error: "Fikrni saqlashda xatolik yuz berdi" }, { status: 500 });
  }
}
