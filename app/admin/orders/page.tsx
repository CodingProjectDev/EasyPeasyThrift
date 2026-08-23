'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminShell from '@/components/admin-shell';
import { money } from '@/lib/format';
import { OrderStatus, PaymentMethod } from '@/lib/types';

const statuses: OrderStatus[] = [
  'Pending',
  'Payment Verification Required',
  'Payment Rejected',
  'Approved',
  'Processing',
  'Shipped',
  'Delivered',
];

type AdminOrder = {
  id: string;
  createdAt: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    postalCode: string;
  };
  items: Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  transactionId?: string;
  paymentProofUrl?: string;
  promoCode?: string;
  status: OrderStatus;
};

export default function AdminOrders() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/orders', {
        cache: 'no-store',
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || 'Could not load orders.');
      }

      setOrders(Array.isArray(payload.orders) ? payload.orders : []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Could not load orders.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  async function updateStatus(orderId: string, status: OrderStatus) {
    setUpdatingId(orderId);
    setError('');

    try {
      const response = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          status,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || 'Could not update order.');
      }

      setOrders((current) =>
        current.map((order) =>
          order.id === orderId ? { ...order, status } : order,
        ),
      );
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : 'Could not update order.',
      );

      await loadOrders();
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <AdminShell>
      <div className="admin-top">
        <div>
          <span className="eyebrow">Fulfillment + payment</span>
          <h1>Orders</h1>
          <p className="muted">
            Live orders are loaded from Supabase. Status changes are saved to
            Supabase and shown to customers.
          </p>
        </div>

        <button
          className="btn ghost"
          type="button"
          onClick={() => void loadOrders()}
          disabled={loading}
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div
          className="notice"
          style={{
            marginBottom: 16,
            color: '#9b4136',
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="admin-card">
          <div className="empty-state">Loading orders…</div>
        </div>
      ) : orders.length ? (
        orders.map((order) => (
          <article
            className="admin-card"
            style={{ marginBottom: 14 }}
            key={order.id}
          >
            <div className="order-head">
              <div>
                <b>{order.id}</b>
                <p className="muted">
                  {new Date(order.createdAt).toLocaleString()}
                </p>
              </div>

              <select
                className="control"
                value={order.status}
                disabled={updatingId === order.id}
                onChange={(event) =>
                  void updateStatus(
                    order.id,
                    event.target.value as OrderStatus,
                  )
                }
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-grid" style={{ marginTop: 0 }}>
              <div>
                <h4>Customer</h4>

                <p>
                  {order.customer.name}
                  <br />
                  {order.customer.email}
                  <br />
                  {order.customer.phone}
                  <br />
                  {order.customer.address}, {order.customer.city}{' '}
                  {order.customer.postalCode}
                </p>

                <h4>Items</h4>

                {order.items.map((item, index) => (
                  <div
                    className="summary-row"
                    key={`${item.productId}-${index}`}
                  >
                    <span>
                      {item.name} × {item.quantity}
                    </span>

                    <b>{money(item.price * item.quantity)}</b>
                  </div>
                ))}

                <div className="summary-row">
                  <span>Subtotal</span>
                  <b>{money(order.subtotal)}</b>
                </div>

                {order.discount > 0 && (
                  <div className="summary-row">
                    <span>Discount</span>
                    <b>−{money(order.discount)}</b>
                  </div>
                )}

                <div className="summary-row total">
                  <span>Total</span>
                  <span>{money(order.total)}</span>
                </div>
              </div>

              <div>
                <h4>Payment</h4>

                <p>
                  <b>{order.paymentMethod}</b>
                </p>

                {order.promoCode && (
                  <p>
                    Promo: <b>{order.promoCode}</b>
                  </p>
                )}

                {order.paymentMethod === 'QR' && (
                  <>
                    <p>
                      Transaction ID: <b>{order.transactionId || '—'}</b>
                    </p>

                    {order.paymentProofUrl ? (
                      <a
                        href={order.paymentProofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <img
                          src={order.paymentProofUrl}
                          style={{
                            maxWidth: 260,
                            maxHeight: 320,
                            objectFit: 'contain',
                            borderRadius: 12,
                          }}
                          alt="Customer payment proof"
                        />
                      </a>
                    ) : (
                      <p className="muted">
                        No payment proof preview is available.
                      </p>
                    )}

                    <div className="inline-actions" style={{ marginTop: 12 }}>
                      <button
                        type="button"
                        className="btn sage"
                        disabled={updatingId === order.id}
                        onClick={() =>
                          void updateStatus(order.id, 'Approved')
                        }
                      >
                        Approve QR
                      </button>

                      <button
                        type="button"
                        className="btn danger"
                        disabled={updatingId === order.id}
                        onClick={() =>
                          void updateStatus(order.id, 'Payment Rejected')
                        }
                      >
                        Reject
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </article>
        ))
      ) : (
        <div className="admin-card">
          <div className="empty-state">No orders found in Supabase.</div>
        </div>
      )}
    </AdminShell>
  );
}
