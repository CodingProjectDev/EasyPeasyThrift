'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ExternalLink,
  Heart,
  ShoppingBag,
} from 'lucide-react';

import { useStore } from '@/components/store-provider';
import ProductGrid from '@/components/product-grid';
import { ProductImage } from '@/components/product-image';
import { money } from '@/lib/format';

export default function ProductPage() {
  const router = useRouter();

  const { slug } =
    useParams<{ slug: string }>();

const {
  products,
  cart,
  wishlist,
  toggleWishlist,
  addToCart,
  recordRecent,
  recent,
} = useStore();

  const product =
    products.find(
      (product) =>
        product.slug === slug
    );

  useEffect(() => {
    if (product) {
      recordRecent(product.id);
    }
  }, [product?.id]);

  if (!ready) {
    return (
      <div className="container content-page">
        <div className="empty-state">
          <h2>Loading piece…</h2>
          <p className="muted">Checking the latest store inventory.</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container content-page">
        <h1>Piece not found.</h1>

        <p>
          It may have been removed
          from the rack.
        </p>

        <Link
          className="btn"
          href="/shop"
        >
          Back to shop
        </Link>
      </div>
    );
  }

  const related =
    products
      .filter(
        (item) =>
          item.id !== product.id &&
          item.category ===
            product.category
      )
      .slice(0, 4);

  const recently =
    recent
      .filter(
        (id) =>
          id !== product.id
      )
      .map((id) =>
        products.find(
          (product) =>
            product.id === id
        )
      )
      .filter(Boolean)
      .slice(0, 4) as typeof products;

  const sold =
    product.inventory <= 0;
  function handleCheckoutNow() {
  if (sold) {
    return;
  }

  const alreadyInCart = cart.some(
    (item) =>
      item.productId === product.id
  );

  if (!alreadyInCart) {
    addToCart(product.id);
  }

  router.push('/checkout');
}

  return (
    <div className="container">
      <section className="product-page">
        <div className="product-gallery">
          {product.images.map(
            (image, index) => (
              <ProductImage
                key={`${image}-${index}`}
                src={image}
                alt={`${product.name} view ${
                  index + 1
                }`}
              />
            )
          )}
        </div>

        <div className="product-info">
          <span className="eyebrow">
            {product.category} ·{' '}
            {product.brand}
          </span>

          <h1>
            {product.name}
          </h1>

          <div
            className="badges"
            style={{
              position: 'static',
              maxWidth: 'none',
            }}
          >
            {product.newArrival && (
              <span className="badge sage">
                New Arrival
              </span>
            )}

            {product.vintageFind && (
              <span className="badge brown">
                Vintage Find
              </span>
            )}

            {product.oneOfOne && (
              <span className="badge dark">
                One-of-One
              </span>
            )}
          </div>

          <div className="price-row">
            <strong>
              {money(
                product.price
              )}
            </strong>

            {product.compareAt && (
              <del>
                {money(
                  product.compareAt
                )}
              </del>
            )}
          </div>

          <div className="info-chips">
            <span className="info-chip">
              Size {product.size}
            </span>

            <span className="info-chip">
              {
                product.condition
              }
            </span>

            <span className="info-chip">
              {product.brand}
            </span>
          </div>

          <p className="product-description">
            {
              product.description
            }
          </p>

          <div className="measurements">
            <strong>
              Measurements
            </strong>

            <p
              className="muted"
              style={{
                fontSize: '.78rem',
                marginTop: 5,
              }}
            >
              Measured flat.
              Compare with a piece
              you already own.
            </p>

            {Object.entries(
              product.measurements
            ).map(
              ([key, value]) => (
                <div
                  className="measure-row"
                  key={key}
                >
                  <span>
                    {key}
                  </span>

                  <b>
                    {value}
                  </b>
                </div>
              )
            )}
          </div>

          {sold ? (
            <div className="notice brown">
              <b>Sold Out.</b>{' '}
              This one-of-one
              piece already found
              its next home.
            </div>
          ) : (
            <div className="notice sage">
              Only{' '}
              {
                product.inventory
              }{' '}
              available. Adding it
              to cart does not
              reserve it until
              checkout is
              completed.
            </div>
          )}

          <div className="product-cta">
  <button
    type="button"
    disabled={sold}
    className="btn sage"
    onClick={() =>
      addToCart(product.id)
    }
  >
    <ShoppingBag size={18} />

    {sold
      ? 'Sold Out'
      : 'Add to cart'}
  </button>

  <button
    type="button"
    disabled={sold}
    className="btn checkout-now"
    onClick={handleCheckoutNow}
  >
    Checkout now
  </button>

  <button
    type="button"
    className="btn ghost wishlist-square"
    onClick={() =>
      toggleWishlist(product.id)
    }
    aria-label="Wishlist"
  >
    <Heart
      size={19}
      fill={
        wishlist.includes(product.id)
          ? 'currentColor'
          : 'none'
      }
    />
  </button>
</div>

          {/* TikTok video link */}
          {product.tiktokUrl && (
            <a
              href={
                product.tiktokUrl
              }
              target="_blank"
              rel="noopener noreferrer"
              className="btn ghost"
              style={{
                marginTop: 12,
                width: '100%',
                justifyContent:
                  'center',
              }}
            >
              <ExternalLink
                size={17}
              />
              Watch product video on
              TikTok
            </a>
          )}
        </div>
      </section>

      {related.length > 0 && (
        <section className="section">
          <div className="section-head">
            <div>
              <span className="eyebrow">
                Same mood
              </span>

              <h2>
                Related pieces
              </h2>
            </div>
          </div>

          <ProductGrid
            products={related}
          />
        </section>
      )}

      {recently.length >
        0 && (
        <section className="section">
          <div className="section-head">
            <div>
              <span className="eyebrow">
                Your trail
              </span>

              <h2>
                Recently viewed
              </h2>
            </div>
          </div>

          <ProductGrid
            products={recently}
          />
        </section>
      )}
    </div>
  );
}
