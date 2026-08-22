'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';

import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage('');

    const supabase = createClient();

    const redirectTo =
      `${window.location.origin}/reset-password`;

    const { error } =
      await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo,
        }
      );

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    // Don't reveal whether the account exists.
    setMessage(
      'If an account exists for this email, a password reset link has been sent.'
    );

    setLoading(false);
  }

  return (
    <div className="container">
      <div className="auth-wrap panel">
        <span className="eyebrow">
          EasyPeasy account
        </span>

        <h2 style={{ marginTop: 12 }}>
          Forgot your password?
        </h2>

        <p className="muted">
          Enter your email and we’ll send you a password reset link.
        </p>

        <form className="stack" onSubmit={submit}>
          <div className="field">
            <label>Email</label>

            <input
              className="control"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="you@example.com"
              required
            />
          </div>

          <button
            type="submit"
            className="btn sage"
            disabled={loading}
          >
            {loading
              ? 'Sending...'
              : 'Send reset link'}
          </button>

          {message && (
            <div className="notice sage">
              {message}
            </div>
          )}

          <Link href="/login">
            Back to login
          </Link>
        </form>
      </div>
    </div>
  );
}
