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
};

export type StoreSettings = {
  storeName: string;
  tagline: string;
  storeEmail: string;
  storePhone: string;

  // Customer-facing shipping text, e.g. "Depends on product and location".
  shippingInfo: string;

  returnPolicy: string;
  codEnabled: boolean;
  qrEnabled: boolean;
  qrImage?: string;
  logoImage?: string;

  // Kept only for compatibility with older pages/database columns.
  // They are no longer shown in Admin Settings or used by checkout.
  shippingFee: number;
  freeShippingThreshold: number;
};

const defaultSettings: StoreSettings = {
  storeName: 'EasyPeasy-Thrift',
  tagline: 'Secondhand. Standout. So Easy.',
  storeEmail: 'hello@easypeasy-thrift.example',
  storePhone: '',
  shippingInfo: 'Depends on product and location',
  returnPolicy:
    'Please make sure you check the item carefully before purchasing. By completing your purchase, you agree to this return policy.\n\nThank you for your understanding and support! ❤️',
  codEnabled: true,
  qrEnabled: true,
  qrImage: '/store-qr.png',
  shippingFee: 0,
  freeShippingThreshold: 0,
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
  saveSettings: (settings: StoreSettings) => Promise<void>;
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

function settingsFromRow(row: any): StoreSettings {
  return {
    storeName: String(row?.store_name || defaultSettings.storeName),
    tagline: String(row?.tagline || defaultSettings.tagline),
    storeEmail: String(row?.store_email || ''),
    storePhone: String(row?.store_phone || ''),
    shippingInfo: String(
      row?.shipping_info ||
        defaultSettings.shippingInfo,
    ),
    returnPolicy: String(
      row?.return_policy ||
        defaultSettings.returnPolicy,
    ),
    codEnabled:
      typeof row?.cod_enabled === 'boolean'
        ? row.cod_enabled
        : defaultSettings.codEnabled,
    qrEnabled:
      typeof row?.qr_enabled === 'boolean'
        ? row.qr_enabled
        : defaultSettings.qrEnabled,
    qrImage: row?.qr_image_path
      ? String(row.qr_image_path)
      : defaultSettings.qrImage,
    logoImage: row?.logo_path
      ? String(row.logo_path)
      : undefined,

    // Legacy numeric fields. Shipping is now confirmed separately.
    shippingFee: 0,
    freeShippingThreshold: 0,
  };
}

export function StoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const [customerUserId, setCustomerUserId] =
    useState<string | null>(null);

  // Products come only from Supabase.
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [promos, setPromos] =
    useState<PromoCode[]>(defaultPromos);
  const [settings, setSettings] =
    useState<StoreSettings>(defaultSettings);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    setOrders(load(KEYS.orders, []));
    setRecent(load(KEYS.recent, []));
    setPromos(load(KEYS.promos, defaultPromos));

    async function refreshProducts() {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (!mounted) return;

      if (error) {
        console.error(
          'Could not load products from Supabase:',
          error.message,
        );
        setProducts([]);
        return;
      }

      setProducts((data || []).map(productFromRow));
    }

    async function refreshSettings() {
      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        console.error(
          'Could not load store settings from Supabase:',
          error.message,
        );
        setSettings(defaultSettings);
        return;
      }

      if (data) {
        setSettings(settingsFromRow(data));
      }
    }

    async function boot() {
      await Promise.all([
        refreshProducts(),
        refreshSettings(),
      ]);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      const id = user?.id || null;
      setCustomerUserId(id);
      setCart(load(customerKey(KEYS.cart, id), []));
      setWishlist(
        load(customerKey(KEYS.wishlist, id), []),
      );
      setReady(true);
    }

    void boot();

    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const id = session?.user?.id || null;

        setCustomerUserId(id);
        setCart(load(customerKey(KEYS.cart, id), []));
        setWishlist(
          load(customerKey(KEYS.wishlist, id), []),
        );
      },
    );

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

    const settingsChannel = supabase
      .channel('easypeasy-settings-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'store_settings',
        },
        () => {
          void refreshSettings();
        },
      )
      .subscribe();

    function handleFocus() {
      void refreshProducts();
      void refreshSettings();
    }

    window.addEventListener('focus', handleFocus);

    return () => {
      mounted = false;
      authSubscription.unsubscribe();
      window.removeEventListener('focus', handleFocus);
      void supabase.removeChannel(productsChannel);
      void supabase.removeChannel(settingsChannel);
    };
  }, []);

  useEffect(() => {
    if (ready) {
      localStorage.setItem(
        KEYS.orders,
        JSON.stringify(orders),
      );
    }
  }, [orders, ready]);

  useEffect(() => {
    if (ready) {
      localStorage.setItem(
        KEYS.recent,
        JSON.stringify(recent),
      );
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
                  quantity: Math.min(
                    item.quantity + 1,
                    product.inventory,
                  ),
                }
              : item,
          )
        : [...prev, { productId: id, quantity: 1 }],
    );
  };

  const removeFromCart = (id: string) => {
    setCart((prev) =>
      prev.filter((item) => item.productId !== id),
    );
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
              quantity: Math.min(
                qty,
                product.inventory,
              ),
            }
          : item,
      ),
    );
  };

  const clearCart = () => setCart([]);

  const toggleWishlist = (id: string) => {
    setWishlist((prev) =>
      prev.includes(id)
        ? prev.filter(
            (productId) => productId !== id,
          )
        : [...prev, id],
    );
  };

  const recordRecent = (id: string) => {
    setRecent((prev) =>
      [
        id,
        ...prev.filter(
          (productId) => productId !== id,
        ),
      ].slice(0, 6),
    );
  };

  const placeLocalOrder = (order: Order) => {
    setOrders((prev) => [order, ...prev]);

    // Supabase RPC already decrements database inventory.
    // This updates the current browser immediately.
    setProducts((prev) =>
      prev.map((product) => {
        const line = order.items.find(
          (item) => item.productId === product.id,
        );

        if (!line) return product;

        return {
          ...product,
          inventory: product.oneOfOne
            ? 0
            : Math.max(
                0,
                product.inventory - line.quantity,
              ),
        };
      }),
    );

    setCart([]);
  };

  const updateOrderStatus = (
    id: string,
    status: OrderStatus,
  ) => {
    const current = orders.find(
      (order) => order.id === id,
    );

    if (
      current &&
      current.paymentMethod === 'QR' &&
      current.status !== 'Payment Rejected' &&
      status === 'Payment Rejected'
    ) {
      setProducts((prev) =>
        prev.map((product) => {
          const line = current.items.find(
            (item) =>
              item.productId === product.id,
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
          ? { ...order, status }
          : order,
      ),
    );
  };

  const addProduct = (product: Product) => {
    setProducts((prev) => [
      product,
      ...prev.filter(
        (item) => item.id !== product.id,
      ),
    ]);
  };

  const updateProduct = (product: Product) => {
    setProducts((prev) =>
      prev.map((item) =>
        item.id === product.id ? product : item,
      ),
    );
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) =>
      prev.filter((product) => product.id !== id),
    );
    setCart((prev) =>
      prev.filter((item) => item.productId !== id),
    );
    setWishlist((prev) =>
      prev.filter((productId) => productId !== id),
    );
  };

  const savePromos = (value: PromoCode[]) => {
    setPromos(value);
    localStorage.setItem(
      KEYS.promos,
      JSON.stringify(value),
    );
  };

  const saveSettings = async (
    value: StoreSettings,
  ) => {
    const response = await fetch(
      '/api/admin/settings',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          settings: value,
        }),
      },
    );

    const payload = await response
      .json()
      .catch(() => ({}));

    if (!response.ok || !payload.settings) {
      throw new Error(
        payload.error ||
          'Could not save store settings.',
      );
    }

    setSettings(
      payload.settings as StoreSettings,
    );
  };

  const cartProducts = useMemo(
    () =>
      cart
        .map((item) => ({
          product: products.find(
            (product) =>
              product.id === item.productId,
          ),
          quantity: item.quantity,
        }))
        .filter((item) => item.product) as Array<{
        product: Product;
        quantity: number;
      }>,
    [cart, products],
  );

  const cartCount = cart.reduce(
    (sum, item) => sum + item.quantity,
    0,
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
  const value = useContext(StoreContext);

  if (!value) {
    throw new Error(
      'useStore must be used within StoreProvider',
    );
  }

  return value;
}
