import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { sendTelegramMessage, getWebsiteLinkHtml } from '@/lib/telegram';
import { BorrowStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    ok: true,
    status: 'Kitobxon Telegram Webhook faol!',
    bot: '@kitobxon_rasmiy_bot',
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();

    if (!update.message || !update.message.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = String(update.message.chat.id);
    const text = update.message.text.trim();
    const firstName = update.message.from?.first_name || 'Foydalanuvchi';
    const webLink = getWebsiteLinkHtml();

    // 1. /start yoki /start CODE
    if (text.startsWith('/start')) {
      const parts = text.split(' ');
      const code = parts[1]?.trim();

      if (code) {
        // Deep-link code orqali hisobni bog'lash
        const user = await prisma.user.findFirst({
          where: { telegram_link_code: code },
          include: { library: true },
        });

        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: { telegram_chat_id: chatId },
          });

          await sendTelegramMessage(
            chatId,
            `🎉 <b>Assalomu alaykum, ${user.full_name}!</b>\n\n` +
            `Sizning <b>Kitobxon</b> hisobingiz (${user.library?.name || 'Kutubxona'}) ushbu @kitobxon_rasmiy_bot rasmiy botiga muvaffaqiyatli bog'landi!\n\n` +
            `🔔 <i>Endi olingan kitoblar muddati, kechikish ogohlantirishlari va navbatdagi kitoblar haqida barcha xabarnomalar shu yerga keladi.</i>\n\n` +
            `🌐 ${webLink}\n\n` +
            `Buyruqlar:\n/mybooks — Olingan kitoblar holatini ko'rish\n/help — Yordam`
          );
          return NextResponse.json({ ok: true });
        } else {
          await sendTelegramMessage(
            chatId,
            `❌ <b>Kod topilmadi!</b>\nKiritilgan bog'lash kodi (<code>${code}</code>) eskirgan yoki mavjud emas. Profilingizdan qaytadan kod oling.\n\n🌐 ${webLink}`
          );
          return NextResponse.json({ ok: true });
        }
      }

      // Oddiy /start
      await sendTelegramMessage(
        chatId,
        `📚 <b>Assalomu alaykum, ${firstName}!</b>\n\n` +
        `<b>Kitobxon</b> (@kitobxon_rasmiy_bot) — Maktab va jamoat kutubxonalari uchun yagona raqamli tizimining rasmiy botiga xush kelibsiz!\n\n` +
        `🆔 Sizning Telegram Chat ID: <code>${chatId}</code>\n\n` +
        `Hisobingizni bog'lash uchun:\n` +
        `1. ${webLink}\n` +
        `2. "Mening kitoblarim" sahifasidagi @kitobxon_rasmiy_bot havolasini bosing yoki Chat ID raqamingizni kiriting.\n\n` +
        `Buyruqlar:\n/mybooks — Sizdagi kitoblar ro'yxati\n/help — Yo'riqnoma`
      );
      return NextResponse.json({ ok: true });
    }

    // 2. /mybooks buyrug'i
    if (text === '/mybooks') {
      const user = await prisma.user.findFirst({
        where: { telegram_chat_id: chatId },
        include: {
          borrow_records: {
            where: {
              status: { in: [BorrowStatus.BORROWED, BorrowStatus.OVERDUE] },
            },
            include: { book: true },
          },
        },
      });

      if (!user) {
        await sendTelegramMessage(
          chatId,
          `⚠️ Sizning Telegram hisobingiz hali Kitobxon tizimiga ulanmagan.\n\n` +
          `Sizning Chat ID: <code>${chatId}</code>.\n` +
          `🌐 ${webLink}`
        );
        return NextResponse.json({ ok: true });
      }

      if (user.borrow_records.length === 0) {
        await sendTelegramMessage(
          chatId,
          `📚 <b>${user.full_name}</b>, sizda hozircha olingan faol kitoblar yo'q.\n\n` +
          `Yangi kitoblar qidirish uchun:\n` +
          `🌐 ${webLink}`
        );
        return NextResponse.json({ ok: true });
      }

      let msg = `📖 <b>${user.full_name} — Sizdagi kitoblar:</b>\n\n`;
      const now = new Date();

      user.borrow_records.forEach((r, idx) => {
        const deadline = new Date(r.deadline_at);
        const diffMs = deadline.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        const isOverdue = diffDays < 0;

        msg += `${idx + 1}. <b>${r.book.title}</b> (Kodi: <code>${r.book.code}</code>)\n`;
        msg += `   Topshirish muddati: ${deadline.toLocaleDateString('uz-UZ')}\n`;
        if (isOverdue) {
          msg += `   ⚠️ <b>MUDDATI O'TGAN! (${Math.abs(diffDays)} kun kechikdi)</b>\n\n`;
        } else {
          msg += `   ⏳ Qolgan muddat: ${diffDays} kun\n\n`;
        }
      });

      msg += `🌐 ${webLink}`;

      await sendTelegramMessage(chatId, msg);
      return NextResponse.json({ ok: true });
    }

    // 3. /help buyrug'i
    if (text === '/help') {
      await sendTelegramMessage(
        chatId,
        `ℹ️ <b>Kitobxon (@kitobxon_rasmiy_bot) Boti Yordami:</b>\n\n` +
        `Ushbu bot orqali siz:\n` +
        `• Olingan kitoblar qaytarish muddatini kuzatishingiz;\n` +
        `• Qaytarish muddati yaqinlashganda va o'tib ketganda ogohlantirish xabarlarini olishingiz;\n` +
        `• Siz kutayotgan kitob navbati kelganda zudlik bilan xabardor bo'lishingiz mumkin.\n\n` +
        `🌐 ${webLink}\n\n` +
        `Sizning Chat ID: <code>${chatId}</code>`
      );
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Bot webhook xatosi:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
