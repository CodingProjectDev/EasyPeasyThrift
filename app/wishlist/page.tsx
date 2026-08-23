'use client';

import Link from 'next/link';
import ProductGrid from '@/components/product-grid';
import { useStore } from '@/components/store-provider';

export default function Wishlist() {
  const { products, wishlist, ready } = useStore();
  const items = products.filter((product) => wishlist.includes(product.id));

  if (!ready) {
    return (
      <div className="container content-page">
        <div className="empty-state">
          <h2>Loading wishlist…</h2>
          <p className="muted">Checking your saved pieces.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-hero">
        <span className="eyebrow">Saved for later</span>
        <h1>Wishlist.</h1>
        <p>
          One-of-one pieces can sell at any time. Wishlist saves the link—it
          does not reserve inventory.
        </p>
      </div>

      {items.length ? (
        <ProductGrid products={items} />
      ) : (
        <div className="empty-state">
          <h3>No saved pieces yet.</h3>
          <Link className="btn" href="/shop">
            Explore the shop
          </Link>
        </div>
      )}
    </div>
  );
}
