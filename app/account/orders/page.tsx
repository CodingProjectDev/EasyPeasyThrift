'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { createClient } from '@/lib/supabase/client';
import { money } from '@/lib/format';
import {
  Order,
  OrderStatus,
  PaymentMethod,
} from '@/lib/types';

type CustomerOrder = Order & {
  databaseId: string;
};

function tone(status: OrderStatus) {
  if (
    ['Delivered', 'Approved', 'Processing', 'Shipped'].includes(status)
  ) {
    return 'good';
  }

  if (status === 'Payment Rejected') {
    return 'bad';
  }

  if (status === 'Payment Verification Required') {
    return 'warn';
  }

  return '';
}

function numberValue(value: unknown) {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

export default function OrdersPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadOrders = useCallback(
    async (showRefreshing = false) => {
      const supabase = createClient();

      if (showRefreshing) {
        setRefreshing(true);
      }

      setError('');

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.replace('/login');
          return;
        }

        const { data, error: orderError } = await supabase
          .from('orders')
          .select(`
            id,
            public_order_id,
            customer_id,
            email,
            full_name,
            phone,
            address,
            city,
            postal_code,
            subtotal,
            shipping,
            discount,
            total,
            payment_method,
            transaction_id,
            status,
            created_at,
            order_items (
              id,
              product_id,
              product_name,
              unit_price,
              quantity
            )
          `)
          .eq('customer_id', user.id)
          .order('created_at', { ascending: false });

        if (orderError) {
          throw orderError;
        }

        const mapped: CustomerOrder[] = (data || []).map((row: any) => ({
          databaseId: String(row.id),
          id: String(row.public_order_id),
          createdAt: String(row.created_at),

          customer: {
            name: String(row.full_name || ''),
            email: String(row.email || ''),
            phone: String(row.phone || ''),
            address: String(row.address || ''),
            city: String(row.city || ''),
            postalCode: String(row.postal_code || ''),
          },

          items: Array.isArray(row.order_items)
            ? row.order_items.map((item: any) => ({
                productId: item.product_id
                  ? String(item.product_id)
                  : String(item.id),
                name: String(item.product_name || ''),
                price: numberValue(item.unit_price),
                quantity: numberValue(item.quantity),
              }))
            : [],

          subtotal: numberValue(row.subtotal),
          shipping: numberValue(row.shipping),
          discount: numberValue(row.discount),
          total: numberValue(row.total),

          paymentMethod: String(row.payment_method) as PaymentMethod,

          transactionId: row.transaction_id
            ? String(row.transaction_id)
            : undefined,

          status: String(row.status) as OrderStatus,
        }));

        setOrders(mapped);
      } catch (loadError) {
        console.error('CUSTOMER ORDERS ERROR:', loadError);

        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Could not load your orders.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router],
  );

  useEffect(() => {
    void loadOrders();

    function handleFocus() {
      void loadOrders();
    }

    window.addEventListener('focus', handleFocus);

    const intervalId = window.setInterval(() => {
      void loadOrders();
    }, 10000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.clearInterval(intervalId);
    };
  }, [loadOrders]);

  if (loading) {
    return (
      <div className="container content-page">
        <div className="empty-state">
          <h3>Loading your orders…</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-hero">
        <span className="eyebrow">Your account</span>

        <h1>Order history.</h1>

        <div style={{ marginTop: 18 }}>
          <button
            type="button"
            className="btn ghost"
            onClick={() => void loadOrders(true)}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing…' : 'Refresh order status'}
          </button>
        </div>
      </div>

      {error && (
        <div
          className="notice"
          style={{
            marginBottom: 18,
            color: '#9b4136',
          }}
        >
          {error}
        </div>
      )}

      {orders.length ? (
        orders.map((order) => (
          <article
            className="order-card"
            key={order.databaseId}
          >
            <div className="order-head">
              <div>
                <b>{order.id}</b>

                <p
                  className="muted"
                  style={{ margin: '4px 0 0' }}
                >
                  {new Date(order.createdAt).toLocaleString()}
                </p>
              </div>

              <span className={`status ${tone(order.status)}`}>
                {order.status}
              </span>
            </div>

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
              <span>
                Total · {order.paymentMethod}
              </span>

              <span>{money(order.total)}</span>
            </div>

            {order.paymentMethod === 'QR' && (
              <p
                className="muted"
                style={{ fontSize: '.8rem' }}
              >
                Transaction ID: {order.transactionId || '—'}
              </p>
            )}

            {order.status === 'Shipped' && (
              <div
                className="notice sage"
                style={{ marginTop: 14 }}
              >
                Your order has been shipped.
              </div>
            )}

            {order.status === 'Delivered' && (
              <div
                className="notice sage"
                style={{ marginTop: 14 }}
              >
                Your order has been delivered.
              </div>
            )}
          </article>
        ))
      ) : (
        <div className="empty-state">
          <h3>No orders yet.</h3>

          <p className="muted">
            Orders placed with this account will appear here.
          </p>

          <Link className="btn" href="/shop">
            Shop now
          </Link>
        </div>
      )}
    </div>
  );
}
