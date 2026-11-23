import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== Role.LIBRARIAN && user.role !== Role.SUPER_ADMIN)) {
      return NextResponse.json({ error: "Ruxsat etilmagan" }, { status: 403 });
    }

    const libraryId = user.library_id || (await prisma.library.findFirst({ where: { status: 'ACTIVE' } }))?.id;
    if (!libraryId) {
      return NextResponse.json({ error: "Kutubxona topilmadi" }, { status: 400 });
    }

    const studentId = params.id;
    const body = await req.json();
    const { full_name, class_name, telegram_chat_id } = body;

    const existing = await prisma.user.findFirst({
      where: {
        id: studentId,
        library_id: libraryId,
        role: Role.STUDENT,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "O'quvchi topilmadi" }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id: studentId },
      data: {
        ...(full_name ? { full_name: full_name.trim() } : {}),
        ...(class_name !== undefined ? { class_name: class_name.trim() } : {}),
        ...(telegram_chat_id !== undefined ? { telegram_chat_id: telegram_chat_id ? telegram_chat_id.trim() : null } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      message: "O'quvchi ma'lumotlari yangilandi",
      student: updated,
    });
  } catch (error: any) {
    console.error('O\'quvchi tahrirlash xatosi:', error);
    return NextResponse.json({ error: "Yangilashda xatolik yuz berdi" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== Role.LIBRARIAN && user.role !== Role.SUPER_ADMIN)) {
      return NextResponse.json({ error: "Ruxsat etilmagan" }, { status: 403 });
    }

    const libraryId = user.library_id || (await prisma.library.findFirst({ where: { status: 'ACTIVE' } }))?.id;
    if (!libraryId) {
      return NextResponse.json({ error: "Kutubxona topilmadi" }, { status: 400 });
    }

    const studentId = params.id;

    const existing = await prisma.user.findFirst({
      where: {
        id: studentId,
        library_id: libraryId,
        role: Role.STUDENT,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "O'quvchi topilmadi" }, { status: 404 });
    }

    await prisma.user.delete({
      where: { id: studentId },
    });

    return NextResponse.json({
      success: true,
      message: `'${existing.full_name}' o'quvchi hisobi muvaffaqiyatli o'chirildi`,
    });
  } catch (error: any) {
    console.error('O\'quvchi o\'chirish xatosi:', error);
    return NextResponse.json({ error: "O'chirishda xatolik yuz berdi" }, { status: 500 });
  }
}
