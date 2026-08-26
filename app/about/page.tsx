'use client';

import {
  DollarSign,
  Globe2,
  Heart,
  Leaf,
  Package,
  ShoppingBag,
  Tag,
} from 'lucide-react';

import { useStore } from '@/components/store-provider';

export default function About() {
  const { settings } = useStore();

  return (
    <div className="container about-brand-page">

      {/* =====================================
          HERO / OUR STORY
      ====================================== */}

      <section className="about-brand-hero">

        <div className="about-brand-copy">

          <span className="about-brand-eyebrow">
            Our Story
          </span>

          <div className="about-brand-line" />

          <h1 className="about-brand-title">
            The Story Behind
            <span>EasyPeasy Thrift</span>
          </h1>

          <div className="about-brand-decoration">
            <span />
            <Leaf size={24} />
          </div>

          <div className="about-brand-story">
            <p>
              EasyPeasy Thrift was inspired by our child-Ezekiel, and our
              family&apos;s love of life&apos;s simple joys.
            </p>

            <p>
              We make thrifting easy, cheerful, and affordable by offering
              unique pre-loved treasures that help families save money,
              reduce waste, and give wonderful items a fresh start.
            </p>
          </div>

          <div className="about-brand-quote">
            <span className="about-brand-spark">
              ♡
            </span>

            <p>
              Every purchase brings home something special with a brand-new
              story—easy-peasy!
            </p>
          </div>
        </div>


        {/* HERO IMAGE */}

        <div className="about-brand-hero-image">
          <img
            src="/about-story.png"
            alt="Beautiful pre-loved clothing selected for EasyPeasy Thrift"
          />

          <div className="about-brand-image-tag">
            <span>
              Pre-loved
            </span>

            <strong>
              Loved Again
            </strong>

            <Heart size={17} />
          </div>
        </div>

      </section>


      {/* =====================================
          THREE VALUES
      ====================================== */}

      <section className="about-brand-values">

        <div className="about-brand-value">

          <span className="about-value-number">
            01
          </span>

          <div className="about-value-icon">
            <ShoppingBag size={34} />
          </div>

          <h3>
            Easy
          </h3>

          <p>
            Simple, convenient secondhand shopping without the clutter.
          </p>

        </div>


        <div className="about-brand-value">

          <span className="about-value-number">
            02
          </span>

          <div className="about-value-icon">
            <DollarSign size={34} />
          </div>

          <h3>
            Affordable
          </h3>

          <p>
            Great finds that help families save while still shopping well.
          </p>

        </div>


        <div className="about-brand-value">

          <span className="about-value-number">
            03
          </span>

          <div className="about-value-icon">
            <Leaf size={34} />
          </div>

          <h3>
            Thoughtful
          </h3>

          <p>
            Giving pre-loved items a fresh start instead of creating waste.
          </p>

        </div>

      </section>


      {/* =====================================
          WHAT WE BELIEVE
      ====================================== */}

      <section className="about-believe">

        {/* LEFT IMAGE */}

        <div className="about-believe-image">
          <img
            src="/about-rack.png"
            alt="A curated rack of pre-loved clothing"
          />

          <div className="about-believe-photo-message">
            <span>
              GOOD CHOICES
            </span>

            <span>
              GOOD FINDS
            </span>

            <span>
              GOOD IMPACT
            </span>

            <Heart
              size={17}
              fill="currentColor"
            />
          </div>
        </div>


        {/* RIGHT CONTENT */}

        <div className="about-believe-copy">

          <span className="about-brand-eyebrow">
            What We Believe
          </span>

          <div className="about-brand-line" />

          <h2>
            Good clothes deserve another life.
          </h2>

          <p>
            {settings.storeName} is built around a simple idea: secondhand
            shopping should feel curated, trustworthy, and fun—not like
            digging through a messy catalog.
          </p>

          <p>
            Every product page is designed to show what matters: condition,
            size, measurements, brand, photos, and whether the piece is truly
            one-of-one.
          </p>

          <h3 className="about-brand-tagline">
            {settings.tagline}
          </h3>

          <div className="about-tagline-decoration">
            <span />
            <Leaf size={22} />
            <span />
          </div>

          <p>
            We mix a youthful fashion eye with the honest details buyers
            need. The result is a thrift store that feels like a brand while
            still respecting what makes secondhand special: limited pieces,
            unexpected finds, and less waste.
          </p>

        </div>

      </section>


      {/* =====================================
          BOTTOM BENEFITS
      ====================================== */}

      <section className="about-brand-benefits">

        <div className="about-brand-benefit">
          <Tag size={29} />

          <div>
            <strong>
              One-of-One
            </strong>

            <span>
              Finds
            </span>
          </div>
        </div>


        <div className="about-brand-benefit">
          <Heart size={29} />

          <div>
            <strong>
              Quality You
            </strong>

            <span>
              Can Trust
            </span>
          </div>
        </div>


        <div className="about-brand-benefit">
          <Package size={29} />

          <div>
            <strong>
              Packed with
            </strong>

            <span>
              Care
            </span>
          </div>
        </div>


        <div className="about-brand-benefit">
          <Globe2 size={29} />

          <div>
            <strong>
              Better for You,
            </strong>

            <span>
              Better for Earth
            </span>
          </div>
        </div>

      </section>

    </div>
  );
}