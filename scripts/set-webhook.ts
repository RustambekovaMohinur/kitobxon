import fs from 'fs';
import path from 'path';

// .env va .env.local fayllarini yuklash
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

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();

  if (!token || token.includes('ABCdefGhIJKlmNoPQRsTUVwxyZ') || token.startsWith('123456789:')) {
    console.error('❌ Xatolik: .env faylida TELEGRAM_BOT_TOKEN belgilanmagan yoki demo qiymatda!');
    console.error('Iltimos, @BotFather dan olingan haqiqiy bot tokenini .env fayliga kiriting.');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const isDelete = args.includes('--delete') || args.includes('-d');

  if (isDelete) {
    console.log('🔄 Webhook o\'chirilmoqda (polling rejimiga qaytish uchun)...');
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook?drop_pending_updates=true`);
      const data = await res.json();
      if (data.ok) {
        console.log('✅ Webhook muvaffaqiyatli o\'chirildi!');
        console.log('Endi bemalol `npm run bot` orqali lokal polling rejimida ishlatishingiz mumkin.');
      } else {
        console.error('❌ Xatolik:', data.description);
      }
    } catch (e: any) {
      console.error('❌ Tarmoq xatosi:', e.message);
    }
    return;
  }

  // Webhook URL ni aniqlash
  let baseUrl = args.find((a) => a.startsWith('http://') || a.startsWith('https://')) ||
    (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL)?.trim();

  if (!baseUrl || baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
    console.log('================================================================');
    console.log('⚠️  Diqqat: Telegram Webhook uchun ommaviy HTTPS domen kerak!');
    console.log('Localhost manzillarni Telegram qabul qilmaydi.');
    console.log('');
    console.log('Vercel yoki serveringiz domenini quyidagicha uzating:');
    console.log('  npm run bot:webhook https://sizning-loyihangiz.vercel.app');
    console.log('yoki .env faylida NEXT_PUBLIC_APP_URL ga https domen yozing.');
    console.log('================================================================');
    process.exit(1);
  }

  const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
  const webhookUrl = `${cleanBaseUrl}/api/telegram/webhook`;

  console.log(`🌐 Webhook manzili sozlanmoqda: ${webhookUrl}`);

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query'],
        drop_pending_updates: false,
      }),
    });

    const data = await res.json();
    if (data.ok) {
      console.log('================================================================');
      console.log('✅ Webhook muvaffaqiyatli ro\'yxatdan o\'tkazildi!');
      console.log(`🔗 Webhook URL: ${webhookUrl}`);
      console.log('🚀 Endi Vercel serverless muhitida bot uzluksiz ishlaydi.');
      console.log('================================================================');
    } else {
      console.error('❌ Telegram API xatosi:', data.description);
    }

    // Webhook ma'lumotlarini tekshirish
    const infoRes = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    const infoData = await infoRes.json();
    if (infoData.ok) {
      console.log('📊 Joriy Webhook holati:');
      console.log('   URL:', infoData.result.url || '(yo\'q)');
      console.log('   Kutilayotgan yangilanishlar soni:', infoData.result.pending_update_count);
      if (infoData.result.last_error_message) {
        console.log('   Oxirgi xatolik:', infoData.result.last_error_message);
      }
    }
  } catch (e: any) {
    console.error('❌ So\'rov yuborishda xatolik:', e.message);
  }
}

main();
