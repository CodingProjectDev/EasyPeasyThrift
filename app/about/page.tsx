'use client';

import { useStore } from '@/components/store-provider';

export default function About() {
  const { settings } = useStore();

  return (
    <div className="container">
      <article className="content-page">
        <span className="eyebrow">Our story</span>

        <h1>Good clothes deserve another life.</h1>

        <p>
          {settings.storeName} is built around a simple idea: secondhand shopping
          should feel curated, trustworthy, and fun—not like digging through a
          messy catalog. Every product page is designed to show what matters:
          condition, size, measurements, brand, photos, and whether the piece is
          truly one-of-one.
        </p>

        <h2>{settings.tagline}</h2>

        <p>
          We mix a youthful fashion eye with the honest details buyers need. The
          result is a thrift store that feels like a brand while still respecting
          what makes secondhand special: limited pieces, unexpected finds, and
          less waste.
        </p>
      </article>
    </div>
  );
}
