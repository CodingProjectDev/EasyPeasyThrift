import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import {
  createServerClient,
} from '@supabase/ssr';

import {
  createClient as createSupabaseClient,
} from '@supabase/supabase-js';

type NotificationAction =
  | 'cart'
  | 'wishlist';

type NotificationOperation =
  | 'schedule'
  | 'cancel';

function getSupabaseUrl() {
  return (
    process.env
      .NEXT_PUBLIC_SUPABASE_URL ||
    ''
  );
}

function getPublicKey() {
  return (
    process.env
      .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env
      .NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ''
  );
}

function getAdminKey() {
  return (
    process.env
      .SUPABASE_SECRET_KEY ||
    process.env
      .SUPABASE_SERVICE_ROLE_KEY ||
    ''
  );
}

async function createAuthClient() {
  const url =
    getSupabaseUrl();

  const key =
    getPublicKey();

  if (!url || !key) {
    throw new Error(
      'Supabase public URL/key is missing.',
    );
  }

  const cookieStore =
    await cookies();

  return createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },

        setAll(
          cookiesToSet,
        ) {
          try {
            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }) => {
                cookieStore.set(
                  name,
                  value,
                  options,
                );
              },
            );
          } catch {
            // Cookie write can be ignored here.
          }
        },
      },
    },
  );
}

function createAdminClient() {
  const url =
    getSupabaseUrl();

  const key =
    getAdminKey();

  if (!url || !key) {
    throw new Error(
      'Supabase server secret key is missing.',
    );
  }

  return createSupabaseClient(
    url,
    key,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

export async function POST(
  request: Request,
) {
  try {
    const authSupabase =
      await createAuthClient();

    const {
      data: { user },
      error: userError,
    } =
      await authSupabase.auth.getUser();

    if (
      userError ||
      !user
    ) {
      return NextResponse.json(
        {
          error:
            'You must be logged in.',
        },
        {
          status: 401,
        },
      );
    }

    if (!user.email) {
      return NextResponse.json(
        {
          error:
            'Customer email was not found.',
        },
        {
          status: 400,
        },
      );
    }

    const body =
      await request.json();

    const productId =
      typeof body.productId ===
      'string'
        ? body.productId.trim()
        : '';

    const action =
      body.action as
        | NotificationAction
        | undefined;

    const operation =
      body.operation as
        | NotificationOperation
        | undefined;

    if (!productId) {
      return NextResponse.json(
        {
          error:
            'Product is required.',
        },
        {
          status: 400,
        },
      );
    }

    if (
      action !== 'cart' &&
      action !== 'wishlist'
    ) {
      return NextResponse.json(
        {
          error:
            'Invalid action.',
        },
        {
          status: 400,
        },
      );
    }

    if (
      operation !== 'schedule' &&
      operation !== 'cancel'
    ) {
      return NextResponse.json(
        {
          error:
            'Invalid operation.',
        },
        {
          status: 400,
        },
      );
    }

    const admin =
      createAdminClient();

    /*
     * CANCEL PENDING EMAIL
     */
    if (
      operation === 'cancel'
    ) {
      const {
        error:
          cancelError,
      } =
        await admin
          .from(
            'product_notification_queue',
          )
          .update({
            status:
              'cancelled',

            cancelled_at:
              new Date()
                .toISOString(),
          })
          .eq(
            'user_id',
            user.id,
          )
          .eq(
            'product_id',
            productId,
          )
          .eq(
            'action',
            action,
          )
          .eq(
            'status',
            'pending',
          );

      if (cancelError) {
        console.error(
          'NOTIFICATION CANCEL ERROR:',
          cancelError,
        );

        return NextResponse.json(
          {
            error:
              'Could not cancel notification.',
          },
          {
            status: 500,
          },
        );
      }

      return NextResponse.json({
        success: true,
        cancelled: true,
      });
    }

    /*
     * LOAD REAL PRODUCT DATA
     */
    const {
      data: product,
      error: productError,
    } =
      await admin
        .from('products')
        .select(
          'id,name,active,inventory',
        )
        .eq(
          'id',
          productId,
        )
        .maybeSingle();

    if (
      productError ||
      !product ||
      !product.active
    ) {
      return NextResponse.json(
        {
          error:
            'Product was not found.',
        },
        {
          status: 404,
        },
      );
    }

    if (
      Number(
        product.inventory,
      ) < 1
    ) {
      return NextResponse.json(
        {
          error:
            'Product is sold out.',
        },
        {
          status: 400,
        },
      );
    }

    /*
     * CUSTOMER NAME
     */
    let customerName =
      String(
        user.user_metadata
          ?.full_name ||
          user.user_metadata
            ?.name ||
          '',
      ).trim();

    if (!customerName) {
      const {
        data:
          latestOrder,
      } =
        await admin
          .from('orders')
          .select(
            'full_name',
          )
          .eq(
            'customer_id',
            user.id,
          )
          .order(
            'created_at',
            {
              ascending:
                false,
            },
          )
          .limit(1)
          .maybeSingle();

      customerName =
        String(
          latestOrder
            ?.full_name ||
            '',
        ).trim();
    }

    /*
     * Remove any previous pending
     * notification for the same item.
     */
    await admin
      .from(
        'product_notification_queue',
      )
      .update({
        status:
          'cancelled',

        cancelled_at:
          new Date()
            .toISOString(),
      })
      .eq(
        'user_id',
        user.id,
      )
      .eq(
        'product_id',
        productId,
      )
      .eq(
        'action',
        action,
      )
      .eq(
        'status',
        'pending',
      );

    /*
     * EXACTLY 10 MINUTES FROM NOW
     */
    const sendAt =
      new Date(
        Date.now() +
          10 * 60 * 1000,
      ).toISOString();

    const {
      data: queued,
      error: queueError,
    } =
      await admin
        .from(
          'product_notification_queue',
        )
        .insert({
          user_id:
            user.id,

          customer_email:
            user.email,

          customer_name:
            customerName ||
            null,

          product_id:
            productId,

          product_name:
            String(
              product.name ||
                'Product',
            ),

          action,

          status:
            'pending',

          send_at:
            sendAt,
        })
        .select(
          'id,send_at',
        )
        .single();

    if (queueError) {
      console.error(
        'NOTIFICATION QUEUE ERROR:',
        queueError,
      );

      return NextResponse.json(
        {
          error:
            'Could not schedule email.',
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json({
      success: true,

      scheduled: true,

      notificationId:
        queued.id,

      sendAt:
        queued.send_at,
    });
  } catch (error) {
    console.error(
      'PRODUCT NOTIFICATION ERROR:',
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Could not schedule notification.',
      },
      {
        status: 500,
      },
    );
  }
}
