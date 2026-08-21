'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage('');

    const form = new FormData(event.currentTarget);

    const name = String(form.get('name') || '').trim();
    const email = String(form.get('email') || '').trim();
    const password = String(form.get('password') || '');

    const supabase = createClient();

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
            },
          },
        });

        console.log('SIGNUP DATA:', data);
        console.log('SIGNUP ERROR:', error);

        if (error) {
          setMessage(`ERROR: ${error.message}`);
          return;
        }

        if (data.user) {
          setMessage(
            `Account created successfully: ${data.user.email}`
          );

          // If email confirmation is OFF,
          // Supabase returns a session immediately.
          if (data.session) {
            setTimeout(() => {
              router.push('/account/orders');
              router.refresh();
            }, 700);
          }

          return;
        }

        setMessage('Signup finished, but no user was returned.');
        return;
      }

      const { data, error } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      console.log('LOGIN DATA:', data);
      console.log('LOGIN ERROR:', error);

      if (error) {
        setMessage(`ERROR: ${error.message}`);
        return;
      }

      setMessage('Login successful.');

      setTimeout(() => {
        router.push('/account/orders');
        router.refresh();
      }, 500);
    } catch (error) {
      console.error('AUTH ERROR:', error);

      setMessage(
        error instanceof Error
          ? `ERROR: ${error.message}`
          : 'ERROR: Something went wrong.'
      );
    } finally {
      setLoading(false);
    }
  }

  function switchMode(newMode: 'login' | 'signup') {
    setMode(newMode);
    setMessage('');
  }

  return (
    <div className="container">
      <div className="auth-wrap panel">
        <span className="eyebrow">
          Your EasyPeasy account
        </span>

        <h2 style={{ marginTop: 12 }}>
          {mode === 'login'
            ? 'Welcome back.'
            : 'Join the thrift list.'}
        </h2>

        <div className="auth-tabs">
          <button
            type="button"
            className={mode === 'login' ? 'active' : ''}
            onClick={() => switchMode('login')}
          >
            Login
          </button>

          <button
            type="button"
            className={mode === 'signup' ? 'active' : ''}
            onClick={() => switchMode('signup')}
          >
            Sign up
          </button>
        </div>

        <form className="stack" onSubmit={submit}>
          {mode === 'signup' && (
            <div className="field">
              <label>Name</label>

              <input
                className="control"
                name="name"
                type="text"
                placeholder="Your name"
                autoComplete="name"
                required
              />
            </div>
          )}

          <div className="field">
            <label>Email</label>

            <input
              className="control"
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="field">
            <label>Password</label>

            <input
              className="control"
              name="password"
              type="password"
              placeholder="Minimum 6 characters"
              minLength={6}
              autoComplete={
                mode === 'login'
                  ? 'current-password'
                  : 'new-password'
              }
              required
            />
          </div>

          <button
            className="btn sage"
            type="submit"
            disabled={loading}
          >
            {loading
              ? 'Please wait...'
              : mode === 'signup'
                ? 'Create account'
                : 'Login'}
          </button>

          {message && (
            <div
              className="notice sage"
              style={{
                marginTop: 12,
                wordBreak: 'break-word',
              }}
            >
              {message}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}