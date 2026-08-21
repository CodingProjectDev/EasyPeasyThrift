import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from '@/lib/supabase';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    /*
     * Get the REAL logged-in customer.
     */
    const authSupabase =
      await createServerSupabaseClient();

    const {
      data: { user },
      error: userError,
    } =
      await authSupabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error:
            'You must be logged in before placing an order.',
        },
        {
          status: 401,
        }
      );
    }

    /*
     * Admin Supabase client is used for the
     * database transaction/RPC.
     */
    const supabase =
      getSupabaseAdmin();

    if (!supabase) {
      return NextResponse.json(
        {
          error:
            'Supabase server configuration is missing.',
        },
        {
          status: 503,
        }
      );
    }

    const body =
      await req.json();

    /*
     * Validate customer information.
     */
    if (
      !body.customer ||
      !body.customer.name ||
      !body.customer.email ||
      !body.customer.phone ||
      !body.customer.address ||
      !body.customer.city
    ) {
      return NextResponse.json(
        {
          error:
            'Customer delivery information is incomplete.',
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Validate items.
     */
    if (
      !Array.isArray(body.items) ||
      body.items.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            'Order items are required.',
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Only COD and QR are allowed.
     */
    if (
      !['COD', 'QR'].includes(
        body.paymentMethod
      )
    ) {
      return NextResponse.json(
        {
          error:
            'Unsupported payment method.',
        },
        {
          status: 400,
        }
      );
    }

    /*
     * QR requires both transaction ID
     * and uploaded payment proof.
     */
    if (
      body.paymentMethod === 'QR' &&
      (!body.transactionId ||
        !body.paymentProofPath)
    ) {
      return NextResponse.json(
        {
          error:
            'QR payment requires payment proof and transaction ID.',
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Convert frontend items to the structure
     * expected by your Supabase function.
     */
    const items =
      body.items.map(
        (item: {
          productId: string;
          quantity: number;
        }) => ({
          product_id:
            item.productId,

          quantity:
            Number(
              item.quantity
            ),
        })
      );

    /*
     * IMPORTANT FIX:
     *
     * Previously:
     *
     * p_customer_id: null
     *
     * Now:
     *
     * p_customer_id: user.id
     *
     * This permanently connects the order
     * to the logged-in Supabase customer.
     */
    const {
      data,
      error,
    } =
      await supabase.rpc(
        'place_order',
        {
          p_customer_id:
            user.id,

          p_email:
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
            body.customer
              .postalCode || '',

          p_payment_method:
            body.paymentMethod,

          p_transaction_id:
            body.transactionId ||
            null,

          p_payment_proof_path:
            body.paymentProofPath ||
            null,

          p_promo_code:
            body.promoCode ||
            null,

          p_items:
            items,
        }
      );

    /*
     * Show the actual Supabase error.
     */
    if (error) {
      console.error(
        'PLACE ORDER RPC ERROR:',
        error
      );

      return NextResponse.json(
        {
          error:
            error.message,
          details:
            error.details,
          hint:
            error.hint,
          code:
            error.code,
        },
        {
          status: 409,
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        orderId: data,
        customerId:
          user.id,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      'ORDER API ERROR:',
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Could not place order.',
      },
      {
        status: 500,
      }
    );
  }
}
