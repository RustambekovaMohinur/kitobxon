import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { Role } from '@prisma/client';
import { parseBookCatalogWithGemini } from '@/lib/gemini';
import * as xlsx from 'xlsx';
import QRCode from 'qrcode';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== Role.LIBRARIAN && user.role !== Role.SUPER_ADMIN)) {
      return NextResponse.json({ error: "Faqat kutubxonachi yoki administrator kitob import qila oladi" }, { status: 403 });
    }

    const libraryId = user.library_id || (await prisma.library.findFirst({ where: { status: 'ACTIVE' } }))?.id;
    if (!libraryId) {
      return NextResponse.json({ error: "Kitoblar biriktirish uchun faol kutubxona topilmadi" }, { status: 400 });
    }

    const contentType = req.headers.get('content-type') || '';
    let parsedBooks: Array<{ title: string; author: string; category: string; copies_count: number }> = [];

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const rawText = formData.get('text') as string | null;

      if (!file && !rawText) {
        return NextResponse.json({ error: "Iltimos, fayl (.xlsx, .xls, .csv, rasm, pdf) yoki matn yuklang" }, { status: 400 });
      }

      if (file) {
        const fileName = file.name.toLowerCase();
        const fileType = file.type;
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv') || fileType.includes('spreadsheet') || fileType.includes('excel') || fileType.includes('csv')) {
          // Excel yoki CSV faylni o'qish
          try {
            const workbook = xlsx.read(buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const csvText = xlsx.utils.sheet_to_csv(sheet);

            if (!csvText || !csvText.trim()) {
              return NextResponse.json({ error: "Fayl bo'sh yoki ma'lumotlar topilmadi" }, { status: 400 });
            }

            parsedBooks = await parseBookCatalogWithGemini({ text: csvText });
          } catch (err: any) {
            console.error("Jadval o'qish xatosi:", err);
            return NextResponse.json({ error: `Jadval faylini tahlil qilib bo'lmadi: ${err.message}` }, { status: 400 });
          }
        } else if (fileType.startsWith('image/') || fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.webp') || fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
          // Rasm yoki PDF orqali tahlil
          const mimeType = fileType || (fileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
          const base64Data = buffer.toString('base64');

          parsedBooks = await parseBookCatalogWithGemini({
            fileInlineData: {
              mimeType,
              data: base64Data,
            },
          });
        } else {
          // Matnli fayl
          const textContent = buffer.toString('utf-8');
          parsedBooks = await parseBookCatalogWithGemini({ text: textContent });
        }
      } else if (rawText) {
        parsedBooks = await parseBookCatalogWithGemini({ text: rawText });
      }
    } else {
      // JSON formatda yuborilgan matn
      const body = await req.json();
      if (!body.text || !body.text.trim()) {
        return NextResponse.json({ error: "Matn maydoni bo'sh" }, { status: 400 });
      }
      parsedBooks = await parseBookCatalogWithGemini({ text: body.text });
    }

    if (!parsedBooks || parsedBooks.length === 0) {
      return NextResponse.json({ error: "Fayldan hech qanday kitob topilmadi. Jadval ustunlarini tekshiring." }, { status: 400 });
    }

    // Bazadagi mavjud kitoblarni olish
    const existingBooks = await prisma.book.findMany({
      where: { library_id: libraryId },
      select: { code: true, title: true, author: true },
    });

    // Eng yuqori KTB kodini hisoblash
    let maxNum = 0;
    for (const b of existingBooks) {
      const match = b.code.match(/KTB-(\d+)/i);
      if (match) {
        const n = parseInt(match[1], 10);
        if (!isNaN(n) && n > maxNum) maxNum = n;
      }
    }

    // Ketma-ket unikal kod va QR ma'lumotlarini shakllantirish
    let runningNum = maxNum;
    const previewItems = await Promise.all(
      parsedBooks.map(async (book, idx) => {
        runningNum++;
        const generatedCode = `KTB-${String(runningNum).padStart(4, '0')}`;

        // Dublikat tekshiruvi (nomi va muallif bo'yicha)
        const cleanTitle = book.title.toLowerCase().replace(/['`’"«»]/g, '').trim();
        const cleanAuthor = book.author.toLowerCase().replace(/['`’"«»]/g, '').trim();

        const duplicateMatch = existingBooks.find((eb) => {
          const ebTitle = eb.title.toLowerCase().replace(/['`’"«»]/g, '').trim();
          const ebAuthor = eb.author.toLowerCase().replace(/['`’"«»]/g, '').trim();
          return (
            ebTitle === cleanTitle ||
            (ebTitle.includes(cleanTitle) && cleanAuthor !== "noma'lum" && ebAuthor.includes(cleanAuthor))
          );
        });

        const qrData = `KITOBXON:${libraryId}:${generatedCode}`;
        let qrPreview = '';
        try {
          qrPreview = await QRCode.toDataURL(qrData, { width: 140, margin: 1 });
        } catch {
          qrPreview = '';
        }

        return {
          temp_id: `ai-${Date.now()}-${idx}`,
          book_code: generatedCode,
          title: book.title,
          author: book.author || "Noma'lum",
          category: book.category || 'Badiiy adabiyot',
          copies_count: Math.max(1, book.copies_count || 1),
          is_duplicate: Boolean(duplicateMatch),
          duplicate_info: duplicateMatch
            ? `Bazada mavjud: "${duplicateMatch.title}" (${duplicateMatch.code})`
            : null,
          qr_data: qrData,
          qr_preview: qrPreview,
        };
      })
    );

    return NextResponse.json({
      success: true,
      library_id: libraryId,
      total_detected: previewItems.length,
      duplicate_count: previewItems.filter((i) => i.is_duplicate).length,
      items: previewItems,
    });
  } catch (error: any) {
    console.error('AI Import Preview xatosi:', error);
    return NextResponse.json(
      { error: error.message || "Kitoblar ro'yxatini tahlil qilishda server xatosi yuz berdi" },
      { status: 500 }
    );
  }
}
