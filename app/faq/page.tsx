'use client';

import { useStore } from '@/components/store-provider';

export default function FAQ() {
  const { settings } = useStore();

  const payments = [
    settings.codEnabled && 'Cash on Delivery (COD)',
    settings.qrEnabled && 'QR Payment',
  ].filter(Boolean) as string[];

  const faqs = [
    [
      'Are items one-of-one?',
      'Many pieces are one-of-one. When one sells, inventory becomes zero and the product is marked Sold Out until Admin deletes or restocks it.',
    ],
    [
      'How do I know an item will fit?',
      'Every listing includes the tagged size plus garment measurements when available. Compare them with a similar item you already own.',
    ],
    [
      'What payment methods are accepted?',
      payments.length
        ? `Current payment options: ${payments.join(' and ')}.`
        : 'Online checkout is temporarily unavailable because no payment method is enabled.',
    ],
    [
      'How does QR payment work?',
      settings.qrEnabled
        ? 'Scan the store QR at checkout, pay, upload a JPG/PNG/WEBP screenshot, enter the transaction/reference ID, and submit. The order stays in Payment Verification Required until Admin reviews it.'
        : 'QR Payment is not currently enabled.',
    ],
    [
      'How is shipping charged?',
      `${settings.shippingInfo}. Shipping is confirmed separately and is not automatically added to the online product total.`,
    ],
    [
      'Can I return thrift items?',
      settings.returnPolicy,
    ],
  ];

  return (
    <div className="container">
      <article className="content-page">
        <span className="eyebrow">Need to know</span>
        <h1>FAQ.</h1>

        {faqs.map(([question, answer]) => (
          <details className="faq-item" key={question}>
            <summary>{question}</summary>
            <p style={{ whiteSpace: 'pre-line' }}>{answer}</p>
          </details>
        ))}
      </article>
    </div>
  );
}
