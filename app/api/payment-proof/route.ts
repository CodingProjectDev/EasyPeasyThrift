import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

function extensionFor(type: string) {
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  return 'jpg';
}

export async function POST(req: Request) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json(
      { error: 'Supabase server configuration is missing.' },
      { status: 503 },
    );
  }

  const authorization = req.headers.get('authorization');
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice(7)
    : null;

  if (!token) {
    return NextResponse.json(
      { error: 'Please login before uploading payment proof.' },
      { status: 401 },
    );
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Your login session has expired. Please login again.' },
      { status: 401 },
    );
  }

  const data = await req.formData();
  const file = data.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Payment proof image is required.' }, { status: 400 });
  }

  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: 'Use a JPG, PNG, or WEBP image for payment proof.' },
      { status: 400 },
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: 'Payment proof must be 5 MB or smaller.' },
      { status: 400 },
    );
  }

  const ext = extensionFor(file.type);
  const path = `${user.id}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from('payment-proofs')
    .upload(path, bytes, {
      contentType: file.type,
      upsert: false,
      cacheControl: '3600',
    });

  if (error) {
    return NextResponse.json(
      { error: `Payment proof upload failed: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ path });
}
