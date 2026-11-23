import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { Role, BookStatus } from '@prisma/client';
import { createBookSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== Role.LIBRARIAN && user.role !== Role.SUPER_ADMIN)) {
      return NextResponse.json({ error: "Ruxsat etilmagan" }, { status: 403 });
    }

    const libraryId = user.library_id || (await prisma.library.findFirst({ where: { status: 'ACTIVE' } }))?.id;
    if (!libraryId) {
      return NextResponse.json({ books: [] });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';

    const where: any = {
      library_id: libraryId,
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { author: { contains: search, mode: 'insensitive' } },
      ];
    }

    const books = await prisma.book.findMany({
      where,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        code: true,
        title: true,
        author: true,
        category: true,
        status: true,
        created_at: true,
      },
    });

    return NextResponse.json({ books });
  } catch (error: any) {
    console.error('Kutubxonachi kitoblarini olish xatosi:', error);
    return NextResponse.json({ error: "Kitoblarni yuklab bo'lmadi" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== Role.LIBRARIAN && user.role !== Role.SUPER_ADMIN)) {
      return NextResponse.json({ error: "Faqat kutubxonachi yoki administrator kitob qo'sha oladi" }, { status: 403 });
    }

    const body = await req.json();
    const validation = createBookSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Ma'lumotlar noto'g'ri" },
        { status: 400 }
      );
    }

    const { code, title, author, category } = validation.data;
    const cleanCode = code.trim().toUpperCase();

    const libraryId = user.library_id || body.library_id || (await prisma.library.findFirst({ where: { status: 'ACTIVE' } }))?.id;
    if (!libraryId) {
      return NextResponse.json({ error: "Kitob biriktirish uchun faol kutubxona topilmadi" }, { status: 400 });
    }

    // Kod takrorlanmasligini tekshirish
    const existing = await prisma.book.findFirst({
      where: {
        library_id: libraryId,
        code: cleanCode,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Ushbu '${cleanCode}' raqamli kitob ushbu kutubxonada allaqachon mavjud` },
        { status: 409 }
      );
    }

    const book = await prisma.book.create({
      data: {
        library_id: libraryId,
        code: cleanCode,
        title: title.trim(),
        author: author.trim(),
        category: category || 'Badiiy adabiyot',
        status: BookStatus.AVAILABLE,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Yangi kitob muvaffaqiyatli qo'shildi",
      book,
    });
  } catch (error: any) {
    console.error('Kitob qo\'shish xatosi:', error);
    return NextResponse.json({ error: "Kitobni qo'shishda server xatosi yuz berdi" }, { status: 500 });
  }
}
