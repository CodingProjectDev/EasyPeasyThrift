import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';


export async function POST(req: Request) {
  try {
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase server configuration is missing.' },
        { status: 503 }
      );
    }

    // Get logged-in customer's access token
    const authorization = req.headers.get('authorization');

    const token =
      authorization?.startsWith('Bearer ')
        ? authorization.substring(7)
        : null;

    if (!token) {
      return NextResponse.json(
        { error: 'Please login before placing an order.' },
        { status: 401 }
      );
    }

    // Verify token with Supabase
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('ORDER AUTH ERROR:', authError);

      return NextResponse.json(
        { error: 'Your login session has expired. Please login again.' },
        { status: 401 }
      );
    }

    const body = await req.json();

    if (
      !body.customer ||
      !body.customer.name ||
      !body.customer.email ||
      !body.customer.phone ||
      !body.customer.address ||
      !body.customer.city
    ) {
      return NextResponse.json(
        { error: 'Delivery information is incomplete.' },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.items) || !body.items.length) {
      return NextResponse.json(
        { error: 'Order items required.' },
        { status: 400 }
      );
    }

    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    for (const item of body.items) {
      const quantity = Number(item?.quantity);
      if (!uuidPattern.test(String(item?.productId || '')) || !Number.isInteger(quantity) || quantity < 1) {
        return NextResponse.json(
          { error: 'One or more cart items are invalid. Refresh your cart and try again.' },
          { status: 400 }
        );
      }
    }

    if (!['COD', 'QR'].includes(body.paymentMethod)) {
      return NextResponse.json(
        { error: 'Unsupported payment method.' },
        { status: 400 }
      );
    }

    const { data: storeSettings, error: settingsError } = await supabase
      .from('store_settings')
      .select('cod_enabled,qr_enabled')
      .eq('id', 1)
      .maybeSingle();

    if (settingsError) {
      return NextResponse.json(
        { error: `Could not verify payment settings: ${settingsError.message}` },
        { status: 500 }
      );
    }

    if (
      (body.paymentMethod === 'COD' && storeSettings?.cod_enabled === false) ||
      (body.paymentMethod === 'QR' && storeSettings?.qr_enabled === false)
    ) {
      return NextResponse.json(
        { error: 'That payment method is currently disabled.' },
        { status: 400 }
      );
    }

    if (
      body.paymentMethod === 'QR' &&
      (!body.transactionId || !body.paymentProofPath)
    ) {
      return NextResponse.json(
        {
          error:
            'QR payment requires payment proof and transaction ID.',
        },
        { status: 400 }
      );
    }

    const items = body.items.map(
      (item: {
        productId: string;
        quantity: number;
      }) => ({
        product_id: item.productId,
        quantity: Number(item.quantity),
      })
    );

    const { data, error } = await supabase.rpc('place_order', {
        p_customer_id: user.id,

        p_email:
          user.email ||
          body.customer.email,

        p_full_name:
          body.customer.name,

        p_phone:
          body.customer.phone,

        p_address:
          body.customer.address,

        p_city:
          body.customer.city,

        p_postal_code:
          body.customer.postalCode || '',

        p_payment_method:
          body.paymentMethod,

        p_transaction_id:
          body.transactionId || null,

        p_payment_proof_path:
          body.paymentProofPath || null,

        p_promo_code:
          body.promoCode || null,

        p_items: items,
      });

    if (error) {
      console.error('PLACE ORDER RPC ERROR:', error);

      if (body.paymentMethod === 'QR' && body.paymentProofPath) {
        await supabase.storage
          .from('payment-proofs')
          .remove([String(body.paymentProofPath)]);
      }

      return NextResponse.json(
        {
          error: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      orderId: data,
      customerId: user.id,
    });
  } catch (error) {
    console.error('ORDER API ERROR:', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Could not place order.',
      },
      { status: 500 }
    );
  }
}
