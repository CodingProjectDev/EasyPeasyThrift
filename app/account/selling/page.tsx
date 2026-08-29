'use client';

import {
  useEffect,
  useState,
} from 'react';

import Link from 'next/link';

import {
  CheckCircle2,
  Clock3,
  DollarSign,
  PackageCheck,
  XCircle,
} from 'lucide-react';

import {
  createClient,
} from '@/lib/supabase/client';

import {
  money,
} from '@/lib/format';

type SellSubmission = {
  id: string;

  item_name: string;

  category: string;

  brand:
    | string
    | null;

  size:
    | string
    | null;

  condition: string;

  description: string;

  expected_price:
    | number
    | null;

  images: string[];

  delivery_method:
    | string
    | null;

  status: string;

  rejection_reason:
    | string
    | null;

  approved_price:
    | number
    | null;

  seller_percentage:
    | number
    | null;

  seller_earning:
    | number
    | null;

  store_earning:
    | number
    | null;

  product_id:
    | string
    | null;

  payout_status: string;

  payout_method:
    | string
    | null;

  payout_reference:
    | string
    | null;

  paid_at:
    | string
    | null;

  reviewed_at:
    | string
    | null;

  created_at: string;

  updated_at: string;
};

const STATUS_STEPS = [
  'Submitted',
  'Under Review',
  'Approved',
  'Listed',
  'Sold',
  'Payout Pending',
  'Paid',
];

function formatDate(
  value?: string | null,
) {
  if (!value) {
    return '';
  }

  return new Intl.DateTimeFormat(
    'en-US',
    {
      month:
        'short',

      day:
        'numeric',

      year:
        'numeric',
    },
  ).format(
    new Date(value),
  );
}

function statusIndex(
  status: string,
) {
  return STATUS_STEPS.indexOf(
    status,
  );
}

export default function MySellingPage() {
  const [
    submissions,
    setSubmissions,
  ] =
    useState<
      SellSubmission[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    loggedIn,
    setLoggedIn,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState('');

  /* =========================================
     LOAD SELLING ITEMS
  ========================================= */

  useEffect(() => {
    const supabase =
      createClient();

    async function load() {
      setLoading(
        true,
      );

      setError(
        '',
      );

      try {
        const {
          data: {
            session,
          },
        } =
          await supabase.auth.getSession();

        if (
          !session
            ?.access_token
        ) {
          setLoggedIn(
            false,
          );

          setLoading(
            false,
          );

          return;
        }

        setLoggedIn(
          true,
        );

        const response =
          await fetch(
            '/api/sell',
            {
              headers: {
                Authorization:
                  `Bearer ${session.access_token}`,
              },
            },
          );

        const result =
          await response
            .json()
            .catch(
              () => ({}),
            );

        if (
          !response.ok
        ) {
          throw new Error(
            result.error ||
              'Could not load your selling items.',
          );
        }

        setSubmissions(
          result.submissions ||
            [],
        );
      } catch (
        loadError
      ) {
        setError(
          loadError instanceof
            Error
            ? loadError.message
            : 'Could not load your selling items.',
        );
      } finally {
        setLoading(
          false,
        );
      }
    }

    void load();

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        () => {
          void load();
        },
      );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /* =========================================
     LOADING
  ========================================= */

  if (loading) {
    return (
      <div className="container content-page">
        <div className="empty-state">
          <h2>
            Loading your items…
          </h2>

          <p className="muted">
            Checking your selling submissions.
          </p>
        </div>
      </div>
    );
  }

  /* =========================================
     LOGIN REQUIRED
  ========================================= */

  if (!loggedIn) {
    return (
      <div className="container content-page">
        <div className="empty-state">
          <span className="eyebrow">
            Sell With Us
          </span>

          <h2>
            Login to view your selling items.
          </h2>

          <p className="muted">
            Your selling submissions are linked to your customer account.
          </p>

          <Link
            href={`/login?next=${encodeURIComponent(
              '/account/selling',
            )}`}
            className="btn sage"
          >
            Login / Sign Up
          </Link>
        </div>
      </div>
    );
  }

  /* =========================================
     PAGE
  ========================================= */

  return (
    <div className="container">
      <div className="selling-page-head">
        <div>
          <span className="eyebrow">
            Sell With Us
          </span>

          <h1>
            My selling items.
          </h1>

          <p>
            Follow your submissions from review to sale and payout.
          </p>
        </div>

        <Link
          href="/sell"
          className="btn sage"
        >
          + Sell another item
        </Link>
      </div>

      {error && (
        <div className="notice brown">
          {error}
        </div>
      )}

      {!submissions.length ? (
        <div className="empty-state">
          <PackageCheck
            size={36}
          />

          <h2>
            Nothing submitted yet.
          </h2>

          <p>
            Have something you no longer use? Give it a fresh start.
          </p>

          <Link
            href="/sell"
            className="btn sage"
          >
            Sell an item
          </Link>
        </div>
      ) : (
        <div className="selling-list">
          {submissions.map(
            (
              submission,
            ) => {
              const rejected =
                submission.status ===
                'Rejected';

              const currentStep =
                statusIndex(
                  submission.status,
                );

              return (
                <article
                  key={
                    submission.id
                  }
                  className="selling-card"
                >
                  {/* IMAGE */}

                  <div className="selling-card-image">
                    <img
                      src={
                        submission
                          .images?.[0] ||
                        '/noupload.png'
                      }
                      alt={
                        submission.item_name
                      }
                    />

                    <span
                      className={`selling-status selling-status-${submission.status
                        .toLowerCase()
                        .replace(
                          /\s+/g,
                          '-',
                        )}`}
                    >
                      {
                        submission.status
                      }
                    </span>
                  </div>

                  {/* CONTENT */}

                  <div className="selling-card-content">
                    <div className="selling-card-top">
                      <div>
                        <span className="eyebrow">
                          {
                            submission.category
                          }
                        </span>

                        <h2>
                          {
                            submission.item_name
                          }
                        </h2>

                        <p className="muted">
                          {submission.brand ||
                            'No brand'}
                          {' · '}
                          {submission.size ||
                            'No size'}
                          {' · '}
                          {
                            submission.condition
                          }
                        </p>
                      </div>

                      <small className="muted">
                        Submitted{' '}
                        {formatDate(
                          submission.created_at,
                        )}
                      </small>
                    </div>

                    {/* REJECTED */}

                    {rejected ? (
                      <div className="selling-rejected">
                        <XCircle
                          size={22}
                        />

                        <div>
                          <b>
                            Item not accepted
                          </b>

                          <p>
                            {submission.rejection_reason ||
                              'This item was not approved for listing at this time.'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="selling-progress">
                        {STATUS_STEPS.map(
                          (
                            step,
                            index,
                          ) => {
                            const completed =
                              index <=
                              currentStep;

                            return (
                              <div
                                key={
                                  step
                                }
                                className={`selling-progress-step ${
                                  completed
                                    ? 'complete'
                                    : ''
                                }`}
                              >
                                <div className="selling-progress-dot">
                                  {completed ? (
                                    <CheckCircle2
                                      size={
                                        16
                                      }
                                    />
                                  ) : (
                                    <Clock3
                                      size={
                                        15
                                      }
                                    />
                                  )}
                                </div>

                                <span>
                                  {
                                    step
                                  }
                                </span>
                              </div>
                            );
                          },
                        )}
                      </div>
                    )}

                    {/* PRICING */}

                    <div className="selling-money-grid">
                      <div>
                        <span>
                          Your expected price
                        </span>

                        <b>
                          {submission.expected_price !=
                          null
                            ? money(
                                submission.expected_price,
                              )
                            : 'Not specified'}
                        </b>
                      </div>

                      <div>
                        <span>
                          Approved selling price
                        </span>

                        <b>
                          {submission.approved_price !=
                          null
                            ? money(
                                submission.approved_price,
                              )
                            : 'Pending review'}
                        </b>
                      </div>

                      <div>
                        <span>
                          Your share
                        </span>

                        <b>
                          {submission.seller_percentage !=
                          null
                            ? `${submission.seller_percentage}%`
                            : 'Pending'}
                        </b>
                      </div>

                      <div className="selling-earnings">
                        <span>
                          Your earning
                        </span>

                        <b>
                          {submission.seller_earning !=
                          null
                            ? money(
                                submission.seller_earning,
                              )
                            : 'Pending'}
                        </b>
                      </div>
                    </div>

                    {/* PAYOUT */}

                    {(submission.status ===
                      'Sold' ||
                      submission.status ===
                        'Payout Pending' ||
                      submission.status ===
                        'Paid') && (
                      <div className="selling-payout">
                        <DollarSign
                          size={20}
                        />

                        <div>
                          <span className="muted">
                            Payout
                          </span>

                          <b>
                            {
                              submission.payout_status
                            }
                          </b>

                          {submission.paid_at && (
                            <small>
                              Paid{' '}
                              {formatDate(
                                submission.paid_at,
                              )}
                            </small>
                          )}
                        </div>
                      </div>
                    )}

                    {/* FOOTER */}

                    <div className="selling-card-footer">
                      <span>
                        Handoff:{' '}

                        <b>
                          {submission.delivery_method ||
                            'Not selected'}
                        </b>
                      </span>

                      <span>
                        Reference:{' '}

                        <b>
                          {submission.id.slice(
                            0,
                            8,
                          )}
                        </b>
                      </span>
                    </div>
                  </div>
                </article>
              );
            },
          )}
        </div>
      )}
    </div>
  );
}