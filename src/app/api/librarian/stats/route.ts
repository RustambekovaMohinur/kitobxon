import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { Role, BorrowStatus, BookStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== Role.LIBRARIAN && user.role !== Role.SUPER_ADMIN)) {
      return NextResponse.json({ error: "Ruxsat etilmagan" }, { status: 403 });
    }

    const libraryId = user.library_id || (await prisma.library.findFirst({ where: { status: 'ACTIVE' } }))?.id;
    if (!libraryId) {
      return NextResponse.json({
        stats: {
          totalBooks: 0,
          availableBooks: 0,
          activeBorrows: 0,
          overdueBorrows: 0,
          totalStudents: 0,
        },
      });
    }
    const now = new Date();

    const [totalBooks, availableBooks, activeBorrows, overdueBorrows, totalStudents] = await Promise.all([
      prisma.book.count({ where: { library_id: libraryId } }),
      prisma.book.count({ where: { library_id: libraryId, status: BookStatus.AVAILABLE } }),
      prisma.borrowRecord.count({
        where: {
          library_id: libraryId,
          status: { in: [BorrowStatus.BORROWED, BorrowStatus.OVERDUE] },
        },
      }),
      prisma.borrowRecord.count({
        where: {
          library_id: libraryId,
          status: { in: [BorrowStatus.BORROWED, BorrowStatus.OVERDUE] },
          deadline_at: { lt: now },
        },
      }),
      prisma.user.count({
        where: {
          library_id: libraryId,
          role: Role.STUDENT,
        },
      }),
    ]);

    return NextResponse.json({
      stats: {
        totalBooks,
        availableBooks,
        activeBorrows,
        overdueBorrows,
        totalStudents,
      },
    });
  } catch (error: any) {
    console.error('Kutubxonachi statistikasi xatosi:', error);
    return NextResponse.json({ error: "Statistikani yuklab bo'lmadi" }, { status: 500 });
  }
}
