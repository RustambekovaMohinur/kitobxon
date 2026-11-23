import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser, hashPassword } from '@/lib/auth';
import { Role } from '@prisma/client';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== Role.LIBRARIAN && user.role !== Role.SUPER_ADMIN)) {
      return NextResponse.json({ error: "Ruxsat etilmagan" }, { status: 403 });
    }

    const libraryId = user.library_id || (await prisma.library.findFirst({ where: { status: 'ACTIVE' } }))?.id;
    if (!libraryId) {
      return NextResponse.json({ students: [] });
    }

    const students = await prisma.user.findMany({
      where: {
        library_id: libraryId,
        role: Role.STUDENT,
      },
      select: {
        id: true,
        full_name: true,
        login: true,
        class_name: true,
        telegram_chat_id: true,
        telegram_link_code: true,
        created_at: true,
        _count: {
          select: {
            borrow_records: {
              where: {
                status: { in: ['BORROWED', 'OVERDUE'] },
              },
            },
          },
        },
      },
      orderBy: { full_name: 'asc' },
    });

    return NextResponse.json({ students });
  } catch (error: any) {
    console.error('O\'quvchilarni olish xatosi:', error);
    return NextResponse.json({ error: "O'quvchilar ro'yxatini yuklab bo'lmadi" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== Role.LIBRARIAN && user.role !== Role.SUPER_ADMIN)) {
      return NextResponse.json({ error: "Ruxsat etilmagan" }, { status: 403 });
    }

    const libraryId = user.library_id || (await prisma.library.findFirst({ where: { status: 'ACTIVE' } }))?.id;
    if (!libraryId) {
      return NextResponse.json({ error: "Faol kutubxona topilmadi" }, { status: 400 });
    }

    const body = await req.json();
    const { full_name, class_name, login, password, telegram_chat_id } = body;

    if (!full_name || !full_name.trim() || !login || !login.trim()) {
      return NextResponse.json({ error: "Ism-familiya va login kiritilishi shart" }, { status: 400 });
    }

    const cleanLogin = login.trim().toLowerCase();

    // Login band emasligini tekshirish
    const existing = await prisma.user.findUnique({
      where: { login: cleanLogin },
    });

    if (existing) {
      return NextResponse.json({ error: `Ushbu '${cleanLogin}' logini allaqachon band` }, { status: 409 });
    }

    const rawPass = password && password.trim() ? password.trim() : 'talaba123';
    const passwordHash = await hashPassword(rawPass);
    const linkCode = `MUTOLAA-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const newStudent = await prisma.user.create({
      data: {
        full_name: full_name.trim(),
        class_name: class_name && class_name.trim() ? class_name.trim() : 'Kitobxon',
        login: cleanLogin,
        password_hash: passwordHash,
        role: Role.STUDENT,
        library_id: libraryId,
        telegram_chat_id: telegram_chat_id && telegram_chat_id.trim() ? telegram_chat_id.trim() : null,
        telegram_link_code: linkCode,
      },
    });

    return NextResponse.json({
      success: true,
      message: `'${newStudent.full_name}' o'quvchi sifatida muvaffaqiyatli ro'yxatga olindi`,
      student: newStudent,
    }, { status: 201 });
  } catch (error: any) {
    console.error('O\'quvchi qo\'shish xatosi:', error);
    return NextResponse.json({ error: "O'quvchi qo'shishda xatolik yuz berdi" }, { status: 500 });
  }
}
