import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export const runtime = 'nodejs';

export async function POST(
  request: Request,
) {
  try {
    const apiKey =
      process.env.RESEND_API_KEY;

    const storeEmail =
      process.env.CONTACT_TO_EMAIL?.trim();

    const fromEmail =
      process.env.CONTACT_FROM_EMAIL?.trim();

    if (
      !apiKey ||
      !storeEmail ||
      !fromEmail
    ) {
      console.error(
        'Contact email configuration is missing.',
        {
          hasResendKey:
            Boolean(apiKey),
          hasToEmail:
            Boolean(storeEmail),
          hasFromEmail:
            Boolean(fromEmail),
        },
      );

      return NextResponse.json(
        {
          error:
            'Contact form is not configured.',
        },
        {
          status: 500,
        },
      );
    }

    const resend =
      new Resend(apiKey);

    const body =
      await request.json();

    const name =
      String(
        body?.name || '',
      ).trim();

    const email =
      String(
        body?.email || '',
      ).trim();

    const orderNumber =
      String(
        body?.orderNumber || '',
      ).trim();

    const message =
      String(
        body?.message || '',
      ).trim();

    if (
      !name ||
      !email ||
      !message
    ) {
      return NextResponse.json(
        {
          error:
            'Name, email and message are required.',
        },
        {
          status: 400,
        },
      );
    }

    if (
      name.length > 100 ||
      email.length > 200 ||
      orderNumber.length > 100 ||
      message.length > 3000
    ) {
      return NextResponse.json(
        {
          error:
            'One or more fields are too long.',
        },
        {
          status: 400,
        },
      );
    }

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !emailPattern.test(email)
    ) {
      return NextResponse.json(
        {
          error:
            'Enter a valid email address.',
        },
        {
          status: 400,
        },
      );
    }

    const {
      data,
      error,
    } =
      await resend.emails.send({
        /*
         * CONTACT_FROM_EMAIL should
         * already contain the full sender.
         *
         * Example:
         * EasyPeasy-Thrift <noreply@example.com>
         */
        from: fromEmail,

        to: [
          storeEmail,
        ],

        replyTo: email,

        subject:
          orderNumber
            ? `Contact form - Order ${orderNumber}`
            : `Contact form - ${name}`,

        text: `
New customer message

Name:
${name}

Email:
${email}

Order number:
${orderNumber || 'Not provided'}

Message:
${message}
        `.trim(),
      });

    if (error) {
      console.error(
        'RESEND CONTACT ERROR:',
        error,
      );

      return NextResponse.json(
        {
          error:
            'Could not send your message. Please try again.',
        },
        {
          status: 500,
        },
      );
    }

    console.log(
      'Contact email sent:',
      data?.id,
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      'CONTACT FORM ERROR:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Something went wrong. Please try again.',
      },
      {
        status: 500,
      },
    );
  }
}