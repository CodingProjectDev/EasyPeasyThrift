import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { createServerClient } from '@supabase/ssr';

import {
  createClient as createSupabaseClient,
} from '@supabase/supabase-js';

import { Resend } from 'resend';

const resend = new Resend(
  process.env.RESEND_API_KEY,
);

function getSupabaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
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
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ''
  );
}

async function createAuthClient() {
  const url = getSupabaseUrl();
  const key = getPublicKey();

  if (!url || !key) {
    throw new Error(
      'Supabase public URL/key is missing.',
    );
  }

  const cookieStore = await cookies();

  return createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },

        setAll(cookiesToSet) {
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
            // Safe to ignore here.
          }
        },
      },
    },
  );
}

function createAdminClient() {
  const url = getSupabaseUrl();
  const key = getAdminKey();

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

function escapeHtml(
  value: string,
) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function money(
  value: unknown,
) {
  const amount = Number(value);

  return `Rs. ${(
    Number.isFinite(amount)
      ? amount
      : 0
  ).toLocaleString('en-US', {
    maximumFractionDigits: 2,
  })}`;
}

export async function POST(
  request: Request,
) {
  try {
    const fromEmail =
      process.env.CONTACT_FROM_EMAIL;

    if (
      !process.env.RESEND_API_KEY ||
      !fromEmail
    ) {
      throw new Error(
        'Email service is not configured.',
      );
    }

    /*
     * Verify logged-in customer.
     */
    const authSupabase =
      await createAuthClient();

    const authorization =
      request.headers.get('authorization') || '';

    const accessToken = authorization
      .replace(/^Bearer\s+/i, '')
      .trim();

    const {
      data: { user },
      error: userError,
    } = accessToken
      ? await authSupabase.auth.getUser(accessToken)
      : await authSupabase.auth.getUser();

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

    const body =
      await request.json();

    const orderId =
      typeof body.orderId ===
      'string'
        ? body.orderId.trim()
        : '';

    if (!orderId) {
      return NextResponse.json(
        {
          error:
            'Order ID is required.',
        },
        {
          status: 400,
        },
      );
    }

    const admin =
      createAdminClient();

    /*
     * Load authoritative order from
     * Supabase and make sure it belongs
     * to this customer.
     */
    const {
      data: order,
      error: orderError,
    } =
      await admin
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
          status,
          created_at,
          confirmation_email_sent_at,
          order_items (
            id,
            product_id,
            product_name,
            unit_price,
            quantity
          )
        `)
        .eq(
          'public_order_id',
          orderId,
        )
        .eq(
          'customer_id',
          user.id,
        )
        .maybeSingle();

    if (
      orderError ||
      !order
    ) {
      return NextResponse.json(
        {
          error:
            'Order was not found.',
        },
        {
          status: 404,
        },
      );
    }

    /*
     * Avoid duplicate emails.
     */
    if (
      order.confirmation_email_sent_at
    ) {
      return NextResponse.json({
        success: true,
        alreadySent: true,
      });
    }

    const customerEmail =
      String(
        order.email ||
          user.email ||
          '',
      ).trim();

    if (!customerEmail) {
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

    const customerName =
      escapeHtml(
        String(
          order.full_name ||
            user.user_metadata
              ?.full_name ||
            user.user_metadata
              ?.name ||
            '',
        ),
      );

    const publicOrderId =
      escapeHtml(
        String(
          order.public_order_id,
        ),
      );

    const items =
      Array.isArray(
        order.order_items,
      )
        ? order.order_items
        : [];

    const itemRows =
      items
        .map((item: any) => {
          const name =
            escapeHtml(
              String(
                item.product_name ||
                  'Product',
              ),
            );

          const quantity =
            Number(
              item.quantity ||
                0,
            );

          const lineTotal =
            Number(
              item.unit_price ||
                0,
            ) *
            quantity;

          return `
            <tr>
              <td
                style="
                  padding:12px 0;
                  border-bottom:1px solid #ece6db;
                "
              >
                ${name} × ${quantity}
              </td>

              <td
                style="
                  padding:12px 0;
                  border-bottom:1px solid #ece6db;
                  text-align:right;
                  font-weight:700;
                "
              >
                ${money(lineTotal)}
              </td>
            </tr>
          `;
        })
        .join('');

    const isQR =
      order.payment_method ===
      'QR';

    const paymentMessage =
      isQR
        ? 'Your payment proof was received. We will verify your payment shortly.'
        : 'Your Cash on Delivery order was received successfully. Our associate will contact you shortly for verification.';

    const appUrl =
      (
        process.env
          .NEXT_PUBLIC_APP_URL ||
        new URL(
          request.url,
        ).origin
      ).replace(
        /\/$/,
        '',
      );

    /*
     * Get admin-editable store email.
     *
     * Priority:
     * 1. Admin Store Email
     * 2. STORE_REPLY_TO_EMAIL fallback
     */
    const {
      data: storeSettings,
      error: storeSettingsError,
    } =
      await admin
        .from('store_settings')
        .select('store_email')
        .eq('id', 1)
        .maybeSingle();

    if (storeSettingsError) {
      console.error(
        'STORE EMAIL LOAD ERROR:',
        storeSettingsError,
      );
    }

    const replyToEmail =
      String(
        storeSettings?.store_email ||
          process.env.STORE_REPLY_TO_EMAIL ||
          '',
      ).trim();

    const {
      error: emailError,
    } =
      await resend.emails.send({
        from: fromEmail,

        to: customerEmail,

        ...(replyToEmail
          ? {
              replyTo:
                replyToEmail,
            }
          : {}),

        subject:
          `Order ${order.public_order_id} confirmed | EasyPeasy-Thrift`,

        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
</head>

<body
  style="
    margin:0;
    padding:0;
    background:#f4efe6;
    color:#171714;
    font-family:Arial,Helvetica,sans-serif;
  "
>
  <div
    style="
      max-width:620px;
      margin:0 auto;
      padding:32px 16px;
    "
  >
    <div
      style="
        background:#fffdf8;
        border:1px solid #d9d2c5;
        border-radius:20px;
        overflow:hidden;
      "
    >
      <div
        style="
          padding:22px 26px;
          background:#536752;
          color:#ffffff;
        "
      >
        <div
          style="
            font-size:22px;
            font-weight:700;
          "
        >
          EasyPeasy-Thrift
        </div>

        <div
          style="
            margin-top:5px;
            font-size:12px;
            opacity:.85;
          "
        >
          Secondhand. Standout. So Easy.
        </div>
      </div>

      <div
        style="
          padding:28px 26px;
        "
      >
        <h1
          style="
            margin:0 0 18px;
            font-size:26px;
          "
        >
          Order placed successfully! 🎉
        </h1>

        <p
          style="
            margin:0 0 14px;
            font-size:16px;
            line-height:1.6;
          "
        >
          ${
            customerName
              ? `Hi <strong>${customerName}</strong>,`
              : 'Hi there,'
          }
        </p>

        <p
          style="
            font-size:16px;
            line-height:1.7;
            color:#4f4c45;
          "
        >
          Thank you for your order.
          We have successfully received
          <strong>Order ${publicOrderId}</strong>.
        </p>

        <div
          style="
            margin:20px 0;
            padding:14px 16px;
            border-radius:12px;
            background:#dfe9dd;
            color:#36513a;
            line-height:1.6;
          "
        >
          ${paymentMessage}
        </div>

        <table
          style="
            width:100%;
            border-collapse:collapse;
            margin-top:20px;
          "
        >
          ${itemRows}
        </table>

        <div
          style="
            margin-top:20px;
          "
        >
          <div
            style="
              display:flex;
              justify-content:space-between;
              padding:7px 0;
            "
          >
            <span>
              Subtotal
            </span>

            <strong>
              ${money(order.subtotal)}
            </strong>
          </div>

          ${
            Number(
              order.shipping,
            ) > 0
              ? `
                <div
                  style="
                    display:flex;
                    justify-content:space-between;
                    padding:7px 0;
                  "
                >
                  <span>
                    Shipping
                  </span>

                  <strong>
                    ${money(order.shipping)}
                  </strong>
                </div>
              `
              : ''
          }

          ${
            Number(
              order.discount,
            ) > 0
              ? `
                <div
                  style="
                    display:flex;
                    justify-content:space-between;
                    padding:7px 0;
                  "
                >
                  <span>
                    Discount
                  </span>

                  <strong>
                    -${money(order.discount)}
                  </strong>
                </div>
              `
              : ''
          }

          <div
            style="
              border-top:1px solid #d9d2c5;
              margin-top:8px;
              padding-top:14px;
              display:flex;
              justify-content:space-between;
              font-size:18px;
            "
          >
            <strong>
              Total
            </strong>

            <strong>
              ${money(order.total)}
            </strong>
          </div>
        </div>

        <p
          style="
            margin-top:22px;
            font-size:14px;
            color:#726f67;
            line-height:1.6;
          "
        >
          Payment method:
          <strong>
            ${escapeHtml(
              String(
                order.payment_method,
              ),
            )}
          </strong>
        </p>

        <a
          href="${appUrl}/account/orders"
          style="
            display:inline-block;
            margin-top:12px;
            padding:12px 20px;
            border-radius:999px;
            background:#536752;
            color:#ffffff;
            text-decoration:none;
            font-weight:700;
          "
        >
          View My Order
        </a>

        <p
          style="
            margin:28px 0 0;
            font-size:13px;
            line-height:1.6;
            color:#726f67;
          "
        >
          Thank you for shopping with
          EasyPeasy-Thrift.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
        `,
      });

    if (emailError) {
      console.error(
        'ORDER CONFIRMATION EMAIL ERROR:',
        emailError,
      );

      return NextResponse.json(
        {
          error:
            'Order was placed, but confirmation email could not be sent.',
        },
        {
          status: 500,
        },
      );
    }

    /*
     * Mark confirmation as sent.
     */
    await admin
      .from('orders')
      .update({
        confirmation_email_sent_at:
          new Date().toISOString(),
      })
      .eq(
        'id',
        order.id,
      );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      'ORDER CONFIRMATION ERROR:',
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Could not send order confirmation.',
      },
      {
        status: 500,
      },
    );
  }
}
