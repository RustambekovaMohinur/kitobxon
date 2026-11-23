import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json({ error: "Ruxsat etilmagan (Faqat Super Admin)" }, { status: 403 });
    }

    const libraryId = params.id;
    const body = await req.json();
    const { name, type, location, status } = body;

    const existing = await prisma.library.findUnique({
      where: { id: libraryId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Kutubxona topilmadi" }, { status: 404 });
    }

    const updated = await prisma.library.update({
      where: { id: libraryId },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(type ? { type } : {}),
        ...(location ? { location: location.trim() } : {}),
        ...(status ? { status } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Muassasa ma'lumotlari muvaffaqiyatli yangilandi",
      library: updated,
    });
  } catch (error: any) {
    console.error('Kutubxona tahrirlash xatosi:', error);
    return NextResponse.json({ error: "Yangilashda xatolik yuz berdi" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json({ error: "Ruxsat etilmagan (Faqat Super Admin)" }, { status: 403 });
    }

    const libraryId = params.id;

    const existing = await prisma.library.findUnique({
      where: { id: libraryId },
      include: {
        _count: {
          select: {
            books: true,
            users: true,
            borrow_records: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Kutubxona topilmadi" }, { status: 404 });
    }

    // O'chirish (Prisma Cascade orqali barcha bog'liq kitoblar va yozuvlar tozalanadi)
    await prisma.library.delete({
      where: { id: libraryId },
    });

    return NextResponse.json({
      success: true,
      message: `'${existing.name}' muassasasi muvaffaqiyatli o'chirildi`,
    });
  } catch (error: any) {
    console.error('Kutubxona o\'chirish xatosi:', error);
    return NextResponse.json({ error: "O'chirishda xatolik yuz berdi" }, { status: 500 });
  }
}
