import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

const ORDER_TIMEOUT = 15000;

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

    if (!['COD', 'QR'].includes(body.paymentMethod)) {
      return NextResponse.json(
        { error: 'Unsupported payment method.' },
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

    const rpcRequest = Promise.resolve(
      supabase.rpc('place_order', {
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
      })
    );

    // Prevent an endless "Placing order..." request
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            'Database order request timed out.'
          )
        );
      }, ORDER_TIMEOUT);
    });

    const { data, error } = await Promise.race([
      rpcRequest,
      timeout,
    ]);

    if (error) {
      console.error('PLACE ORDER RPC ERROR:', error);

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
