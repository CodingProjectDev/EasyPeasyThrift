import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim();
    const orderNumber = String(body.orderNumber || '').trim();
    const message = String(body.message || '').trim();

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email and message are required.' },
        { status: 400 },
      );
    }

    if (name.length > 100 || email.length > 200 || message.length > 3000) {
      return NextResponse.json(
        { error: 'One or more fields are too long.' },
        { status: 400 },
      );
    }

    const storeEmail = process.env.CONTACT_TO_EMAIL;
    const fromEmail = process.env.CONTACT_FROM_EMAIL;

    if (!storeEmail || !fromEmail) {
      console.error('Contact email environment variables are missing.');

      return NextResponse.json(
        { error: 'Contact form is not configured.' },
        { status: 500 },
      );
    }

    const { error } = await resend.emails.send({
      from: `EasyPeasy-Thrift <${fromEmail}>`,
      to: [storeEmail],
      replyTo: email,
      subject: orderNumber
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
      console.error('Resend error:', error);

      return NextResponse.json(
        { error: 'Could not send your message.' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Contact form error:', error);

    return NextResponse.json(
      { error: 'Something went wrong.' },
      { status: 500 },
    );
  }
}
