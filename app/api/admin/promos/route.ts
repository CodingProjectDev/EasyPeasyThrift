import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { ADMIN_COOKIE, verifyAdminToken } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const cookieStore = await cookies();
  return verifyAdminToken(cookieStore.get(ADMIN_COOKIE)?.value);
}

function toClient(row: any) {
  return {
    id: String(row.id),
    code: String(row.code),
    type: String(row.discount_type),
    value: Number(row.value),
    expiresAt: String(row.expires_at),
    active: Boolean(row.active),
  };
}

function normalizeExpiry(value: unknown) {
  const raw = String(value || '').trim();
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const date = new Date(`${raw}T23:59:59.999Z`);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function validatePromo(body: any) {
  const code = String(body?.code || '').trim().toUpperCase();
  const type = String(body?.type || '');
  const value = Number(body?.value);
  const expiresAt = normalizeExpiry(body?.expiresAt);

  if (!code) return { error: 'Promo code is required.' } as const;
  if (!['percentage', 'fixed'].includes(type)) {
    return { error: 'Invalid discount type.' } as const;
  }
  if (!Number.isFinite(value) || value <= 0) {
    return { error: 'Discount value must be greater than 0.' } as const;
  }
  if (type === 'percentage' && value > 100) {
    return { error: 'Percentage discount cannot exceed 100%.' } as const;
  }
  if (!expiresAt) return { error: 'A valid expiration date is required.' } as const;

  return { code, type, value, expiresAt } as const;
}

export async function GET() {
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

  const { data, error } = await supabase
    .from('promo_codes')
    .select('id,code,discount_type,value,expires_at,active,created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: `Could not load promo codes: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { promos: (data || []).map(toClient) },
    { headers: { 'Cache-Control': 'no-store' } },
  );
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
    const validated = validatePromo(body);

    if ('error' in validated) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('promo_codes')
      .insert({
        code: validated.code,
        discount_type: validated.type,
        value: validated.value,
        expires_at: validated.expiresAt,
        active: true,
      })
      .select('id,code,discount_type,value,expires_at,active')
      .single();

    if (error) {
      const duplicate = error.code === '23505';
      return NextResponse.json(
        { error: duplicate ? 'That promo code already exists.' : `Could not create promo: ${error.message}` },
        { status: duplicate ? 409 : 500 },
      );
    }

    return NextResponse.json({ promo: toClient(data) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not create promo.' },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
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
    const id = String(body?.id || '').trim();

    if (!id) {
      return NextResponse.json({ error: 'Promo ID is required.' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (typeof body.active === 'boolean') updates.active = body.active;

    if (!Object.keys(updates).length) {
      return NextResponse.json({ error: 'No promo changes were provided.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('promo_codes')
      .update(updates)
      .eq('id', id)
      .select('id,code,discount_type,value,expires_at,active')
      .single();

    if (error) {
      return NextResponse.json(
        { error: `Could not update promo: ${error.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ promo: toClient(data) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not update promo.' },
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
  if (!id) {
    return NextResponse.json({ error: 'Promo ID is required.' }, { status: 400 });
  }

  const { error } = await supabase.from('promo_codes').delete().eq('id', id);

  if (error) {
    return NextResponse.json(
      { error: `Could not delete promo: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
