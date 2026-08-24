import {
  NextResponse,
} from 'next/server';

import {
  Resend,
} from 'resend';

import {
  createClient,
} from '@/lib/supabase/server';

const resend =
  new Resend(
    process.env.RESEND_API_KEY,
  );

type NotificationAction =
  | 'cart'
  | 'wishlist';

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
     * Check environment variables.
     */
    const fromEmail =
      process.env
        .CONTACT_FROM_EMAIL;

    if (
      !process.env
        .RESEND_API_KEY ||
      !fromEmail
    ) {
      console.error(
        'Product notification email environment variables are missing.',
      );

      return NextResponse.json(
        {
          error:
            'Email service is not configured.',
        },
        {
          status: 500,
        },
      );
    }

    /*
     * Get logged-in Supabase user.
     */
    const supabase =
      await createClient();

    const {
      data: { user },
      error: userError,
    } =
      await supabase.auth.getUser();

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

    /*
     * Never trust an email address
     * provided by the browser.
     *
     * We use the verified email from
     * the Supabase login session.
     */
    const customerEmail =
      user.email;

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

    /*
     * Read request.
     */
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
            'Invalid notification action.',
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Fetch real product details
     * from Supabase.
     *
     * Never trust the product name
     * supplied by the browser.
     */
    const {
      data: product,
      error: productError,
    } =
      await supabase
        .from('products')
        .select(
          'id,name,slug,active',
        )
        .eq(
          'id',
          productId,
        )
        .maybeSingle();

    if (
      productError ||
      !product
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

    /*
     * Customer name.
     */
    const customerName =
      String(
        user.user_metadata
          ?.full_name ||
          user.user_metadata
            ?.name ||
          '',
      ).trim();

    /*
     * Store information.
     */
    const {
      data:
        storeSettings,
    } =
      await supabase
        .from(
          'store_settings',
        )
        .select(
          'store_name',
        )
        .eq('id', 1)
        .maybeSingle();

    const storeName =
      String(
        storeSettings
          ?.store_name ||
          'EasyPeasy-Thrift',
      );

    /*
     * Destination button.
     */
    const origin =
      process.env
        .NEXT_PUBLIC_APP_URL ||
      new URL(
        request.url,
      ).origin;

    const baseUrl =
      origin.replace(
        /\/$/,
        '',
      );

    const destination =
      action === 'cart'
        ? `${baseUrl}/cart`
        : `${baseUrl}/wishlist`;

    /*
     * Email content.
     */
    const productName =
      String(
        product.name ||
          'Product',
      );

    const safeProductName =
      escapeHtml(
        productName,
      );

    const safeStoreName =
      escapeHtml(
        storeName,
      );

    const safeCustomerName =
      escapeHtml(
        customerName,
      );

    const isCart =
      action === 'cart';

    const subject =
      isCart
        ? `${productName} was added to your cart`
        : `${productName} was saved to your wishlist`;

    const headline =
      isCart
        ? 'Added to your cart 🛍️'
        : 'Saved to your wishlist ❤️';

    const message =
      isCart
        ? `<strong>${safeProductName}</strong> is now in your EasyPeasy-Thrift cart.`
        : `<strong>${safeProductName}</strong> was saved to your EasyPeasy-Thrift wishlist.`;

    const buttonText =
      isCart
        ? 'View Cart'
        : 'View Wishlist';

    /*
     * Send notification.
     */
    const {
      error:
        resendError,
    } =
      await resend.emails.send({
        from: fromEmail,

        to: customerEmail,

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
          color:white;
          padding:20px 24px;
        "
      >
        <div
          style="
            font-size:20px;
            font-weight:700;
          "
        >
          ${safeStoreName}
        </div>

        <div
          style="
            font-size:12px;
            margin-top:4px;
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
            font-size:16px;
            line-height:1.6;
            margin:0 0 14px;
          "
        >
          ${
            safeCustomerName
              ? `Hi <strong>${safeCustomerName}</strong>,`
              : 'Hi there,'
          }
        </p>

        <p
          style="
            font-size:16px;
            line-height:1.7;
            margin:0 0 24px;
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
          Thank you for shopping with ${safeStoreName}.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
        `,
      });

    if (resendError) {
      console.error(
        'RESEND PRODUCT NOTIFICATION ERROR:',
        resendError,
      );

      return NextResponse.json(
        {
          error:
            'Could not send notification email.',
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      'PRODUCT NOTIFICATION ERROR:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Could not send notification email.',
      },
      {
        status: 500,
      },
    );
  }
}
