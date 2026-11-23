import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser, hashPassword } from '@/lib/auth';
import { createLibrarianSchema } from '@/lib/validation';
import { Role } from '@prisma/client';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json({ error: "Ruxsat etilmagan" }, { status: 403 });
    }

    const librarians = await prisma.user.findMany({
      where: { role: Role.LIBRARIAN },
      select: {
        id: true,
        full_name: true,
        login: true,
        role: true,
        library_id: true,
        telegram_chat_id: true,
        created_at: true,
        library: {
          select: {
            id: true,
            name: true,
            type: true,
            location: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({ librarians });
  } catch (error: any) {
    console.error('Kutubxonachilarni olish xatosi:', error);
    return NextResponse.json({ error: "Ma'lumotlarni yuklab bo'lmadi" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json({ error: "Ruxsat etilmagan" }, { status: 403 });
    }

    const body = await req.json();
    const validation = createLibrarianSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Ma'lumotlar noto'g'ri" },
        { status: 400 }
      );
    }

    const { full_name, login, password, library_id } = validation.data;

    // Kutubxona mavjudligini tekshirish
    const library = await prisma.library.findUnique({
      where: { id: library_id },
    });

    if (!library) {
      return NextResponse.json({ error: "Kutubxona topilmadi" }, { status: 404 });
    }

    // Login takrorlanmasligini tekshirish
    const existing = await prisma.user.findUnique({
      where: { login },
    });

    if (existing) {
      return NextResponse.json({ error: "Ushbu login tizimda mavjud" }, { status: 409 });
    }

    const password_hash = await hashPassword(password);
    const linkCode = `LIB-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const newLibrarian = await prisma.user.create({
      data: {
        full_name,
        login,
        password_hash,
        role: Role.LIBRARIAN,
        library_id,
        telegram_link_code: linkCode,
      },
      include: {
        library: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Kutubxonachi hisobi muvaffaqiyatli yaratildi",
      librarian: {
        id: newLibrarian.id,
        full_name: newLibrarian.full_name,
        login: newLibrarian.login,
        library_name: newLibrarian.library?.name,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Kutubxonachi yaratish xatosi:', error);
    return NextResponse.json({ error: "Kutubxonachi yaratishda xatolik" }, { status: 500 });
  }
}
