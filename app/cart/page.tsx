'use client';

import Link from 'next/link';
import { Trash2 } from 'lucide-react';

import { ProductImage } from '@/components/product-image';
import { useStore } from '@/components/store-provider';
import { money } from '@/lib/format';
import type { Product } from '@/lib/types';

function getDiscountPercent(
  product: Product,
) {
  if (
    !product.compareAt ||
    product.compareAt <= product.price
  ) {
    return null;
  }

  return Math.round(
    (1 -
      product.price /
        product.compareAt) *
      100,
  );
}

export default function CartPage() {
  const {
    cartProducts,
    removeFromCart,
    updateQty,
    settings,
    ready,
  } = useStore();

  /*
   * product.price is the actual
   * sale price the customer pays.
   */
  const subtotal =
    cartProducts.reduce(
      (sum, item) =>
        sum +
        item.product.price *
          item.quantity,
      0,
    );

  /*
   * Regular subtotal before
   * automatic product discounts.
   */
  const regularSubtotal =
    cartProducts.reduce(
      (sum, item) => {
        const regularPrice =
          item.product.compareAt &&
          item.product.compareAt >
            item.product.price
            ? item.product.compareAt
            : item.product.price;

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
      regularSubtotal - subtotal,
    );

  const paymentMethods = [
    settings.codEnabled &&
      'Cash on Delivery',
    settings.qrEnabled &&
      'QR Payment',
  ].filter(Boolean) as string[];

  if (!ready) {
    return (
      <div className="container content-page">
        <div className="empty-state">
          <h2>Loading cart…</h2>

          <p className="muted">
            Checking current inventory.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-hero">
        <span className="eyebrow">
          Your rack
        </span>

        <h1>Cart.</h1>
      </div>

      {!cartProducts.length ? (
        <div className="empty-state">
          <h3>Your cart is empty.</h3>

          <p>
            Good pieces move quickly. Go find yours.
          </p>

          <Link
            className="btn"
            href="/shop"
          >
            Shop now
          </Link>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="panel">
            {cartProducts.map(
              ({
                product,
                quantity,
              }) => {
                const discountPercent =
                  getDiscountPercent(
                    product,
                  );

                const onSale =
                  discountPercent !==
                  null;

                return (
                  <div
                    className="cart-line"
                    key={product.id}
                  >
                    <ProductImage
                      src={
                        product.images[0] ||
                        '/noupload.png'
                      }
                      alt={product.name}
                    />

                    <div>
                      <b>
                        {product.name}
                      </b>

                      <p className="muted">
                        {product.brand}
                        {' · '}Size{' '}
                        {product.size}
                        {' · '}
                        {product.condition}
                      </p>

                      {onSale && (
                        <span className="badge sale cart-sale-badge">
                          {discountPercent}% OFF
                        </span>
                      )}

                      <div className="qty">
                        <button
                          type="button"
                          onClick={() =>
                            updateQty(
                              product.id,
                              quantity - 1,
                            )
                          }
                        >
                          −
                        </button>

                        <b>{quantity}</b>

                        <button
                          type="button"
                          disabled={
                            quantity >=
                            product.inventory
                          }
                          onClick={() =>
                            updateQty(
                              product.id,
                              quantity + 1,
                            )
                          }
                        >
                          +
                        </button>

                        <button
                          type="button"
                          style={{
                            marginLeft: 8,
                            border: 0,
                          }}
                          onClick={() =>
                            removeFromCart(
                              product.id,
                            )
                          }
                          aria-label="Remove"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="cart-line-price">
                      <strong>
                        {money(
                          product.price *
                            quantity,
                        )}
                      </strong>

                      {onSale &&
                        product.compareAt && (
                          <>
                            <del>
                              {money(
                                product.compareAt *
                                  quantity,
                              )}
                            </del>

                            <small>
                              Save{' '}
                              {money(
                                (product.compareAt -
                                  product.price) *
                                  quantity,
                              )}
                            </small>
                          </>
                        )}
                    </div>
                  </div>
                );
              },
            )}
          </div>

          <aside className="panel">
            <h3>Order summary</h3>

            {productSavings > 0 && (
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
                    −{money(productSavings)}
                  </b>
                </div>
              </>
            )}

            <div className="summary-row">
              <span>
                Product subtotal
              </span>

              <b>{money(subtotal)}</b>
            </div>

            <div className="summary-row">
              <span>Shipping</span>

              <b
                style={{
                  textAlign: 'right',
                  maxWidth: 180,
                }}
              >
                {settings.shippingInfo}
              </b>
            </div>

            <div className="summary-row total">
              <span>
                Product total
              </span>

              <span>
                {money(subtotal)}
              </span>
            </div>

            {productSavings > 0 && (
              <div className="notice sage cart-savings-notice">
                You saved{' '}
                <b>
                  {money(productSavings)}
                </b>{' '}
                with product discounts.
              </div>
            )}

            <p
              className="muted"
              style={{
                fontSize: '.74rem',
                marginTop: 10,
              }}
            >
              Shipping is confirmed separately based on the product and delivery location.
            </p>

            {paymentMethods.length ? (
              <Link
                href="/checkout"
                className="btn sage"
                style={{
                  width: '100%',
                  marginTop: 14,
                }}
              >
                Checkout
              </Link>
            ) : (
              <button
                type="button"
                className="btn sage"
                style={{
                  width: '100%',
                  marginTop: 14,
                }}
                disabled
              >
                Checkout unavailable
              </button>
            )}

            <p
              className="muted"
              style={{
                fontSize: '.74rem',
                marginTop: 12,
              }}
            >
              Payment options:{' '}
              {paymentMethods.length
                ? paymentMethods.join(
                    ' or ',
                  )
                : 'No payment method is currently enabled.'}
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
