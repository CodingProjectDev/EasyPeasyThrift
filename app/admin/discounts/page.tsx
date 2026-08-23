'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';

import AdminShell from '@/components/admin-shell';
import { money } from '@/lib/format';
import { PromoCode } from '@/lib/types';

function dateOnly(value: string) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value.slice(0, 10) : date.toISOString().slice(0, 10);
}

export default function Discounts() {
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadPromos = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/promos', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || 'Could not load promo codes.');
      }

      setPromos(Array.isArray(payload.promos) ? payload.promos : []);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : 'Could not load promo codes.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPromos();
  }, [loadPromos]);

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setError('');
    setMessage('');

    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch('/api/admin/promos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: String(form.get('code') || ''),
          type: String(form.get('type') || ''),
          value: Number(form.get('value')),
          expiresAt: String(form.get('expiresAt') || ''),
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.promo) {
        throw new Error(payload.error || 'Could not create promo code.');
      }

      setPromos((current) => [payload.promo as PromoCode, ...current]);
      setMessage('Promo code created and saved to Supabase.');
      event.currentTarget.reset();
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : 'Could not create promo code.',
      );
    } finally {
      setCreating(false);
    }
  }

  async function toggle(promo: PromoCode) {
    setBusyId(promo.id);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/admin/promos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: promo.id, active: !promo.active }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.promo) {
        throw new Error(payload.error || 'Could not update promo code.');
      }

      setPromos((current) =>
        current.map((item) => (item.id === promo.id ? (payload.promo as PromoCode) : item)),
      );
    } catch (updateError) {
      setError(
        updateError instanceof Error ? updateError.message : 'Could not update promo code.',
      );
    } finally {
      setBusyId(null);
    }
  }

  async function remove(promo: PromoCode) {
    if (!confirm(`Delete promo code ${promo.code}?`)) return;

    setBusyId(promo.id);
    setError('');
    setMessage('');

    try {
      const response = await fetch(
        `/api/admin/promos?id=${encodeURIComponent(promo.id)}`,
        { method: 'DELETE' },
      );
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || 'Could not delete promo code.');
      }

      setPromos((current) => current.filter((item) => item.id !== promo.id));
      setMessage('Promo code deleted.');
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : 'Could not delete promo code.',
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminShell>
      <div className="admin-top">
        <div>
          <span className="eyebrow">Promotions</span>
          <h1>Discounts</h1>
          <p className="muted">
            Promo codes are stored in Supabase and are the same codes checkout validates.
          </p>
        </div>

        <button className="btn ghost" type="button" onClick={() => void loadPromos()} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="notice" style={{ marginBottom: 16, color: '#9b4136' }}>
          {error}
        </div>
      )}

      {message && (
        <div className="notice sage" style={{ marginBottom: 16 }}>
          {message}
        </div>
      )}

      <div className="admin-grid">
        <div className="admin-card">
          <h3>Saved codes</h3>

          {loading ? (
            <div className="empty-state">Loading promo codes…</div>
          ) : promos.length ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Type</th>
                  <th>Value</th>
                  <th>Expires</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {promos.map((promo) => (
                  <tr key={promo.id}>
                    <td><b>{promo.code}</b></td>
                    <td>{promo.type}</td>
                    <td>
                      {promo.type === 'percentage' ? `${promo.value}%` : money(promo.value)}
                    </td>
                    <td>{dateOnly(promo.expiresAt)}</td>
                    <td>
                      <span className={`status ${promo.active ? 'good' : ''}`}>
                        {promo.active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td>
                      <div className="inline-actions">
                        <button
                          type="button"
                          className="mini-btn"
                          disabled={busyId === promo.id}
                          onClick={() => void toggle(promo)}
                        >
                          {promo.active ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          type="button"
                          className="mini-btn danger"
                          disabled={busyId === promo.id}
                          onClick={() => void remove(promo)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">No promo codes saved yet.</div>
          )}
        </div>

        <div className="admin-card">
          <h3>Create promo</h3>
          <form className="stack" onSubmit={add}>
            <div className="field">
              <label>Code</label>
              <input className="control" name="code" required placeholder="THRIFT15" />
            </div>

            <div className="field">
              <label>Discount type</label>
              <select className="control" name="type" defaultValue="percentage">
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed amount</option>
              </select>
            </div>

            <div className="field">
              <label>Value</label>
              <input className="control" name="value" type="number" min="0.01" step="0.01" required />
            </div>

            <div className="field">
              <label>Expiration date</label>
              <input className="control" name="expiresAt" type="date" required />
            </div>

            <button className="btn sage" disabled={creating}>
              {creating ? 'Creating…' : 'Create code'}
            </button>
          </form>
        </div>
      </div>
    </AdminShell>
  );
}
