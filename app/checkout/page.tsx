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
    cartProducts,
    placeLocalOrder,
    promos,
    settings,
  } = useStore();

  const [method, setMethod] =
    useState<PaymentMethod>('COD');

  const [proof, setProof] =
    useState<File | null>(null);

  const [proofPreview, setProofPreview] =
    useState('');

  const [txid, setTxid] =
    useState('');

  const [promo, setPromo] =
    useState('');

  const [placed, setPlaced] =
    useState<Order | null>(null);

  const [busy, setBusy] =
    useState(false);

  const [userId, setUserId] =
    useState<string | null>(null);

  const [authChecked, setAuthChecked] =
    useState(false);

  /*
   * Check logged-in Supabase customer
   */
  useEffect(() => {
    const supabase = createClient();

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUserId(user?.id || null);
      setAuthChecked(true);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUserId(
          session?.user?.id || null
        );
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /*
   * Totals
   */
  const subtotal =
    cartProducts.reduce(
      (sum, item) =>
        sum +
        item.product.price *
          item.quantity,
      0
    );

  const shipping =
    subtotal >=
      settings.freeShippingThreshold ||
    subtotal === 0
      ? 0
      : settings.shippingFee;

  const validPromo =
    useMemo(() => {
      return promos.find(
        (item) =>
          item.active &&
          item.code.toLowerCase() ===
            promo
              .trim()
              .toLowerCase() &&
          new Date(item.expiresAt) >=
            new Date()
      );
    }, [promo, promos]);

  const discount =
    validPromo
      ? validPromo.type === 'percentage'
        ? (subtotal *
            validPromo.value) /
          100
        : Math.min(
            subtotal,
            validPromo.value
          )
      : 0;

  const total = Math.max(
    0,
    subtotal +
      shipping -
      discount
  );

  /*
   * Payment screenshot preview
   */
  function handleProof(file?: File) {
    if (!file) return;

    setProof(file);

    const reader = new FileReader();

    reader.onload = () => {
      setProofPreview(
        String(reader.result)
      );
    };

    reader.readAsDataURL(file);
  }

  /*
   * PLACE ORDER
   */
  async function submit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!cartProducts.length) {
      return;
    }

    if (
      method === 'QR' &&
      (!proof || !txid.trim())
    ) {
      alert(
        'For QR Payment, upload payment proof and enter the transaction/reference ID.'
      );

      return;
    }

    const supabase =
      createClient();

    /*
     * Get real logged-in Supabase session.
     * We need the access token for /api/orders.
     */
    const {
      data: { session },
      error: sessionError,
    } =
      await supabase.auth.getSession();

    if (
      sessionError ||
      !session ||
      !session.access_token
    ) {
      alert(
        'Your login session has expired. Please login again.'
      );

      window.location.href =
        '/login';

      return;
    }

    setBusy(true);

    const form =
      new FormData(
        event.currentTarget
      );

    let proofUrl = '';

    try {
      /*
       * QR payment proof upload
       */
      if (
        method === 'QR' &&
        proof
      ) {
        const uploadForm =
          new FormData();

        uploadForm.append(
          'file',
          proof
        );

        const proofResponse =
          await fetch(
            '/api/payment-proof',
            {
              method: 'POST',
              body: uploadForm,
            }
          );

        const proofResult =
          await proofResponse
            .json()
            .catch(() => ({}));

        if (!proofResponse.ok) {
          throw new Error(
            proofResult.error ||
              'Payment proof upload failed.'
          );
        }

        proofUrl =
          proofResult.path || '';

        if (!proofUrl) {
          throw new Error(
            'Payment proof was uploaded but no storage path was returned.'
          );
        }
      }

      /*
       * Build order
       */
      const order:
        Order & {
          userId: string;
        } = {
        id: `EP-${Date.now()
          .toString()
          .slice(-8)}`,

        createdAt:
          new Date().toISOString(),

        userId:
          session.user.id,

        customer: {
          name: String(
            form.get('name') || ''
          ).trim(),

          email: String(
            form.get('email') || ''
          ).trim(),

          phone: String(
            form.get('phone') || ''
          ).trim(),

          address: String(
            form.get('address') || ''
          ).trim(),

          city: String(
            form.get('city') || ''
          ).trim(),

          postalCode: String(
            form.get(
              'postalCode'
            ) || ''
          ).trim(),
        },

        items:
          cartProducts.map(
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
            })
          ),

        subtotal,
        shipping,
        discount,
        total,

        paymentMethod:
          method,

        paymentProofName:
          proof?.name,

        paymentProofDataUrl:
          proofPreview,

        transactionId:
          method === 'QR'
            ? txid.trim()
            : undefined,

        status:
          method === 'QR'
            ? 'Payment Verification Required'
            : 'Pending',
      };

      /*
       * Prevent infinite
       * "Placing order..." state.
       */
      const controller =
        new AbortController();

      const timeoutId =
        window.setTimeout(
          () => {
            controller.abort();
          },
          20000
        );

      let response: Response;

      try {
        response =
          await fetch(
            '/api/orders',
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json',

                /*
                 * Send logged-in customer token
                 * to API route.
                 */
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

              signal:
                controller.signal,
            }
          );
      } finally {
        window.clearTimeout(
          timeoutId
        );
      }

      const result =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        console.error(
          'ORDER API ERROR:',
          result
        );

        throw new Error(
          result.error ||
            'Could not place order.'
        );
      }

      /*
       * Replace temporary order ID
       * with real Supabase order ID.
       */
      if (result.orderId) {
        order.id =
          String(
            result.orderId
          );
      }

      /*
       * Save locally only AFTER
       * Supabase successfully creates
       * the order.
       */
      placeLocalOrder(order);

      setPlaced(order);

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    } catch (error) {
      console.error(
        'CHECKOUT ERROR:',
        error
      );

      if (
        error instanceof Error &&
        error.name === 'AbortError'
      ) {
        alert(
          'The order request took too long. Please try again.'
        );
      } else {
        alert(
          error instanceof Error
            ? error.message
            : 'Could not place order.'
        );
      }
    } finally {
      /*
       * Important:
       * Never leave button stuck at
       * "Placing order..."
       */
      setBusy(false);
    }
  }

  /*
   * Wait for authentication
   */
  if (!authChecked) {
    return (
      <div className="container content-page">
        <div className="empty-state">
          <h2>
            Loading checkout…
          </h2>
        </div>
      </div>
    );
  }

  /*
   * Require customer login
   */
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
            href="/login"
            className="btn sage"
          >
            Login / Sign Up
          </Link>

          <Link
            href="/cart"
            className="btn secondary"
            style={{
              marginLeft: 8,
            }}
          >
            Back to cart
          </Link>
        </div>
      </div>
    );
  }

  /*
   * ORDER SUCCESS
   */
  if (placed) {
    return (
      <div className="container content-page">
        <div className="success-box">
          <div className="success-icon">
            <Check size={34} />
          </div>

          <span className="eyebrow">
            Order {placed.id}
          </span>

          <h2
            style={{
              marginTop: 12,
            }}
          >
            Order placed.
          </h2>

          <p>
            {placed.paymentMethod ===
            'QR'
              ? 'Your payment proof was submitted. The order is now Payment Verification Required until the admin approves it.'
              : 'Your COD order is Pending and will move to Processing after review.'}
          </p>

          <div
            className="hero-actions"
            style={{
              justifyContent:
                'center',
            }}
          >
            <Link
              className="btn"
              href="/account/orders"
            >
              View order
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

  /*
   * EMPTY CART
   */
  if (!cartProducts.length) {
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
          No card forms here.
          Choose Cash on Delivery
          or pay by QR and upload
          your proof.
        </p>
      </div>

      <form
        onSubmit={submit}
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
                    sessionEmailFallback()
                  }
                  required
                />
              </div>

              <div className="field">
                <label>
                  Phone
                </label>

                <input
                  className="control"
                  name="phone"
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
                    method === 'COD'
                      ? 'active'
                      : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="COD"
                    checked={
                      method === 'COD'
                    }
                    onChange={() =>
                      setMethod('COD')
                    }
                  />

                  <Truck />

                  <div>
                    <b>
                      Cash on Delivery
                      (COD)
                    </b>

                    <p className="muted">
                      Place the order
                      now and pay when
                      it arrives.
                    </p>
                  </div>
                </label>
              )}

              {settings.qrEnabled && (
                <label
                  className={`payment-card ${
                    method === 'QR'
                      ? 'active'
                      : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="QR"
                    checked={
                      method === 'QR'
                    }
                    onChange={() =>
                      setMethod('QR')
                    }
                  />

                  <QrCode />

                  <div>
                    <b>
                      QR Payment
                    </b>

                    <p className="muted">
                      Scan the store
                      QR, pay, then
                      upload proof
                      for admin
                      verification.
                    </p>
                  </div>
                </label>
              )}
            </div>

            {method === 'QR' && (
              <div className="qr-box">
                <img
                  src={
                    settings.qrImage ||
                    '/store-qr.svg'
                  }
                  alt="Store payment QR code"
                />

                <b>
                  Scan and complete
                  your payment
                </b>

                <p className="muted">
                  Then upload a clear
                  screenshot and enter
                  the exact
                  transaction/reference
                  ID.
                </p>

                <div
                  className="field"
                  style={{
                    textAlign: 'left',
                    marginTop: 14,
                  }}
                >
                  <label>
                    Payment screenshot
                  </label>

                  <input
                    className="control"
                    type="file"
                    accept="image/*"
                    required={
                      method === 'QR'
                    }
                    onChange={(event) =>
                      handleProof(
                        event.target
                          .files?.[0]
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
                    textAlign: 'left',
                    marginTop: 12,
                  }}
                >
                  <label>
                    Transaction /
                    Reference ID
                  </label>

                  <input
                    className="control"
                    value={txid}
                    onChange={(event) =>
                      setTxid(
                        event.target
                          .value
                      )
                    }
                    required={
                      method === 'QR'
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
            height: 'max-content',
          }}
        >
          <h3>
            Your order
          </h3>

          {cartProducts.map(
            ({
              product,
              quantity,
            }) => (
              <div
                className="summary-row"
                key={product.id}
              >
                <span>
                  {product.name} ×{' '}
                  {quantity}
                </span>

                <b>
                  {money(
                    product.price *
                      quantity
                  )}
                </b>
              </div>
            )
          )}

          <hr
            style={{
              border: 0,
              borderTop:
                '1px solid var(--line)',
            }}
          />

          <div className="field">
            <label>
              Promo code
            </label>

            <div
              style={{
                display: 'flex',
                gap: 8,
              }}
            >
              <input
                className="control"
                value={promo}
                onChange={(event) =>
                  setPromo(
                    event.target.value
                  )
                }
                placeholder="EASY10"
              />
            </div>

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

          <div className="summary-row">
            <span>
              Subtotal
            </span>

            <b>
              {money(subtotal)}
            </b>
          </div>

          <div className="summary-row">
            <span>
              Shipping
            </span>

            <b>
              {shipping
                ? money(shipping)
                : 'Free'}
            </b>
          </div>

          {discount > 0 && (
            <div className="summary-row">
              <span>
                Discount
              </span>

              <b>
                −{money(discount)}
              </b>
            </div>
          )}

          <div className="summary-row total">
            <span>
              Total
            </span>

            <span>
              {money(total)}
            </span>
          </div>

          <button
            type="submit"
            disabled={
              busy ||
              (!settings.codEnabled &&
                !settings.qrEnabled)
            }
            className="btn sage"
            style={{
              width: '100%',
              marginTop: 14,
            }}
          >
            {busy
              ? 'Placing order…'
              : method === 'QR'
                ? 'Submit payment for verification'
                : 'Place COD order'}
          </button>

          <p
            className="muted"
            style={{
              fontSize: '.72rem',
              marginTop: 12,
            }}
          >
            By ordering, you agree
            to the store’s shipping
            and return policy.
          </p>
        </aside>
      </form>
    </div>
  );
}

/*
 * Kept simple because the checkout
 * already verifies the Supabase user.
 * You can later pre-fill email/name
 * from the Supabase profile.
 */
function sessionEmailFallback() {
  return '';
}
