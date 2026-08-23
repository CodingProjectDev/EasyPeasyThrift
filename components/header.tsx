'use client';

import Link from 'next/link';
import {
  usePathname,
  useRouter,
} from 'next/navigation';

import {
  Heart,
  LogOut,
  Menu,
  Search,
  ShoppingBag,
  User,
  X,
} from 'lucide-react';

import {
  useEffect,
  useRef,
  useState,
} from 'react';

import { useStore } from './store-provider';
import { createClient } from '@/lib/supabase/client';

export default function Header() {
  const [open, setOpen] =
    useState(false);

  const [loggedIn, setLoggedIn] =
    useState(false);

  const [
    accountMenuOpen,
    setAccountMenuOpen,
  ] = useState(false);

  const accountMenuRef =
    useRef<HTMLDivElement | null>(null);

  const {
    cartCount,
    wishlist,
    settings,
    products,
  } = useStore();

  const pathname = usePathname();
  const router = useRouter();

  const categoryLinks = Array.from(
    new Set(products.map((product) => product.category).filter(Boolean)),
  )
    .slice(0, 2)
    .map((category) => [
      category,
      `/shop?category=${encodeURIComponent(category)}`,
    ] as const);

  const links = [
    ['Shop', '/shop'] as const,
    ...categoryLinks,
    ['About', '/about'] as const,
  ];

  useEffect(() => {
    const supabase = createClient();

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

          if (!session?.user) {
            setAccountMenuOpen(
              false,
            );
          }
        },
      );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Close account/mobile menus while scrolling.
  useEffect(() => {
    function handleScroll() {
      setAccountMenuOpen(false);
      setOpen(false);
    }

    window.addEventListener(
      'scroll',
      handleScroll,
      { passive: true },
    );

    return () => {
      window.removeEventListener(
        'scroll',
        handleScroll,
      );
    };
  }, []);

  // Close account menu when clicking outside.
  useEffect(() => {
    function handleOutsideClick(
      event: MouseEvent,
    ) {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(
          event.target as Node,
        )
      ) {
        setAccountMenuOpen(false);
      }
    }

    document.addEventListener(
      'mousedown',
      handleOutsideClick,
    );

    return () => {
      document.removeEventListener(
        'mousedown',
        handleOutsideClick,
      );
    };
  }, []);

  useEffect(() => {
    setAccountMenuOpen(false);
    setOpen(false);
  }, [pathname]);

  function handleAccountClick() {
    if (!loggedIn) {
      router.push('/login');
      return;
    }

    setAccountMenuOpen(
      (value) => !value,
    );
  }

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
    setAccountMenuOpen(false);
    setOpen(false);

    router.push('/');
    router.refresh();
  }

  if (
    pathname.startsWith('/admin')
  ) {
    return null;
  }

  return (
    <>
      <div className="announcement">
        Shipping:{' '}
        {settings.shippingInfo}

        <span> • </span>

        {settings.tagline}
      </div>

      <header className="site-header">
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
                height: 36,
                width: 'auto',
                maxWidth: 180,
                objectFit:
                  'contain',
              }}
            />
          ) : (
            settings.storeName
          )}
        </Link>

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

        <div className="header-actions">
          <Link
            href="/shop"
            aria-label="Search"
          >
            <Search size={20} />
          </Link>

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

          <div
            ref={accountMenuRef}
            style={{
              position:
                'relative',
            }}
          >
            <button
              type="button"
              onClick={
                handleAccountClick
              }
              aria-label={
                loggedIn
                  ? 'My account'
                  : 'Login'
              }
              title={
                loggedIn
                  ? 'My account'
                  : 'Login'
              }
              style={{
                background:
                  'none',
                border: 'none',
                padding: 0,
                margin: 0,
                cursor:
                  'pointer',
                display: 'flex',
                alignItems:
                  'center',
                color:
                  'inherit',
              }}
            >
              <User size={20} />
            </button>

            {loggedIn &&
              accountMenuOpen && (
                <div
                  style={{
                    position:
                      'absolute',
                    top: '34px',
                    right: 0,
                    minWidth:
                      '170px',
                    background:
                      '#fffdf8',
                    border:
                      '1px solid #d8d4ca',
                    borderRadius:
                      '12px',
                    padding:
                      '8px',
                    boxShadow:
                      '0 12px 30px rgba(0,0,0,0.12)',
                    zIndex:
                      9999,
                  }}
                >
                  <Link
                    href="/account/orders"
                    onClick={() =>
                      setAccountMenuOpen(
                        false,
                      )
                    }
                    style={{
                      display:
                        'flex',
                      alignItems:
                        'center',
                      gap: '9px',
                      padding:
                        '10px 12px',
                      borderRadius:
                        '8px',
                      textDecoration:
                        'none',
                      color:
                        'inherit',
                      fontWeight:
                        600,
                    }}
                  >
                    <ShoppingBag
                      size={17}
                    />
                    My Orders
                  </Link>

                  <button
                    type="button"
                    onClick={
                      handleLogout
                    }
                    style={{
                      width:
                        '100%',
                      display:
                        'flex',
                      alignItems:
                        'center',
                      gap: '9px',
                      padding:
                        '10px 12px',
                      border:
                        'none',
                      borderRadius:
                        '8px',
                      background:
                        'transparent',
                      cursor:
                        'pointer',
                      color:
                        '#9b4136',
                      fontWeight:
                        600,
                      fontSize:
                        'inherit',
                      textAlign:
                        'left',
                    }}
                  >
                    <LogOut
                      size={17}
                    />
                    Logout
                  </button>
                </div>
              )}
          </div>

          <Link
            href="/cart"
            className="count-link"
            aria-label="Cart"
          >
            <ShoppingBag
              size={20}
            />

            {cartCount > 0 && (
              <b>{cartCount}</b>
            )}
          </Link>

          <button
            type="button"
            className="mobile-menu-btn"
            onClick={() => {
              setOpen(
                (value) =>
                  !value,
              );

              setAccountMenuOpen(
                false,
              );
            }}
            aria-label="Menu"
          >
            {open ? (
              <X />
            ) : (
              <Menu />
            )}
          </button>
        </div>
      </header>

      {open && (
        <nav className="mobile-nav">
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

          <Link
            href="/wishlist"
            onClick={() =>
              setOpen(false)
            }
          >
            Wishlist
          </Link>

          {loggedIn ? (
            <>
              <Link
                href="/account/orders"
                onClick={() =>
                  setOpen(false)
                }
              >
                My Orders
              </Link>

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
