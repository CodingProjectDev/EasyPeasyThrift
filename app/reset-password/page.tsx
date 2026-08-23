'use client';

import {
  FormEvent,
  useEffect,
  useState,
} from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] =
    useState('');

  const [ready, setReady] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    async function checkRecoverySession() {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            if (mounted) setLinkError(error.message);
            return;
          }

          window.history.replaceState({}, '', '/reset-password');
        }

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          setLinkError(error.message);
          return;
        }

        if (session) {
          setReady(true);
          setLinkError('');
        } else {
          setLinkError('This password reset link is invalid or expired. Request a new one.');
        }
      } catch (error) {
        if (!mounted) return;
        setLinkError(
          error instanceof Error
            ? error.message
            : 'Could not verify the password reset link.',
        );
      }
    }

    void checkRecoverySession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === 'PASSWORD_RECOVERY' || session) {
        setReady(true);
        setLinkError('');
      }
    });

    return () => {
      mounted = false;
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
          <h2>{linkError ? 'Reset link unavailable.' : 'Checking password reset link...'}</h2>

          <p className="muted">
            {linkError || 'Verifying your secure recovery session.'}
          </p>

          {linkError && (
            <Link className="btn sage" href="/forgot-password">
              Request a new reset link
            </Link>
          )}
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
