import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { Role, BorrowStatus, QueueStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Avval tizimga kiring" }, { status: 401 });
    }

    const now = new Date();

    // 1. Faol olingan kitoblar
    const activeBorrows = await prisma.borrowRecord.findMany({
      where: {
        student_id: user.id,
        status: { in: [BorrowStatus.BORROWED, BorrowStatus.OVERDUE] },
      },
      include: {
        book: {
          include: {
            library: true,
          },
        },
      },
      orderBy: { deadline_at: 'asc' },
    });

    const formattedActive = activeBorrows.map((b) => {
      const deadline = new Date(b.deadline_at);
      const diffMs = deadline.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const isOverdue = diffDays < 0;

      return {
        id: b.id,
        book_id: b.book.id,
        title: b.book.title,
        author: b.book.author,
        code: b.book.code,
        category: b.book.category,
        library_name: b.book.library.name,
        borrowed_at: b.borrowed_at,
        deadline_at: b.deadline_at,
        days_remaining: Math.abs(diffDays),
        is_overdue: isOverdue,
      };
    });

    // 2. O'qib qaytarilgan kitoblar tarixi
    const pastBorrows = await prisma.borrowRecord.findMany({
      where: {
        student_id: user.id,
        status: BorrowStatus.RETURNED,
      },
      include: {
        book: {
          include: {
            library: true,
          },
        },
      },
      orderBy: { returned_at: 'desc' },
      take: 20,
    });

    const formattedPast = pastBorrows.map((b) => ({
      id: b.id,
      book_id: b.book.id,
      title: b.book.title,
      author: b.book.author,
      code: b.book.code,
      library_name: b.book.library.name,
      borrowed_at: b.borrowed_at,
      returned_at: b.returned_at,
    }));

    // 3. Navbatdagi kitoblar
    const queueItems = await prisma.bookQueue.findMany({
      where: {
        student_id: user.id,
        status: { in: [QueueStatus.WAITING, QueueStatus.NOTIFIED] },
      },
      include: {
        book: {
          include: {
            library: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const formattedQueue = queueItems.map((q) => ({
      id: q.id,
      book_id: q.book.id,
      title: q.book.title,
      author: q.book.author,
      code: q.book.code,
      library_name: q.book.library.name,
      position: q.position,
      status: q.status,
      created_at: q.created_at,
    }));

    // 4. O'quvchi yulduzlari va taqrizlari (Student stars, reviews & rank system)
    const feedbacks = await prisma.bookFeedback.findMany({
      where: { student_id: user.id },
      include: {
        book: {
          select: { id: true, title: true, code: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const booksReadCount = pastBorrows.length;
    const reviewsCount = feedbacks.length;
    const totalStars = (booksReadCount * 5) + (reviewsCount * 3);

    let rankTitle = 'Yangi Kitobxon ⭐';
    let nextRankStars = 20;
    if (totalStars >= 80) {
      rankTitle = 'Zukko Alloma 🌟🌟🌟🌟🌟';
      nextRankStars = 80;
    } else if (totalStars >= 45) {
      rankTitle = 'Kutubxona Faxri 🌟🌟🌟🌟';
      nextRankStars = 80;
    } else if (totalStars >= 20) {
      rankTitle = 'Faol Kitobxon ⭐⭐⭐';
      nextRankStars = 45;
    } else if (totalStars >= 5) {
      rankTitle = 'Intiluvchan Kitobxon ⭐⭐';
      nextRankStars = 20;
    }

    const progressPercent = Math.min(100, Math.round((totalStars / nextRankStars) * 100));

    let linkCode = user.telegram_link_code;
    if (!linkCode) {
      linkCode = `KB-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      await prisma.user.update({
        where: { id: user.id },
        data: { telegram_link_code: linkCode },
      });
    }

    return NextResponse.json({
      activeBorrows: formattedActive,
      pastBorrows: formattedPast,
      queueItems: formattedQueue,
      studentStars: {
        total_stars: totalStars,
        books_read: booksReadCount,
        reviews_count: reviewsCount,
        rank_title: rankTitle,
        next_rank_stars: nextRankStars,
        progress_percent: progressPercent,
      },
      myFeedbacks: feedbacks.map((f) => ({
        id: f.id,
        book_id: f.book.id,
        book_title: f.book.title,
        book_code: f.book.code,
        rating: f.rating,
        comment: f.comment,
        created_at: f.created_at,
      })),
      telegram: {
        is_linked: !!user.telegram_chat_id,
        chat_id: user.telegram_chat_id,
        link_code: linkCode,
      },
    });
  } catch (error: any) {
    console.error('Mening kitoblarim xatosi:', error);
    return NextResponse.json({ error: "Ma'lumotlarni yuklab bo'lmadi" }, { status: 500 });
  }
}
