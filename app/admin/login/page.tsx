'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useStore } from '@/components/store-provider';

export default function AdminLogin() {
  const router = useRouter();
  const { settings } = useStore();

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(
    e: FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault();

    setBusy(true);
    setError('');

    const fd = new FormData(e.currentTarget);

    const r = await fetch('/api/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: fd.get('email'),
        password: fd.get('password'),
      }),
    });

    if (r.ok) {
      router.replace('/admin');
      router.refresh();
      return;
    }

    const j = await r
      .json()
      .catch(() => ({}));

    setError(j.error || 'Login failed');
    setBusy(false);
  }

  return (
    <div className="admin-login">
      <div className="admin-login-wrap">

        {/* STORE LOGO */}
        <div className="admin-login-logo">
          {settings.logoImage ? (
            <img
              src={settings.logoImage}
              alt={settings.storeName}
            />
          ) : (
            <div className="brand">
              {settings.storeName}
            </div>
          )}
        </div>

        {/* LOGIN CARD */}
        <form
          className="admin-login-card"
          onSubmit={submit}
        >
          <span className="eyebrow">
            Secure store access
          </span>

          <h1>Admin.</h1>

          <p className="muted">
            Manage products, payment verification,
            orders, inventory, customers, discounts,
            and store settings.
          </p>

          <div className="stack">
            <div className="field">
              <label>Email</label>

              <input
                className="control"
                name="email"
                type="email"
                required
                placeholder="admin@example.com"
              />
            </div>

            <div className="field">
              <label>Password</label>

              <input
                className="control"
                name="password"
                type="password"
                required
              />
            </div>

            {error && (
              <div className="notice brown">
                {error}
              </div>
            )}

            <button
              className="btn sage"
              disabled={busy}
            >
              {busy
                ? 'Signing in…'
                : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
