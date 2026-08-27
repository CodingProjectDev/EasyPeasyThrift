'use client';

import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  useParams,
  useRouter,
} from 'next/navigation';

import Link from 'next/link';

import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Play,
  ShoppingBag,
  X,
} from 'lucide-react';

import { SiTiktok } from 'react-icons/si';

import { useStore } from '@/components/store-provider';
import ProductGrid from '@/components/product-grid';
import { ProductImage } from '@/components/product-image';
import { money } from '@/lib/format';

export default function ProductPage() {
  const router = useRouter();

  const [galleryOpen, setGalleryOpen] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const galleryRef = useRef<HTMLDivElement | null>(null);

  const [
    showFullDescription,
    setShowFullDescription,
  ] = useState(false);

  const [
    tiktokEmbedUrl,
    setTiktokEmbedUrl,
  ] = useState<string | null>(null);

  const [
    tiktokLoading,
    setTiktokLoading,
  ] = useState(false);

  const [
    tiktokError,
    setTiktokError,
  ] = useState(false);

  const { slug } =
    useParams<{
      slug: string;
    }>();

  const {
    products,
    cart,
    wishlist,
    toggleWishlist,
    addToCart,
    recordRecent,
    recent,
    ready,
  } = useStore();

  const product =
    products.find(
      (item) =>
        item.slug === slug,
    );

  const productImages =
    product?.images?.length
      ? product.images
      : ['/noupload.png'];

  function openGallery(index: number) {
    setActiveImageIndex(index);
    setGalleryOpen(true);
  }

  function closeGallery() {
    setGalleryOpen(false);
  }

  function goToImage(index: number) {
    const total = productImages.length;
    if (!total) return;

    const nextIndex = (index + total) % total;
    setActiveImageIndex(nextIndex);

    const gallery = galleryRef.current;
    if (!gallery) return;

    gallery.scrollTo({
      left: gallery.clientWidth * nextIndex,
      behavior: 'smooth',
    });
  }

  function handleGalleryScroll() {
    const gallery = galleryRef.current;
    if (!gallery || !gallery.clientWidth) return;

    const nextIndex = Math.round(
      gallery.scrollLeft / gallery.clientWidth,
    );

    setActiveImageIndex(
      Math.max(0, Math.min(nextIndex, productImages.length - 1)),
    );
  }

  useEffect(() => {
    if (!galleryOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const frame = requestAnimationFrame(() => {
      const gallery = galleryRef.current;
      if (!gallery) return;

      gallery.scrollTo({
        left: gallery.clientWidth * activeImageIndex,
        behavior: 'auto',
      });
    });

    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
    };
  }, [galleryOpen, activeImageIndex]);

  useEffect(() => {
    if (!galleryOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setGalleryOpen(false);
      }

      if (event.key === 'ArrowLeft') {
        goToImage(activeImageIndex - 1);
      }

      if (event.key === 'ArrowRight') {
        goToImage(activeImageIndex + 1);
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [galleryOpen, activeImageIndex, productImages.length]);

  /*
   * RECENTLY VIEWED
   */
  useEffect(() => {
    if (product) {
      recordRecent(
        product.id,
      );
    }
  }, [product?.id]);

  /*
   * TIKTOK VIDEO
   *
   * Supports:
   * https://vt.tiktok.com/...
   * https://vm.tiktok.com/...
   * https://www.tiktok.com/@user/video/...
   */
  useEffect(() => {
    const tiktokUrl =
      product?.tiktokUrl?.trim();

    if (!tiktokUrl) {
      setTiktokEmbedUrl(null);
      setTiktokLoading(false);
      setTiktokError(false);

      return;
    }

    let cancelled = false;

    async function loadTikTokVideo() {
      setTiktokLoading(true);
      setTiktokError(false);
      setTiktokEmbedUrl(null);

      try {
        const response =
          await fetch(
            '/api/tiktok/resolve',
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body: JSON.stringify({
                url: tiktokUrl,
              }),
            },
          );

        const data =
          await response.json();

        if (cancelled) {
          return;
        }

        if (
          !response.ok ||
          !data.embedUrl
        ) {
          console.error(
            'TikTok resolve failed:',
            data,
          );

          setTiktokError(true);

          return;
        }

        setTiktokEmbedUrl(
          data.embedUrl,
        );
      } catch (error) {
        console.error(
          'TikTok video error:',
          error,
        );

        if (!cancelled) {
          setTiktokError(true);
        }
      } finally {
        if (!cancelled) {
          setTiktokLoading(false);
        }
      }
    }

    void loadTikTokVideo();

    return () => {
      cancelled = true;
    };
  }, [product?.tiktokUrl]);

  /*
   * LOADING
   */
  if (!ready) {
    return (
      <div className="container content-page">
        <div className="empty-state">
          <h2>
            Loading piece…
          </h2>

          <p className="muted">
            Checking the latest
            store inventory.
          </p>
        </div>
      </div>
    );
  }

  /*
   * PRODUCT NOT FOUND
   */
  if (!product) {
    return (
      <div className="container content-page">
        <h1>
          Piece not found.
        </h1>

        <p>
          It may have been
          removed from the rack.
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

  /*
   * DESCRIPTION
   */
  const descriptionWords =
    product.description
      .trim()
      .split(/\s+/);

  const hasLongDescription =
    descriptionWords.length >
    25;

  const displayedDescription =
    hasLongDescription &&
    !showFullDescription
      ? `${descriptionWords
          .slice(0, 25)
          .join(' ')}...`
      : product.description;

  /*
   * RELATED PRODUCTS
   */
  const related = products
    .filter(
      (item) =>
        item.id !==
          product.id &&
        item.category ===
          product.category,
    )
    .slice(0, 4);

  /*
   * RECENTLY VIEWED
   */
  const recently = recent
    .filter(
      (id) =>
        id !== product.id,
    )
    .map((id) =>
      products.find(
        (item) =>
          item.id === id,
      ),
    )
    .filter(Boolean)
    .slice(0, 4) as typeof products;

  /*
   * SOLD STATUS
   */
  const sold =
    product.inventory <= 0;

  /*
   * PRODUCT DISCOUNT
   */
  const discountPercent =
    product.compareAt &&
    product.compareAt > product.price
      ? Math.round(
          (1 -
            product.price /
              product.compareAt) *
            100,
        )
      : null;

  /*
   * CHECKOUT NOW
   */
  function handleCheckoutNow() {
    if (
      !product ||
      product.inventory < 1
    ) {
      return;
    }

    const productId =
      product.id;

    const alreadyInCart =
      cart.some(
        (item) =>
          item.productId ===
          productId,
      );

    if (!alreadyInCart) {
      addToCart(
        productId,
      );
    }

    router.push(
      '/checkout',
    );
  }

  return (
    <div className="container">
      <section className="product-page">
        {/* PRODUCT IMAGES */}

        <div className="product-gallery">
  <button
    type="button"
    className="product-gallery-button"
    onClick={() => openGallery(0)}
    aria-label={`Open ${product.name} photo gallery`}
  >
    <ProductImage
      src={productImages[0]}
      alt={product.name}
    />

    {productImages.length > 1 && (
      <span className="product-photo-count-badge">
        1 / {productImages.length}
      </span>
    )}
  </button>
</div>

        {/* PRODUCT INFORMATION */}

        <div className="product-info">
          <span className="eyebrow">
            {product.category}
            {' · '}
            {product.brand}
          </span>

          <h1>
            {product.name}
          </h1>

          {/* BADGES */}

          <div
            className="badges"
            style={{
              position: 'static',
              maxWidth: 'none',
            }}
          >
            {discountPercent && (
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

          {/* PRICE */}

          <div className="price-row">
            <strong>
              {money(
                product.price,
              )}
            </strong>

            {product.compareAt &&
              product.compareAt >
                product.price && (
                <del>
                  {money(
                    product.compareAt,
                  )}
                </del>
              )}

            {discountPercent && (
              <span className="product-page-discount">
                -{discountPercent}% OFF
              </span>
            )}
          </div>

          {/* PRODUCT INFO */}

          <div className="info-chips">
            <span className="info-chip">
              Size{' '}
              {product.size}
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

          {/* DESCRIPTION */}

          <div className="product-description-box">
            <h3 className="product-description-title">
              Description:
            </h3>

            <p className="product-description">
              {
                displayedDescription
              }
            </p>

            {hasLongDescription && (
              <button
                type="button"
                className="description-toggle"
                onClick={() =>
                  setShowFullDescription(
                    (
                      current,
                    ) =>
                      !current,
                  )
                }
              >
                {showFullDescription
                  ? '⌃ See less'
                  : 'See more'}
              </button>
            )}
          </div>

          {/* MEASUREMENTS */}

          {Object.entries(
            product.measurements,
          ).some(
            ([, value]) =>
              value &&
              value.trim() !==
                '' &&
              value.toLowerCase() !==
                'not listed',
          ) && (
            <div className="measurements">
              <strong>
                Measurements
              </strong>

              <p
                className="muted"
                style={{
                  fontSize:
                    '.78rem',
                  marginTop: 5,
                }}
              >
                Measured flat.
                Compare with a
                piece you already
                own.
              </p>

              {Object.entries(
                product.measurements,
              )
                .filter(
                  ([, value]) =>
                    value &&
                    value.trim() !==
                      '' &&
                    value.toLowerCase() !==
                      'not listed',
                )
                .map(
                  ([
                    key,
                    value,
                  ]) => (
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
                  ),
                )}
            </div>
          )}

          {/* INVENTORY */}

          {sold ? (
            <div className="notice brown">
              <b>
                Sold Out.
              </b>{' '}
              This one-of-one
              piece already found
              its next home.
            </div>
          ) : (
            <div className="notice sage">
              Only{' '}
              {product.inventory}{' '}
              available. Adding
              it to cart does not
              reserve it until
              checkout is
              completed.
            </div>
          )}

          {/* BUY BUTTONS */}

          <div className="product-cta">
            <button
              type="button"
              disabled={sold}
              className="btn sage"
              onClick={() =>
                addToCart(
                  product.id,
                )
              }
            >
              <ShoppingBag
                size={18}
              />

              {sold
                ? 'Sold Out'
                : 'Add to cart'}
            </button>

            <button
              type="button"
              disabled={sold}
              className="btn checkout-now"
              onClick={
                handleCheckoutNow
              }
            >
              Checkout now
            </button>

            <button
              type="button"
              className="btn ghost wishlist-square"
              onClick={() =>
                toggleWishlist(
                  product.id,
                )
              }
              aria-label="Wishlist"
            >
              <Heart
                size={19}
                fill={
                  wishlist.includes(
                    product.id,
                  )
                    ? 'currentColor'
                    : 'none'
                }
              />
            </button>
          </div>

          {/* TIKTOK VIDEO */}

          {product.tiktokUrl &&
            tiktokLoading && (
              <div className="notice sage">
                Loading product
                video...
              </div>
            )}

          {tiktokEmbedUrl && (
            <div className="product-video-section">
              <div className="product-video-heading">
                <Play
                  size={18}
                  fill="currentColor"
                />

                <strong>
                  Watch product
                  video
                </strong>
              </div>

              <div className="tiktok-video-wrap">
                <iframe
                src={tiktokEmbedUrl}
                title={`${product.name} product video`}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                loading="lazy"
                />
              </div>

              {/* FALLBACK BUTTON */}
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
                  <SiTiktok size={20} />
                    Watch on TikTok
                </a>
              )}
            </div>
          )}

          {/* TIKTOK EMBED FAILED */}

          {product.tiktokUrl &&
            !tiktokLoading &&
            !tiktokEmbedUrl &&
            tiktokError && (
              <div className="product-video-section">
                <div className="notice brown">
                  TikTok could not
                  play this video
                  inside the
                  website.
                </div>

                <a
                  href={
                    product.tiktokUrl
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn sage"
                  style={{
                    marginTop: 10,
                    width: '100%',
                    justifyContent:
                      'center',
                  }}
                >
                  <Play
                    size={17}
                    fill="currentColor"
                  />

                  Watch on TikTok
                </a>
              </div>
            )}
        </div>
      </section>

      {/* RELATED PRODUCTS */}

      {related.length >
        0 && (
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

      {/* RECENTLY VIEWED */}

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

      {galleryOpen && (
        <div
          className="product-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`${product.name} photo gallery`}
        >
          <button
            type="button"
            className="product-lightbox-close"
            onClick={closeGallery}
            aria-label="Close photo gallery"
          >
            <X size={26} />
          </button>

          <div
            ref={galleryRef}
            className="product-lightbox-track"
            onScroll={handleGalleryScroll}
          >
            {productImages.map((image, index) => (
              <div
                className="product-lightbox-slide"
                key={`${image}-lightbox-${index}`}
              >
                <ProductImage
                  src={image}
                  alt={`${product.name} photo ${index + 1}`}
                />
              </div>
            ))}
          </div>

          {productImages.length > 1 && (
            <>
              <button
                type="button"
                className="product-lightbox-arrow product-lightbox-prev"
                onClick={() =>
                  goToImage(activeImageIndex - 1)
                }
                aria-label="Previous photo"
              >
                <ChevronLeft size={28} />
              </button>

              <button
                type="button"
                className="product-lightbox-arrow product-lightbox-next"
                onClick={() =>
                  goToImage(activeImageIndex + 1)
                }
                aria-label="Next photo"
              >
                <ChevronRight size={28} />
              </button>

              <div className="product-lightbox-count">
                {activeImageIndex + 1} / {productImages.length}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}