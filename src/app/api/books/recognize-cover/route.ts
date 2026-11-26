import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { recognizeBookCoverWithGemini } from '@/lib/gemini';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== Role.LIBRARIAN && user.role !== Role.SUPER_ADMIN)) {
      return NextResponse.json(
        { error: "Faqat kutubxonachi yoki administrator muqovani tahlil qila oladi" },
        { status: 403 }
      );
    }

    const libraryId = user.library_id || (await prisma.library.findFirst({ where: { status: 'ACTIVE' } }))?.id;
    if (!libraryId) {
      return NextResponse.json({ error: "Kutubxona topilmadi" }, { status: 400 });
    }

    let mimeType = 'image/jpeg';
    let base64Data = '';

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ error: "Fayl yuklanmadi" }, { status: 400 });
      }
      mimeType = file.type || 'image/jpeg';
      const arrayBuffer = await file.arrayBuffer();
      base64Data = Buffer.from(arrayBuffer).toString('base64');
    } else {
      const body = await req.json();
      if (!body.image_base64) {
        return NextResponse.json({ error: "Tasvir (base64) kiritilmadi" }, { status: 400 });
      }
      base64Data = body.image_base64.replace(/^data:image\/[a-z]+;base64,/, '');
      if (body.mime_type) mimeType = body.mime_type;
    }

    // Gemini Vision orqali muqovani aniqlash
    const detected = await recognizeBookCoverWithGemini({
      mimeType,
      data: base64Data,
    });

    // Kutubxona katalogida bunday kitob allaqachon mavjudligini tekshirish
    const searchConditions: any[] = [];
    if (detected.title && detected.title.length > 2) {
      searchConditions.push({ title: { contains: detected.title, mode: 'insensitive' } });
    }
    if (detected.author && detected.author !== "Noma'lum" && detected.author.length > 2) {
      searchConditions.push({ author: { contains: detected.author, mode: 'insensitive' } });
    }

    let existingBooks: any[] = [];
    if (searchConditions.length > 0) {
      existingBooks = await prisma.book.findMany({
        where: {
          library_id: libraryId,
          OR: searchConditions,
        },
        take: 6,
        orderBy: { code: 'asc' },
      });
    }

    return NextResponse.json({
      success: true,
      detected,
      existing_books: existingBooks.map((b) => ({
        id: b.id,
        code: b.code,
        title: b.title,
        author: b.author,
        category: b.category,
        status: b.status,
      })),
      is_in_library: existingBooks.length > 0,
    });
  } catch (error: any) {
    console.error('Muqovani aniqlash xatosi:', error);
    return NextResponse.json(
      { error: error.message || "Kitob muqovasini aniqlashda xatolik yuz berdi" },
      { status: 500 }
    );
  }
}
