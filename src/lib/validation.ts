import { z } from 'zod';

/**
 * XSS hujumlarining oldini olish uchun foydalanuvchi kiritgan matnlarni tozalash (sanitizatsiya)
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

export const loginSchema = z.object({
  login: z.string().min(3, "Login kamida 3 ta belgidan iborat bo'lishi kerak"),
  password: z.string().min(4, "Parol kamida 4 ta belgidan iborat bo'lishi kerak"),
});

export const registerSchema = z.object({
  full_name: z.string().min(3, "Ism-familiya kamida 3 ta belgidan iborat bo'lishi kerak"),
  library_id: z.string().min(1, "Iltimos, maktab yoki kutubxonani tanlang"),
  class_name: z.string().optional().default("Kitobxon"),
  login: z
    .string()
    .min(3, "Login kamida 3 ta belgidan iborat bo'lishi kerak")
    .regex(/^[a-zA-Z0-9_.-]+$/, "Login faqat lotin harflari, sonlar va _ . belgilaridan iborat bo'lishi mumkin"),
  password: z.string().min(6, "Parol kamida 6 ta belgidan iborat bo'lishi kerak"),
});

export const createLibrarySchema = z.object({
  name: z.string().min(3, "Muassasa nomi kamida 3 ta belgi bo'lishi kerak"),
  type: z.enum(["Maktab", "Kutubxona"]),
  location: z.string().min(3, "Manzil kamida 3 ta belgi bo'lishi kerak"),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export const createLibrarianSchema = z.object({
  full_name: z.string().min(3, "Kutubxonachi ismi kamida 3 ta belgi bo'lishi kerak"),
  login: z.string().min(3, "Login kamida 3 ta belgi bo'lishi kerak"),
  password: z.string().min(6, "Parol kamida 6 ta belgi bo'lishi kerak"),
  library_id: z.string().min(1, "Kutubxona biriktirilishi shart"),
});

export const createBookSchema = z.object({
  code: z
    .string()
    .min(2, "Kitob raqami (kod) kamida 2 ta belgi bo'lishi kerak")
    .transform((val) => val.trim().toUpperCase()),
  title: z.string().min(2, "Kitob nomi kamida 2 ta belgi bo'lishi kerak"),
  author: z.string().min(2, "Muallif nomi kamida 2 ta belgi bo'lishi kerak"),
  category: z.string().min(2, "Kategoriya kiritilishi kerak").default("Badiiy adabiyot"),
});

export const issueBookSchema = z.object({
  book_id: z.string().min(1, "Kitob tanlanishi shart"),
  student_id: z.string().min(1, "O'quvchi tanlanishi shart"),
  class_name: z.string().optional(),
  parent_telegram_chat_id: z.string().optional().transform((v) => (v ? v.trim() : undefined)),
  deadline_days: z.coerce.number().min(1).max(180).default(14),
});

export const returnBookSchema = z
  .object({
    borrow_record_id: z.string().optional(),
    book_code: z.string().optional(),
  })
  .refine(
    (data) =>
      Boolean((data.borrow_record_id && data.borrow_record_id.trim().length > 0) || (data.book_code && data.book_code.trim().length > 0)),
    {
      message: "Qarz yozuvi ID yoki Kitob kodi kiritilishi shart",
    }
  );

export const feedbackSchema = z.object({
  book_id: z.string().min(1, "Kitob ID si talab qilinadi"),
  rating: z.coerce.number().int().min(1, "Reyting kamida 1 yulduz").max(5, "Reyting ko'pi bilan 5 yulduz"),
  comment: z
    .string()
    .min(3, "Fikr kamida 3 ta belgidan iborat bo'lishi kerak")
    .max(1000, "Fikr 1000 ta belgidan oshmasligi kerak")
    .transform(sanitizeInput),
});
