import fs from 'fs';
import path from 'path';

// .env va .env.local fayllarini ishonchli yuklash
function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const filePath = path.resolve(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      try {
        if (typeof (process as any).loadEnvFile === 'function') {
          (process as any).loadEnvFile(filePath);
        } else {
          const content = fs.readFileSync(filePath, 'utf-8');
          for (const line of content.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const eqIdx = trimmed.indexOf('=');
            if (eqIdx !== -1) {
              const key = trimmed.slice(0, eqIdx).trim();
              let val = trimmed.slice(eqIdx + 1).trim();
              if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.slice(1, -1);
              }
              if (!process.env[key]) {
                process.env[key] = val;
              }
            }
          }
        }
      } catch (err) {
        // Ignored
      }
    }
  }
}

loadEnv();

import { Telegraf } from 'telegraf';
import prisma from '../src/lib/db';
import { BorrowStatus, BookStatus } from '@prisma/client';
import { recommendBooksWithGemini } from '../src/lib/gemini';

function getWebsiteLinkHtml(): string {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL)?.trim();
  if (appUrl) {
    return `<a href="${appUrl}">Saytimizga tashrif buyurish uchun bosing</a>`;
  }
  return `Saytimizga tashrif buyurish`;
}

const token = process.env.TELEGRAM_BOT_TOKEN?.trim();

if (!token || token.includes('ABCdefGhIJKlmNoPQRsTUVwxyZ') || token.startsWith('123456789:')) {
  console.log('================================================================');
  console.log('⚠️  TELEGRAM_BOT_TOKEN belgilanmagan yoki demo qiymatda turibdi!');
  console.log('----------------------------------------------------------------');
  console.log('Telegram botni jonli ishga tushirish uchun:');
  console.log('1. Telegramda @BotFather ga kiring va yangi bot yarating.');
  console.log('2. Olingan HTTP API tokenni .env fayliga yozing:');
  console.log('   TELEGRAM_BOT_TOKEN="1234567890:AAxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"');
  console.log('3. So\'ng qaytadan buyruqni bering:');
  console.log('   npm run bot');
  console.log('================================================================');
  process.exit(0);
}

const bot = new Telegraf(token);

// Xatoliklarni ushlab qolish (bot to'xtab qolmasligi uchun)
bot.catch((err: any, ctx) => {
  console.error(`⚠️ [Bot Xatoligi - ${ctx?.updateType}]:`, err?.message || err);
});

// Barcha kiruvchi xabarlarni log qilish
bot.use(async (ctx, next) => {
  const user = ctx.from?.username ? `@${ctx.from.username}` : (ctx.from?.first_name || 'Noma\'lum');
  const text = (ctx.message as any)?.text || '';
  console.log(`📩 [Telegram Yangilanish] ${new Date().toLocaleTimeString('uz-UZ')} | Foydalanuvchi: ${user} (ID: ${ctx.chat?.id}) | Buyruq: "${text}"`);
  return next();
});

// /start komandasi
bot.start(async (ctx) => {
  try {
    const chatId = String(ctx.chat.id);
    const text = ctx.message.text || '';
    const parts = text.split(' ');
    const code = parts[1]?.trim();
    const firstName = ctx.from.first_name || 'Kitobxon';
    const webLink = getWebsiteLinkHtml();

    if (code) {
      const user = await prisma.user.findFirst({
        where: { telegram_link_code: code },
        include: { library: true },
      });

      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { telegram_chat_id: chatId },
        });

        return await ctx.replyWithHTML(
          `🎉 <b>Assalomu alaykum, ${user.full_name}!</b>\n\n` +
          `Sizning <b>Kitobxon</b> profilingiz (${user.library?.name || 'Kutubxona'}) ushbu @kitobxon_rasmiy_bot rasmiy botiga muvaffaqiyatli bog'landi!\n\n` +
          `🔔 <i>Endi olingan kitoblar muddati, kechikish ogohlantirishlari va navbatdagi kitoblar haqida barcha xabarnomalar shu yerga keladi.</i>\n\n` +
          `🌐 ${webLink}\n\n` +
          `Buyruqlar:\n/mybooks — Olingan kitoblar holatini ko'rish\n/help — Yordam`
        );
      } else {
        return await ctx.replyWithHTML(
          `❌ <b>Kod topilmadi!</b>\nKiritilgan bog'lash kodi (<code>${code}</code>) eskirgan yoki mavjud emas. Profilingizdan qaytadan kod oling.\n\n🌐 ${webLink}`
        );
      }
    }

    return await ctx.replyWithHTML(
      `📚 <b>Assalomu alaykum, ${firstName}!</b>\n\n` +
      `<b>Kitobxon</b> (@kitobxon_rasmiy_bot) — Maktab va jamoat kutubxonalari uchun yagona raqamli tizimining rasmiy botiga xush kelibsiz!\n\n` +
      `🆔 Sizning Telegram Chat ID: <code>${chatId}</code>\n\n` +
      `Hisobingizni bog'lash uchun:\n` +
      `1. ${webLink}\n` +
      `2. "Mening kitoblarim" sahifasidagi @kitobxon_rasmiy_bot tugmasini bosing yoki Chat ID raqamingizni kiriting.\n\n` +
      `Buyruqlar:\n/mybooks — Sizdagi kitoblar ro'yxati\n/help — Yo'riqnoma`
    );
  } catch (err: any) {
    console.error('Xatolik /start da:', err);
    await ctx.reply('Xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
  }
});

// /mybooks komandasi
bot.command('mybooks', async (ctx) => {
  try {
    const chatId = String(ctx.chat.id);
    const webLink = getWebsiteLinkHtml();

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
      return await ctx.replyWithHTML(
        `⚠️ Sizning Telegram hisobingiz hali Kitobxon tizimiga ulanmagan.\n\n` +
        `Sizning Chat ID: <code>${chatId}</code>.\n` +
        `🌐 ${webLink}`
      );
    }

    if (user.borrow_records.length === 0) {
      return await ctx.replyWithHTML(
        `📚 <b>${user.full_name}</b>, sizda hozircha olingan faol kitoblar yo'q.\n\n` +
        `Yangi kitoblar qidirish uchun:\n` +
        `🌐 ${webLink}`
      );
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

    return await ctx.replyWithHTML(msg);
  } catch (err: any) {
    console.error('Xatolik /mybooks da:', err);
    await ctx.reply('Kitoblar ro\'yxatini olishda xatolik yuz berdi.');
  }
});

// /tavsiya komandasi (AI Kitob Maslahatchisi)
bot.command('tavsiya', async (ctx) => {
  try {
    const chatId = String(ctx.chat.id);
    const text = (ctx.message as any)?.text || '';
    const parts = text.split(' ');
    const userQuery = parts.slice(1).join(' ').trim();
    const webLink = getWebsiteLinkHtml();

    const user = await prisma.user.findFirst({
      where: { telegram_chat_id: chatId },
    });

    let libraryId = user?.library_id;
    if (!libraryId) {
      const activeLib = await prisma.library.findFirst({
        where: { status: 'ACTIVE' },
        orderBy: { created_at: 'asc' },
      });
      libraryId = activeLib?.id;
    }

    const availableBooks = libraryId
      ? await prisma.book.findMany({
          where: {
            library_id: libraryId,
            status: BookStatus.AVAILABLE,
          },
          select: { code: true, title: true, author: true, category: true },
          take: 50,
        })
      : [];

    if (availableBooks.length === 0) {
      return await ctx.replyWithHTML(
        `📚 Hozirda kutubxonada tavsiya qilish uchun bo'sh kitoblar mavjud emas.\n\n🌐 ${webLink}`
      );
    }

    await ctx.replyWithHTML(`⏳ <i>AI kutubxonadagi mavjud kitoblar orasidan siz uchun eng yaxshilarini tanlamoqda...</i>`);

    const recs = await recommendBooksWithGemini(
      userQuery || 'Menga eng sara va qiziqarli kitoblardan tavsiya bering',
      availableBooks
    );

    let msg = `✨ <b>Kitobxon AI — Siz uchun kitob tavsiyalari:</b>\n\n`;
    if (recs.length === 0) {
      const first = availableBooks[0];
      msg += `1. 📖 <b>${first.title}</b> — <i>${first.author}</i>\n`;
      msg += `   🔖 Kodi: <code>${first.code}</code>\n`;
      msg += `   💡 <i>Kutubxonamizdagi sara asarlardan biri.</i>\n\n`;
    } else {
      recs.forEach((r, idx) => {
        msg += `${idx + 1}. 📖 <b>${r.title}</b> — <i>${r.author}</i>\n`;
        msg += `   🔖 Kodi: <code>${r.code}</code>\n`;
        msg += `   💡 <i>${r.pitch}</i>\n\n`;
      });
    }

    msg += `Kitoblarni band qilish yoki batafsil ko'rish:\n🌐 ${webLink}`;
    return await ctx.replyWithHTML(msg);
  } catch (err: any) {
    console.error('Xatolik /tavsiya da:', err);
    await ctx.reply('AI tavsiyasini tayyorlashda xatolik yuz berdi.');
  }
});

// /help komandasi
bot.command('help', async (ctx) => {
  try {
    const webLink = getWebsiteLinkHtml();
    return await ctx.replyWithHTML(
      `ℹ️ <b>Kitobxon (@kitobxon_rasmiy_bot) Boti Yordami:</b>\n\n` +
      `Ushbu bot orqali siz:\n` +
      `• /mybooks — Olingan kitoblar qaytarish muddatini kuzatish\n` +
      `• /tavsiya [qiziqish] — Kutubxonadagi mavjud kitoblardan AI tavsiyasini olish\n` +
      `• Qaytarish muddati yaqinlashganda va o'tib ketganda ogohlantirish xabarlarini olish\n` +
      `• Siz kutayotgan kitob navbati kelganda zudlik bilan xabardor bo'lish\n\n` +
      `🌐 ${webLink}\n\n` +
      `Sizning Chat ID: <code>${ctx.chat.id}</code>`
    );
  } catch (err: any) {
    console.error('Xatolik /help da:', err);
    await ctx.reply('Yordam ma\'lumotini olishda xatolik yuz berdi.');
  }
});

async function start() {
  try {
    console.log('🤖 Telegram serveri bilan bog\'lanmoqda...');
    const botInfo = await bot.telegram.getMe();
    console.log('================================================================');
    console.log('✅ Kitobxon Telegram boti muvaffaqiyatli ulandi!');
    console.log(`👤 Bot nomi:      ${botInfo.first_name}`);
    console.log(`🔗 Bot username:  @${botInfo.username}`);
    console.log(`🌐 Sayt havolasi: ${process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || '(sozlanmagan)'}`);
    console.log('📡 Polling rejimi ishga tushirildi — yangi xabarlar qabul qilinmoqda...');
    console.log('----------------------------------------------------------------');
    console.log('💡 Test qilish uchun Telegram orqali bering:');
    console.log('   /start   — Botni boshlash va Chat ID olish');
    console.log('   /mybooks — Olingan kitoblarni tekshirish');
    console.log('   /help    — Bot imkoniyatlari bilan tanishish');
    console.log('================================================================');

    console.log('🔄 Telegram webhook holati tozalanmoqda (polling rejimini sozlash)...');
    try {
      await bot.telegram.deleteWebhook({ drop_pending_updates: false });
      console.log('✅ Webhook tozalandi, pollingga to\'siq yo\'q.');
    } catch (e: any) {
      console.warn('⚠️ deleteWebhook ogohlantirishi:', e.message);
    }

    await bot.launch();
  } catch (err: any) {
    console.error('❌ Botni ishga tushirishda xatolik:');
    console.error(err.message || err);
    if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
      console.error('👉 Iltimos, .env faylidagi TELEGRAM_BOT_TOKEN to\'g\'ri ekanligini tekshiring.');
    }
    process.exit(1);
  }
}

start();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
