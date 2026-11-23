import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json({ error: "Ruxsat etilmagan" }, { status: 403 });
    }

    const librarianId = params.id;

    const targetUser = await prisma.user.findUnique({
      where: { id: librarianId },
    });

    if (!targetUser || targetUser.role !== Role.LIBRARIAN) {
      return NextResponse.json({ error: "Kutubxonachi topilmadi" }, { status: 404 });
    }

    await prisma.user.delete({
      where: { id: librarianId },
    });

    return NextResponse.json({
      success: true,
      message: `'${targetUser.full_name}' kutubxonachi hisobi muvaffaqiyatli o'chirildi`,
    });
  } catch (error: any) {
    console.error('Kutubxonachi o\'chirish xatosi:', error);
    return NextResponse.json({ error: "O'chirishda xatolik yuz berdi" }, { status: 500 });
  }
}
