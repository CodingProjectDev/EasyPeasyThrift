'use client';

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';

import Link from 'next/link';

import {
  Check,
  QrCode,
  Truck,
} from 'lucide-react';

import {
  useStore,
} from '@/components/store-provider';

import {
  money,
} from '@/lib/format';

import {
  Order,
  PaymentMethod,
} from '@/lib/types';

import {
  createClient,
} from '@/lib/supabase/client';

export default function CheckoutPage() {
  const {
    products,
    cartProducts,
    placeLocalOrder,
    promos,
    settings,
    ready,
  } = useStore();

  const [
    method,
    setMethod,
  ] =
    useState<PaymentMethod>(
      'COD',
    );

  const [
    proof,
    setProof,
  ] =
    useState<File | null>(
      null,
    );

  const [
    proofPreview,
    setProofPreview,
  ] =
    useState('');

  const [
    txid,
    setTxid,
  ] =
    useState('');

  const [
    promo,
    setPromo,
  ] =
    useState('');

  const [
    placed,
    setPlaced,
  ] =
    useState<Order | null>(
      null,
    );

  const [
    busy,
    setBusy,
  ] =
    useState(false);

  const [
    userId,
    setUserId,
  ] =
    useState<
      string | null
    >(null);

  const [
    userEmail,
    setUserEmail,
  ] =
    useState('');

  const [
    authChecked,
    setAuthChecked,
  ] =
    useState(false);

  /*
   * Checkout Now product ID.
   *
   * Example:
   *
   * /checkout?buyNow=PRODUCT_ID
   */
  const [
    buyNowProductId,
    setBuyNowProductId,
  ] =
    useState('');

  const [
    checkoutIntentReady,
    setCheckoutIntentReady,
  ] =
    useState(false);

  /* =========================================
     READ CHECKOUT INTENT
  ========================================= */

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search,
      );

    const buyNow =
      params.get(
        'buyNow',
      );

    setBuyNowProductId(
      buyNow || '',
    );

    setCheckoutIntentReady(
      true,
    );
  }, []);

  /* =========================================
     CUSTOMER AUTH
  ========================================= */

  useEffect(() => {
    const supabase =
      createClient();

    async function loadUser() {
      const {
        data: {
          user,
        },
      } =
        await supabase.auth.getUser();

      setUserId(
        user?.id ||
          null,
      );

      setUserEmail(
        user?.email ||
          '',
      );

      setAuthChecked(
        true,
      );
    }

    void loadUser();

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        (
          _event,
          session,
        ) => {
          setUserId(
            session?.user?.id ||
              null,
          );

          setUserEmail(
            session?.user?.email ||
              '',
          );

          setAuthChecked(
            true,
          );
        },
      );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /* =========================================
     PAYMENT DEFAULT
  ========================================= */

  useEffect(() => {
    if (
      !settings.codEnabled &&
      settings.qrEnabled
    ) {
      setMethod(
        'QR',
      );
    } else if (
      settings.codEnabled &&
      !settings.qrEnabled
    ) {
      setMethod(
        'COD',
      );
    }
  }, [
    settings.codEnabled,
    settings.qrEnabled,
  ]);

  /* =========================================
     BUY NOW PRODUCT
  ========================================= */

  const buyNowProduct =
    buyNowProductId
      ? products.find(
          (product) =>
            product.id ===
            buyNowProductId,
        )
      : undefined;

  const isBuyNow =
    Boolean(
      buyNowProductId,
    );

  /*
   * Checkout Now:
   * use ONLY the selected product.
   *
   * Normal checkout:
   * use all cart products.
   */
  const checkoutProducts =
    isBuyNow
      ? buyNowProduct &&
        buyNowProduct.inventory >
          0
        ? [
            {
              product:
                buyNowProduct,
              quantity:
                1,
            },
          ]
        : []
      : cartProducts;

  /*
   * Preserve Buy Now through login.
   */
  const checkoutPath =
    isBuyNow
      ? `/checkout?buyNow=${encodeURIComponent(
          buyNowProductId,
        )}`
      : '/checkout';

  const loginPath =
    `/login?next=${encodeURIComponent(
      checkoutPath,
    )}`;

  /* =========================================
     TOTALS
  ========================================= */

  const subtotal =
    checkoutProducts.reduce(
      (
        sum,
        item,
      ) =>
        sum +
        item.product.price *
          item.quantity,
      0,
    );

  const regularSubtotal =
    checkoutProducts.reduce(
      (
        sum,
        item,
      ) => {
        const regularPrice =
          item.product
            .compareAt &&
          item.product
            .compareAt >
            item.product
              .price
            ? item.product
                .compareAt
            : item.product
                .price;

        return (
          sum +
          regularPrice *
            item.quantity
        );
      },
      0,
    );

  const productSavings =
    Math.max(
      0,
      regularSubtotal -
        subtotal,
    );

  /*
   * Product-level shipping.
   *
   * Free product        -> Rs. 0
   * Fixed-fee product   -> fee × quantity
   * Manual/location     -> confirmed separately
   *
   * The Supabase place_order() function
   * performs the authoritative calculation
   * again on the server/database side.
   */
  const shipping =
    checkoutProducts.reduce(
      (
        sum,
        item,
      ) => {
        if (
          item.product
            .freeShipping
        ) {
          return sum;
        }

        if (
          item.product
            .shippingFee ==
          null
        ) {
          return sum;
        }

        return (
          sum +
          Number(
            item.product
              .shippingFee,
          ) *
            item.quantity
        );
      },
      0,
    );

  const hasManualShipping =
    checkoutProducts.some(
      (item) =>
        !item.product
          .freeShipping &&
        item.product
          .shippingFee ==
          null,
    );

  const shippingLabel =
    hasManualShipping
      ? shipping > 0
        ? `${money(
            shipping,
          )} + location-based shipping`
        : 'Depends on product and location'
      : shipping > 0
        ? money(
            shipping,
          )
        : 'FREE';

  const validPromo =
    useMemo(() => {
      return promos.find(
        (item) =>
          item.active &&
          item.code.toLowerCase() ===
            promo
              .trim()
              .toLowerCase() &&
          new Date(
            item.expiresAt,
          ) >=
            new Date(),
      );
    }, [
      promo,
      promos,
    ]);

  const discount =
    validPromo
      ? validPromo.type ===
        'percentage'
        ? (subtotal *
            validPromo.value) /
          100
        : Math.min(
            subtotal,
            validPromo.value,
          )
      : 0;

  const total =
    Math.max(
      0,
      subtotal +
        shipping -
        discount,
    );

  /* =========================================
     PAYMENT PROOF
  ========================================= */

  function handleProof(
    file?: File,
  ) {
    if (!file) {
      setProof(
        null,
      );

      setProofPreview(
        '',
      );

      return;
    }

    setProof(
      file,
    );

    const reader =
      new FileReader();

    reader.onload =
      () => {
        setProofPreview(
          String(
            reader.result,
          ),
        );
      };

    reader.readAsDataURL(
      file,
    );
  }

  /* =========================================
     PLACE ORDER
  ========================================= */

  async function submit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const form =
      new FormData(
        event.currentTarget,
      );

    if (
      !checkoutProducts.length
    ) {
      alert(
        'There are no products available for checkout.',
      );

      return;
    }

    if (
      method === 'QR' &&
      (
        !proof ||
        !txid.trim()
      )
    ) {
      alert(
        'For QR Payment, upload payment proof and enter the transaction/reference ID.',
      );

      return;
    }

    setBusy(
      true,
    );

    try {
      const supabase =
        createClient();

      const {
        data: {
          session,
        },
        error:
          sessionError,
      } =
        await supabase.auth.getSession();

      /*
       * Session expired.
       *
       * Keep the exact checkout
       * destination, including
       * the Buy Now product ID.
       */
      if (
        sessionError ||
        !session ||
        !session.access_token
      ) {
        alert(
          'Your login session has expired. Please login again.',
        );

        window.location.href =
          loginPath;

        return;
      }

      const customer = {
        name:
          String(
            form.get(
              'name',
            ) ||
              '',
          ).trim(),

        email:
          String(
            form.get(
              'email',
            ) ||
              '',
          ).trim(),

        phone:
          String(
            form.get(
              'phone',
            ) ||
              '',
          ).trim(),

        address:
          String(
            form.get(
              'address',
            ) ||
              '',
          ).trim(),

        city:
          String(
            form.get(
              'city',
            ) ||
              '',
          ).trim(),

        postalCode:
          String(
            form.get(
              'postalCode',
            ) ||
              '',
          ).trim(),
      };

      if (
        !customer.name ||
        !customer.email ||
        !customer.phone ||
        !customer.address ||
        !customer.city ||
        !customer.postalCode
      ) {
        throw new Error(
          'Please complete all delivery details.',
        );
      }

      let proofUrl =
        '';

      /* =====================================
         QR PAYMENT PROOF
      ====================================== */

      if (
        method === 'QR' &&
        proof
      ) {
        const uploadForm =
          new FormData();

        uploadForm.append(
          'file',
          proof,
        );

        const proofResponse =
          await fetch(
            '/api/payment-proof',
            {
              method:
                'POST',

              headers: {
                Authorization:
                  `Bearer ${session.access_token}`,
              },

              body:
                uploadForm,
            },
          );

        const proofResult =
          await proofResponse
            .json()
            .catch(
              () => ({}),
            );

        if (
          !proofResponse.ok
        ) {
          throw new Error(
            proofResult.error ||
              'Payment proof upload failed.',
          );
        }

        proofUrl =
          proofResult.path ||
          '';

        if (!proofUrl) {
          throw new Error(
            'Payment proof was uploaded but no storage path was returned.',
          );
        }
      }

      /* =====================================
         BUILD ORDER
      ====================================== */

      const order:
        Order & {
          userId: string;
        } = {
        id:
          `EP-${Date.now()
            .toString()
            .slice(-8)}`,

        createdAt:
          new Date()
            .toISOString(),

        userId:
          session.user.id,

        customer,

        /*
         * IMPORTANT:
         *
         * Checkout Now uses the
         * selected product only.
         *
         * Cart checkout uses the
         * cart products.
         */
        items:
          checkoutProducts.map(
            ({
              product,
              quantity,
            }) => ({
              productId:
                product.id,

              name:
                product.name,

              price:
                product.price,

              quantity,
            }),
          ),

        subtotal,

        shipping,

        shippingPending:
          hasManualShipping,

        discount,

        total,

        paymentMethod:
          method,

        paymentProofName:
          proof?.name,

        transactionId:
          method ===
            'QR'
            ? txid.trim()
            : undefined,

        status:
          method ===
            'QR'
            ? 'Payment Verification Required'
            : 'Pending',
      };

      /* =====================================
         CREATE ORDER
      ====================================== */

      const response =
        await fetch(
          '/api/orders',
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',

              Authorization:
                `Bearer ${session.access_token}`,
            },

            body:
              JSON.stringify({
                ...order,

                paymentProofPath:
                  proofUrl,

                promoCode:
                  validPromo?.code ||
                  null,
              }),
          },
        );

      const result =
        await response
          .json()
          .catch(
            () => ({}),
          );

      if (
        !response.ok
      ) {
        let errorMessage =
          result.error ||
          'Could not place order.';

        if (
          result.details
        ) {
          errorMessage +=
            `\n${result.details}`;
        }

        if (
          result.hint
        ) {
          errorMessage +=
            `\n${result.hint}`;
        }

        throw new Error(
          errorMessage,
        );
      }

      if (
        result.orderId
      ) {
        order.id =
          String(
            result.orderId,
          );
      }

      /* =====================================
         SEND CONFIRMATION EMAIL
      ====================================== */

      try {
        const emailResponse =
          await fetch(
            '/api/customer/order-confirmation',
            {
              method:
                'POST',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body:
                JSON.stringify({
                  orderId:
                    order.id,
                }),
            },
          );

        const emailResult =
          await emailResponse
            .json()
            .catch(
              () => ({}),
            );

        if (
          !emailResponse.ok
        ) {
          console.error(
            'ORDER CONFIRMATION EMAIL FAILED:',
            {
              status:
                emailResponse.status,

              error:
                emailResult.error ||
                'Unknown email error',
            },
          );
        } else {
          console.log(
            'ORDER CONFIRMATION EMAIL SENT',
          );
        }
      } catch (
        emailError
      ) {
        console.error(
          'ORDER CONFIRMATION EMAIL REQUEST FAILED:',
          emailError,
        );
      }

      /* =====================================
         SUCCESS
      ====================================== */

      /*
       * StoreProvider now removes
       * only products actually bought.
       *
       * Therefore Buy Now does not
       * erase unrelated cart items.
       */
      placeLocalOrder(
        order,
      );

      setPlaced(
        order,
      );

      window.scrollTo({
        top:
          0,

        behavior:
          'smooth',
      });
    } catch (
      error
    ) {
      console.error(
        'CHECKOUT ERROR:',
        error,
      );

      alert(
        error instanceof
          Error
          ? error.message
          : 'Could not place order.',
      );
    } finally {
      setBusy(
        false,
      );
    }
  }

  /* =========================================
     LOADING
  ========================================= */

  if (
    !authChecked ||
    !ready ||
    !checkoutIntentReady
  ) {
    return (
      <div className="container content-page">
        <div className="empty-state">
          <h2>
            Loading checkout…
          </h2>

          <p className="muted">
            Checking your account and current inventory.
          </p>
        </div>
      </div>
    );
  }

  /* =========================================
     INVALID / SOLD BUY NOW PRODUCT
  ========================================= */

  if (
    isBuyNow &&
    (
      !buyNowProduct ||
      buyNowProduct.inventory <
        1
    )
  ) {
    return (
      <div className="container content-page">
        <div className="empty-state">
          <h2>
            This product is no longer available.
          </h2>

          <p className="muted">
            The item may have been sold or removed from the store.
          </p>

          <Link
            className="btn sage"
            href="/shop"
          >
            Back to shop
          </Link>
        </div>
      </div>
    );
  }

  /* =========================================
     LOGIN REQUIRED
  ========================================= */

  if (!userId) {
    return (
      <div className="container content-page">
        <div className="empty-state">
          <span className="eyebrow">
            Customer account
          </span>

          <h2>
            Login to checkout.
          </h2>

          <p className="muted">
            Please login or create
            an account before placing
            your order.
          </p>

          <Link
            href={
              loginPath
            }
            className="btn sage"
          >
            Login / Sign Up
          </Link>

          <Link
            href={
              isBuyNow
                ? `/product/${buyNowProduct?.slug}`
                : '/cart'
            }
            className="btn secondary"
            style={{
              marginLeft:
                8,
            }}
          >
            {isBuyNow
              ? 'Back to product'
              : 'Back to cart'}
          </Link>
        </div>
      </div>
    );
  }

  /* =========================================
     ORDER SUCCESS
  ========================================= */

  if (placed) {
    return (
      <div className="container content-page">
        <div className="success-box">
          <div className="success-icon">
            <Check
              size={34}
            />
          </div>

          <span className="eyebrow">
            Order{' '}
            {
              placed.id
            }
          </span>

          <h2
            style={{
              marginTop:
                12,
            }}
          >
            Order placed successfully!
          </h2>

          <p
            style={{
              marginTop:
                10,

              marginBottom:
                18,

              color:
                '#36513a',

              fontWeight:
                700,

              lineHeight:
                1.5,
            }}
          >
            Please check your email for order confirmation.
            If you did not receive it, please check your spam or junk folder.
          </p>

          {placed.paymentMethod ===
            'COD' && (
            <p
              style={{
                color:
                  '#b42318',

                fontWeight:
                  800,

                marginTop:
                  10,

                marginBottom:
                  18,
              }}
            >
              Order placed successfully! Our associate will contact you shortly for verification.
            </p>
          )}

          <p>
            {placed.paymentMethod ===
            'QR'
              ? 'Your payment proof has been submitted successfully. Your payment is now waiting for admin verification.'
              : 'Your Cash on Delivery order has been placed successfully and is now Pending.'}
          </p>

          <p>
            <b>
              Shipping:
            </b>{' '}
            {placed.shippingPending
              ? placed.shipping > 0
                ? `${money(
                    placed.shipping,
                  )} + location-based shipping`
                : 'Depends on product and location'
              : placed.shipping > 0
                ? money(
                    placed.shipping,
                  )
                : 'FREE'}
          </p>

          {placed.shippingPending && (
            <p className="muted">
              Additional location-based shipping will be confirmed separately.
            </p>
          )}

          <div
            className="hero-actions"
            style={{
              justifyContent:
                'center',
            }}
          >
            <Link
              className="btn sage"
              href="/account/orders"
            >
              View my order
            </Link>

            <Link
              className="btn secondary"
              href="/shop"
            >
              Keep shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* =========================================
     EMPTY CART
  ========================================= */

  if (
    !checkoutProducts.length
  ) {
    return (
      <div className="container content-page">
        <div className="empty-state">
          <h2>
            Your cart is empty.
          </h2>

          <Link
            className="btn"
            href="/shop"
          >
            Back to shop
          </Link>
        </div>
      </div>
    );
  }

  /* =========================================
     CHECKOUT FORM
  ========================================= */

  return (
    <div className="container">
      <div className="page-hero">
        <span className="eyebrow">
          Almost yours
        </span>

        <h1>
          Checkout.
        </h1>

        <p>
          Choose Cash on Delivery
          or pay by QR and upload
          your proof.
        </p>
      </div>

      <form
        onSubmit={
          submit
        }
        className="checkout-layout"
      >
        <div className="stack">
          {/* DELIVERY DETAILS */}

          <section className="panel">
            <h3>
              Delivery details
            </h3>

            <div className="checkout-form">
              <div className="field full">
                <label>
                  Full name
                </label>

                <input
                  className="control"
                  name="name"
                  autoComplete="name"
                  required
                />
              </div>

              <div className="field">
                <label>
                  Email
                </label>

                <input
                  className="control"
                  name="email"
                  type="email"
                  defaultValue={
                    userEmail
                  }
                  readOnly={
                    Boolean(
                      userEmail,
                    )
                  }
                  autoComplete="email"
                  required
                />

                {userEmail && (
                  <small className="muted">
                    Orders are linked to your logged-in account email.
                  </small>
                )}
              </div>

              <div className="field">
                <label>
                  Phone
                </label>

                <input
                  className="control"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  required
                />
              </div>

              <div className="field full">
                <label>
                  Street address
                </label>

                <input
                  className="control"
                  name="address"
                  autoComplete="street-address"
                  required
                />
              </div>

              <div className="field">
                <label>
                  City
                </label>

                <input
                  className="control"
                  name="city"
                  autoComplete="address-level2"
                  required
                />
              </div>

              <div className="field">
                <label>
                  Postal code
                </label>

                <input
                  className="control"
                  name="postalCode"
                  autoComplete="postal-code"
                  required
                />
              </div>
            </div>
          </section>

          {/* PAYMENT METHOD */}

          <section className="panel">
            <h3>
              Payment method
            </h3>

            <div className="payment-choice">
              {settings.codEnabled && (
                <label
                  className={`payment-card ${
                    method ===
                    'COD'
                      ? 'active'
                      : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="COD"
                    checked={
                      method ===
                      'COD'
                    }
                    onChange={() =>
                      setMethod(
                        'COD',
                      )
                    }
                  />

                  <Truck />

                  <div>
                    <b>
                      Cash on Delivery (COD)
                    </b>

                    <p className="muted">
                      A small advance payment helps us safely confirm your order. Thank you for your understanding!
                    </p>
                  </div>
                </label>
              )}

              {settings.qrEnabled && (
                <label
                  className={`payment-card ${
                    method ===
                    'QR'
                      ? 'active'
                      : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="QR"
                    checked={
                      method ===
                      'QR'
                    }
                    onChange={() =>
                      setMethod(
                        'QR',
                      )
                    }
                  />

                  <QrCode />

                  <div>
                    <b>
                      QR Payment
                    </b>

                    <p className="muted">
                      Scan the store QR, pay, then upload proof.
                    </p>
                  </div>
                </label>
              )}
            </div>

            <div
              className="notice"
              style={{
                marginTop:
                  16,
              }}
            >
              <b>
                Shipping:
              </b>{' '}
              {shippingLabel}
            </div>

            {method ===
              'QR' &&
              settings.qrEnabled && (
              <div className="qr-box">
                <img
                  src={
                    settings.qrImage ||
                    '/store-qr.png'
                  }
                  alt="Store payment QR code"
                />

                <b>
                  Scan and complete your payment
                </b>

                <p className="muted">
                  {hasManualShipping
                    ? 'Pay the current total shown below. Additional location-based shipping is confirmed separately.'
                    : 'Pay the full order total shown below, then upload your payment proof.'}
                </p>

                <div
                  className="field"
                  style={{
                    textAlign:
                      'left',

                    marginTop:
                      14,
                  }}
                >
                  <label>
                    Payment screenshot
                  </label>

                  <input
                    className="control"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    required={
                      method ===
                      'QR'
                    }
                    onChange={(
                      event,
                    ) =>
                      handleProof(
                        event.target
                          .files?.[0],
                      )
                    }
                  />

                  {proofPreview && (
                    <img
                      className="upload-preview"
                      src={
                        proofPreview
                      }
                      alt="Payment proof preview"
                    />
                  )}
                </div>

                <div
                  className="field"
                  style={{
                    textAlign:
                      'left',

                    marginTop:
                      12,
                  }}
                >
                  <label>
                    Transaction / Reference ID
                  </label>

                  <input
                    className="control"
                    value={
                      txid
                    }
                    onChange={(
                      event,
                    ) =>
                      setTxid(
                        event.target
                          .value,
                      )
                    }
                    required={
                      method ===
                      'QR'
                    }
                    placeholder="e.g. TXN123456789"
                  />
                </div>
              </div>
            )}
          </section>
        </div>

        {/* ORDER SUMMARY */}

        <aside
          className="panel"
          style={{
            height:
              'max-content',
          }}
        >
          <h3>
            Your order
          </h3>

          {checkoutProducts.map(
            ({
              product,
              quantity,
            }) => (
              <div
                className="summary-row"
                key={
                  product.id
                }
              >
                <span>
                  {
                    product.name
                  }{' '}
                  ×{' '}
                  {
                    quantity
                  }
                </span>

                <div className="checkout-line-price">
                  <b>
                    {money(
                      product.price *
                        quantity,
                    )}
                  </b>

                  {product.compareAt &&
                    product.compareAt >
                      product.price && (
                      <del>
                        {money(
                          product.compareAt *
                            quantity,
                        )}
                      </del>
                    )}
                </div>
              </div>
            ),
          )}

          <hr
            style={{
              border:
                0,

              borderTop:
                '1px solid var(--line)',
            }}
          />

          {/* PROMO */}

          <div className="field">
            <label>
              Promo code
            </label>

            <input
              className="control"
              value={
                promo
              }
              onChange={(
                event,
              ) =>
                setPromo(
                  event.target
                    .value,
                )
              }
              placeholder="EASY10"
            />

            {promo && (
              <small
                style={{
                  color:
                    validPromo
                      ? 'var(--success)'
                      : 'var(--danger)',
                }}
              >
                {validPromo
                  ? `Applied: ${validPromo.code}`
                  : 'Code not valid'}
              </small>
            )}
          </div>

          {/* SAVINGS */}

          {productSavings >
            0 && (
            <>
              <div className="summary-row">
                <span>
                  Regular subtotal
                </span>

                <b>
                  {money(
                    regularSubtotal,
                  )}
                </b>
              </div>

              <div className="summary-row">
                <span>
                  Product discounts
                </span>

                <b className="summary-saving">
                  −
                  {money(
                    productSavings,
                  )}
                </b>
              </div>
            </>
          )}

          {/* SUBTOTAL */}

          <div className="summary-row">
            <span>
              {productSavings >
              0
                ? 'Sale subtotal'
                : 'Subtotal'}
            </span>

            <b>
              {money(
                subtotal,
              )}
            </b>
          </div>

          {/* SHIPPING */}

          <div className="summary-row">
            <span>
              Shipping
            </span>

            <b
              style={{
                textAlign:
                  'right',

                maxWidth:
                  180,
              }}
            >
              {shippingLabel}
            </b>
          </div>

          {/* PROMO DISCOUNT */}

          {discount >
            0 && (
            <div className="summary-row">
              <span>
                Discount
              </span>

              <b>
                −
                {money(
                  discount,
                )}
              </b>
            </div>
          )}

          {/* TOTAL */}

          <div className="summary-row total">
            <span>
              {hasManualShipping
                ? 'Current total'
                : 'Order total'}
            </span>

            <span>
              {money(
                total,
              )}
            </span>
          </div>

          {hasManualShipping && (
            <p
              className="muted"
              style={{
                fontSize:
                  '.75rem',

                marginTop:
                  6,
              }}
            >
              Additional shipping for location-based items is not included and will be confirmed separately.
            </p>
          )}

          <button
            type="submit"
            disabled={
              busy ||
              (
                !settings.codEnabled &&
                !settings.qrEnabled
              )
            }
            className="btn sage"
            style={{
              width:
                '100%',

              marginTop:
                14,
            }}
          >
            {busy
              ? 'Placing order…'
              : method ===
                  'QR'
                ? 'Submit payment for verification'
                : 'Place COD order'}
          </button>

          <p
            className="muted"
            style={{
              fontSize:
                '.72rem',

              marginTop:
                12,
            }}
          >
            By ordering, you agree to the store&apos;s shipping and return policy.
          </p>
        </aside>
      </form>
    </div>
  );
}