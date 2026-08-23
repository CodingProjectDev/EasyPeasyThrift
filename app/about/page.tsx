'use client';

import { useStore } from '@/components/store-provider';

export default function About() {
  const { settings } = useStore();

  const paymentMethods = [
    settings.codEnabled &&
      'Cash on Delivery (COD)',
    settings.qrEnabled &&
      'QR Payment',
  ].filter(Boolean);

  return (
    <div className="container">
      <article className="content-page">
        <span className="eyebrow">
          Our story
        </span>

        <h1>
          Good clothes deserve another life.
        </h1>

        <p>
          EasyPeasy-Thrift is built around a
          simple idea: secondhand shopping should
          feel curated, trustworthy, and fun—not
          like digging through a messy catalog.
          Every product page is designed to show
          what matters: condition, size,
          measurements, brand, photos, and whether
          the piece is truly one-of-one.
        </p>

        <h2>
          Secondhand. Standout. So Easy.
        </h2>

        <p>
          We mix a youthful fashion eye with the
          honest details buyers need. The result is
          a thrift store that feels like a brand
          while still respecting what makes
          secondhand special: limited pieces,
          unexpected finds, and less waste.
        </p>

        <section
          id="store-information"
          style={{
            marginTop: 80,
            paddingTop: 40,
            borderTop:
              '1px solid var(--line)',
          }}
        >
          <span className="eyebrow">
            Store information
          </span>

          <h2 style={{ marginTop: 12 }}>
            {settings.storeName}
          </h2>

          <p
            style={{
              fontSize: '1.15rem',
            }}
          >
            {settings.tagline}
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(230px, 1fr))',
              gap: 16,
              marginTop: 28,
            }}
          >
            <div className="panel">
              <h3>Contact</h3>

              {settings.storeEmail ? (
                <p>
                  <b>Email</b>
                  <br />
                  <a
                    href={`mailto:${settings.storeEmail}`}
                  >
                    {settings.storeEmail}
                  </a>
                </p>
              ) : (
                <p className="muted">
                  Email not listed.
                </p>
              )}

              {settings.storePhone ? (
                <p>
                  <b>Phone</b>
                  <br />
                  <a
                    href={`tel:${settings.storePhone}`}
                  >
                    {settings.storePhone}
                  </a>
                </p>
              ) : (
                <p className="muted">
                  Phone not listed.
                </p>
              )}
            </div>

            <div className="panel">
              <h3>Shipping</h3>

              <p>
                <b>Shipping fee</b>
                <br />
                {settings.shippingInfo}
              </p>

              <p className="muted">
                Shipping is confirmed separately
                based on the product and delivery
                location.
              </p>
            </div>

            <div className="panel">
              <h3>Payment methods</h3>

              {paymentMethods.length ? (
                <p>
                  {paymentMethods.join(' • ')}
                </p>
              ) : (
                <p className="muted">
                  Please contact the store for
                  current payment options.
                </p>
              )}
            </div>
          </div>

          <div
            className="panel"
            style={{ marginTop: 16 }}
          >
            <h3>Return policy</h3>

            <p
              style={{
                whiteSpace: 'pre-line',
              }}
            >
              {settings.returnPolicy}
            </p>
          </div>
        </section>
      </article>
    </div>
  );
}
