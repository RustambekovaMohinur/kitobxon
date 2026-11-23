import prisma from './db';
import { BorrowStatus } from '@prisma/client';

export interface TelegramSendResult {
  ok: boolean;
  error?: string;
  chatId?: string;
}

/**
 * Sayt havolasini HTML formatda yashirin havola sifatida shakllantirish.
 * Agar APP_URL belgilanmagan bo'lsa, oddiy matnga aylanadi.
 */
export function getWebsiteLinkHtml(): string {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL)?.trim();
  if (appUrl) {
    return `<a href="${appUrl}">Saytimizga tashrif buyurish uchun bosing</a>`;
  }
  return `Saytimizga tashrif buyurish`;
}

/**
 * Telegram Bot orqali xabar yuborish
 */
export async function sendTelegramMessage(chatId: string, text: string): Promise<TelegramSendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || token.includes('ABCdefGhIJKlmNoPQRsTUVwxyZ')) {
    console.warn(`[TelegramBot] Token belgilanmagan yoki demo holatda. ChatId: ${chatId} ga xabar yuborilmadi (simulyatsiya qilindi):`, text.slice(0, 100));
    return { ok: true, chatId };
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      console.error('[TelegramBot] API Xatosi:', data);
      return { ok: false, error: data.description || 'Noma\'lum xatolik', chatId };
    }

    return { ok: true, chatId };
  } catch (error: any) {
    console.error('[TelegramBot] Tarmoq xatosi:', error.message);
    return { ok: false, error: error.message, chatId };
  }
}

/**
 * Muddati o'tgan kitob haqida ota-ona yoki o'quvchiga ogohlantirish xabari
 */
export function formatOverdueMessage(params: {
  studentName: string;
  className?: string | null;
  bookTitle: string;
  bookCode: string;
  libraryName: string;
  deadlineDate: string;
  daysOverdue: number;
}): string {
  const { studentName, className, bookTitle, bookCode, libraryName, deadlineDate, daysOverdue } = params;
  const webLink = getWebsiteLinkHtml();

  return (
    `⚠️ <b>DIQQAT: Kitob qaytarish muddati o'tdi!</b>\n\n` +
    `Hurmatli kitobxon va ota-ona!\n` +
    `👤 <b>O'quvchi:</b> ${studentName} ${className ? `(${className})` : ''}\n` +
    `📚 <b>Kitob:</b> ${bookTitle}\n` +
    `🏷 <b>Kitob kodi:</b> <code>${bookCode}</code>\n` +
    `🏛 <b>Kutubxona:</b> ${libraryName}\n` +
    `📅 <b>Topshirish muddati:</b> ${deadlineDate}\n` +
    `⏰ <b>Kechikish:</b> <b>${daysOverdue} kun</b>\n\n` +
    `❗ Iltimos, boshqa o'quvchilar ham ushbu kitobdan foydalanishlari uchun uni <b>zudlik bilan kutubxonaga topshirishingizni</b> so'raymiz.\n\n` +
    `🌐 ${webLink}\n\n` +
    `<i>Kitobxon — Avtomatlashtirilgan kutubxona tizimi (@kitobxon_rasmiy_bot)</i>`
  );
}

/**
 * Navbatdagi o'quvchiga kitob bo'shaganligi haqida xushxabar
 */
export function formatQueueReadyMessage(params: {
  studentName: string;
  bookTitle: string;
  bookCode: string;
  libraryName: string;
}): string {
  const { studentName, bookTitle, bookCode, libraryName } = params;
  const webLink = getWebsiteLinkHtml();

  return (
    `🎉 <b>Xushxabar: Siz kutgan kitob mavjud!</b>\n\n` +
    `Assalomu alaykum, <b>${studentName}</b>!\n` +
    `Siz navbatda turgan kitob topshirildi va siz uchun tayyorlandi:\n\n` +
    `📚 <b>Kitob:</b> ${bookTitle}\n` +
    `🏷 <b>Kodi:</b> <code>${bookCode}</code>\n` +
    `🏛 <b>Kutubxona:</b> ${libraryName}\n\n` +
    `⏳ Kitob siz uchun <b>24 soatga</b> bron qilib qo'yildi. Iltimos, kutubxonaga kelib kitobni qabul qilib oling!\n\n` +
    `🌐 ${webLink}\n\n` +
    `<i>Kitobxon jamoasi (@kitobxon_rasmiy_bot)</i>`
  );
}

/**
 * Barcha yoki bitta kutubxonadagi muddati o'tgan kitoblarni aniqlash va xabarnoma yuborish
 */
export async function runOverdueCheck(libraryId?: string) {
  const now = new Date();

  // Muddati o'tgan yoki muddati tugagan qarzlar
  const overdueRecords = await prisma.borrowRecord.findMany({
    where: {
      status: {
        in: [BorrowStatus.BORROWED, BorrowStatus.OVERDUE],
      },
      deadline_at: {
        lt: now,
      },
      ...(libraryId ? { library_id: libraryId } : {}),
    },
    include: {
      book: true,
      student: true,
      library: true,
    },
  });

  let notifiedCount = 0;
  const results = [];

  for (const record of overdueRecords) {
    const diffTime = Math.abs(now.getTime() - record.deadline_at.getTime());
    const daysOverdue = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    // Statusni OVERDUE ga yangilaymiz
    if (record.status !== BorrowStatus.OVERDUE) {
      await prisma.borrowRecord.update({
        where: { id: record.id },
        data: { status: BorrowStatus.OVERDUE },
      });
    }

    const message = formatOverdueMessage({
      studentName: record.student.full_name,
      className: record.class_name || record.student.class_name,
      bookTitle: record.book.title,
      bookCode: record.book.code,
      libraryName: record.library.name,
      deadlineDate: record.deadline_at.toLocaleDateString('uz-UZ'),
      daysOverdue,
    });

    let sent = false;

    // 1. Ota-onaning Telegram chat_id siga
    if (record.parent_telegram_chat_id) {
      const res = await sendTelegramMessage(record.parent_telegram_chat_id, message);
      if (res.ok) sent = true;
    }

    // 2. O'quvchining o'zini Telegram chat_id siga
    if (record.student.telegram_chat_id && record.student.telegram_chat_id !== record.parent_telegram_chat_id) {
      const res = await sendTelegramMessage(record.student.telegram_chat_id, message);
      if (res.ok) sent = true;
    }

    if (sent) {
      notifiedCount++;
      await prisma.borrowRecord.update({
        where: { id: record.id },
        data: { overdue_notified_at: now },
      });
    }

    results.push({
      recordId: record.id,
      bookTitle: record.book.title,
      bookCode: record.book.code,
      studentName: record.student.full_name,
      daysOverdue,
      parentChatId: record.parent_telegram_chat_id,
      studentChatId: record.student.telegram_chat_id,
      notified: sent,
    });
  }

  return {
    totalOverdue: overdueRecords.length,
    notifiedCount,
    details: results,
  };
}
