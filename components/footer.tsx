'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();

  if (pathname.startsWith('/admin')) return null;

  return (
    <footer className="footer">
      <div className="footer-grid">
        <div>
          <div className="brand footer-brand">
            EasyPeasy<span>—Thrift</span>
          </div>

          <p>Secondhand. Standout. So Easy.</p>

          <p className="muted">
            Curated pre-loved fashion with honest condition notes and exact
            measurements.
          </p>
        </div>

        <div>
          <h4>Shop</h4>
          <Link href="/shop">All pieces</Link>
          <Link href="/wishlist">Wishlist</Link>
          <Link href="/account/orders">Orders</Link>
        </div>

        <div>
          <h4>Help</h4>
          <Link href="/faq">FAQ</Link>
          <Link href="/shipping-returns">Shipping & Returns</Link>
          <Link href="/contact">Contact</Link>
        </div>

        <div>
          <h4>About</h4>

          <Link href="/about">Our story</Link>

          <Link href="/admin">Admin</Link>

          <div className="footer-socials">
            <a
              href="https://www.instagram.com/YOUR_INSTAGRAM_USERNAME"
              target="_blank"
              rel="noopener noreferrer"
            >
              Instagram
            </a>

            <span>·</span>

            <a
              href="https://www.tiktok.com/@YOUR_TIKTOK_USERNAME"
              target="_blank"
              rel="noopener noreferrer"
            >
              TikTok
            </a>

            <span>·</span>

            <a
              href="https://www.pinterest.com/YOUR_PINTEREST_USERNAME"
              target="_blank"
              rel="noopener noreferrer"
            >
              Pinterest
            </a>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© 2026 EasyPeasy-Thrift</span>
        <span>Built for one-of-one finds.</span>
      </div>
    </footer>
  );
}