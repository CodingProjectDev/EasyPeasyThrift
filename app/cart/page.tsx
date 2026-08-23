'use client';

import Link from 'next/link';
import { Trash2 } from 'lucide-react';

import { ProductImage } from '@/components/product-image';
import { useStore } from '@/components/store-provider';
import { money } from '@/lib/format';

export default function CartPage() {
  const { cartProducts, removeFromCart, updateQty, settings, ready } = useStore();
  const subtotal = cartProducts.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );

  const paymentMethods = [
    settings.codEnabled && 'Cash on Delivery',
    settings.qrEnabled && 'QR Payment',
  ].filter(Boolean) as string[];

  if (!ready) {
    return (
      <div className="container content-page">
        <div className="empty-state">
          <h2>Loading cart…</h2>
          <p className="muted">Checking current inventory.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-hero">
        <span className="eyebrow">Your rack</span>
        <h1>Cart.</h1>
      </div>

      {!cartProducts.length ? (
        <div className="empty-state">
          <h3>Your cart is empty.</h3>
          <p>Good pieces move quickly. Go find yours.</p>
          <Link className="btn" href="/shop">Shop now</Link>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="panel">
            {cartProducts.map(({ product, quantity }) => (
              <div className="cart-line" key={product.id}>
                <ProductImage src={product.images[0]} alt={product.name} />
                <div>
                  <b>{product.name}</b>
                  <p className="muted">
                    {product.brand} · Size {product.size} · {product.condition}
                  </p>
                  <div className="qty">
                    <button type="button" onClick={() => updateQty(product.id, quantity - 1)}>−</button>
                    <b>{quantity}</b>
                    <button
                      type="button"
                      disabled={quantity >= product.inventory}
                      onClick={() => updateQty(product.id, quantity + 1)}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      style={{ marginLeft: 8, border: 0 }}
                      onClick={() => removeFromCart(product.id)}
                      aria-label="Remove"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <strong>{money(product.price * quantity)}</strong>
              </div>
            ))}
          </div>

          <aside className="panel">
            <h3>Order summary</h3>
            <div className="summary-row">
              <span>Product subtotal</span>
              <b>{money(subtotal)}</b>
            </div>
            <div className="summary-row">
              <span>Shipping</span>
              <b style={{ textAlign: 'right', maxWidth: 180 }}>{settings.shippingInfo}</b>
            </div>
            <div className="summary-row total">
              <span>Product total</span>
              <span>{money(subtotal)}</span>
            </div>

            <p className="muted" style={{ fontSize: '.74rem', marginTop: 10 }}>
              Shipping is confirmed separately based on the product and delivery location.
            </p>

            {paymentMethods.length ? (
              <Link href="/checkout" className="btn sage" style={{ width: '100%', marginTop: 14 }}>
                Checkout
              </Link>
            ) : (
              <button type="button" className="btn sage" style={{ width: '100%', marginTop: 14 }} disabled>
                Checkout unavailable
              </button>
            )}

            <p className="muted" style={{ fontSize: '.74rem', marginTop: 12 }}>
              Payment options: {paymentMethods.length ? paymentMethods.join(' or ') : 'No payment method is currently enabled.'}
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
