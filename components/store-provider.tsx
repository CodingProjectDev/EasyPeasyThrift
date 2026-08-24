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
  Product,
  PromoCode,
} from '@/lib/types';

const KEYS = {
  cart: 'easypeasy_cart',
  wishlist: 'easypeasy_wishlist',
  recent: 'easypeasy_recent',
};

export type StoreSettings = {
  storeName: string;
  tagline: string;
  announcementText: string;
  storeEmail: string;
  storePhone: string;
  shippingInfo: string;
  returnPolicy: string;
  codEnabled: boolean;
  qrEnabled: boolean;
  qrImage?: string;
  logoImage?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  pinterestUrl?: string;
};

const defaultSettings: StoreSettings = {
  storeName: 'EasyPeasy-Thrift',

  tagline:
    'Secondhand. Standout. So Easy.',

  announcementText:
    'Shipping: Depends on product and location • Secondhand. Standout. So Easy.',

  storeEmail: '',

  storePhone: '',

  shippingInfo:
    'Depends on product and location',

  returnPolicy:
    'Please make sure you check the item carefully before purchasing. By completing your purchase, you agree to this return policy.\n\nThank you for your understanding and support! ❤️',

  codEnabled: true,

  qrEnabled: true,

  qrImage:
    '/store-qr.png',

  instagramUrl: '',

  tiktokUrl: '',

  pinterestUrl: '',
};

type StoreContextValue = {
  ready: boolean;

  products: Product[];

  cart: CartItem[];

  wishlist: string[];

  recent: string[];

  promos: PromoCode[];

  settings:
    StoreSettings;

  cartCount: number;

  cartProducts: Array<{
    product: Product;
    quantity: number;
  }>;

  addToCart:
    (id: string) => void;

  removeFromCart:
    (id: string) => void;

  updateQty:
    (
      id: string,
      qty: number,
    ) => void;

  clearCart:
    () => void;

  toggleWishlist:
    (id: string) => void;

  recordRecent:
    (id: string) => void;

  placeLocalOrder:
    (order: Order) => void;

  addProduct:
    (product: Product) => void;

  updateProduct:
    (product: Product) => void;

  deleteProduct:
    (id: string) => void;

  saveSettings:
    (
      settings:
        StoreSettings,
    ) => Promise<void>;
};

const StoreContext =
  createContext<
    StoreContextValue | null
  >(null);

function load<T>(
  key: string,
  fallback: T,
): T {
  if (
    typeof window ===
    'undefined'
  ) {
    return fallback;
  }

  try {
    const raw =
      localStorage.getItem(
        key,
      );

    return raw
      ? JSON.parse(raw)
      : fallback;
  } catch {
    return fallback;
  }
}

function customerKey(
  base: string,
  userId:
    string | null,
) {
  return `${base}_${
    userId ||
    'guest'
  }`;
}

function settingsFromRow(
  row: any,
): StoreSettings {
  return {
    storeName:
      String(
        row?.store_name ||
          defaultSettings.storeName,
      ),

    tagline:
      String(
        row?.tagline ||
          defaultSettings.tagline,
      ),

    announcementText:
      typeof row
        ?.announcement_text ===
      'string'
        ? row
            .announcement_text
        : `Shipping: ${String(
            row?.shipping_info ||
              defaultSettings.shippingInfo,
          )} • ${String(
            row?.tagline ||
              defaultSettings.tagline,
          )}`,

    storeEmail:
      String(
        row?.store_email ||
          '',
      ),

    storePhone:
      String(
        row?.store_phone ||
          '',
      ),

    shippingInfo:
      String(
        row?.shipping_info ||
          defaultSettings.shippingInfo,
      ),

    returnPolicy:
      String(
        row?.return_policy ||
          defaultSettings.returnPolicy,
      ),

    codEnabled:
      typeof row
        ?.cod_enabled ===
      'boolean'
        ? row.cod_enabled
        : defaultSettings.codEnabled,

    qrEnabled:
      typeof row
        ?.qr_enabled ===
      'boolean'
        ? row.qr_enabled
        : defaultSettings.qrEnabled,

    qrImage:
      row?.qr_image_path
        ? String(
            row.qr_image_path,
          )
        : defaultSettings.qrImage,

    logoImage:
      row?.logo_path
        ? String(
            row.logo_path,
          )
        : undefined,

    instagramUrl:
      row?.instagram_url
        ? String(
            row.instagram_url,
          )
        : '',

    tiktokUrl:
      row?.tiktok_url
        ? String(
            row.tiktok_url,
          )
        : '',

    pinterestUrl:
      row?.pinterest_url
        ? String(
            row.pinterest_url,
          )
        : '',
  };
}

function promoFromRow(
  row: any,
): PromoCode {
  return {
    id:
      String(row.id),

    code:
      String(row.code),

    type:
      String(
        row.discount_type,
      ) as PromoCode['type'],

    value:
      Number(
        row.value,
      ),

    expiresAt:
      String(
        row.expires_at,
      ),

    active:
      Boolean(
        row.active,
      ),
  };
}

async function productNotification(
  productId: string,

  action:
    | 'cart'
    | 'wishlist',

  operation:
    | 'schedule'
    | 'cancel',
) {
  try {
    const response =
      await fetch(
        '/api/customer/product-notification',
        {
          method:
            'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify({
              productId,
              action,
              operation,
            }),

          keepalive:
            true,
        },
      );

    const payload =
      await response
        .json()
        .catch(
          () => ({}),
        );

    if (
      !response.ok
    ) {
      console.error(
        'PRODUCT NOTIFICATION FAILED:',
        {
          status:
            response.status,

          productId,

          action,

          operation,

          error:
            payload.error ||
            'Unknown error',
        },
      );

      return;
    }

    console.log(
      'PRODUCT NOTIFICATION:',
      {
        productId,
        action,
        operation,
      },
    );
  } catch (error) {
    console.error(
      'PRODUCT NOTIFICATION REQUEST FAILED:',
      error,
    );
  }
}

export function StoreProvider({
  children,
}: {
  children:
    React.ReactNode;
}) {
  const [
    ready,
    setReady,
  ] =
    useState(false);

  const [
    customerUserId,
    setCustomerUserId,
  ] =
    useState<
      string | null
    >(null);

  const [
    products,
    setProducts,
  ] =
    useState<
      Product[]
    >([]);

  const [
    cart,
    setCart,
  ] =
    useState<
      CartItem[]
    >([]);

  const [
    wishlist,
    setWishlist,
  ] =
    useState<
      string[]
    >([]);

  const [
    recent,
    setRecent,
  ] =
    useState<
      string[]
    >([]);

  const [
    promos,
    setPromos,
  ] =
    useState<
      PromoCode[]
    >([]);

  const [
    settings,
    setSettings,
  ] =
    useState<
      StoreSettings
    >(
      defaultSettings,
    );

  useEffect(() => {
    const supabase =
      createClient();

    let mounted =
      true;

    setRecent(
      load(
        KEYS.recent,
        [],
      ),
    );

    async function refreshProducts() {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            'products',
          )
          .select('*')
          .eq(
            'active',
            true,
          )
          .order(
            'created_at',
            {
              ascending:
                false,
            },
          );

      if (!mounted) {
        return;
      }

      if (error) {
        console.error(
          'Could not load products from Supabase:',
          error.message,
        );

        return;
      }

      setProducts(
        (
          data ||
          []
        ).map(
          productFromRow,
        ),
      );
    }

    async function refreshSettings() {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            'store_settings',
          )
          .select('*')
          .eq(
            'id',
            1,
          )
          .maybeSingle();

      if (!mounted) {
        return;
      }

      if (error) {
        console.error(
          'Could not load store settings from Supabase:',
          error.message,
        );

        return;
      }

      if (data) {
        setSettings(
          settingsFromRow(
            data,
          ),
        );
      }
    }

    async function refreshPromos() {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            'promo_codes',
          )
          .select(
            'id,code,discount_type,value,expires_at,active',
          )
          .eq(
            'active',
            true,
          )
          .gte(
            'expires_at',
            new Date()
              .toISOString(),
          )
          .order(
            'created_at',
            {
              ascending:
                false,
            },
          );

      if (!mounted) {
        return;
      }

      if (error) {
        console.error(
          'Could not load promo codes from Supabase:',
          error.message,
        );

        setPromos([]);
        return;
      }

      setPromos(
        (
          data ||
          []
        ).map(
          promoFromRow,
        ),
      );
    }

    async function boot() {
      await Promise.all([
        refreshProducts(),
        refreshSettings(),
        refreshPromos(),
      ]);

      const {
        data: {
          user,
        },
      } =
        await supabase
          .auth
          .getUser();

      if (!mounted) {
        return;
      }

      const id =
        user?.id ||
        null;

      setCustomerUserId(
        id,
      );

      setCart(
        load(
          customerKey(
            KEYS.cart,
            id,
          ),
          [],
        ),
      );

      setWishlist(
        load(
          customerKey(
            KEYS.wishlist,
            id,
          ),
          [],
        ),
      );

      setReady(true);
    }

    void boot();

    const {
      data: {
        subscription:
          authSubscription,
      },
    } =
      supabase.auth
        .onAuthStateChange(
          (
            _event,
            session,
          ) => {
            const id =
              session
                ?.user
                ?.id ||
              null;

            setCustomerUserId(
              id,
            );

            setCart(
              load(
                customerKey(
                  KEYS.cart,
                  id,
                ),
                [],
              ),
            );

            setWishlist(
              load(
                customerKey(
                  KEYS.wishlist,
                  id,
                ),
                [],
              ),
            );
          },
        );

    const productsChannel =
      supabase
        .channel(
          'easypeasy-products-sync',
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema:
              'public',
            table:
              'products',
          },
          () =>
            void refreshProducts(),
        )
        .subscribe();

    const settingsChannel =
      supabase
        .channel(
          'easypeasy-settings-sync',
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema:
              'public',
            table:
              'store_settings',
          },
          () =>
            void refreshSettings(),
        )
        .subscribe();

    const promosChannel =
      supabase
        .channel(
          'easypeasy-promos-sync',
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema:
              'public',
            table:
              'promo_codes',
          },
          () =>
            void refreshPromos(),
        )
        .subscribe();

    function handleFocus() {
      void refreshProducts();
      void refreshSettings();
      void refreshPromos();
    }

    window
      .addEventListener(
        'focus',
        handleFocus,
      );

    return () => {
      mounted =
        false;

      authSubscription
        .unsubscribe();

      window
        .removeEventListener(
          'focus',
          handleFocus,
        );

      void supabase
        .removeChannel(
          productsChannel,
        );

      void supabase
        .removeChannel(
          settingsChannel,
        );

      void supabase
        .removeChannel(
          promosChannel,
        );
    };
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }

    localStorage.setItem(
      KEYS.recent,
      JSON.stringify(
        recent,
      ),
    );
  }, [
    recent,
    ready,
  ]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    localStorage.setItem(
      customerKey(
        KEYS.cart,
        customerUserId,
      ),
      JSON.stringify(
        cart,
      ),
    );
  }, [
    cart,
    ready,
    customerUserId,
  ]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    localStorage.setItem(
      customerKey(
        KEYS.wishlist,
        customerUserId,
      ),
      JSON.stringify(
        wishlist,
      ),
    );
  }, [
    wishlist,
    ready,
    customerUserId,
  ]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    const productMap =
      new Map(
        products.map(
          (
            product,
          ) => [
            product.id,
            product,
          ],
        ),
      );

    setCart(
      (current) =>
        current
          .map(
            (item) => {
              const product =
                productMap.get(
                  item.productId,
                );

              if (
                !product ||
                product.inventory <
                  1
              ) {
                return null;
              }

              return {
                ...item,

                quantity:
                  Math.min(
                    item.quantity,
                    product.inventory,
                  ),
              };
            },
          )
          .filter(
            Boolean,
          ) as CartItem[],
    );

    setWishlist(
      (current) =>
        current.filter(
          (
            productId,
          ) =>
            productMap.has(
              productId,
            ),
        ),
    );
  }, [
    products,
    ready,
  ]);

  /*
   * ADD TO CART
   */
  const addToCart =
    (
      id: string,
    ) => {
      const product =
        products.find(
          (item) =>
            item.id ===
            id,
        );

      if (
        !product ||
        product.inventory <
          1
      ) {
        return;
      }

      const alreadyInCart =
        cart.some(
          (item) =>
            item.productId ===
            id,
        );

      setCart(
        (current) =>
          current.some(
            (item) =>
              item.productId ===
              id,
          )
            ? current.map(
                (
                  item,
                ) =>
                  item.productId ===
                  id
                    ? {
                        ...item,

                        quantity:
                          Math.min(
                            item.quantity +
                              1,
                            product.inventory,
                          ),
                      }
                    : item,
              )
            : [
                ...current,

                {
                  productId:
                    id,

                  quantity:
                    1,
                },
              ],
      );

      if (
        !alreadyInCart &&
        customerUserId
      ) {
        void productNotification(
          id,
          'cart',
          'schedule',
        );
      }
    };

  /*
   * REMOVE FROM CART
   */
  const removeFromCart =
    (
      id: string,
    ) => {
      setCart(
        (current) =>
          current.filter(
            (item) =>
              item.productId !==
              id,
          ),
      );

      if (
        customerUserId
      ) {
        void productNotification(
          id,
          'cart',
          'cancel',
        );
      }
    };

  /*
   * QUANTITY
   */
  const updateQty =
    (
      id: string,
      qty: number,
    ) => {
      const product =
        products.find(
          (item) =>
            item.id ===
            id,
        );

      if (!product) {
        return;
      }

      if (
        qty <= 0
      ) {
        removeFromCart(
          id,
        );

        return;
      }

      setCart(
        (current) =>
          current.map(
            (item) =>
              item.productId ===
              id
                ? {
                    ...item,

                    quantity:
                      Math.min(
                        qty,
                        product.inventory,
                      ),
                  }
                : item,
          ),
      );
    };

  /*
   * CLEAR CART
   */
  const clearCart =
    () => {
      const productIds =
        cart.map(
          (item) =>
            item.productId,
        );

      setCart([]);

      if (
        customerUserId
      ) {
        productIds.forEach(
          (id) => {
            void productNotification(
              id,
              'cart',
              'cancel',
            );
          },
        );
      }
    };

  /*
   * WISHLIST
   */
  const toggleWishlist =
    (
      id: string,
    ) => {
      const alreadySaved =
        wishlist.includes(
          id,
        );

      setWishlist(
        (current) =>
          current.includes(
            id,
          )
            ? current.filter(
                (
                  productId,
                ) =>
                  productId !==
                  id,
              )
            : [
                ...current,
                id,
              ],
      );

      if (
        customerUserId
      ) {
        void productNotification(
          id,
          'wishlist',
          alreadySaved
            ? 'cancel'
            : 'schedule',
        );
      }
    };

  const recordRecent =
    (
      id: string,
    ) => {
      setRecent(
        (current) =>
          [
            id,

            ...current.filter(
              (
                productId,
              ) =>
                productId !==
                id,
            ),
          ].slice(
            0,
            6,
          ),
      );
    };

  /*
   * ORDER COMPLETED
   *
   * Cancel cart reminder because
   * customer already purchased.
   */
  const placeLocalOrder =
    (
      _order: Order,
    ) => {
      const productIds =
        cart.map(
          (item) =>
            item.productId,
        );

      if (
        customerUserId
      ) {
        productIds.forEach(
          (id) => {
            void productNotification(
              id,
              'cart',
              'cancel',
            );
          },
        );
      }

      setCart([]);

      const supabase =
        createClient();

      void supabase
        .from(
          'products',
        )
        .select('*')
        .eq(
          'active',
          true,
        )
        .order(
          'created_at',
          {
            ascending:
              false,
          },
        )
        .then(
          ({
            data,
            error,
          }) => {
            if (
              !error
            ) {
              setProducts(
                (
                  data ||
                  []
                ).map(
                  productFromRow,
                ),
              );
            }
          },
        );
    };

  const addProduct =
    (
      product:
        Product,
    ) => {
      setProducts(
        (current) => [
          product,

          ...current.filter(
            (item) =>
              item.id !==
              product.id,
          ),
        ],
      );
    };

  const updateProduct =
    (
      product:
        Product,
    ) => {
      setProducts(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              product.id
                ? product
                : item,
          ),
      );
    };

  const deleteProduct =
    (
      id: string,
    ) => {
      setProducts(
        (current) =>
          current.filter(
            (
              product,
            ) =>
              product.id !==
              id,
          ),
      );

      setCart(
        (current) =>
          current.filter(
            (item) =>
              item.productId !==
              id,
          ),
      );

      setWishlist(
        (current) =>
          current.filter(
            (
              productId,
            ) =>
              productId !==
              id,
          ),
      );
    };

  const saveSettings =
    async (
      value:
        StoreSettings,
    ) => {
      const response =
        await fetch(
          '/api/admin/settings',
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                settings:
                  value,
              }),
          },
        );

      const payload =
        await response
          .json()
          .catch(
            () =>
              ({}),
          );

      if (
        !response.ok ||
        !payload.settings
      ) {
        throw new Error(
          payload.error ||
            'Could not save store settings.',
        );
      }

      setSettings(
        payload.settings as StoreSettings,
      );
    };

  const cartProducts =
    useMemo(
      () =>
        cart
          .map(
            (item) => ({
              product:
                products.find(
                  (
                    product,
                  ) =>
                    product.id ===
                    item.productId,
                ),

              quantity:
                item.quantity,
            }),
          )
          .filter(
            (item) =>
              item.product,
          ) as Array<{
          product:
            Product;

          quantity:
            number;
        }>,
      [
        cart,
        products,
      ],
    );

  const cartCount =
    cartProducts.reduce(
      (
        sum,
        item,
      ) =>
        sum +
        item.quantity,
      0,
    );

  return (
    <StoreContext.Provider
      value={{
        ready,

        products,

        cart,

        wishlist,

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

        addProduct,

        updateProduct,

        deleteProduct,

        saveSettings,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const value =
    useContext(
      StoreContext,
    );

  if (!value) {
    throw new Error(
      'useStore must be used within StoreProvider',
    );
  }

  return value;
}
