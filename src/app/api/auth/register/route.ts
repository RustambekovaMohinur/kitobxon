import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { hashPassword, signToken, AUTH_COOKIE_NAME } from '@/lib/auth';
import { registerSchema } from '@/lib/validation';
import { Role } from '@prisma/client';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Ma'lumotlar noto'g'ri to'ldirilgan" },
        { status: 400 }
      );
    }

    const { full_name, library_id, class_name, login, password } = validation.data;

    // Kutubxona mavjudligini tekshirish
    const library = await prisma.library.findUnique({
      where: { id: library_id },
    });

    if (!library) {
      return NextResponse.json(
        { error: "Tanlangan maktab yoki kutubxona topilmadi" },
        { status: 404 }
      );
    }

    // Login band emasligini tekshirish
    const existingUser = await prisma.user.findUnique({
      where: { login },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Ushbu login band. Boshqa login tanlang." },
        { status: 409 }
      );
    }

    const password_hash = await hashPassword(password);
    const linkCode = `MUTOLAA-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const newUser = await prisma.user.create({
      data: {
        full_name,
        library_id,
        class_name: class_name || 'Kitobxon',
        login,
        password_hash,
        role: Role.STUDENT,
        telegram_link_code: linkCode,
      },
    });

    const token = await signToken({
      userId: newUser.id,
      role: newUser.role,
      libraryId: newUser.library_id,
      login: newUser.login,
    });

    const response = NextResponse.json({
      success: true,
      message: "Ro'yxatdan muvaffaqiyatli o'tdingiz!",
      user: {
        id: newUser.id,
        full_name: newUser.full_name,
        login: newUser.login,
        role: newUser.role,
        class_name: newUser.class_name,
        library_name: library.name,
      },
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: any) {
    console.error('Ro\'yxatdan o\'tish xatosi:', error);
    return NextResponse.json(
      { error: "Ro'yxatdan o'tishda xatolik yuz berdi" },
      { status: 500 }
    );
  }
}
