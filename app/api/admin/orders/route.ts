import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, verifyAdminToken } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { OrderStatus } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_STATUSES: OrderStatus[] = [
  'Pending',
  'Payment Verification Required',
  'Payment Rejected',
  'Approved',
  'Processing',
  'Shipped',
  'Delivered',
];

async function requireAdmin() {
  const cookieStore = await cookies();
  return verifyAdminToken(cookieStore.get(ADMIN_COOKIE)?.value);
}

function n(value: unknown) {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
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
    .from('orders')
    .select(`
      id,
      public_order_id,
      customer_id,
      email,
      full_name,
      phone,
      address,
      city,
      postal_code,
      subtotal,
      shipping,
      discount,
      total,
      payment_method,
      transaction_id,
      payment_proof_path,
      status,
      promo_code,
      created_at,
      order_items (
        id,
        product_id,
        product_name,
        unit_price,
        quantity
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('ADMIN ORDERS LOAD ERROR:', error);
    return NextResponse.json(
      { error: `Could not load orders: ${error.message}` },
      { status: 500 },
    );
  }

  const orders = await Promise.all(
    (data || []).map(async (row: any) => {
      let paymentProofUrl = '';

      if (row.payment_proof_path) {
        const { data: signedData, error: signedError } = await supabase.storage
          .from('payment-proofs')
          .createSignedUrl(row.payment_proof_path, 60 * 60);

        if (!signedError && signedData?.signedUrl) {
          paymentProofUrl = signedData.signedUrl;
        }
      }

      return {
        databaseId: String(row.id),
        id: String(row.public_order_id),
        userId: row.customer_id ? String(row.customer_id) : undefined,
        createdAt: String(row.created_at),
        customer: {
          name: String(row.full_name || ''),
          email: String(row.email || ''),
          phone: String(row.phone || ''),
          address: String(row.address || ''),
          city: String(row.city || ''),
          postalCode: String(row.postal_code || ''),
        },
        items: Array.isArray(row.order_items)
          ? row.order_items.map((item: any) => ({
              productId: item.product_id ? String(item.product_id) : String(item.id),
              name: String(item.product_name || ''),
              price: n(item.unit_price),
              quantity: n(item.quantity),
            }))
          : [],
        subtotal: n(row.subtotal),
        shipping: n(row.shipping),
        discount: n(row.discount),
        total: n(row.total),
        paymentMethod: String(row.payment_method),
        transactionId: row.transaction_id ? String(row.transaction_id) : undefined,
        paymentProofPath: row.payment_proof_path ? String(row.payment_proof_path) : undefined,
        paymentProofUrl: paymentProofUrl || undefined,
        promoCode: row.promo_code ? String(row.promo_code) : undefined,
        status: String(row.status),
      };
    }),
  );

  return NextResponse.json(
    { orders },
    { headers: { 'Cache-Control': 'no-store' } },
  );
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
    const orderId = String(body?.orderId || '').trim();
    const status = String(body?.status || '') as OrderStatus;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required.' }, { status: 400 });
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid order status.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('public_order_id', orderId)
      .select('public_order_id,status')
      .single();

    if (error) {
      console.error('ADMIN ORDER STATUS ERROR:', error);
      return NextResponse.json(
        { error: `Could not update order: ${error.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      orderId: data.public_order_id,
      status: data.status,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Could not update order.',
      },
      { status: 500 },
    );
  }
}
