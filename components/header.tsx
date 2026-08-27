'use client';

import Link from 'next/link';
import {
  usePathname,
  useRouter,
} from 'next/navigation';

import {
  Heart,
  Menu,
  Search,
  ShoppingBag,
  User,
  X,
} from 'lucide-react';

import {
  useEffect,
  useState,
} from 'react';

import { useStore } from './store-provider';
import { createClient } from '@/lib/supabase/client';

export default function Header() {
  const [open, setOpen] =
    useState(false);

  const [loggedIn, setLoggedIn] =
    useState(false);

  const {
    cartCount,
    wishlist,
    settings,
    products,
  } = useStore();

  const pathname = usePathname();
  const router = useRouter();

  /*
   * Dynamic category navigation
   */
  const categoryLinks = Array.from(
    new Set(
      products
        .map(
          (product) =>
            product.category,
        )
        .filter(Boolean),
    ),
  )
    .slice(0, 2)
    .map(
      (category) =>
        [
          category,
          `/shop?category=${encodeURIComponent(
            category,
          )}`,
        ] as const,
    );

  const links = [
    ['Shop', '/shop'] as const,
    ...categoryLinks,
    ['About', '/about'] as const,
  ];

  /*
   * Check customer login
   */
  useEffect(() => {
    const supabase =
      createClient();

    async function checkUser() {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      setLoggedIn(!!user);
    }

    void checkUser();

    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        (_event, session) => {
          setLoggedIn(
            !!session?.user,
          );
        },
      );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /*
   * Close mobile menu while scrolling
   */
  useEffect(() => {
    function handleScroll() {
      setOpen(false);
    }

    window.addEventListener(
      'scroll',
      handleScroll,
      {
        passive: true,
      },
    );

    return () => {
      window.removeEventListener(
        'scroll',
        handleScroll,
      );
    };
  }, []);

  /*
   * Close menu after navigation
   */
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  /*
   * Account icon
   *
   * Logged in:
   * /account
   *
   * Logged out:
   * /login
   */
  function handleAccountClick() {
    setOpen(false);

    if (!loggedIn) {
      router.push('/login');
      return;
    }

    router.push('/account');
  }

  /*
   * Logout
   */
  async function handleLogout() {
    const supabase =
      createClient();

    const { error } =
      await supabase.auth.signOut();

    if (error) {
      console.error(
        'Logout error:',
        error.message,
      );

      return;
    }

    setLoggedIn(false);
    setOpen(false);

    router.push('/');
    router.refresh();
  }

  /*
   * Hide customer header
   * on admin pages
   */
  if (
    pathname.startsWith('/admin')
  ) {
    return null;
  }

  return (
    <>
      {/* =========================
          ANNOUNCEMENT BAR
      ========================== */}

      {settings.announcementText.trim() && (
  <div
    className="announcement"
    role="region"
    aria-label="Store announcement"
  >
    <div className="announcement-track">

      <div className="announcement-group">
        <span className="announcement-item">
          {settings.announcementText}
        </span>

        <span
          className="announcement-separator"
          aria-hidden="true"
        >
          ✦
        </span>

        <span
          className="announcement-item"
          aria-hidden="true"
        >
          {settings.announcementText}
        </span>

        <span
          className="announcement-separator"
          aria-hidden="true"
        >
          ✦
        </span>
      </div>

      <div
        className="announcement-group"
        aria-hidden="true"
      >
        <span className="announcement-item">
          {settings.announcementText}
        </span>

        <span className="announcement-separator">
          ✦
        </span>

        <span className="announcement-item">
          {settings.announcementText}
        </span>

        <span className="announcement-separator">
          ✦
        </span>
      </div>

    </div>
  </div>
)}

      {/* =========================
          HEADER
      ========================== */}

      <header className="site-header">

        {/* LOGO */}

        <Link
          className="brand"
          href="/"
        >
          {settings.logoImage ? (
            <img
              src={
                settings.logoImage
              }
              alt={
                settings.storeName
              }
              style={{
                height: 58,
                width: 'auto',
                maxWidth: 260,
                objectFit:
                  'contain',
              }}
            />
          ) : (
            settings.storeName
          )}
        </Link>

        {/* =========================
            DESKTOP NAVIGATION
        ========================== */}

        <nav className="desktop-nav">
          {links.map(
            ([label, href]) => (
              <Link
                key={label}
                href={href}
              >
                {label}
              </Link>
            ),
          )}
        </nav>

        {/* =========================
            HEADER ACTIONS
        ========================== */}

        <div className="header-actions">

          {/* SEARCH */}

          <Link
            href="/shop"
            aria-label="Search"
          >
            <Search size={20} />
          </Link>

          {/* WISHLIST */}

          <Link
            href="/wishlist"
            className="count-link"
            aria-label="Wishlist"
          >
            <Heart size={20} />

            {wishlist.length >
              0 && (
              <b>
                {
                  wishlist.length
                }
              </b>
            )}
          </Link>

          {/* =========================
              ACCOUNT / PROFILE
          ========================== */}

          <button
            type="button"
            onClick={
              handleAccountClick
            }
            aria-label={
              loggedIn
                ? 'My Profile'
                : 'Login'
            }
            title={
              loggedIn
                ? 'My Profile'
                : 'Login'
            }
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              margin: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              color: 'inherit',
            }}
          >
            <User size={20} />
          </button>

          {/* CART */}

          <Link
            href="/cart"
            className="count-link"
            aria-label="Cart"
          >
            <ShoppingBag
              size={20}
            />

            {cartCount > 0 && (
              <b>
                {cartCount}
              </b>
            )}
          </Link>

          {/* =========================
              MOBILE MENU BUTTON
          ========================== */}

          <button
            type="button"
            className="mobile-menu-btn"
            onClick={() =>
              setOpen(
                (value) => !value,
              )
            }
            aria-label={
              open
                ? 'Close menu'
                : 'Open menu'
            }
            aria-expanded={open}
          >
            {open ? (
              <X />
            ) : (
              <Menu />
            )}
          </button>
        </div>
      </header>

      {/* =========================
          MOBILE NAVIGATION
      ========================== */}

      {open && (
        <nav className="mobile-nav">

          {/* MAIN STORE LINKS */}

          {links.map(
            ([label, href]) => (
              <Link
                key={label}
                href={href}
                onClick={() =>
                  setOpen(false)
                }
              >
                {label}
              </Link>
            ),
          )}

          {/* DIVIDER */}

          <div
            style={{
              height: 1,
              background:
                '#e2ded5',
              margin:
                '4px 0',
            }}
          />

          {/* WISHLIST */}

          <Link
            href="/wishlist"
            onClick={() =>
              setOpen(false)
            }
          >
            Wishlist
          </Link>

          {/* =========================
              LOGGED IN CUSTOMER
          ========================== */}

          {loggedIn ? (
            <>
              {/* MY PROFILE */}

              <Link
                href="/account"
                onClick={() =>
                  setOpen(false)
                }
              >
                My Profile
              </Link>

              {/* MY ORDERS */}

              <Link
                href="/account/orders"
                onClick={() =>
                  setOpen(false)
                }
              >
                My Orders
              </Link>

              {/* DIVIDER */}

              <div
                style={{
                  height: 1,
                  background:
                    '#e2ded5',
                  margin:
                    '4px 0',
                }}
              />

              {/* LOGOUT */}

              <button
                type="button"
                onClick={
                  handleLogout
                }
                style={{
                  background:
                    'none',
                  border:
                    'none',
                  padding: 0,
                  textAlign:
                    'left',
                  cursor:
                    'pointer',
                  font:
                    'inherit',
                  color:
                    '#9b4136',
                }}
              >
                Logout
              </button>
            </>
          ) : (
            /* =========================
               NOT LOGGED IN
            ========================== */

            <Link
              href="/login"
              onClick={() =>
                setOpen(false)
              }
            >
              Login / Sign Up
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
