'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { demoProducts } from '@/lib/demo-data';
import {
  CartItem,
  Order,
  OrderStatus,
  Product,
  PromoCode,
} from '@/lib/types';

import { createClient } from '@/lib/supabase/client';

const KEYS = {
  cart: 'easypeasy_cart',
  wishlist: 'easypeasy_wishlist',

  // These remain shared store data
  products: 'easypeasy_products',
  orders: 'easypeasy_orders',
  recent: 'easypeasy_recent',
  promos: 'easypeasy_promos',
  settings: 'easypeasy_settings',
};

export type StoreSettings = {
  storeName: string;
  tagline: string;
  storeEmail: string;
  storePhone: string;
  shippingFee: number;
  freeShippingThreshold: number;

  returnPolicy: string;
  codEnabled: boolean;
  qrEnabled: boolean;
  qrImage?: string;
  logoImage?: string;
};

const defaultSettings: StoreSettings = {
  storeName: 'EasyPeasy-Thrift',
  tagline: 'Secondhand. Standout. So Easy.',
  storeEmail: 'hello@easypeasy-thrift.example',
  storePhone: '',

  shippingFee: 6,
  freeShippingThreshold: 75,

  returnPolicy:
    'Returns are accepted within 7 days for items that differ materially from their listed condition.',

  codEnabled: true,
  qrEnabled: true,
  qrImage: '/store-qr.png',
};

const defaultPromos: PromoCode[] = [
  {
    id: 'promo-1',
    code: 'EASY10',
    type: 'percentage',
    value: 10,
    expiresAt: '2027-12-31',
    active: true,
  },
];

type StoreContextValue = {
  ready: boolean;

  products: Product[];
  cart: CartItem[];
  wishlist: string[];
  orders: Order[];
  recent: string[];

  promos: PromoCode[];
  settings: StoreSettings;

  cartCount: number;

  cartProducts: Array<{
    product: Product;
    quantity: number;
  }>;

  addToCart: (id: string) => void;
  removeFromCart: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clearCart: () => void;

  toggleWishlist: (id: string) => void;
  recordRecent: (id: string) => void;

  placeLocalOrder: (order: Order) => void;

  updateOrderStatus: (
    id: string,
    status: OrderStatus
  ) => void;

  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;

  savePromos: (promos: PromoCode[]) => void;
  saveSettings: (settings: StoreSettings) => void;
};

const StoreContext =
  createContext<StoreContextValue | null>(null);

function load<T>(
  key: string,
  fallback: T
): T {
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const raw =
      localStorage.getItem(key);

    return raw
      ? JSON.parse(raw)
      : fallback;
  } catch {
    return fallback;
  }
}

/*
  Each customer gets different local storage keys.

  Examples:

  easypeasy_cart_abc-user-id
  easypeasy_cart_xyz-user-id

  Logged-out users use:
  easypeasy_cart_guest
*/
function customerKey(
  base: string,
  userId: string | null
) {
  return `${base}_${userId || 'guest'}`;
}

export function StoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [ready, setReady] =
    useState(false);

  /*
   * Supabase customer ID currently using
   * this browser.
   */
  const [customerUserId, setCustomerUserId] =
    useState<string | null>(null);

  const [products, setProducts] =
    useState<Product[]>(demoProducts);

  const [cart, setCart] =
    useState<CartItem[]>([]);

  const [wishlist, setWishlist] =
    useState<string[]>([]);

  /*
   * We keep the main order collection shared
   * because the admin dashboard may need the
   * complete order collection.
   *
   * Customer order history will filter this
   * collection using userId.
   */
  const [orders, setOrders] =
    useState<Order[]>([]);

  const [recent, setRecent] =
    useState<string[]>([]);

  const [promos, setPromos] =
    useState<PromoCode[]>(
      defaultPromos
    );

  const [settings, setSettings] =
    useState<StoreSettings>(
      defaultSettings
    );

  /*
   * Initial data load + Supabase
   * authentication listener.
   */
  useEffect(() => {
    const supabase =
      createClient();

    let mounted = true;

    // Shared store data
    setProducts(
      load(
        KEYS.products,
        demoProducts
      )
    );

    setOrders(
      load(KEYS.orders, [])
    );

    setRecent(
      load(KEYS.recent, [])
    );

    setPromos(
      load(
        KEYS.promos,
        defaultPromos
      )
    );

    setSettings(
      load(
        KEYS.settings,
        defaultSettings
      )
    );

    async function loadCustomer() {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!mounted) {
        return;
      }

      const id =
        user?.id || null;

      setCustomerUserId(id);

      /*
       * Load only this customer's cart
       * and wishlist.
       */
      setCart(
        load(
          customerKey(
            KEYS.cart,
            id
          ),
          []
        )
      );

      setWishlist(
        load(
          customerKey(
            KEYS.wishlist,
            id
          ),
          []
        )
      );

      setReady(true);
    }

    loadCustomer();

    /*
     * Automatically switch cart/wishlist
     * when a customer logs in or logs out.
     */
    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        (_event, session) => {
          const id =
            session?.user?.id ||
            null;

          setCustomerUserId(
            id
          );

          setCart(
            load(
              customerKey(
                KEYS.cart,
                id
              ),
              []
            )
          );

          setWishlist(
            load(
              customerKey(
                KEYS.wishlist,
                id
              ),
              []
            )
          );
        }
      );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /*
   * Shared store data persistence
   */

  useEffect(() => {
    if (!ready) return;

    localStorage.setItem(
      KEYS.products,
      JSON.stringify(products)
    );
  }, [products, ready]);

  useEffect(() => {
    if (!ready) return;

    localStorage.setItem(
      KEYS.orders,
      JSON.stringify(orders)
    );
  }, [orders, ready]);

  useEffect(() => {
    if (!ready) return;

    localStorage.setItem(
      KEYS.recent,
      JSON.stringify(recent)
    );
  }, [recent, ready]);

  /*
   * CUSTOMER-SPECIFIC CART
   */
  useEffect(() => {
    if (!ready) return;

    localStorage.setItem(
      customerKey(
        KEYS.cart,
        customerUserId
      ),
      JSON.stringify(cart)
    );
  }, [
    cart,
    ready,
    customerUserId,
  ]);

  /*
   * CUSTOMER-SPECIFIC WISHLIST
   */
  useEffect(() => {
    if (!ready) return;

    localStorage.setItem(
      customerKey(
        KEYS.wishlist,
        customerUserId
      ),
      JSON.stringify(wishlist)
    );
  }, [
    wishlist,
    ready,
    customerUserId,
  ]);

  /*
   * CART
   */

  const addToCart = (
    id: string
  ) => {
    const product =
      products.find(
        (p) => p.id === id
      );

    if (
      !product ||
      product.inventory < 1
    ) {
      return;
    }

    setCart((prev) => {
      const existing =
        prev.find(
          (item) =>
            item.productId === id
        );

      if (existing) {
        return prev.map(
          (item) =>
            item.productId === id
              ? {
                  ...item,
                  quantity:
                    Math.min(
                      item.quantity +
                        1,
                      product.inventory
                    ),
                }
              : item
        );
      }

      return [
        ...prev,
        {
          productId: id,
          quantity: 1,
        },
      ];
    });
  };

  const removeFromCart = (
    id: string
  ) => {
    setCart((prev) =>
      prev.filter(
        (item) =>
          item.productId !== id
      )
    );
  };

  const updateQty = (
    id: string,
    qty: number
  ) => {
    const product =
      products.find(
        (p) => p.id === id
      );

    if (!product) {
      return;
    }

    if (qty <= 0) {
      removeFromCart(id);
      return;
    }

    setCart((prev) =>
      prev.map((item) =>
        item.productId === id
          ? {
              ...item,
              quantity:
                Math.min(
                  qty,
                  product.inventory
                ),
            }
          : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  /*
   * WISHLIST
   */

  const toggleWishlist = (
    id: string
  ) => {
    setWishlist((prev) =>
      prev.includes(id)
        ? prev.filter(
            (item) =>
              item !== id
          )
        : [...prev, id]
    );
  };

  /*
   * RECENT PRODUCTS
   */

  const recordRecent = (
    id: string
  ) => {
    setRecent((prev) =>
      [
        id,
        ...prev.filter(
          (item) =>
            item !== id
        ),
      ].slice(0, 6)
    );
  };

  /*
   * ORDER
   */

  const placeLocalOrder = (
    order: Order
  ) => {
    /*
     * Order object created during checkout
     * contains userId.
     *
     * We keep all orders together for admin
     * purposes. Customer order history filters
     * them by userId.
     */
    setOrders((prev) => [
      order,
      ...prev,
    ]);

    /*
     * Reduce inventory
     */
    setProducts((prev) =>
      prev.map((product) => {
        const line =
          order.items.find(
            (item) =>
              item.productId ===
              product.id
          );

        if (!line) {
          return product;
        }

        return {
          ...product,

          inventory:
            product.oneOfOne
              ? 0
              : Math.max(
                  0,
                  product.inventory -
                    line.quantity
                ),
        };
      })
    );

    /*
     * Clear only the currently logged-in
     * customer's cart.
     */
    setCart([]);
  };

  const updateOrderStatus = (
    id: string,
    status: OrderStatus
  ) => {
    const current =
      orders.find(
        (order) =>
          order.id === id
      );

    /*
     * Restore inventory if QR payment
     * is rejected.
     */
    if (
      current &&
      current.paymentMethod ===
        'QR' &&
      current.status !==
        'Payment Rejected' &&
      status ===
        'Payment Rejected'
    ) {
      setProducts((prev) =>
        prev.map(
          (product) => {
            const line =
              current.items.find(
                (item) =>
                  item.productId ===
                  product.id
              );

            if (!line) {
              return product;
            }

            return {
              ...product,

              inventory:
                product.oneOfOne
                  ? 1
                  : product.inventory +
                    line.quantity,
            };
          }
        )
      );
    }

    setOrders((prev) =>
      prev.map((order) =>
        order.id === id
          ? {
              ...order,
              status,
            }
          : order
      )
    );
  };

  /*
   * PRODUCTS
   */

  const addProduct = (
    product: Product
  ) => {
    setProducts((prev) => [
      product,
      ...prev,
    ]);
  };

  const updateProduct = (
    product: Product
  ) => {
    setProducts((prev) =>
      prev.map((item) =>
        item.id === product.id
          ? product
          : item
      )
    );
  };

  const deleteProduct = (
    id: string
  ) => {
    setProducts((prev) =>
      prev.filter(
        (product) =>
          product.id !== id
      )
    );

    setCart((prev) =>
      prev.filter(
        (item) =>
          item.productId !== id
      )
    );
  };

  /*
   * ADMIN SETTINGS
   */

  const savePromos = (
    value: PromoCode[]
  ) => {
    setPromos(value);

    localStorage.setItem(
      KEYS.promos,
      JSON.stringify(value)
    );
  };

  const saveSettings = (
    value: StoreSettings
  ) => {
    setSettings(value);

    localStorage.setItem(
      KEYS.settings,
      JSON.stringify(value)
    );
  };

  /*
   * CART PRODUCTS
   */

  const cartProducts =
    useMemo(() => {
      return cart
        .map((item) => ({
          product:
            products.find(
              (product) =>
                product.id ===
                item.productId
            ),

          quantity:
            item.quantity,
        }))
        .filter(
          (item) =>
            item.product
        ) as Array<{
        product: Product;
        quantity: number;
      }>;
    }, [cart, products]);

  const cartCount =
    cart.reduce(
      (sum, item) =>
        sum + item.quantity,
      0
    );

  return (
    <StoreContext.Provider
      value={{
        ready,

        products,
        cart,
        wishlist,
        orders,
        recent,

        promos,
        settings,

        cartCount,
        cartProducts,

        addToCart,
        removeFromCart,
        updateQty,
        clearCart,

        toggleWishlist,
        recordRecent,

        placeLocalOrder,
        updateOrderStatus,

        addProduct,
        updateProduct,
        deleteProduct,

        savePromos,
        saveSettings,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const value =
    useContext(StoreContext);

  if (!value) {
    throw new Error(
      'useStore must be used within StoreProvider'
    );
  }

  return value;
}
