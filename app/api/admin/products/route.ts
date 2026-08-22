import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { ADMIN_COOKIE, verifyAdminToken } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isUuid, productFromRow } from '@/lib/product-db';
import { Product } from '@/lib/types';

export const runtime = 'nodejs';

async function requireAdmin() {
  const cookieStore = await cookies();
  return verifyAdminToken(cookieStore.get(ADMIN_COOKIE)?.value);
}

function makeRow(product: Product) {
  return {
    slug: product.slug,
    name: product.name,
    description: product.description || '',
    price: Number(product.price),
    compare_at: product.compareAt ?? null,
    category: product.category,
    size: product.size,
    condition: product.condition,
    brand: product.brand,
    measurements: product.measurements || {},
    images: product.images || [],
    inventory: Number(product.inventory || 0),
    one_of_one: Boolean(product.oneOfOne),
    new_arrival: Boolean(product.newArrival),
    vintage_find: Boolean(product.vintageFind),
    featured: Boolean(product.featured),
    active: true,
    tiktok_url: product.tiktokUrl || null,
  };
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Admin login required.' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Supabase server configuration is missing.' },
      { status: 503 },
    );
  }

  try {
    const body = await req.json();
    const product = body?.product as Product | undefined;

    if (
      !product ||
      !product.name?.trim() ||
      !product.slug?.trim() ||
      !product.category?.trim() ||
      !product.brand?.trim()
    ) {
      return NextResponse.json(
        { error: 'Product name, slug, category, and brand are required.' },
        { status: 400 },
      );
    }

    if (!Number.isFinite(Number(product.price)) || Number(product.price) < 0) {
      return NextResponse.json({ error: 'Enter a valid product price.' }, { status: 400 });
    }

    if (!Number.isInteger(Number(product.inventory)) || Number(product.inventory) < 0) {
      return NextResponse.json({ error: 'Enter a valid inventory amount.' }, { status: 400 });
    }

    const row = makeRow(product);

    let result;

    if (isUuid(product.id)) {
      result = await supabase
        .from('products')
        .upsert(
          {
            id: product.id,
            ...row,
          },
          { onConflict: 'id' },
        )
        .select('*')
        .single();
    } else {
      // Old local-only products used IDs such as custom-12345.
      // Upsert by slug so they receive a real Postgres UUID.
      result = await supabase
        .from('products')
        .upsert(row, { onConflict: 'slug' })
        .select('*')
        .single();
    }

    if (result.error) {
      return NextResponse.json(
        { error: `Could not save product: ${result.error.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ product: productFromRow(result.data) });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Could not save product.',
      },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Admin login required.' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Supabase server configuration is missing.' },
      { status: 503 },
    );
  }

  const id = new URL(req.url).searchParams.get('id') || '';

  // An old local-only ID never existed in Supabase, so deleting it locally is enough.
  if (!isUuid(id)) {
    return NextResponse.json({ success: true });
  }

  const { error } = await supabase.from('products').delete().eq('id', id);

  if (error) {
    return NextResponse.json(
      { error: `Could not delete product: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
