import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { BorrowStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const bookId = params.id;
    const currentUser = await getCurrentUser();

    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: {
        library: true,
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
          orderBy: { position: 'asc' },
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
        feedbacks: {
          orderBy: { created_at: 'desc' },
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
      },
    });

    if (!book) {
      return NextResponse.json({ error: "Kitob topilmadi" }, { status: 404 });
    }

    const activeBorrow = book.borrow_records[0] || null;
    const isLibrarianOfThisBook = currentUser?.role === 'LIBRARIAN' && currentUser.library_id === book.library_id;
    const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

    // Mask name for students, show full for librarians/admin
    let borrowerDisplay = null;
    if (activeBorrow?.student) {
      if (isLibrarianOfThisBook || isSuperAdmin) {
        borrowerDisplay = `${activeBorrow.student.full_name} (${activeBorrow.class_name || activeBorrow.student.class_name || 'Kitobxon'})`;
      } else {
        const parts = activeBorrow.student.full_name.split(' ');
        const initial = parts[1] ? ` ${parts[1][0]}.` : '';
        borrowerDisplay = `${parts[0]}${initial} (${activeBorrow.class_name || activeBorrow.student.class_name || 'Kitobxon'})`;
      }
    }

    // Check if current user is in queue
    const userQueueItem = currentUser
      ? book.queue_items.find((q) => q.student_id === currentUser.id)
      : null;

    // Check if current user holds this book
    const userHoldsBook = currentUser && activeBorrow?.student_id === currentUser.id;

    const formattedQueue = book.queue_items.map((q) => {
      let name = q.student.full_name;
      if (!isLibrarianOfThisBook && !isSuperAdmin) {
        const parts = q.student.full_name.split(' ');
        name = `${parts[0]} ${parts[1] ? parts[1][0] + '.' : ''}`;
      }
      return {
        id: q.id,
        position: q.position,
        student_name: name,
        class_name: q.student.class_name,
        created_at: q.created_at,
        is_current_user: currentUser?.id === q.student_id,
      };
    });

    // Compute average rating and count
    const totalRating = book.feedbacks.reduce((acc, f) => acc + f.rating, 0);
    const ratingAvg = book.feedbacks.length > 0 ? (totalRating / book.feedbacks.length).toFixed(1) : null;

    return NextResponse.json({
      book: {
        id: book.id,
        library_id: book.library_id,
        library_name: book.library.name,
        library_location: book.library.location,
        code: book.code,
        title: book.title,
        author: book.author,
        category: book.category,
        status: book.status,
        created_at: book.created_at,
        current_borrower: borrowerDisplay,
        deadline_at: activeBorrow?.deadline_at || null,
        is_overdue: activeBorrow ? new Date(activeBorrow.deadline_at) < new Date() : false,
        user_holds_book: userHoldsBook,
        user_queue_position: userQueueItem ? userQueueItem.position : null,
        rating_avg: ratingAvg,
        feedback_count: book.feedbacks.length,
      },
      queue: formattedQueue,
      feedbacks: book.feedbacks.map((f) => ({
        id: f.id,
        rating: f.rating,
        comment: f.comment,
        created_at: f.created_at,
        student_name: f.student.full_name,
        class_name: f.student.class_name,
      })),
    });
  } catch (error: any) {
    console.error('Kitob ma\'lumotlarini olish xatosi:', error);
    return NextResponse.json({ error: "Kitob ma'lumotlarini yuklab bo'lmadi" }, { status: 500 });
  }
}
