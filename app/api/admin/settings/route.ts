import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  ADMIN_COOKIE,
  verifyAdminToken,
} from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

async function requireAdmin() {
  const cookieStore = await cookies();

  return verifyAdminToken(
    cookieStore.get(ADMIN_COOKIE)?.value,
  );
}

function toClientSettings(row: any) {
  return {
    storeName: String(
      row?.store_name || 'EasyPeasy-Thrift',
    ),
    tagline: String(
      row?.tagline ||
        'Secondhand. Standout. So Easy.',
    ),
    storeEmail: String(row?.store_email || ''),
    storePhone: String(row?.store_phone || ''),
    shippingInfo: String(
      row?.shipping_info ||
        'Depends on product and location',
    ),
    returnPolicy: String(row?.return_policy || ''),
    codEnabled: Boolean(row?.cod_enabled),
    qrEnabled: Boolean(row?.qr_enabled),
    qrImage: row?.qr_image_path
      ? String(row.qr_image_path)
      : undefined,
    logoImage: row?.logo_path
      ? String(row.logo_path)
      : undefined,

    // Legacy compatibility only.
    shippingFee: 0,
    freeShippingThreshold: 0,
  };
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
    const body = await req.json();
    const settings = body?.settings;

    if (!settings) {
      return NextResponse.json(
        { error: 'Store settings are required.' },
        { status: 400 },
      );
    }

    const storeName = String(
      settings.storeName || '',
    ).trim();

    const tagline = String(
      settings.tagline || '',
    ).trim();

    const storeEmail = String(
      settings.storeEmail || '',
    ).trim();

    const storePhone = String(
      settings.storePhone || '',
    ).trim();

    const shippingInfo = String(
      settings.shippingInfo || '',
    ).trim();

    const returnPolicy = String(
      settings.returnPolicy || '',
    ).trim();

    if (!storeName) {
      return NextResponse.json(
        { error: 'Store name is required.' },
        { status: 400 },
      );
    }

    if (!tagline) {
      return NextResponse.json(
        { error: 'Tagline is required.' },
        { status: 400 },
      );
    }

    if (!shippingInfo) {
      return NextResponse.json(
        {
          error:
            'Shipping information is required.',
        },
        { status: 400 },
      );
    }

    if (!returnPolicy) {
      return NextResponse.json(
        { error: 'Return policy is required.' },
        { status: 400 },
      );
    }

    const row = {
      id: 1,
      store_name: storeName,
      tagline,
      store_email: storeEmail || null,
      store_phone: storePhone || null,
      shipping_info: shippingInfo,
      return_policy: returnPolicy,
      cod_enabled: Boolean(
        settings.codEnabled,
      ),
      qr_enabled: Boolean(
        settings.qrEnabled,
      ),
      logo_path:
        String(settings.logoImage || '').trim() ||
        null,
      qr_image_path:
        String(settings.qrImage || '').trim() ||
        null,

      // Shipping is confirmed separately based on
      // product/location, so the automated order
      // total must not add a legacy fixed fee.
      shipping_fee: 0,
      free_shipping_threshold: 0,
    };

    const { data, error } = await supabase
      .from('store_settings')
      .upsert(row, { onConflict: 'id' })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json(
        {
          error: `Could not save store settings: ${error.message}`,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      settings: toClientSettings(data),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Could not save store settings.',
      },
      { status: 500 },
    );
  }
}
