'use client';

import Link from 'next/link';
import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import { ProductImage } from '@/components/product-image';
import { useStore } from '@/components/store-provider';
import { money } from '@/lib/format';

const SLIDE_TIME = 3000;

export default function HeroProductSlider() {
  const { products, ready } = useStore();

  const latestProducts = useMemo(() => {
    return [...products]
      .filter(
        (product) =>
          product.inventory > 0 &&
          product.images?.length,
      )
      .sort((a, b) => {
        const aTime =
          new Date(
            a.createdAt || 0,
          ).getTime();

        const bTime =
          new Date(
            b.createdAt || 0,
          ).getTime();

        return bTime - aTime;
      })
      .slice(0, 5);
  }, [products]);

  const [
    activeIndex,
    setActiveIndex,
  ] = useState(0);

  /*
   * Reset to the first item if
   * product list changes.
   */
  useEffect(() => {
    setActiveIndex(0);
  }, [latestProducts.length]);

  /*
   * Automatically change every 5 seconds.
   */
  useEffect(() => {
    if (
      latestProducts.length <= 1
    ) {
      return;
    }

    const timer =
      window.setInterval(() => {
        setActiveIndex(
          (current) =>
            (current + 1) %
            latestProducts.length,
        );
      }, SLIDE_TIME);

    return () => {
      window.clearInterval(
        timer,
      );
    };
  }, [latestProducts.length]);

  if (
    !ready ||
    latestProducts.length === 0
  ) {
    return (
      <div className="hero-product-slider-fallback">
        <img
  src="/hero-image.jpg"
  alt="EasyPeasy-Thrift fashion"
/>
      </div>
    );
  }

  const product =
    latestProducts[
      activeIndex
    ];

  const image =
    product.images?.[0] ||
    '/noupload.png';

  return (
    <div className="hero-product-slider">
      <Link
        href={`/product/${product.slug}`}
        className="hero-product-slide"
        aria-label={`View ${product.name}`}
      >
        <ProductImage
          key={`${product.id}-${activeIndex}`}
          src={image}
          alt={product.name}
          className="hero-product-slide-image"
        />

        <div className="hero-product-shade" />

        <div className="hero-product-top-label">
          Latest find
        </div>

        <div className="hero-product-info">
          <span>
            New arrival
          </span>

          <h3>
            {product.name}
          </h3>

          <strong>
            {money(
              product.price,
            )}
          </strong>

          <small>
            View piece →
          </small>
        </div>
      </Link>

      {latestProducts.length >
        1 && (
        <div
          className="hero-product-dots"
          aria-label="Latest products"
        >
          {latestProducts.map(
            (
              item,
              index,
            ) => (
              <button
                key={
                  item.id
                }
                type="button"
                className={
                  index ===
                  activeIndex
                    ? 'active'
                    : ''
                }
                onClick={() =>
                  setActiveIndex(
                    index,
                  )
                }
                aria-label={`Show ${item.name}`}
              />
            ),
          )}
        </div>
      )}

      <div className="hero-product-counter">
        {activeIndex + 1}
        {' / '}
        {
          latestProducts.length
        }
      </div>
    </div>
  );
}