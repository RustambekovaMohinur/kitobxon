import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { Role, BorrowStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json({ error: "Ruxsat etilmagan" }, { status: 403 });
    }

    const [totalLibraries, totalBooks, activeBorrows, overdueCount, totalUsers] = await Promise.all([
      prisma.library.count(),
      prisma.book.count(),
      prisma.borrowRecord.count({
        where: {
          status: { in: [BorrowStatus.BORROWED, BorrowStatus.OVERDUE] },
        },
      }),
      prisma.borrowRecord.count({
        where: {
          status: { in: [BorrowStatus.BORROWED, BorrowStatus.OVERDUE] },
          deadline_at: { lt: new Date() },
        },
      }),
      prisma.user.count(),
    ]);

    return NextResponse.json({
      stats: {
        totalLibraries,
        totalBooks,
        activeBorrows,
        overdueCount,
        totalUsers,
      },
    });
  } catch (error: any) {
    console.error('Super Admin statistikasi xatosi:', error);
    return NextResponse.json({ error: "Statistikani yuklab bo'lmadi" }, { status: 500 });
  }
}
