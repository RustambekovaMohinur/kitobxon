import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import prisma from './db';
import { Role } from '@prisma/client';

const JWT_SECRET_STRING = process.env.JWT_SECRET || 'mutolaaid_production_jwt_secret_key_secure_2026_salt_dev';
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);
export const AUTH_COOKIE_NAME = 'mutolaaid_session';

export interface SessionPayload {
  userId: string;
  role: Role;
  libraryId?: string | null;
  login: string;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch (error) {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Returns the currently authenticated user directly from the database,
 * ensuring role and library_id are 100% verified server-side.
 */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session?.userId) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        library: true,
      },
    });

    if (!user) return null;

    // Password hash should not be exposed
    const { password_hash, ...safeUser } = user;
    return safeUser;
  } catch (error) {
    console.error('getCurrentUser xatosi:', error);
    return null;
  }
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}

export async function requireRole(allowedRoles: Role[]) {
  const user = await requireAuth();
  if (!allowedRoles.includes(user.role)) {
    throw new Error('FORBIDDEN');
  }
  return user;
}

export async function requireSuperAdmin() {
  return requireRole([Role.SUPER_ADMIN]);
}

export async function requireLibrarian() {
  const user = await requireRole([Role.LIBRARIAN]);
  if (!user.library_id) {
    throw new Error('LIBRARIAN_HAS_NO_LIBRARY');
  }
  return user;
}

export async function requireStudent() {
  return requireRole([Role.STUDENT]);
}
