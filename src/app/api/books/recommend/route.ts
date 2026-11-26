import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { recommendBooksWithGemini } from '@/lib/gemini';
import { BookStatus } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const { query, mood, genre, library_id } = body;

    // Kutubxona identifikatorini aniqlash
    let libraryId = library_id || user?.library_id;
    if (!libraryId) {
      const activeLib = await prisma.library.findFirst({
        where: { status: 'ACTIVE' },
        orderBy: { created_at: 'asc' },
      });
      libraryId = activeLib?.id;
    }

    if (!libraryId) {
      return NextResponse.json({ error: "Kutubxona topilmadi" }, { status: 404 });
    }

    // Ayni paytda kutubxonada MAVJUD bo'sh kitoblarni olish
    const availableBooks = await prisma.book.findMany({
      where: {
        library_id: libraryId,
        status: BookStatus.AVAILABLE,
      },
      select: {
        id: true,
        code: true,
        title: true,
        author: true,
        category: true,
        status: true,
        feedbacks: {
          select: {
            rating: true,
          },
        },
      },
      take: 60,
    });

    if (availableBooks.length === 0) {
      return NextResponse.json({
        success: true,
        recommendations: [],
        message: "Ayni paytda kutubxonada tavsiya qilish uchun bo'sh kitoblar mavjud emas.",
      });
    }

    // Foydalanuvchi so'rovini shakllantirish
    const promptParts = [];
    if (query && query.trim()) promptParts.push(query.trim());
    if (mood && mood.trim()) promptParts.push(`Kayfiyat: ${mood.trim()}`);
    if (genre && genre.trim()) promptParts.push(`Janr: ${genre.trim()}`);
    const userInterest = promptParts.join(' | ') || "Menga eng qiziqarli va sara kitoblardan tavsiya bering";

    // Gemini orqali tavsiyalar olish
    const aiRecs = await recommendBooksWithGemini(
      userInterest,
      availableBooks.map((b) => ({
        code: b.code,
        title: b.title,
        author: b.author,
        category: b.category,
      }))
    );

    // AI tavsiyalariga DB dagi ID va reyting ma'lumotlarini qo'shish
    const enriched = aiRecs.map((rec) => {
      const dbBook = availableBooks.find((b) => b.code.toUpperCase() === rec.code.toUpperCase());
      const ratings = dbBook?.feedbacks.map((f) => f.rating) || [];
      const avgRating = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : null;

      return {
        id: dbBook?.id || '',
        code: rec.code,
        title: rec.title || dbBook?.title || '',
        author: rec.author || dbBook?.author || '',
        category: dbBook?.category || 'Badiiy adabiyot',
        pitch: rec.pitch,
        rating_avg: avgRating,
        feedback_count: ratings.length,
      };
    }).filter((r) => r.id);

    return NextResponse.json({
      success: true,
      recommendations: enriched,
      availableCount: availableBooks.length,
    });
  } catch (error: any) {
    console.error('AI Kitob tavsiya xatosi:', error);
    return NextResponse.json(
      { error: "Kitob tavsiyalarini tayyorlashda xatolik yuz berdi" },
      { status: 500 }
    );
  }
}
