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

const links = [
  ['Shop', '/shop'],
  [
    'Brand New Product',
    '/shop?category=Brand%20New%20Product',
  ],
  [
    'Used Product',
    '/shop?category=Used%20Product',
  ],
  ['About', '/about'],
];

export default function Header() {
  const [open, setOpen] = useState(false);

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
  } = useStore();

  const pathname = usePathname();
  const router = useRouter();

  /*
   * CHECK CUSTOMER LOGIN
   */
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
            !!session?.user
          );

          if (!session?.user) {
            setAccountMenuOpen(
              false
            );
          }
        }
      );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /*
   * CLOSE MENUS WHEN PAGE SCROLLS
   */
  useEffect(() => {
    function handleScroll() {
      setAccountMenuOpen(false);
      setOpen(false);
    }

    window.addEventListener(
      'scroll',
      handleScroll,
      {
        passive: true,
      }
    );

    return () => {
      window.removeEventListener(
        'scroll',
        handleScroll
      );
    };
  }, []);

  /*
   * CLOSE ACCOUNT MENU
   * WHEN CLICKING OUTSIDE
   */
  useEffect(() => {
    function handleOutsideClick(
      event: MouseEvent
    ) {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(
          event.target as Node
        )
      ) {
        setAccountMenuOpen(false);
      }
    }

    document.addEventListener(
      'mousedown',
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        'mousedown',
        handleOutsideClick
      );
    };
  }, []);

  /*
   * CLOSE MENUS WHEN PAGE CHANGES
   */
  useEffect(() => {
    setAccountMenuOpen(false);
    setOpen(false);
  }, [pathname]);

  /*
   * ACCOUNT BUTTON
   */
  function handleAccountClick() {
    if (!loggedIn) {
      router.push('/login');
      return;
    }

    setAccountMenuOpen(
      (value) => !value
    );
  }

  /*
   * LOGOUT
   */
  async function handleLogout() {
    const supabase =
      createClient();

    const { error } =
      await supabase.auth.signOut();

    if (error) {
      console.error(
        'Logout error:',
        error.message
      );
      return;
    }

    setLoggedIn(false);
    setAccountMenuOpen(false);
    setOpen(false);

    router.push('/');
    router.refresh();
  }

  /*
   * DON'T SHOW CUSTOMER HEADER
   * INSIDE ADMIN
   */
  if (
    pathname.startsWith('/admin')
  ) {
    return null;
  }

  return (
    <>
      {/* ANNOUNCEMENT */}

      <div className="announcement">
        Free shipping on orders
        Rs.1000+

        <span> • </span>

        Every piece gets a second
        story.
      </div>

      {/* MAIN HEADER */}

      <header className="site-header">
        {/* BRAND */}

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
            <>
              EasyPeasy
              <span>
                —Thrift
              </span>
            </>
          )}
        </Link>

        {/* DESKTOP NAVIGATION */}

        <nav className="desktop-nav">
          {links.map(
            ([label, href]) => (
              <Link
                key={label}
                href={href}
              >
                {label}
              </Link>
            )
          )}
        </nav>

        {/* HEADER ACTIONS */}

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

          {/* ACCOUNT */}

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
                  {/* MY ORDERS */}

                  <Link
                    href="/account/orders"
                    onClick={() =>
                      setAccountMenuOpen(
                        false
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

                  {/* LOGOUT */}

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

          {/* MOBILE MENU */}

          <button
            type="button"
            className="mobile-menu-btn"
            onClick={() => {
              setOpen(
                (value) =>
                  !value
              );

              setAccountMenuOpen(
                false
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

      {/* MOBILE NAVIGATION */}

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
            )
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
