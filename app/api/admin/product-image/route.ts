import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, verifyAdminToken } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

function safeExtension(type: string) {
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  return 'jpg';
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  if (!verifyAdminToken(cookieStore.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: 'Admin login required.' }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Please choose a product image.' }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: 'Use JPG, PNG, or WEBP. HEIC is converted automatically before upload.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Processed image is too large. Please use an image under 8 MB.' }, { status: 400 });
  }

  const ext = safeExtension(file.type);
  const filename = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const supabase = getSupabaseAdmin();
  if (supabase) {
    const storagePath = `products/${new Date().toISOString().slice(0, 10)}/${filename}`;
    const { error } = await supabase.storage.from('product-images').upload(storagePath, bytes, {
      contentType: file.type,
      upsert: false,
      cacheControl: '31536000',
    });

    if (error) {
      return NextResponse.json({ error: `Supabase image upload failed: ${error.message}` }, { status: 500 });
    }

    const { data } = supabase.storage.from('product-images').getPublicUrl(storagePath);
    return NextResponse.json({ url: data.publicUrl, storage: 'supabase' });
  }

  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Product image storage is not configured. Connect Supabase Storage before deploying to Vercel.' },
      { status: 503 },
    );
  }

  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), bytes);

  return NextResponse.json({ url: `/uploads/${filename}`, storage: 'local' });
}
