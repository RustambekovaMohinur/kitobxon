import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { Role, BookStatus } from '@prisma/client';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const confirmItemSchema = z.object({
  book_code: z.string().min(1),
  title: z.string().min(1, "Kitob nomi kiritilishi shart"),
  author: z.string().optional().default("Noma'lum"),
  category: z.string().optional().default("Badiiy adabiyot"),
  copies_count: z.coerce.number().int().min(1).default(1),
});

const confirmPayloadSchema = z.object({
  items: z.array(confirmItemSchema).min(1, "Kamida 1 ta kitob kiritilishi kerak"),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== Role.LIBRARIAN && user.role !== Role.SUPER_ADMIN)) {
      return NextResponse.json({ error: "Faqat kutubxonachi yoki administrator kitob saqlay oladi" }, { status: 403 });
    }

    const libraryId = user.library_id || (await prisma.library.findFirst({ where: { status: 'ACTIVE' } }))?.id;
    if (!libraryId) {
      return NextResponse.json({ error: "Kitoblar biriktirish uchun faol kutubxona topilmadi" }, { status: 400 });
    }

    const body = await req.json();
    const validation = confirmPayloadSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Ma'lumotlar formati noto'g'ri" },
        { status: 400 }
      );
    }

    const { items } = validation.data;

    // Tranzaksiya orqali barcha kitob nusxalarini xavfsiz yaratish
    const result = await prisma.$transaction(async (tx) => {
      // Mavjud kodlarni olish
      const existingBooks = await tx.book.findMany({
        where: { library_id: libraryId },
        select: { code: true },
      });

      const usedCodes = new Set<string>(existingBooks.map((b) => b.code.toUpperCase()));

      // Eng yuqori KTB raqamini aniqlash
      let maxNum = 0;
      usedCodes.forEach((code) => {
        const match = code.match(/KTB-(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      });

      const getNextCode = (preferredCode?: string): string => {
        if (preferredCode) {
          const clean = preferredCode.trim().toUpperCase();
          if (!usedCodes.has(clean)) {
            usedCodes.add(clean);
            return clean;
          }
        }
        maxNum++;
        let candidate = `KTB-${String(maxNum).padStart(4, '0')}`;
        while (usedCodes.has(candidate)) {
          maxNum++;
          candidate = `KTB-${String(maxNum).padStart(4, '0')}`;
        }
        usedCodes.add(candidate);
        return candidate;
      };

      const createdList: Array<{ id: string; code: string; title: string; author: string }> = [];

      for (const item of items) {
        const count = Math.max(1, item.copies_count || 1);

        for (let copyIdx = 0; copyIdx < count; copyIdx++) {
          const assignedCode = copyIdx === 0 ? getNextCode(item.book_code) : getNextCode();

          const newBook = await tx.book.create({
            data: {
              library_id: libraryId,
              code: assignedCode,
              title: item.title.trim(),
              author: (item.author || "Noma'lum").trim(),
              category: (item.category || "Badiiy adabiyot").trim(),
              status: BookStatus.AVAILABLE,
            },
            select: {
              id: true,
              code: true,
              title: true,
              author: true,
            },
          });

          createdList.push(newBook);
        }
      }

      return createdList;
    });

    return NextResponse.json({
      success: true,
      message: `${result.length} ta kitob nusxasi katalogga muvaffaqiyatli saqlandi!`,
      created_count: result.length,
      books: result,
    });
  } catch (error: any) {
    console.error('AI Import Confirm xatosi:', error);
    return NextResponse.json(
      { error: error.message || "Kitoblarni saqlashda server xatosi yuz berdi" },
      { status: 500 }
    );
  }
}
