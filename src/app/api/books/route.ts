import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { createBookSchema } from '@/lib/validation';
import { Role, BookStatus, BorrowStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const libraryId = searchParams.get('library_id')?.trim();
    const category = searchParams.get('category')?.trim();
    const statusParam = searchParams.get('status')?.trim();

    const where: any = {};

    if (libraryId) {
      where.library_id = libraryId;
    }

    if (category && category !== 'ALL') {
      where.category = category;
    }

    if (statusParam && statusParam !== 'ALL') {
      where.status = statusParam as BookStatus;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { author: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const books = await prisma.book.findMany({
      where,
      include: {
        library: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        borrow_records: {
          where: {
            status: { in: [BorrowStatus.BORROWED, BorrowStatus.OVERDUE] },
          },
          take: 1,
          orderBy: { borrowed_at: 'desc' },
          include: {
            student: {
              select: {
                id: true,
                full_name: true,
                class_name: true,
              },
            },
          },
        },
        queue_items: {
          where: {
            status: 'WAITING',
          },
          select: {
            id: true,
            position: true,
            student_id: true,
          },
          orderBy: { position: 'asc' },
        },
        feedbacks: {
          select: {
            rating: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const formattedBooks = books.map((b) => {
      const activeBorrow = b.borrow_records[0] || null;
      const ratings = b.feedbacks.map((f) => f.rating);
      const avgRating = ratings.length > 0 ? (ratings.reduce((a, c) => a + c, 0) / ratings.length).toFixed(1) : null;

      // Mask student name for privacy: "Jasurbek Karimov" -> "Jasurbek K."
      let maskedHolder = null;
      if (activeBorrow?.student) {
        const parts = activeBorrow.student.full_name.split(' ');
        const initial = parts[1] ? ` ${parts[1][0]}.` : '';
        maskedHolder = `${parts[0]}${initial} (${activeBorrow.class_name || activeBorrow.student.class_name || 'Kitobxon'})`;
      }

      return {
        id: b.id,
        library_id: b.library_id,
        library_name: b.library.name,
        code: b.code,
        title: b.title,
        author: b.author,
        category: b.category,
        status: b.status,
        created_at: b.created_at,
        current_borrower: maskedHolder,
        deadline_at: activeBorrow?.deadline_at || null,
        is_overdue: activeBorrow ? new Date(activeBorrow.deadline_at) < new Date() : false,
        queue_count: b.queue_items.length,
        rating_avg: avgRating,
        feedback_count: b.feedbacks.length,
      };
    });

    return NextResponse.json({ books: formattedBooks });
  } catch (error: any) {
    console.error('Kitoblarni olish xatosi:', error);
    return NextResponse.json({ error: "Kitoblar ro'yxatini yuklab bo'lmadi" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== Role.LIBRARIAN || !user.library_id) {
      return NextResponse.json({ error: "Faqat kutubxonachilar kitob qo'sha oladi" }, { status: 403 });
    }

    const body = await req.json();
    const validation = createBookSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Ma'lumotlar noto'g'ri" },
        { status: 400 }
      );
    }

    const { code, title, author, category } = validation.data;

    // Ushbu kutubxonada shu kodli kitob bor-yo'qligini tekshirish
    const existing = await prisma.book.findUnique({
      where: {
        library_id_code: {
          library_id: user.library_id,
          code,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Ushbu kutubxonada '${code}' raqamli kitob allaqachon mavjud` },
        { status: 409 }
      );
    }

    const newBook = await prisma.book.create({
      data: {
        library_id: user.library_id,
        code,
        title,
        author,
        category,
        status: BookStatus.AVAILABLE,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Kitob muvaffaqiyatli qo'shildi",
      book: newBook,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Kitob qo\'shish xatosi:', error);
    return NextResponse.json({ error: "Kitob qo'shishda xatolik yuz berdi" }, { status: 500 });
  }
}
