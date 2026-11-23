import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Avval tizimga kiring" }, { status: 401 });
    }

    const body = await req.json();
    const { telegram_chat_id } = body;

    if (!telegram_chat_id || typeof telegram_chat_id !== 'string') {
      return NextResponse.json({ error: "Telegram Chat ID kiritilishi shart" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        telegram_chat_id: telegram_chat_id.trim(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Telegram hisob muvaffaqiyatli saqlandi!",
      telegram_chat_id: updated.telegram_chat_id,
    });
  } catch (error: any) {
    console.error('Telegram bog\'lash xatosi:', error);
    return NextResponse.json({ error: "Telegram hisobni saqlashda xatolik yuz berdi" }, { status: 500 });
  }
}
