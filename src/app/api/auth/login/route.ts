import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyPassword, signToken, AUTH_COOKIE_NAME } from '@/lib/auth';
import { loginSchema } from '@/lib/validation';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Noto'g'ri ma'lumotlar kiritildi" },
        { status: 400 }
      );
    }

    const { login, password } = validation.data;

    const user = await prisma.user.findUnique({
      where: { login },
      include: { library: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Login yoki parol noto'g'ri" },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Login yoki parol noto'g'ri" },
        { status: 401 }
      );
    }

    // Role bo'yicha yo'naltirish
    let redirectUrl = '/books';
    if (user.role === 'SUPER_ADMIN') {
      redirectUrl = '/super-admin';
    } else if (user.role === 'LIBRARIAN') {
      redirectUrl = '/librarian';
    } else if (user.role === 'STUDENT') {
      redirectUrl = '/my-books';
    }

    const token = await signToken({
      userId: user.id,
      role: user.role,
      libraryId: user.library_id,
      login: user.login,
    });

    const response = NextResponse.json({
      success: true,
      redirectUrl,
      user: {
        id: user.id,
        full_name: user.full_name,
        login: user.login,
        role: user.role,
        library_id: user.library_id,
        library_name: user.library?.name,
      },
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 kun
    });

    return response;
  } catch (error: any) {
    console.error('Login xatosi:', error);
    return NextResponse.json(
      { error: "Tizimda xatolik yuz berdi. Qayta urinib ko'ring." },
      { status: 500 }
    );
  }
}
