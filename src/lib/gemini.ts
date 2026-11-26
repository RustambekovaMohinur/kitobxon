/**
 * Google Gemini AI Service for Smart Book Catalog Importer
 */

export interface RawParsedBook {
  title: string;
  author: string;
  category: string;
  copies_count: number;
}

const CANDIDATE_MODELS = [
  'gemini-3.8-flash',
  'gemini-2.5-flash-lite',
  'gemini-flash-latest',
];

export async function parseBookCatalogWithGemini(input: {
  text?: string;
  fileInlineData?: {
    mimeType: string;
    data: string; // base64
  };
}): Promise<RawParsedBook[]> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey || apiKey.includes('your_gemini_api_key_here')) {
    // Agar API kalit qo'yilmagan bo'lsa va matn berilgan bo'lsa, zaxira lokal parslar
    if (input.text) {
      return parseTextLocally(input.text);
    }
    throw new Error("GEMINI_API_KEY sozlanmagan. Iltimos, .env faylida Gemini API kalitini ko'rsating.");
  }

  const promptText = `
Siz maktab va jamoat kutubxonalari uchun kitoblar ro'yxatini tahlil qiluvchi aqlli mutaxassissiz.
Vazifangiz taqdim etilgan jadval, matn, Excel ma'lumotlari yoki ro'yxatdan barcha kitoblarni aniqlab, ularni tuzilmaviy JSON formatga o'tkazish.

Qoidalarga qat'iy amal qiling:
1. title: Kitobning toza nomi (tartib raqamlari, ortiqcha nuqtalar, qavsdagi keraksiz belgilarni tozalang, bosh harflarni to'g'rilang).
2. author: Kitob muallifining to'liq ismi (masalan: "Abdulla Qodiriy", "O'tkir Hoshimov", "J.K. Rowling"). Agar muallif ko'rsatilmagan bo'lsa yoki topilmasa, qat'iy ravishda "Noma'lum" deb yozing.
3. category: Kitob yo'nalishini quyidagi standart toifalardan biriga aniq tasniflang:
   - "Badiiy adabiyot" (romanlar, qissalar, she'riyat, dostonlar)
   - "Darslik va o'quv qo'llanma" (maktab darsliklari, fan qo'llanmalari, masalalar to'plamlari)
   - "Ilmiy-ommabop" (tarix, biologiya, fizika, psixologiya, ensiklopediyalar)
   - "Bolalar adabiyoti" (ertaklar, bolalar hikoyalari, bolalar ensiklopediyasi)
   - "Xorijiy adabiyot" (chet tillari, ingliz/rus/nemis tilidagi adabiyotlar)
   - "Diniy-ma'rifiy" (hadislar, odob-axloq)
   - "Boshqa" (agar yuqoridagilarga to'g'ri kelmasa)
4. copies_count: Kitobning nusxalar soni (butun son, masalan: 1, 3, 5, 10). Agar matnda "3 dona", "5 nusxa", "10 ta" yoki son bo'lsa, o'sha sonni oling. Agar aniq ko'rsatilmagan bo'lsa, standart 1 deb oling (kamida 1).

Har bir kitob alohida obyekt bo'lishi shart!
`;

  const parts: any[] = [];

  if (input.fileInlineData) {
    parts.push({
      inlineData: input.fileInlineData,
    });
  }

  if (input.text) {
    parts.push({
      text: `${promptText}\n\nQuyidagi ma'lumotlarni tahlil qiling:\n${input.text}`,
    });
  } else {
    parts.push({
      text: promptText,
    });
  }

  const payload = {
    contents: [{ parts }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            author: { type: 'string' },
            category: { type: 'string' },
            copies_count: { type: 'integer' },
          },
          required: ['title', 'author', 'category', 'copies_count'],
        },
      },
    },
  };

  let lastError: any = null;

  for (const model of CANDIDATE_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (response.status === 429) {
          // Rate limit - brief delay then retry
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Model ${model} xatosi (${response.status}): ${errorText.slice(0, 150)}`);
        }

        const resData = await response.json();
        const rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!rawText) {
          throw new Error("AI javob matni bo'sh");
        }

        const parsed = JSON.parse(rawText);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item) => ({
            title: String(item.title || "Nomsiz kitob").trim(),
            author: String(item.author || "Noma'lum").trim(),
            category: String(item.category || "Badiiy adabiyot").trim(),
            copies_count: Math.max(1, parseInt(String(item.copies_count || 1), 10) || 1),
          }));
        }
      } catch (err: any) {
        lastError = err;
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  // Agar AI so'rovi muvaffaqiyatsiz bo'lsa va text bo'lsa, lokal zaxiradan parslash
  if (input.text) {
    console.warn("Gemini so'rovi o'xshamadi, lokal zaxira algoritmidan foydalanilmoqda:", lastError?.message);
    const localResult = parseTextLocally(input.text);
    if (localResult.length > 0) return localResult;
  }

  throw lastError || new Error("Gemini AI orqali kitoblarni tahlil qilib bo'lmadi");
}

/**
 * Zaxira lokal jadval parslar (Agar tarmoq yoki AI vaqtincha javob bermasa ham kutubxonachi to'xtab qolmasligi uchun)
 */
function parseTextLocally(text: string): RawParsedBook[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const books: RawParsedBook[] = [];

  // Agar CSV formati bo'lsa
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Sarlavha qatorini o'tkazib yuborish
    if (i === 0 && (line.toLowerCase().includes('nomi') || line.toLowerCase().includes('title') || line.toLowerCase().includes('muallif'))) {
      continue;
    }

    const cols = line.split(/[,\t;|]/).map((c) => c.replace(/^["']|["']$/g, '').trim());
    if (cols.length >= 2) {
      // Birinchi ustun ko'pincha tartib raqami bo'lishi mumkin
      let titleIdx = 0;
      let authorIdx = 1;
      let countIdx = -1;
      let catIdx = -1;

      if (/^\d+$/.test(cols[0])) {
        titleIdx = 1;
        authorIdx = 2;
        countIdx = 3;
        catIdx = 4;
      }

      const title = cols[titleIdx];
      const author = cols[authorIdx] || "Noma'lum";
      const rawCount = countIdx !== -1 && cols[countIdx] ? parseInt(cols[countIdx], 10) : 1;
      const category = catIdx !== -1 && cols[catIdx] ? cols[catIdx] : "Badiiy adabiyot";

      if (title && title.length > 1 && !/^\d+$/.test(title)) {
        books.push({
          title,
          author: author || "Noma'lum",
          category: category || "Badiiy adabiyot",
          copies_count: isNaN(rawCount) || rawCount < 1 ? 1 : rawCount,
        });
      }
    }
  }

  return books;
}
