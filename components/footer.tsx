'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '@/components/store-provider';

export default function Footer() {
  const pathname = usePathname();
  const { settings } = useStore();

  if (pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <footer className="footer">
      <div className="footer-grid">
        {/* STORE INFORMATION */}
        <div className="footer-store-info">
          <div className="brand footer-brand">
            {settings.storeName}
          </div>

          <p>{settings.tagline}</p>

          <p className="muted">
            Curated products with honest condition notes and clear details.
          </p>

          {settings.storeEmail && (
            <p>
              <a
                className="footer-contact-link"
                href={`mailto:${settings.storeEmail}`}
              >
                {settings.storeEmail}
              </a>
            </p>
          )}

          {settings.storePhone && (
            <p>
              <a
                className="footer-contact-link"
                href={`tel:${settings.storePhone}`}
              >
                {settings.storePhone}
              </a>
            </p>
          )}
        </div>

        {/* SHOP */}
        <div className="footer-section">
          <h4>Shop</h4>

          <div className="footer-link-row">
            <Link href="/shop">
              All products
            </Link>

            <Link href="/wishlist">
              Wishlist
            </Link>

            <Link href="/account/orders">
              Orders
            </Link>
          </div>
        </div>

        {/* HELP */}
        <div className="footer-section">
          <h4>Help</h4>

          <div className="footer-link-row">
            <Link href="/faq">
              FAQ
            </Link>

            <Link href="/shipping-returns">
              Shipping & Returns
            </Link>

            <Link href="/contact">
              Contact
            </Link>
          </div>
        </div>

        {/* ABOUT */}
        <div className="footer-section">
          <h4>About</h4>

          <div className="footer-link-row">
            <Link href="/about">
              Our story
            </Link>

            <Link href="/store-information">
              Store information
            </Link>
          </div>

          {(settings.instagramUrl ||
            settings.tiktokUrl ||
            settings.pinterestUrl) && (
            <div className="footer-socials">
              {settings.instagramUrl && (
                <a
                  href={settings.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Instagram
                </a>
              )}

              {settings.instagramUrl &&
                (settings.tiktokUrl || settings.pinterestUrl) && (
                  <span aria-hidden="true">·</span>
                )}

              {settings.tiktokUrl && (
                <a
                  href={settings.tiktokUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  TikTok
                </a>
              )}

              {settings.tiktokUrl && settings.pinterestUrl && (
                <span aria-hidden="true">·</span>
              )}

              {settings.pinterestUrl && (
                <a
                  href={settings.pinterestUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Pinterest
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="footer-bottom">
        <span>
          © 2026 {settings.storeName}
        </span>
      </div>
    </footer>
  );
}