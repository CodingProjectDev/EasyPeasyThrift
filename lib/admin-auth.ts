import crypto from 'crypto';

export const ADMIN_COOKIE = 'easypeasy_admin_session';

function secret() {
  const configured = process.env.ADMIN_SESSION_SECRET;
  if (configured) return configured;
  if (process.env.NODE_ENV !== 'production') return 'easypeasy-dev-session-secret-change-me';
  throw new Error('ADMIN_SESSION_SECRET is required in production');
}

export function createAdminToken(email: string) {
  const payload = Buffer.from(JSON.stringify({ email, exp: Date.now() + 1000 * 60 * 60 * 12 })).toString('base64url');
  const sig = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyAdminToken(token?: string | null) {
  if (!token) return false;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;

  try {
    const expected = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;

    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { exp?: number };
    return typeof decoded.exp === 'number' && decoded.exp > Date.now();
  } catch {
    return false;
  }
}

export function adminCredentials() {
  const email = process.env.ADMIN_EMAIL || (process.env.NODE_ENV !== 'production' ? 'admin@easypeasy.local' : '');
  const password = process.env.ADMIN_PASSWORD || (process.env.NODE_ENV !== 'production' ? 'easypeasy-demo' : '');
  return { email, password };
}
