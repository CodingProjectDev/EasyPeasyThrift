import { randomUUID } from 'crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  ADMIN_COOKIE,
  verifyAdminToken,
} from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

const MAX_BYTES = 5 * 1024 * 1024;

const CONTENT_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

async function requireAdmin() {
  const cookieStore = await cookies();

  return verifyAdminToken(
    cookieStore.get(ADMIN_COOKIE)?.value,
  );
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json(
      { error: 'Admin login required.' },
      { status: 401 },
    );
  }

  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json(
      {
        error:
          'Supabase server configuration is missing.',
      },
      { status: 503 },
    );
  }

  try {
    const form = await req.formData();
    const file = form.get('file');
    const kind =
      String(form.get('kind') || 'asset') === 'qr'
        ? 'qr'
        : 'logo';

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'Image file is required.' },
        { status: 400 },
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        {
          error:
            'Image is too large. Maximum size is 5 MB.',
        },
        { status: 400 },
      );
    }

    const extension =
      CONTENT_TYPES[file.type];

    if (!extension) {
      return NextResponse.json(
        {
          error:
            'Use a JPG, PNG, or WEBP image.',
        },
        { status: 400 },
      );
    }

    const path =
      `store-assets/${kind}-${Date.now()}-${randomUUID()}.${extension}`;

    const buffer = Buffer.from(
      await file.arrayBuffer(),
    );

    const { error } = await supabase.storage
      .from('product-images')
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
        cacheControl: '3600',
      });

    if (error) {
      return NextResponse.json(
        {
          error: `Image upload failed: ${error.message}`,
        },
        { status: 500 },
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage
      .from('product-images')
      .getPublicUrl(path);

    return NextResponse.json({
      success: true,
      path,
      url: publicUrl,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Image upload failed.',
      },
      { status: 500 },
    );
  }
}
