import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, adminCredentials, createAdminToken } from '@/lib/admin-auth';

export async function POST(req: Request) {
  const { email, password } = await req.json();
  const expected = adminCredentials();
  if (!expected.email || !expected.password) return NextResponse.json({ error: 'Admin credentials are not configured on this deployment.' }, { status: 503 });
  if (email !== expected.email || password !== expected.password) return NextResponse.json({ error: 'Invalid admin email or password.' }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, createAdminToken(email), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 12 });
  return res;
}
