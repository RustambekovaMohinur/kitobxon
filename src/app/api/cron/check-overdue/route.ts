import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { runOverdueCheck } from '@/lib/telegram';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    let libraryId: string | undefined = undefined;

    if (user) {
      if (user.role === Role.LIBRARIAN) {
        libraryId = user.library_id || undefined;
      }
    }

    const result = await runOverdueCheck(libraryId);

    return NextResponse.json({
      success: true,
      message: `Muddati o'tgan kitoblar tekshirildi: ${result.totalOverdue} ta muddati o'tgan kitob aniqlandi, ${result.notifiedCount} ta xabarnoma yuborildi.`,
      stats: result,
    });
  } catch (error: any) {
    console.error('Overdue tekshirish xatosi:', error);
    return NextResponse.json({ error: "Tekshirishda xatolik yuz berdi" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
