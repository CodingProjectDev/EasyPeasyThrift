'use client';

import { useStore } from '@/components/store-provider';

export default function Shipping() {
  const { settings } = useStore();

  return (
    <div className="container">
      <article className="content-page">
        <span className="eyebrow">
          The practical stuff
        </span>

        <h1>Shipping & Returns.</h1>

        <h2>Shipping</h2>

        <p>
          <b>Shipping fee:</b>{' '}
          {settings.shippingInfo}
        </p>

        <p>
          Shipping is confirmed separately based
          on the product and delivery location.
          The online product total does not
          automatically add a fixed shipping fee.
        </p>

        <h2>Returns</h2>

        <p
          style={{
            whiteSpace: 'pre-line',
          }}
        >
          {settings.returnPolicy}
        </p>

        <h2>Condition accuracy</h2>

        <p>
          Product photos, descriptions, sizes,
          measurements, and condition notes
          should be reviewed carefully before
          purchase.
        </p>
      </article>
    </div>
  );
}
