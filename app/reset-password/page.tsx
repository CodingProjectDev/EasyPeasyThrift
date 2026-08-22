'use client';

import {
  FormEvent,
  useEffect,
  useState,
} from 'react';

import { useRouter } from 'next/navigation';

import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] =
    useState('');

  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        setReady(true);
      }
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (
          event === 'PASSWORD_RECOVERY' ||
          session
        ) {
          setReady(true);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function submit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage('');

    if (password.length < 6) {
      setMessage(
        'Password must be at least 6 characters.'
      );
      return;
    }

    if (password !== confirmPassword) {
      setMessage(
        'Passwords do not match.'
      );
      return;
    }

    setLoading(true);

    const supabase = createClient();

    const { error } =
      await supabase.auth.updateUser({
        password,
      });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage(
      'Password changed successfully.'
    );

    setTimeout(() => {
      router.push('/login');
      router.refresh();
    }, 1000);
  }

  if (!ready) {
    return (
      <div className="container content-page">
        <div className="empty-state">
          <h2>
            Checking password reset link...
          </h2>

          <p className="muted">
            If this page does not continue, request a new password reset link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="auth-wrap panel">
        <span className="eyebrow">
          EasyPeasy account
        </span>

        <h2 style={{ marginTop: 12 }}>
          Create a new password.
        </h2>

        <form className="stack" onSubmit={submit}>
          <div className="field">
            <label>New password</label>

            <input
              className="control"
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              minLength={6}
              autoComplete="new-password"
              required
            />
          </div>

          <div className="field">
            <label>Confirm password</label>

            <input
              className="control"
              type="password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value
                )
              }
              minLength={6}
              autoComplete="new-password"
              required
            />
          </div>

          <button
            type="submit"
            className="btn sage"
            disabled={loading}
          >
            {loading
              ? 'Changing password...'
              : 'Change password'}
          </button>

          {message && (
            <div className="notice sage">
              {message}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
