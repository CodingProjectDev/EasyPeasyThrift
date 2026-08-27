'use client';

import Link from 'next/link';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { ProductImage } from '@/components/product-image';
import { useStore } from '@/components/store-provider';
import { money } from '@/lib/format';

const SLIDE_TIME = 3000;
const SWIPE_DISTANCE = 50;

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
        const aTime = new Date(
          a.createdAt || 0,
        ).getTime();

        const bTime = new Date(
          b.createdAt || 0,
        ).getTime();

        return bTime - aTime;
      })
      .slice(0, 5);
  }, [products]);

  const [activeIndex, setActiveIndex] =
    useState(0);

  const touchStartX = useRef<number | null>(
    null,
  );

  const touchEndX = useRef<number | null>(
    null,
  );

  /*
   * Reset slider when product list changes
   */
  useEffect(() => {
    setActiveIndex(0);
  }, [latestProducts.length]);

  /*
   * Auto slide every 3 seconds
   * Works on desktop, tablet and phone
   */
  useEffect(() => {
    if (latestProducts.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex(
        (current) =>
          (current + 1) %
          latestProducts.length,
      );
    }, SLIDE_TIME);

    return () => {
      window.clearInterval(timer);
    };
  }, [latestProducts.length]);

  /*
   * Previous product
   */
  function previousSlide() {
    if (latestProducts.length <= 1) {
      return;
    }

    setActiveIndex(
      (current) =>
        (current -
          1 +
          latestProducts.length) %
        latestProducts.length,
    );
  }

  /*
   * Next product
   */
  function nextSlide() {
    if (latestProducts.length <= 1) {
      return;
    }

    setActiveIndex(
      (current) =>
        (current + 1) %
        latestProducts.length,
    );
  }

  /*
   * Phone touch swipe
   */
  function handleTouchStart(
    event: React.TouchEvent<HTMLDivElement>,
  ) {
    touchEndX.current = null;

    touchStartX.current =
      event.targetTouches[0].clientX;
  }

  function handleTouchMove(
    event: React.TouchEvent<HTMLDivElement>,
  ) {
    touchEndX.current =
      event.targetTouches[0].clientX;
  }

  function handleTouchEnd() {
    if (
      touchStartX.current === null ||
      touchEndX.current === null
    ) {
      return;
    }

    const distance =
      touchStartX.current -
      touchEndX.current;

    if (distance > SWIPE_DISTANCE) {
      nextSlide();
    }

    if (distance < -SWIPE_DISTANCE) {
      previousSlide();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  }

  /*
   * Fallback
   */
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
    latestProducts[activeIndex];

  const image =
    product.images?.[0] ||
    '/noupload.png';

  return (
    <div
      className="hero-product-slider"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
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
          draggable={false}
        />

        <div className="hero-product-shade" />

        <div className="hero-product-top-label">
          Latest find
        </div>

        <div className="hero-product-info">
          <span>New arrival</span>

          <h3>{product.name}</h3>

          <strong>
            {money(product.price)}
          </strong>

          <small>
            View piece →
          </small>
        </div>
      </Link>

      {latestProducts.length > 1 && (
        <div
          className="hero-product-dots"
          aria-label="Latest products"
        >
          {latestProducts.map(
            (item, index) => (
              <button
                key={item.id}
                type="button"
                className={
                  index === activeIndex
                    ? 'active'
                    : ''
                }
                onClick={() =>
                  setActiveIndex(index)
                }
                aria-label={`Show ${item.name}`}
              />
            ),
          )}
        </div>
      )}

      <div className="hero-product-counter">
        {activeIndex + 1} /{' '}
        {latestProducts.length}
      </div>
    </div>
  );
}