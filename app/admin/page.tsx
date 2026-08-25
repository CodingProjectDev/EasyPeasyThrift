'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Boxes, Package, ShoppingCart, Users } from 'lucide-react';
import AdminShell from '@/components/admin-shell';
import { useStore } from '@/components/store-provider';
import { money } from '@/lib/format';

type DashboardOrder = {
  id: string;
  createdAt: string;
  total: number;
  paymentMethod: string;
  status: string;
  customer: {
    name: string;
    email: string;
  };
};

export default function AdminDashboard() {
  const { products } = useStore();
  const [orders, setOrders] = useState<DashboardOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/orders', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || 'Could not load dashboard orders.');
      }

      setOrders(Array.isArray(payload.orders) ? payload.orders : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const sales = useMemo(
    () =>
      orders
        .filter((order) => order.status !== 'Payment Rejected')
        .reduce((sum, order) => sum + Number(order.total || 0), 0),
    [orders],
  );

  const customers = useMemo(
    () =>
      new Set(
        orders
          .map((order) => order.customer.email.trim().toLowerCase())
          .filter(Boolean),
      ).size,
    [orders],
  );

  const salesReport = useMemo(() => {
  const now = new Date();

  let dailySales = 0;
  let monthlySales = 0;
  let yearlySales = 0;

  let dailyOrders = 0;
  let monthlyOrders = 0;
  let yearlyOrders = 0;

  orders
    .filter(
      (order) =>
        order.status !== 'Payment Rejected',
    )
    .forEach((order) => {
      const orderDate = new Date(order.createdAt);
      const amount = Number(order.total || 0);

      const isToday =
        orderDate.getFullYear() === now.getFullYear() &&
        orderDate.getMonth() === now.getMonth() &&
        orderDate.getDate() === now.getDate();

      const isThisMonth =
        orderDate.getFullYear() === now.getFullYear() &&
        orderDate.getMonth() === now.getMonth();

      const isThisYear =
        orderDate.getFullYear() === now.getFullYear();

      if (isToday) {
        dailySales += amount;
        dailyOrders += 1;
      }

      if (isThisMonth) {
        monthlySales += amount;
        monthlyOrders += 1;
      }

      if (isThisYear) {
        yearlySales += amount;
        yearlyOrders += 1;
      }
    });

  return {
    dailySales,
    dailyOrders,
    monthlySales,
    monthlyOrders,
    yearlySales,
    yearlyOrders,
  };
}, [orders]);

  return (
    <AdminShell>
      <div className="admin-top">
        <div>
          <span className="eyebrow">Store control room</span>
          <h1>Dashboard</h1>
          <p className="muted">Live store totals from Supabase.</p>
        </div>

        <button
          type="button"
          className="btn ghost"
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

      <div className="stat-grid">
        <div className="stat">
          <div className="icon">
            <ShoppingCart size={18} />
          </div>
          <b>{money(sales)}</b>
          <span>Total sales</span>
        </div>

        <div className="stat">
          <div className="icon">
            <Package size={18} />
          </div>
          <b>{orders.length}</b>
          <span>Orders</span>
        </div>

        <div className="stat">
          <div className="icon">
            <Boxes size={18} />
          </div>
          <b>{products.length}</b>
          <span>Products</span>
        </div>

        <div className="stat">
          <div className="icon">
            <Users size={18} />
          </div>
          <b>{customers}</b>
          <span>Customers</span>
        </div>
      </div>

</div>

{/* SALES REPORT */}

<div className="admin-card sales-overview-card">
  <div className="sales-overview-head">
    <span className="eyebrow">
      Sales report
    </span>

    <h3>Sales overview</h3>
  </div>

  <div className="sales-report-grid">
    <div className="sales-report-card">
      <span className="sales-report-label">
        Today
      </span>

      <strong>
        {money(salesReport.dailySales)}
      </strong>

      <small>
        {salesReport.dailyOrders}{' '}
        {salesReport.dailyOrders === 1
          ? 'order'
          : 'orders'}
      </small>
    </div>

    <div className="sales-report-card">
      <span className="sales-report-label">
        This month
      </span>

      <strong>
        {money(salesReport.monthlySales)}
      </strong>

      <small>
        {salesReport.monthlyOrders}{' '}
        {salesReport.monthlyOrders === 1
          ? 'order'
          : 'orders'}
      </small>
    </div>

    <div className="sales-report-card">
      <span className="sales-report-label">
        This year
      </span>

      <strong>
        {money(salesReport.yearlySales)}
      </strong>

      <small>
        {salesReport.yearlyOrders}{' '}
        {salesReport.yearlyOrders === 1
          ? 'order'
          : 'orders'}
      </small>
    </div>
  </div>
</div>

<div className="admin-card">
  <h3>Recent orders</h3>

        {loading ? (
          <div className="empty-state" style={{ padding: 30 }}>
            Loading orders…
          </div>
        ) : orders.length ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Total</th>
              </tr>
            </thead>

            <tbody>
              {orders.slice(0, 6).map((order) => (
                <tr key={order.id}>
                  <td>
                    <b>{order.id}</b>
                  </td>
                  <td>
                    {order.customer.name}
                    <br />
                    <span className="muted">{order.customer.email}</span>
                  </td>
                  <td>{order.paymentMethod}</td>
                  <td>
                    <span className="status">{order.status}</span>
                  </td>
                  <td>{money(order.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state" style={{ padding: 30 }}>
            No orders found in Supabase.
          </div>
        )}
      </div>
    </AdminShell>
  );
}
