'use client';

import {
  useEffect,
  useState,
} from 'react';

import Link from 'next/link';

import {
  BarChart3,
  Boxes,
  LogOut,
  Menu,
  Package,
  Percent,
  Settings,
  ShoppingCart,
  Users,
  X,
} from 'lucide-react';

import {
  usePathname,
} from 'next/navigation';

const nav = [
  [
    'Dashboard',
    '/admin',
    BarChart3,
  ],

  [
    'Products',
    '/admin/products',
    Package,
  ],

  [
    'Orders',
    '/admin/orders',
    ShoppingCart,
  ],

  [
    'Inventory',
    '/admin/inventory',
    Boxes,
  ],

  [
    'Customers',
    '/admin/customers',
    Users,
  ],

  [
    'Discounts',
    '/admin/discounts',
    Percent,
  ],

  [
    'Settings',
    '/admin/settings',
    Settings,
  ],
] as const;

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname =
    usePathname();

  const [
    mobileMenuOpen,
    setMobileMenuOpen,
  ] = useState(false);

  /*
   * Close mobile menu whenever
   * admin navigates to another page.
   */
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  function isActive(
    href: string,
  ) {
    if (
      href === '/admin'
    ) {
      return pathname ===
        '/admin';
    }

    return pathname.startsWith(
      href,
    );
  }

  function renderNav() {
    return nav.map(
      ([
        label,
        href,
        Icon,
      ]) => (
        <Link
          href={href}
          key={href}
          className={
            isActive(href)
              ? 'active'
              : ''
          }
        >
          <Icon
            size={18}
            aria-hidden="true"
          />

          <span>
            {label}
          </span>
        </Link>
      ),
    );
  }

  return (
    <div className="admin-main">
      {/* MOBILE HEADER */}

      <header className="admin-mobile-header">
        <Link
          href="/admin"
          className="admin-mobile-brand"
        >
          EasyPeasy—Admin
        </Link>

        <button
          type="button"
          className="admin-mobile-menu-button"
          aria-label={
            mobileMenuOpen
              ? 'Close admin menu'
              : 'Open admin menu'
          }
          aria-expanded={
            mobileMenuOpen
          }
          onClick={() =>
            setMobileMenuOpen(
              (current) =>
                !current,
            )
          }
        >
          {mobileMenuOpen ? (
            <X size={22} />
          ) : (
            <Menu
              size={23}
            />
          )}
        </button>
      </header>

      {/* MOBILE OVERLAY */}

      {mobileMenuOpen && (
        <button
          type="button"
          className="admin-mobile-overlay"
          aria-label="Close admin menu"
          onClick={() =>
            setMobileMenuOpen(
              false,
            )
          }
        />
      )}

      {/* MOBILE DRAWER */}

      <aside
        className={`admin-mobile-drawer ${
          mobileMenuOpen
            ? 'open'
            : ''
        }`}
      >
        <div className="admin-mobile-drawer-head">
          <div>
            <span className="eyebrow">
              Store control
            </span>

            <strong>
              EasyPeasy—Admin
            </strong>
          </div>

          <button
            type="button"
            className="admin-mobile-drawer-close"
            aria-label="Close menu"
            onClick={() =>
              setMobileMenuOpen(
                false,
              )
            }
          >
            <X size={20} />
          </button>
        </div>

        <nav className="admin-mobile-nav">
          {renderNav()}
        </nav>

        <form
          className="admin-mobile-logout"
          action="/api/admin/logout"
          method="post"
        >
          <button
            type="submit"
            className="btn ghost"
          >
            <LogOut
              size={17}
            />

            Sign out
          </button>
        </form>
      </aside>

      {/* DESKTOP LAYOUT */}

      <div className="admin-shell">
        <aside className="admin-sidebar">
          <div className="admin-brand">
            EasyPeasy—Admin
          </div>

          <nav className="admin-nav">
            {renderNav()}
          </nav>

          <form
            className="logout"
            action="/api/admin/logout"
            method="post"
          >
            <button
              type="submit"
              className="btn ghost"
              style={{
                width: '100%',
                color: 'white',
                borderColor:
                  '#45453f',
              }}
            >
              <LogOut
                size={16}
              />

              Sign out
            </button>
          </form>
        </aside>

        <section className="admin-content">
          {children}
        </section>
      </div>
    </div>
  );
}
