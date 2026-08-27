'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';

import type { Product } from '@/lib/types';

import { money } from '@/lib/format';
import { useStore } from './store-provider';
import { ProductImage } from './product-image';

function getDiscountPercent(
  product: Product,
) {
  if (
    !product.compareAt ||
    product.compareAt <= product.price
  ) {
    return null;
  }

  return Math.round(
    (1 -
      product.price /
        product.compareAt) *
      100,
  );
}

export default function ProductCard({
  product,
}: {
  product: Product;
}) {
  const {
    wishlist,
    toggleWishlist,
  } = useStore();

  const sold =
    product.inventory <= 0;

  const discountPercent =
    getDiscountPercent(
      product,
    );

  const onSale =
    discountPercent !== null;

  return (
    <article
      className={`product-card ${
        sold ? 'sold' : ''
      }`}
    >
      <div className="product-image-wrap">
        <Link
          href={`/product/${product.slug}`}
        >
          <ProductImage
            src={
              product.images[0] ||
              '/noupload.png'
            }
            alt={product.name}
          />
        </Link>

        <div className="badges">
          {onSale && (
            <span className="badge sale">
              {discountPercent}% OFF
            </span>
          )}

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

        {sold && (
          <div className="sold-overlay">
            SOLD OUT
          </div>
        )}

        <button
          type="button"
          className={`heart-btn ${
            wishlist.includes(product.id)
              ? 'active'
              : ''
          }`}
          onClick={() =>
            toggleWishlist(product.id)
          }
          aria-label="Wishlist"
        >
          <Heart
            size={18}
            fill={
              wishlist.includes(product.id)
                ? 'currentColor'
                : 'none'
            }
          />
        </button>
      </div>

      <div className="product-meta">
        <div>
          <Link
            href={`/product/${product.slug}`}
            className="product-name"
          >
            {product.name}
          </Link>

          <p>
            {product.brand}
            {' · '}
            {product.size}
            {' · '}
            {product.condition}
          </p>
        </div>

        <div className="product-card-price">
          <strong className="product-current-price">
            {money(product.price)}
          </strong>

          {onSale && product.compareAt && (
            <>
              <del className="product-old-price">
                {money(product.compareAt)}
              </del>

              <span className="product-discount-percent">
                -{discountPercent}% OFF
              </span>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
