import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- MutolaaID: Bazani tozalash va yagona Super Admin yaratish ---');

  // 1. Barcha jadvallarni tozalash (hech qanday namunaviy kitob, o'quvchi yoki kutubxona qolmaydi)
  await prisma.bookFeedback.deleteMany();
  await prisma.bookQueue.deleteMany();
  await prisma.borrowRecord.deleteMany();
  await prisma.book.deleteMany();
  await prisma.user.deleteMany();
  await prisma.library.deleteMany();

  console.log('Barcha jadvallar tozalandi (bo\'sh baza).');

  // 2. Yagona Super Admin hisobini yaratish
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('AdminPass2026!', salt);

  const superAdmin = await prisma.user.create({
    data: {
      full_name: 'Bosh Administrator (Platforma Egasi)',
      login: 'mohi_admin',
      password_hash: passwordHash,
      role: Role.SUPER_ADMIN,
      telegram_link_code: 'SA-MOHI-2026',
    },
  });

  console.log('----------------------------------------------------');
  console.log('✅ Yagona Super Admin muvaffaqiyatli yaratildi:');
  console.log(`   Login:    ${superAdmin.login}`);
  console.log(`   Parol:    AdminPass2026!`);
  console.log(`   F.I.SH:   ${superAdmin.full_name}`);
  console.log(`   Rol:      ${superAdmin.role}`);
  console.log('----------------------------------------------------');
  console.log('Baza toza holatda: Kitoblar, o\'quvchilar va kutubxonalar mavjud emas.');
  console.log('Endi Super Admin orqali maktab/kutubxona va kutubxonachilarni o\'zingiz kiritasiz.');
}

main()
  .catch((e) => {
    console.error('Seed xatosi:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
