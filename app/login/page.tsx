'use client';

import {
  FormEvent,
  useEffect,
  useState,
} from 'react';

import {
  useRouter,
} from 'next/navigation';

import Link from 'next/link';

import {
  createClient,
} from '@/lib/supabase/client';

export default function LoginPage() {
  const router =
    useRouter();

  const [
    redirectAfterAuth,
    setRedirectAfterAuth,
  ] =
    useState('/account');

  const [
    mode,
    setMode,
  ] =
    useState<
      'login' | 'signup'
    >('login');

  const [
    message,
    setMessage,
  ] =
    useState('');

  const [
    messageType,
    setMessageType,
  ] =
    useState<
      'success' | 'error'
    >('success');

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  /*
   * =========================================
   * REMEMBER REQUESTED PAGE
   * =========================================
   *
   * Example:
   *
   * /login?next=/account/orders
   *
   * After login:
   *
   * /account/orders
   */

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search,
      );

    const requestedNext =
      params.get('next');

    /*
     * Only allow internal URLs.
     *
     * This prevents redirects such as:
     * //example.com
     * https://example.com
     */
    if (
      requestedNext &&
      requestedNext.startsWith('/') &&
      !requestedNext.startsWith('//') &&
      requestedNext !== '/login'
    ) {
      setRedirectAfterAuth(
        requestedNext,
      );
    }
  }, []);

  /*
   * =========================================
   * SUBMIT
   * =========================================
   */

  async function submit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setLoading(true);

    setMessage('');

    setMessageType(
      'success',
    );

    const form =
      new FormData(
        event.currentTarget,
      );

    const name =
      String(
        form.get('name') ||
          '',
      ).trim();

    const email =
      String(
        form.get('email') ||
          '',
      )
        .trim()
        .toLowerCase();

    const password =
      String(
        form.get(
          'password',
        ) || '',
      );

    const supabase =
      createClient();

    try {
      /*
       * =====================================
       * SIGN UP
       * =====================================
       */

      if (
        mode === 'signup'
      ) {
        const {
          data,
          error,
        } =
          await supabase.auth.signUp(
            {
              email,
              password,

              options: {
                data: {
                  name,
                },
              },
            },
          );

        if (error) {
          setMessageType(
            'error',
          );

          setMessage(
            error.message,
          );

          return;
        }

        /*
         * EMAIL CONFIRMATION OFF
         *
         * If Supabase immediately gives us
         * a session, the customer is already
         * logged in.
         */

        if (data.session) {
          setMessageType(
            'success',
          );

          setMessage(
            'Account created successfully.',
          );

          window.setTimeout(
            () => {
              router.push(
                redirectAfterAuth,
              );

              router.refresh();
            },
            700,
          );

          return;
        }

        /*
         * EMAIL CONFIRMATION ON
         */

        setMessageType(
          'success',
        );

        setMessage(
          'If this email is new, we sent you a confirmation link. If you already have an account, please log in.',
        );

        return;
      }

      /*
       * =====================================
       * LOGIN
       * =====================================
       */

      const {
        error,
      } =
        await supabase.auth
          .signInWithPassword(
            {
              email,
              password,
            },
          );

      if (error) {
        setMessageType(
          'error',
        );

        setMessage(
          error.message,
        );

        return;
      }

      setMessageType(
        'success',
      );

      setMessage(
        'Login successful.',
      );

      /*
       * Important:
       *
       * Instead of always sending the
       * customer to /account, send them
       * back to the page they originally
       * requested.
       */

      window.setTimeout(
        () => {
          router.push(
            redirectAfterAuth,
          );

          router.refresh();
        },
        500,
      );
    } catch (error) {
      console.error(
        'AUTH ERROR:',
        error,
      );

      setMessageType(
        'error',
      );

      setMessage(
        error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * =========================================
   * SWITCH LOGIN / SIGNUP
   * =========================================
   */

  function switchMode(
    newMode:
      | 'login'
      | 'signup',
  ) {
    setMode(
      newMode,
    );

    setMessage('');

    setMessageType(
      'success',
    );
  }

  /*
   * =========================================
   * PAGE
   * =========================================
   */

  return (
    <div className="container">
      <div className="auth-wrap panel">
        <span className="eyebrow">
          Your EasyPeasy
          account
        </span>

        <h2
          style={{
            marginTop: 12,
          }}
        >
          {mode ===
          'login'
            ? 'Welcome back.'
            : 'Join the thrift list.'}
        </h2>

        {/* LOGIN / SIGNUP TABS */}

        <div className="auth-tabs">
          <button
            type="button"
            className={
              mode ===
              'login'
                ? 'active'
                : ''
            }
            onClick={() =>
              switchMode(
                'login',
              )
            }
          >
            Login
          </button>

          <button
            type="button"
            className={
              mode ===
              'signup'
                ? 'active'
                : ''
            }
            onClick={() =>
              switchMode(
                'signup',
              )
            }
          >
            Sign up
          </button>
        </div>

        <form
          className="stack"
          onSubmit={
            submit
          }
        >
          {/* NAME */}

          {mode ===
            'signup' && (
            <div className="field">
              <label
                htmlFor="auth-name"
              >
                Name
              </label>

              <input
                id="auth-name"
                className="control"
                name="name"
                type="text"
                placeholder="Your name"
                autoComplete="name"
                required
              />
            </div>
          )}

          {/* EMAIL */}

          <div className="field">
            <label
              htmlFor="auth-email"
            >
              Email
            </label>

            <input
              id="auth-email"
              className="control"
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>

          {/* PASSWORD */}

          <div className="field">
            <label
              htmlFor="auth-password"
            >
              Password
            </label>

            <input
              id="auth-password"
              className="control"
              name="password"
              type="password"
              placeholder="Minimum 6 characters"
              minLength={6}
              autoComplete={
                mode ===
                'login'
                  ? 'current-password'
                  : 'new-password'
              }
              required
            />
          </div>

          {/* FORGOT PASSWORD */}

          {mode ===
            'login' && (
            <div
              style={{
                display:
                  'flex',

                justifyContent:
                  'flex-end',

                marginTop:
                  -4,
              }}
            >
              <Link
                href="/forgot-password"
                style={{
                  fontSize:
                    '0.84rem',

                  textDecoration:
                    'none',

                  fontWeight:
                    600,
                }}
              >
                Forgot
                password?
              </Link>
            </div>
          )}

          {/* SUBMIT */}

          <button
            className="btn sage"
            type="submit"
            disabled={
              loading
            }
          >
            {loading
              ? 'Please wait...'
              : mode ===
                  'signup'
                ? 'Create account'
                : 'Login'}
          </button>

          {/* MESSAGE */}

          {message && (
            <div
              className={
                messageType ===
                'error'
                  ? 'notice brown'
                  : 'notice sage'
              }
              style={{
                marginTop:
                  12,

                wordBreak:
                  'break-word',
              }}
            >
              {message}

              {mode ===
                'signup' &&
                messageType ===
                  'success' && (
                  <div
                    style={{
                      marginTop:
                        10,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        switchMode(
                          'login',
                        )
                      }
                      style={{
                        padding:
                          0,

                        border:
                          0,

                        background:
                          'transparent',

                        cursor:
                          'pointer',

                        font:
                          'inherit',

                        fontWeight:
                          700,

                        textDecoration:
                          'underline',
                      }}
                    >
                      Go to
                      Login
                    </button>
                  </div>
                )}
            </div>
          )}
        </form>

        {/* BOTTOM SWITCH */}

        <div
          style={{
            marginTop:
              20,

            textAlign:
              'center',
          }}
        >
          {mode ===
          'login' ? (
            <p className="muted">
              Don&apos;t have
              an account?{' '}

              <button
                type="button"
                onClick={() =>
                  switchMode(
                    'signup',
                  )
                }
                style={{
                  background:
                    'none',

                  border:
                    'none',

                  padding:
                    0,

                  cursor:
                    'pointer',

                  font:
                    'inherit',

                  fontWeight:
                    700,

                  textDecoration:
                    'underline',
                }}
              >
                Create one
              </button>
            </p>
          ) : (
            <p className="muted">
              Already have an
              account?{' '}

              <button
                type="button"
                onClick={() =>
                  switchMode(
                    'login',
                  )
                }
                style={{
                  background:
                    'none',

                  border:
                    'none',

                  padding:
                    0,

                  cursor:
                    'pointer',

                  font:
                    'inherit',

                  fontWeight:
                    700,

                  textDecoration:
                    'underline',
                }}
              >
                Login
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}