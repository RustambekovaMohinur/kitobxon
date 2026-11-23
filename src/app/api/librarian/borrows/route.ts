import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { Role, BorrowStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== Role.LIBRARIAN && user.role !== Role.SUPER_ADMIN)) {
      return NextResponse.json({ error: "Ruxsat etilmagan" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const statusParam = searchParams.get('status')?.trim();

    const libraryId = user.library_id || (await prisma.library.findFirst({ where: { status: 'ACTIVE' } }))?.id;
    if (!libraryId) {
      return NextResponse.json({ borrows: [] });
    }
    const now = new Date();

    const where: any = {
      library_id: libraryId,
    };

    if (statusParam && statusParam !== 'ALL') {
      where.status = statusParam as BorrowStatus;
    } else {
      where.status = { in: [BorrowStatus.BORROWED, BorrowStatus.OVERDUE] };
    }

    if (search) {
      where.OR = [
        { book: { title: { contains: search, mode: 'insensitive' } } },
        { book: { code: { contains: search, mode: 'insensitive' } } },
        { student: { full_name: { contains: search, mode: 'insensitive' } } },
        { class_name: { contains: search, mode: 'insensitive' } },
        { parent_telegram_chat_id: { contains: search, mode: 'insensitive' } },
      ];
    }

    const records = await prisma.borrowRecord.findMany({
      where,
      include: {
        book: true,
        student: {
          select: {
            id: true,
            full_name: true,
            login: true,
            class_name: true,
            telegram_chat_id: true,
          },
        },
      },
      orderBy: { deadline_at: 'asc' },
    });

    const formattedRecords = records.map((r) => {
      const isOverdue = r.status === BorrowStatus.OVERDUE || new Date(r.deadline_at) < now;
      const diffMs = now.getTime() - new Date(r.deadline_at).getTime();
      const daysOverdue = isOverdue ? Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24))) : 0;

      return {
        id: r.id,
        book_id: r.book_id,
        book_code: r.book.code,
        book_title: r.book.title,
        book_author: r.book.author,
        student_id: r.student_id,
        student_name: r.student.full_name,
        class_name: r.class_name || r.student.class_name || 'Kitobxon',
        parent_telegram: r.parent_telegram_chat_id || r.student.telegram_chat_id || 'Kiritilmagan',
        borrowed_at: r.borrowed_at,
        deadline_at: r.deadline_at,
        returned_at: r.returned_at,
        status: isOverdue && r.status !== BorrowStatus.RETURNED ? BorrowStatus.OVERDUE : r.status,
        is_overdue: isOverdue && r.status !== BorrowStatus.RETURNED,
        days_overdue: daysOverdue,
      };
    });

    return NextResponse.json({ records: formattedRecords });
  } catch (error: any) {
    console.error('Qarzlarni olish xatosi:', error);
    return NextResponse.json({ error: "Qarzlarni yuklab bo'lmadi" }, { status: 500 });
  }
}
