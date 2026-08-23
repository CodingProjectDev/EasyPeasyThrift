'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { ArrowRight, Leaf, Ruler, Sparkles, Tag } from 'lucide-react';

import ProductGrid from '@/components/product-grid';
import { ProductImage } from '@/components/product-image';
import { useStore } from '@/components/store-provider';

export default function HomePage() {
  const { products, settings, ready } = useStore();

  const featured = products
    .filter((product) => product.featured && product.inventory > 0)
    .slice(0, 4);

  const newArrivals = [...products]
    .filter((product) => product.newArrival)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 4);

  const categoryCards = useMemo(() => {
    const byCategory = new Map<string, (typeof products)[number]>();

    for (const product of products) {
      if (!byCategory.has(product.category)) {
        byCategory.set(product.category, product);
      }
    }

    return Array.from(byCategory.entries()).slice(0, 3);
  }, [products]);

  return (
    <>
      <section className="hero">
        <div className="hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">Curated thrift · one piece at a time</span>
            <h1>Wear something nobody else has.</h1>
            <p>
              Pre-loved fashion with personality, honest condition notes, and
              measurements that make secondhand shopping feel easy.
            </p>
            <div className="hero-actions">
              <Link href="/shop" className="btn">
                Shop the drop <ArrowRight size={17} />
              </Link>
              <Link href="/about" className="btn secondary">
                About us
              </Link>
            </div>
          </div>

          <div className="hero-media">
            <img
  src="/hero-image.jpg"
  alt="EasyPeasy-Thrift fashion"
/>
            <div className="hero-sticker">
              one-of-one finds
              <br />
              before they’re gone ✦
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Shop your mood</span>
              <h2>Find your next favorite.</h2>
            </div>
            <Link href="/shop" className="link-arrow">
              Shop all →
            </Link>
          </div>

          {!ready ? (
            <div className="empty-state">Loading categories…</div>
          ) : categoryCards.length ? (
            <div className="category-grid">
              {categoryCards.map(([category, product]) => (
                <Link
                  key={category}
                  href={`/shop?category=${encodeURIComponent(category)}`}
                  className="category-card"
                >
                  <ProductImage
                    src={product.images[0]}
                    alt={`${category} category`}
                  />
                  <div>
                    <h3>{category}</h3>
                    <p>Explore the collection</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>No categories yet.</h3>
              <p>Products added by Admin will appear here automatically.</p>
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Just landed</span>
              <h2>New arrivals</h2>
            </div>
            <Link href="/shop?sort=newest" className="link-arrow">
              See everything →
            </Link>
          </div>
          <ProductGrid products={newArrivals} />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="why-grid">
            <div className="why-image">
  <img
    src="/why-thrift.jpg"
    alt="EasyPeasy-Thrift store"
  />
</div>
            <div className="why-copy">
              <span className="eyebrow" style={{ color: '#c5d5c1' }}>
                Why thrift?
              </span>
              <h2>More style. Less sameness.</h2>
              <p>
                Thrifting keeps great clothes in motion and gives you pieces
                with character. We inspect every item, show the details clearly,
                and keep quantities honest.
              </p>
              <div className="why-points">
                <div className="why-point">
                  <Leaf size={20} />
                  <b>Lower impact</b>
                  <span>Extend the life of clothes already made.</span>
                </div>
                <div className="why-point">
                  <Sparkles size={20} />
                  <b>One-of-one energy</b>
                  <span>Unique pieces, not endless duplicates.</span>
                </div>
                <div className="why-point">
                  <Ruler size={20} />
                  <b>Measured for you</b>
                  <span>Key garment measurements on every listing.</span>
                </div>
                <div className="why-point">
                  <Tag size={20} />
                  <b>Fairly priced</b>
                  <span>Clear pricing based on brand, rarity, and condition.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Store edit</span>
              <h2>Featured finds</h2>
            </div>
          </div>
          <ProductGrid products={featured} />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="newsletter">
            <div>
              <span className="eyebrow" style={{ color: '#d7e2d4' }}>
                Don’t miss the good stuff
              </span>
              <h2>Fresh drops, vintage gems, zero spam.</h2>
              <p>
                Newsletter signup is not connected yet. Follow the store’s
                social pages for new drops and promo announcements.
              </p>
            </div>
            <Link href="/contact" className="btn">
              Contact the store
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">
                {settings.instagramUrl ? (
                  <a
                    href={settings.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Instagram
                  </a>
                ) : (
                  'Store style'
                )}
              </span>
              <h2>Styled in real life.</h2>
            </div>
          </div>
          <div className="insta-grid">
            {[
              'photo-1515886657613-9f3515b0c78f',
              'photo-1485968579580-b6d095142e6e',
              'photo-1539109136881-3be0616acf4b',
              'photo-1529139574466-a303027c1d8b',
              'photo-1490481651871-ab68de25d43d',
            ].map((id) => (
              <img
                key={id}
                src={`https://images.unsplash.com/${id}?auto=format&fit=crop&w=600&q=80`}
                alt="Thrift style inspiration"
              />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
