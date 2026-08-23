'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminShell from '@/components/admin-shell';
import { money } from '@/lib/format';

type ApiOrder = {
  id: string;
  createdAt: string;
  total: number;
  status: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    postalCode: string;
  };
};

type CustomerSummary = {
  key: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  orders: number;
  spent: number;
  lastOrderAt: string;
};

export default function Customers() {
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/orders', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || 'Could not load customers.');
      }

      setOrders(Array.isArray(payload.orders) ? payload.orders : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load customers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const customers = useMemo<CustomerSummary[]>(() => {
    const map = new Map<string, CustomerSummary>();

    for (const order of orders) {
      const email = order.customer.email.trim().toLowerCase();
      const key = email || `${order.customer.phone}-${order.customer.name}`;

      const current = map.get(key) || {
        key,
        name: order.customer.name,
        email: order.customer.email,
        phone: order.customer.phone,
        address: [
          order.customer.address,
          order.customer.city,
          order.customer.postalCode,
        ]
          .filter(Boolean)
          .join(', '),
        orders: 0,
        spent: 0,
        lastOrderAt: order.createdAt,
      };

      current.orders += 1;

      if (order.status !== 'Payment Rejected') {
        current.spent += Number(order.total || 0);
      }

      if (
        new Date(order.createdAt).getTime() >
        new Date(current.lastOrderAt).getTime()
      ) {
        current.lastOrderAt = order.createdAt;
        current.name = order.customer.name;
        current.phone = order.customer.phone;
        current.address = [
          order.customer.address,
          order.customer.city,
          order.customer.postalCode,
        ]
          .filter(Boolean)
          .join(', ');
      }

      map.set(key, current);
    }

    return [...map.values()].sort(
      (a, b) =>
        new Date(b.lastOrderAt).getTime() -
        new Date(a.lastOrderAt).getTime(),
    );
  }, [orders]);

  return (
    <AdminShell>
      <div className="admin-top">
        <div>
          <span className="eyebrow">Buyer relationships</span>
          <h1>Customers</h1>
          <p className="muted">
            Customer information is derived from real Supabase orders.
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
        <div className="notice" style={{ marginBottom: 16, color: '#9b4136' }}>
          {error}
        </div>
      )}

      <div className="admin-card">
        {loading ? (
          <div className="empty-state">Loading customers…</div>
        ) : customers.length ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Phone</th>
                <th>Address</th>
                <th>Orders</th>
                <th>Total spending</th>
                <th>Last order</th>
              </tr>
            </thead>

            <tbody>
              {customers.map((customer) => (
                <tr key={customer.key}>
                  <td>
                    <b>{customer.name}</b>
                    <br />
                    <span className="muted">{customer.email}</span>
                  </td>
                  <td>{customer.phone}</td>
                  <td>{customer.address}</td>
                  <td>{customer.orders}</td>
                  <td>{money(customer.spent)}</td>
                  <td>{new Date(customer.lastOrderAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">No customers found yet.</div>
        )}
      </div>
    </AdminShell>
  );
}
