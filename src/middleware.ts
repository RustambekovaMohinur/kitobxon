import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET_STRING = process.env.JWT_SECRET || 'mutolaaid_production_jwt_secret_key_secure_2026_salt_dev';
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);
const AUTH_COOKIE_NAME = 'mutolaaid_session';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isSuperAdminRoute = pathname.startsWith('/super-admin');
  const isLibrarianRoute = pathname.startsWith('/librarian');
  const isStudentRoute = pathname.startsWith('/my-books');

  if (!isSuperAdminRoute && !isLibrarianRoute && !isStudentRoute) {
    return NextResponse.next();
  }

  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const role = payload.role as string;

    if (isSuperAdminRoute && role !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/books', req.url));
    }

    if (isLibrarianRoute && role !== 'LIBRARIAN' && role !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/books', req.url));
    }

    return NextResponse.next();
  } catch (error) {
    const loginUrl = new URL('/login', req.url);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ['/super-admin/:path*', '/librarian/:path*', '/my-books/:path*'],
};
