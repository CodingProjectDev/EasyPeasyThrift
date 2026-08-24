import {
  NextResponse,
} from 'next/server';

import {
  createClient,
} from '@supabase/supabase-js';

import {
  Resend,
} from 'resend';

const resend =
  new Resend(
    process.env.RESEND_API_KEY,
  );

function getSupabaseUrl() {
  return (
    process.env
      .NEXT_PUBLIC_SUPABASE_URL ||
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

function createAdminClient() {
  const url =
    getSupabaseUrl();

  const key =
    getAdminKey();

  if (!url || !key) {
    throw new Error(
      'Supabase server key is missing.',
    );
  }

  return createClient(
    url,
    key,
    {
      auth: {
        persistSession:
          false,

        autoRefreshToken:
          false,
      },
    },
  );
}

function escapeHtml(
  value: string,
) {
  return value
    .replaceAll(
      '&',
      '&amp;',
    )
    .replaceAll(
      '<',
      '&lt;',
    )
    .replaceAll(
      '>',
      '&gt;',
    )
    .replaceAll(
      '"',
      '&quot;',
    )
    .replaceAll(
      "'",
      '&#039;',
    );
}

export async function POST(
  request: Request,
) {
  try {
    /*
     * Protect this route.
     */
    const auth =
      request.headers.get(
        'authorization',
      );

    const cronSecret =
      process.env
        .CRON_SECRET;

    if (
      !cronSecret ||
      auth !==
        `Bearer ${cronSecret}`
    ) {
      return NextResponse.json(
        {
          error:
            'Unauthorized',
        },
        {
          status: 401,
        },
      );
    }

    const fromEmail =
      process.env
        .CONTACT_FROM_EMAIL;

    if (
      !process.env
        .RESEND_API_KEY ||
      !fromEmail
    ) {
      throw new Error(
        'Resend email configuration is missing.',
      );
    }

    const admin =
      createAdminClient();

    /*
     * Find emails whose 10-minute
     * waiting period has finished.
     */
    const {
      data:
        notifications,
      error:
        queueError,
    } =
      await admin
        .from(
          'product_notification_queue',
        )
        .select('*')
        .eq(
          'status',
          'pending',
        )
        .lte(
          'send_at',
          new Date()
            .toISOString(),
        )
        .order(
          'send_at',
          {
            ascending:
              true,
          },
        )
        .limit(50);

    if (queueError) {
      throw queueError;
    }

    if (
      !notifications ||
      notifications.length ===
        0
    ) {
      return NextResponse.json({
        success: true,
        processed: 0,
      });
    }

    const baseUrl =
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

    let sentCount = 0;

    let failedCount = 0;

    for (
      const item
      of notifications
    ) {
      /*
       * Claim the notification.
       *
       * This prevents two cron
       * requests sending the same email.
       */
      const {
        data: claimed,
      } =
        await admin
          .from(
            'product_notification_queue',
          )
          .update({
            status:
              'processing',
          })
          .eq(
            'id',
            item.id,
          )
          .eq(
            'status',
            'pending',
          )
          .select('id')
          .maybeSingle();

      if (!claimed) {
        continue;
      }

      /*
       * Check that product still exists
       * and has stock.
       */
      const {
        data:
          currentProduct,
      } =
        await admin
          .from('products')
          .select(
            'id,active,inventory',
          )
          .eq(
            'id',
            item.product_id,
          )
          .maybeSingle();

      if (
        !currentProduct ||
        !currentProduct.active ||
        Number(
          currentProduct.inventory,
        ) < 1
      ) {
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

            last_error:
              'Product no longer available.',
          })
          .eq(
            'id',
            item.id,
          );

        continue;
      }

      const isCart =
        item.action ===
        'cart';

      const destination =
        isCart
          ? `${baseUrl}/cart`
          : `${baseUrl}/wishlist`;

      const productName =
        String(
          item.product_name ||
            'Product',
        );

      const customerName =
        String(
          item.customer_name ||
            '',
        );

      const safeName =
        escapeHtml(
          customerName,
        );

      const safeProduct =
        escapeHtml(
          productName,
        );

      const subject =
        isCart
          ? `${productName} is waiting in your cart`
          : `Still thinking about ${productName}?`;

      const headline =
        isCart
          ? 'Still in your cart 🛍️'
          : 'Saved in your wishlist ❤️';

      const message =
        isCart
          ? `<strong>${safeProduct}</strong> is still waiting for you in your EasyPeasy-Thrift cart.`
          : `<strong>${safeProduct}</strong> is saved in your EasyPeasy-Thrift wishlist.`;

      const buttonText =
        isCart
          ? 'View Cart'
          : 'View Wishlist';

      try {
        const {
          error:
            emailError,
        } =
          await resend
            .emails
            .send({
              from:
                fromEmail,

              to:
                item.customer_email,

              subject,

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
    font-family:Arial,Helvetica,sans-serif;
    color:#171714;
  "
>
  <div
    style="
      max-width:600px;
      margin:0 auto;
      padding:32px 18px;
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
          background:#536752;
          color:#ffffff;
          padding:20px 24px;
        "
      >
        <div
          style="
            font-size:20px;
            font-weight:700;
          "
        >
          EasyPeasy-Thrift
        </div>

        <div
          style="
            margin-top:4px;
            font-size:12px;
            opacity:.85;
          "
        >
          Secondhand. Standout. So Easy.
        </div>
      </div>

      <div
        style="
          padding:28px 24px;
        "
      >
        <h1
          style="
            margin:0 0 18px;
            font-size:25px;
          "
        >
          ${headline}
        </h1>

        <p
          style="
            margin:0 0 14px;
            font-size:16px;
            line-height:1.6;
          "
        >
          ${
            safeName
              ? `Hi <strong>${safeName}</strong>,`
              : 'Hi there,'
          }
        </p>

        <p
          style="
            margin:0 0 24px;
            font-size:16px;
            line-height:1.7;
            color:#4f4c45;
          "
        >
          ${message}
        </p>

        <a
          href="${destination}"
          style="
            display:inline-block;
            background:#536752;
            color:#ffffff;
            text-decoration:none;
            font-weight:700;
            padding:12px 20px;
            border-radius:999px;
          "
        >
          ${buttonText}
        </a>

        <p
          style="
            margin:28px 0 0;
            font-size:13px;
            line-height:1.6;
            color:#726f67;
          "
        >
          Thank you for shopping with EasyPeasy-Thrift.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
              `,
            });

        if (emailError) {
          throw new Error(
            emailError.message,
          );
        }

        await admin
          .from(
            'product_notification_queue',
          )
          .update({
            status:
              'sent',

            sent_at:
              new Date()
                .toISOString(),

            last_error:
              null,
          })
          .eq(
            'id',
            item.id,
          );

        sentCount += 1;
      } catch (error) {
        failedCount += 1;

        const attempts =
          Number(
            item.attempt_count ||
              0,
          ) + 1;

        /*
         * Retry twice.
         */
        const shouldRetry =
          attempts < 3;

        await admin
          .from(
            'product_notification_queue',
          )
          .update({
            status:
              shouldRetry
                ? 'pending'
                : 'failed',

            attempt_count:
              attempts,

            last_error:
              error instanceof Error
                ? error.message
                : 'Unknown email error',

            /*
             * Retry after 2 minutes.
             */
            send_at:
              shouldRetry
                ? new Date(
                    Date.now() +
                      2 *
                        60 *
                        1000,
                  ).toISOString()
                : item.send_at,
          })
          .eq(
            'id',
            item.id,
          );
      }
    }

    return NextResponse.json({
      success: true,

      processed:
        notifications.length,

      sent:
        sentCount,

      failed:
        failedCount,
    });
  } catch (error) {
    console.error(
      'PRODUCT EMAIL CRON ERROR:',
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Cron failed.',
      },
      {
        status: 500,
      },
    );
  }
}
