'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { productFromRow } from '@/lib/product-db';
import { createClient } from '@/lib/supabase/client';
import {
  CartItem,
  Order,
  OrderStatus,
  Product,
  PromoCode,
} from '@/lib/types';

const KEYS = {
  cart: 'easypeasy_cart',
  wishlist: 'easypeasy_wishlist',
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
  cartProducts: Array<{ product: Product; quantity: number }>;

  addToCart: (id: string) => void;
  removeFromCart: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clearCart: () => void;

  toggleWishlist: (id: string) => void;
  recordRecent: (id: string) => void;

  placeLocalOrder: (order: Order) => void;
  updateOrderStatus: (id: string, status: OrderStatus) => void;

  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;

  savePromos: (promos: PromoCode[]) => void;
  saveSettings: (settings: StoreSettings) => void;
};

const StoreContext = createContext<StoreContextValue | null>(null);

function load<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;

  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function customerKey(base: string, userId: string | null) {
  return `${base}_${userId || 'guest'}`;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [customerUserId, setCustomerUserId] = useState<string | null>(null);

  // IMPORTANT:
  // Products now come only from Supabase.
  // No demoProducts/localStorage product fallback.
  const [products, setProducts] = useState<Product[]>([]);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [promos, setPromos] = useState<PromoCode[]>(defaultPromos);
  const [settings, setSettings] = useState<StoreSettings>(defaultSettings);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    setOrders(load(KEYS.orders, []));
    setRecent(load(KEYS.recent, []));
    setPromos(load(KEYS.promos, defaultPromos));
    setSettings(load(KEYS.settings, defaultSettings));

    async function refreshProducts() {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (!mounted) return;

      if (error) {
        console.error('Could not load products from Supabase:', error.message);
        setProducts([]);
        return;
      }

      setProducts((data || []).map(productFromRow));
    }

    async function boot() {
      await refreshProducts();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      const id = user?.id || null;

      setCustomerUserId(id);
      setCart(load(customerKey(KEYS.cart, id), []));
      setWishlist(load(customerKey(KEYS.wishlist, id), []));
      setReady(true);
    }

    void boot();

    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const id = session?.user?.id || null;

      setCustomerUserId(id);
      setCart(load(customerKey(KEYS.cart, id), []));
      setWishlist(load(customerKey(KEYS.wishlist, id), []));
    });

    // Keep Admin and shopper catalog in sync when Supabase Realtime
    // is enabled for the products table.
    const productsChannel = supabase
      .channel('easypeasy-products-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
        },
        () => {
          void refreshProducts();
        },
      )
      .subscribe();

    // Also refresh when the user returns to the tab/window.
    // This makes catalog changes appear even if Realtime is not enabled.
    function handleFocus() {
      void refreshProducts();
    }

    window.addEventListener('focus', handleFocus);

    return () => {
      mounted = false;
      authSubscription.unsubscribe();
      window.removeEventListener('focus', handleFocus);
      void supabase.removeChannel(productsChannel);
    };
  }, []);

  useEffect(() => {
    if (ready) {
      localStorage.setItem(KEYS.orders, JSON.stringify(orders));
    }
  }, [orders, ready]);

  useEffect(() => {
    if (ready) {
      localStorage.setItem(KEYS.recent, JSON.stringify(recent));
    }
  }, [recent, ready]);

  useEffect(() => {
    if (ready) {
      localStorage.setItem(
        customerKey(KEYS.cart, customerUserId),
        JSON.stringify(cart),
      );
    }
  }, [cart, ready, customerUserId]);

  useEffect(() => {
    if (ready) {
      localStorage.setItem(
        customerKey(KEYS.wishlist, customerUserId),
        JSON.stringify(wishlist),
      );
    }
  }, [wishlist, ready, customerUserId]);

  const addToCart = (id: string) => {
    const product = products.find((p) => p.id === id);

    if (!product || product.inventory < 1) return;

    setCart((prev) =>
      prev.some((item) => item.productId === id)
        ? prev.map((item) =>
            item.productId === id
              ? {
                  ...item,
                  quantity: Math.min(item.quantity + 1, product.inventory),
                }
              : item,
          )
        : [...prev, { productId: id, quantity: 1 }],
    );
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== id));
  };

  const updateQty = (id: string, qty: number) => {
    const product = products.find((p) => p.id === id);

    if (!product) return;

    if (qty <= 0) {
      removeFromCart(id);
      return;
    }

    setCart((prev) =>
      prev.map((item) =>
        item.productId === id
          ? {
              ...item,
              quantity: Math.min(qty, product.inventory),
            }
          : item,
      ),
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const toggleWishlist = (id: string) => {
    setWishlist((prev) =>
      prev.includes(id)
        ? prev.filter((productId) => productId !== id)
        : [...prev, id],
    );
  };

  const recordRecent = (id: string) => {
    setRecent((prev) => [id, ...prev.filter((productId) => productId !== id)].slice(0, 6));
  };

  const placeLocalOrder = (order: Order) => {
    setOrders((prev) => [order, ...prev]);

    // The Supabase place_order RPC already changes database inventory.
    // This only updates the current browser immediately.
    setProducts((prev) =>
      prev.map((product) => {
        const line = order.items.find((item) => item.productId === product.id);

        if (!line) return product;

        return {
          ...product,
          inventory: product.oneOfOne
            ? 0
            : Math.max(0, product.inventory - line.quantity),
        };
      }),
    );

    setCart([]);
  };

  const updateOrderStatus = (id: string, status: OrderStatus) => {
    const current = orders.find((order) => order.id === id);

    if (
      current &&
      current.paymentMethod === 'QR' &&
      current.status !== 'Payment Rejected' &&
      status === 'Payment Rejected'
    ) {
      setProducts((prev) =>
        prev.map((product) => {
          const line = current.items.find(
            (item) => item.productId === product.id,
          );

          if (!line) return product;

          return {
            ...product,
            inventory: product.oneOfOne
              ? 1
              : product.inventory + line.quantity,
          };
        }),
      );
    }

    setOrders((prev) =>
      prev.map((order) =>
        order.id === id
          ? {
              ...order,
              status,
            }
          : order,
      ),
    );
  };

  // These update the current UI immediately after the Admin API
  // successfully saves/deletes the real Supabase product.
  const addProduct = (product: Product) => {
    setProducts((prev) => [
      product,
      ...prev.filter((item) => item.id !== product.id),
    ]);
  };

  const updateProduct = (product: Product) => {
    setProducts((prev) =>
      prev.map((item) => (item.id === product.id ? product : item)),
    );
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((product) => product.id !== id));
    setCart((prev) => prev.filter((item) => item.productId !== id));
    setWishlist((prev) => prev.filter((productId) => productId !== id));
  };

  const savePromos = (value: PromoCode[]) => {
    setPromos(value);
    localStorage.setItem(KEYS.promos, JSON.stringify(value));
  };

  const saveSettings = (value: StoreSettings) => {
    setSettings(value);
    localStorage.setItem(KEYS.settings, JSON.stringify(value));
  };

  const cartProducts = useMemo(
    () =>
      cart
        .map((item) => ({
          product: products.find((product) => product.id === item.productId),
          quantity: item.quantity,
        }))
        .filter((item) => item.product) as Array<{
        product: Product;
        quantity: number;
      }>,
    [cart, products],
  );

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

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
  const value = useContext(StoreContext);

  if (!value) {
    throw new Error('useStore must be used within StoreProvider');
  }

  return value;
}
