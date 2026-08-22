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

  const [userEmail, setUserEmail] =
    useState('');

  const [authChecked, setAuthChecked] =
    useState(false);

  /*
   * CHECK LOGGED-IN CUSTOMER
   */
  useEffect(() => {
    const supabase = createClient();

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUserId(user?.id || null);
      setUserEmail(user?.email || '');
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

        setUserEmail(
          session?.user?.email || ''
        );
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /*
   * ORDER TOTALS
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
   * QR PAYMENT SCREENSHOT PREVIEW
   */
  function handleProof(file?: File) {
    if (!file) {
      setProof(null);
      setProofPreview('');
      return;
    }

    setProof(file);

    const reader =
      new FileReader();

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

    /*
     * IMPORTANT FIX:
     *
     * Read the HTML form BEFORE any await.
     * event.currentTarget may no longer be
     * available after asynchronous calls.
     */
    const formElement =
      event.currentTarget;

    const form =
      new FormData(formElement);

    /*
     * Basic validation
     */
    if (!cartProducts.length) {
      alert('Your cart is empty.');
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

    setBusy(true);

    try {
      const supabase =
        createClient();

      /*
       * Get logged-in Supabase session
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

      /*
       * READ CUSTOMER INFORMATION
       *
       * We use the FormData that was
       * created BEFORE the await above.
       */
      const customer = {
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
          form.get('postalCode') || ''
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
          'Please complete all delivery details.'
        );
      }

      let proofUrl = '';

      /*
       * QR PAYMENT PROOF UPLOAD
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
       * CREATE ORDER OBJECT
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

        customer,

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
       * STOP REQUEST IF SERVER
       * TAKES LONGER THAN 20 SECONDS
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

      /*
       * READ SERVER RESPONSE
       */
      const result =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        console.error(
          'ORDER API ERROR:',
          result
        );

        let errorMessage =
          result.error ||
          'Could not place order.';

        if (result.details) {
          errorMessage +=
            `\n${result.details}`;
        }

        if (result.hint) {
          errorMessage +=
            `\n${result.hint}`;
        }

        throw new Error(
          errorMessage
        );
      }

      /*
       * USE REAL SUPABASE ORDER ID
       */
      if (result.orderId) {
        order.id =
          String(
            result.orderId
          );
      }

      /*
       * UPDATE LOCAL CUSTOMER STATE
       *
       * Only do this after Supabase
       * successfully creates the order.
       */
      placeLocalOrder(order);

      /*
       * SHOW SUCCESS PAGE
       */
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
       * ALWAYS STOP LOADING
       */
      setBusy(false);
    }
  }

  /*
   * WAIT FOR AUTH
   */
  if (!authChecked) {
    return (
      <div className="container content-page">
        <div className="empty-state">
          <h2>
            Loading checkout…
          </h2>

          <p className="muted">
            Checking your account.
          </p>
        </div>
      </div>
    );
  }

  /*
   * CUSTOMER MUST LOGIN
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
   * ORDER SUCCESS PAGE
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
            Order placed successfully!
          </h2>

          <p>
            {placed.paymentMethod ===
            'QR'
              ? 'Your payment proof has been submitted successfully. Your payment is now waiting for admin verification.'
              : 'Your Cash on Delivery order has been placed successfully and is now Pending.'}
          </p>

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
      {/* PAGE HEADER */}

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
                  autoComplete="email"
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

            {/* QR PAYMENT */}

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

          {/* PROMO */}

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

          {/* TOTALS */}

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

          {/* PLACE ORDER BUTTON */}

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
            to the store&apos;s shipping
            and return policy.
          </p>
        </aside>
      </form>
    </div>
  );
}
