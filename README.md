# Kitobxon — Maktab va Xalq Kutubxonalari Uchun Yagona Raqamli Tizim

**Kitobxon** — O'zbekiston umumta'lim maktablari, ixtisoslashtirilgan maktablar va jamoat kutubxonalari uchun yaratilgan innovatsion boshqaruv va kitobxonlik portali. Tizim qalam bilan yozilgan kitob raqamlari (masalan, `KTB-001`) bo'yicha tezkor qidiruv, avtomatlashtirilgan navbat mexanizmi va Telegram bot (@kitobxon_rasmiy_bot) orqali muddati o'tgan kitoblar bo'yicha ota-onalar va o'quvchilarga avto-ogohlantirish yuborish imkoniyatini taqdim etadi.

---

## 🔑 Yagona Super Admin Hisobi (Boshlang'ich Kirish)

Baza toza holatda bo'lib, unda hech qanday namunaviy kitob, o'quvchi yoki kutubxona mavjud emas. Tizimga birinchi bo'lib **Super Admin** sifatida kirasiz va maktab/kutubxona hamda kutubxonachilarni o'zingiz bosqichma-bosqich qo'shasiz:

| Rol | Login | Parol | F.I.SH | Kirish Manzili |
|---|---|---|---|---|
| **Super Admin** | `mohi_admin` | `AdminPass2026!` | Bosh Administrator | `http://localhost:3000/login` |

---

## 🚀 Asosiy Imkoniyatlar va Rollar

### 1. 🛡 Super Admin (Platforma Egasi) — `/super-admin`
- **Muassasalar To'liq CRUD boshqaruvi:** Maktab va kutubxona muassasalarini yaratish, tahrirlash (`PATCH`) va o'chirish (`DELETE`).
- **Kutubxonachilarni biriktirish va boshqarish:** Har bir kutubxona uchun mas'ul kutubxonachi akkauntlarini (login + parol) yaratish, ko'rish va o'chirish (`DELETE`).
- **Tizim statistikasi:** Jami kutubxonalar, umumiy kitob fondi, faol qarzlar va muddati o'tgan kitoblar soni.
- **Tizim bo'yicha Telegram audit:** Barcha maktablardagi muddati o'tgan kitoblar bo'yicha yagona tugma orqali audit o'tkazish.

### 2. 📚 Kutubxonachi (Librarian) — `/librarian`
*(Faqat o'ziga biriktirilgan kutubxona ma'lumotlari bilan ishlaydi — server darajasida qat'iy himoyalangan)*
- **Kitob berish (Chiqim):** Mavjud bo'sh kitobni tanlash, ro'yxatdagi o'quvchini biriktirish, sinfini belgilash, ota-onasining Telegram ID sini kiritish va qaytarish muddatini belgilash (7, 14, 30, 60 kun). Barchasi `prisma.$transaction` orqali xavfsiz bajariladi.
- **O'quvchilar Boshqaruvi:** O'z kutubxonasiga yangi o'quvchilarni to'g'ridan-to'g'ri ro'yxatga olish, mavjud o'quvchilar ma'lumotlarini (sinf, Telegram ID) tahrirlash va o'chirish.
- **Kitoblar va Tezkor Qidiruv:** Qalam kodi (`KTB-101`), nomi va muallifi bo'yicha yangi kitoblar qo'shish va holatini bir zumda ko'rish.
- **Kitobni qabul qilib olish (Kirim):** Bir marta bosish orqali qabul qilib olinadi. Agar ushbu kitob uchun navbatda o'quvchi kutayotgan bo'lsa:
  - Kitob darhol navbatdagi 1-o'rindagi o'quvchi uchun 24 soatga bron qilinadi (`RESERVED`).
  - Telegram bot (@kitobxon_rasmiy_bot) orqali o'quvchi/ota-onaga xushxabar xabarnomasi jo'natiladi.
- **Muddati o'tganlarni nazorat qilish:** Topshirish muddatidan o'tgan kitoblarni aniq kechikish kunlari bilan ko'rish va Telegram orqali ogohlantirish yuborish.

### 3. 🎓 O'quvchi / Kitobxon (Student) — `/books`, `/books/[id]`, `/my-books`
- **Ro'yxatdan o'tish & Kirish:** O'z maktabini tanlab mustaqil hisob yaratishi yoki kutubxonachi tomonidan ro'yxatga olinishi mumkin.
- **Rolga mos Katalog (`/books`):**
  - O'quvchilar uchun: "Bron qilish" (bo'sh kitoblar) va "Navbatga yozilish" (band kitoblar) tugmalari chiqadi.
  - Kutubxonachi va Super Admin uchun: bu tugmalar yashiriladi va faqat ma'lumotlar ko'rsatiladi.
- **Taqriz va Reyting:** O'qigan kitoblariga 1 dan 5 yulduzgacha baho va XSS dan tozalangan sharh qoldirish.
- **Mening kitoblarim:** Qo'lidagi kitoblar, qolgan muddat taymeri, navbatlar va Telegram (@kitobxon_rasmiy_bot) bog'lash.

### 4. 🤖 Telegram Bot Tizimi (`@kitobxon_rasmiy_bot`)
- Deep-link (`https://t.me/kitobxon_rasmiy_bot?start=<code>`) orqali Telegram profilni Kitobxon hisobiga biriktiradi.
- `/mybooks` buyrug'i orqali olingan kitoblar va ularning topshirish muddatini ko'rsatadi.
- Muddati o'tgan kitoblar bo'yicha to'liq o'zbek tilidagi rasmiy ogohlantirish xabarnomalarini jo'natadi.

---

## 🛠 Texnologiyalar To'plami

- **Frontend & Backend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide Icons.
- **Ma'lumotlar bazasi & ORM:** PostgreSQL (Neon DB), Prisma ORM (`prisma/schema.prisma`).
- **Autentifikatsiya & Xavfsizlik:** `jose` (JWT) bilan xavfsiz `httpOnly` cookie sessiyalari, `bcryptjs` parol xeshlash, Zod validatsiyasi, tranzaksiyalar (`prisma.$transaction`).
- **Telegram Bot:** Telegraf runner `npm run bot` + Webhook API (@kitobxon_rasmiy_bot).

---

## ⚙️ Ishga Tushirish va Sinash Buyruqlari

### 1. Bazani tozalash va yagona Super Admin hisobini yaratish:
```bash
npx prisma db push
npm run seed
```

### 2. Dasturni ishga tushirish (Veb ilova):
```bash
npm run dev
# Brauzerda oching: http://localhost:3000
```

### 3. Telegram Botni ishga tushirish:
`.env` faylida o'zingizning bot tokeningizni ko'rsatib, quyidagi buyruqni alohida terminalda bajaring:
```bash
npm run bot
```
