import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { createLibrarySchema } from '@/lib/validation';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const all = searchParams.get('all') === 'true';

    const libraries = await prisma.library.findMany({
      where: all ? {} : { status: 'ACTIVE' },
      include: {
        _count: {
          select: {
            books: true,
            users: true,
            borrow_records: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({ libraries });
  } catch (error: any) {
    console.error('Kutubxonalarni yuklash xatosi:', error);
    return NextResponse.json({ error: "Kutubxonalarni yuklab bo'lmadi" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json({ error: "Ruxsat etilmagan (Faqat Super Admin)" }, { status: 403 });
    }

    const body = await req.json();
    const validation = createLibrarySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Ma'lumotlar noto'g'ri" },
        { status: 400 }
      );
    }

    const { name, type, location, status } = validation.data;

    const newLibrary = await prisma.library.create({
      data: {
        name,
        type,
        location,
        status,
      },
    });

    return NextResponse.json({
      success: true,
      library: newLibrary,
      message: "Yangi kutubxona / maktab muvaffaqiyatli qo'shildi",
    }, { status: 201 });
  } catch (error: any) {
    console.error('Kutubxona qo\'shish xatosi:', error);
    return NextResponse.json({ error: "Kutubxona qo'shishda xatolik yuz berdi" }, { status: 500 });
  }
}
