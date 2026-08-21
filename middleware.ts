import { NextRequest, NextResponse } from 'next/server';

const COOKIE = 'easypeasy_admin_session';

function b64urlToBytes(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(base64);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

async function validToken(token?: string) {
  if (!token) return false;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;
  const secret = process.env.ADMIN_SESSION_SECRET || (process.env.NODE_ENV !== 'production' ? 'easypeasy-dev-session-secret-change-me' : '');
  if (!secret) return false;
  try {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify('HMAC', key, b64urlToBytes(signature), new TextEncoder().encode(payload));
    if (!ok) return false;
    const data = JSON.parse(new TextDecoder().decode(b64urlToBytes(payload)));
    return typeof data.exp === 'number' && data.exp > Date.now();
  } catch { return false; }
}

export async function middleware(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith('/admin') || req.nextUrl.pathname === '/admin/login') return NextResponse.next();
  const token = req.cookies.get(COOKIE)?.value;
  if (await validToken(token)) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = '/admin/login';
  return NextResponse.redirect(url);
}

export const config = { matcher: ['/admin/:path*'] };
