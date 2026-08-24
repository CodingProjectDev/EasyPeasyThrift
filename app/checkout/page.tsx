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
    ready,
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

  useEffect(() => {
    const supabase = createClient();

    async function loadUser() {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      setUserId(user?.id || null);
      setUserEmail(
        user?.email || '',
      );
      setAuthChecked(true);
    }

    void loadUser();

    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        (_event, session) => {
          setUserId(
            session?.user?.id ||
              null,
          );

          setUserEmail(
            session?.user?.email ||
              '',
          );
        },
      );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (
      !settings.codEnabled &&
      settings.qrEnabled
    ) {
      setMethod('QR');
    } else if (
      settings.codEnabled &&
      !settings.qrEnabled
    ) {
      setMethod('COD');
    }
  }, [
    settings.codEnabled,
    settings.qrEnabled,
  ]);

  const subtotal =
    cartProducts.reduce(
      (sum, item) =>
        sum +
        item.product.price *
          item.quantity,
      0,
    );

  // Shipping is intentionally not calculated
  // automatically. Admin provides customer-facing
  // shipping information instead.
  const shipping = 0;

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
          ) >= new Date(),
      );
    }, [promo, promos]);

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

  // Product total only. Shipping is confirmed
  // separately based on product/location.
  const total = Math.max(
    0,
    subtotal - discount,
  );

  function handleProof(
    file?: File,
  ) {
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
        String(reader.result),
      );
    };

    reader.readAsDataURL(file);
  }

  async function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    // Read the form before any await.
    const form =
      new FormData(
        event.currentTarget,
      );

    if (!cartProducts.length) {
      alert(
        'Your cart is empty.',
      );
      return;
    }

    if (
      method === 'QR' &&
      (!proof || !txid.trim())
    ) {
      alert(
        'For QR Payment, upload payment proof and enter the transaction/reference ID.',
      );
      return;
    }

    setBusy(true);

    try {
      const supabase =
        createClient();

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
          'Your login session has expired. Please login again.',
        );

        window.location.href =
          '/login';

        return;
      }

      const customer = {
        name: String(
          form.get('name') || '',
        ).trim(),
        email: String(
          form.get('email') || '',
        ).trim(),
        phone: String(
          form.get('phone') || '',
        ).trim(),
        address: String(
          form.get('address') || '',
        ).trim(),
        city: String(
          form.get('city') || '',
        ).trim(),
        postalCode: String(
          form.get(
            'postalCode',
          ) || '',
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

      let proofUrl = '';

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
              method: 'POST',
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
              body: uploadForm,
            },
          );

        const proofResult =
          await proofResponse
            .json()
            .catch(() => ({}));

        if (
          !proofResponse.ok
        ) {
          throw new Error(
            proofResult.error ||
              'Payment proof upload failed.',
          );
        }

        proofUrl =
          proofResult.path || '';

        if (!proofUrl) {
          throw new Error(
            'Payment proof was uploaded but no storage path was returned.',
          );
        }
      }

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
            }),
          ),
        subtotal,
        shipping,
        discount,
        total,
        paymentMethod:
          method,
        paymentProofName:
          proof?.name,
        transactionId:
          method === 'QR'
            ? txid.trim()
            : undefined,
        status:
          method === 'QR'
            ? 'Payment Verification Required'
            : 'Pending',
      };

      const response = await fetch(
        '/api/orders',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
            Authorization:
              `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
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
          .catch(() => ({}));

      if (!response.ok) {
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
          errorMessage,
        );
      }

      if (result.orderId) {
        order.id = String(
          result.orderId,
        );
      }

      placeLocalOrder(order);
      setPlaced(order);

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    } catch (error) {
      console.error(
        'CHECKOUT ERROR:',
        error,
      );

      alert(
        error instanceof Error
          ? error.message
          : 'Could not place order.',
      );
    } finally {
      setBusy(false);
    }
  }

  if (!authChecked || !ready) {
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

{placed.paymentMethod === 'COD' && (
  <p
    style={{
      color: '#b42318',
      fontWeight: 800,
      marginTop: 10,
      marginBottom: 18,
    }}
  >
    Order placed successfully! Our associate will contact you shortly for verification.
  </p>
)}

<p>
  {placed.paymentMethod === 'QR'
    ? 'Your payment proof has been submitted successfully. Your payment is now waiting for admin verification.'
    : 'Your Cash on Delivery order has been placed successfully and is now Pending.'}
</p>

          <p>
            <b>Shipping:</b>{' '}
            {settings.shippingInfo}
          </p>

          <p className="muted">
            The product total shown
            online does not include a
            fixed shipping fee.
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

        <h1>Checkout.</h1>

        <p>
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
                  readOnly={Boolean(userEmail)}
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
                      A small advance payment helps us safely confirm your order. Thank you for your understanding!
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
                      upload proof.
                    </p>
                  </div>
                </label>
              )}
            </div>

            <div
              className="notice"
              style={{
                marginTop: 16,
              }}
            >
              <b>Shipping:</b>{' '}
              {settings.shippingInfo}
            </div>

            {method === 'QR' && settings.qrEnabled && (
              <div className="qr-box">
                <img
                  src={
                    settings.qrImage ||
                    '/store-qr.png'
                  }
                  alt="Store payment QR code"
                />

                <b>
                  Scan and complete
                  your payment
                </b>

                <p className="muted">
                  Product total below
                  does not include a
                  fixed shipping fee.
                  Shipping is confirmed
                  separately.
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
                    accept="image/jpeg,image/png,image/webp"
                    required={
                      method === 'QR'
                    }
                    onChange={(event) =>
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
                          .value,
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
                      quantity,
                  )}
                </b>
              </div>
            ),
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

            <input
              className="control"
              value={promo}
              onChange={(event) =>
                setPromo(
                  event.target.value,
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

            <b
              style={{
                textAlign: 'right',
                maxWidth: 180,
              }}
            >
              {
                settings.shippingInfo
              }
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
              Product total
            </span>

            <span>
              {money(total)}
            </span>
          </div>

          <p
            className="muted"
            style={{
              fontSize: '.75rem',
              marginTop: 6,
            }}
          >
            Shipping is not included
            in the product total.
          </p>

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
