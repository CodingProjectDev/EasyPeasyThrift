'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Check,
  DollarSign,
  Eye,
  PackagePlus,
  Search,
  X,
  XCircle,
} from 'lucide-react';

import AdminShell from '@/components/admin-shell';
import { money } from '@/lib/format';

type SellSubmission = {
  id: string;

  user_id:
    | string
    | null;

  seller_name: string;

  email: string;

  phone: string;

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

  seller_notes:
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

  created_at: string;
};

const FILTERS = [
  'All',
  'Submitted',
  'Under Review',
  'Approved',
  'Rejected',
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
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    },
  ).format(
    new Date(value),
  );
}

function statusClass(
  status: string,
) {
  return status
    .toLowerCase()
    .replace(
      /\s+/g,
      '-',
    );
}

export default function AdminSellRequestsPage() {
  const [
    submissions,
    setSubmissions,
  ] =
    useState<
      SellSubmission[]
    >([]);

  const [
    selected,
    setSelected,
  ] =
    useState<
      SellSubmission | null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    busy,
    setBusy,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState('');

  const [
    search,
    setSearch,
  ] =
    useState('');

  const [
    filter,
    setFilter,
  ] =
    useState('All');

  const [
    approvedPrice,
    setApprovedPrice,
  ] =
    useState('');

  const [
    sellerPercentage,
    setSellerPercentage,
  ] =
    useState('70');

  const [
    rejectionReason,
    setRejectionReason,
  ] =
    useState('');

  const [
    payoutMethod,
    setPayoutMethod,
  ] =
    useState('');

  const [
    payoutReference,
    setPayoutReference,
  ] =
    useState('');

  /* =========================================
     LOAD REQUESTS
  ========================================= */

  async function loadRequests() {
    setLoading(true);
    setError('');

    try {
      const response =
        await fetch(
          '/api/admin/sell-requests',
          {
            cache:
              'no-store',
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
            'Could not load sell requests.',
        );
      }

      setSubmissions(
        result.submissions ||
          [],
      );
    } catch (loadError) {
      setError(
        loadError instanceof
          Error
          ? loadError.message
          : 'Could not load sell requests.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRequests();
  }, []);

  /* =========================================
     OPEN REVIEW
  ========================================= */

  function openReview(
    submission:
      SellSubmission,
  ) {
    setSelected(
      submission,
    );

    setApprovedPrice(
      submission.approved_price !=
      null
        ? String(
            submission.approved_price,
          )
        : submission.expected_price !=
            null
          ? String(
              submission.expected_price,
            )
          : '',
    );

    setSellerPercentage(
      submission.seller_percentage !=
      null
        ? String(
            submission.seller_percentage,
          )
        : '70',
    );

    setRejectionReason(
      submission.rejection_reason ||
        '',
    );

    setPayoutMethod(
      submission.payout_method ||
        '',
    );

    setPayoutReference(
      submission.payout_reference ||
        '',
    );

    setError('');
  }

  /* =========================================
     ADMIN ACTION
  ========================================= */

  async function runAction(
    action: string,
  ) {
    if (
      !selected ||
      busy
    ) {
      return;
    }

    if (
      action ===
        'reject' &&
      !rejectionReason.trim()
    ) {
      setError(
        'Enter a rejection reason.',
      );

      return;
    }

    if (
      action ===
        'list' &&
      !confirm(
        'Create this approved item as a live store product?',
      )
    ) {
      return;
    }

    if (
      action ===
        'paid' &&
      !confirm(
        'Mark this seller payout as paid?',
      )
    ) {
      return;
    }

    setBusy(true);
    setError('');

    try {
      const response =
        await fetch(
          '/api/admin/sell-requests',
          {
            method:
              'PATCH',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                id:
                  selected.id,

                action,

                approvedPrice:
                  approvedPrice,

                sellerPercentage:
                  sellerPercentage,

                rejectionReason:
                  rejectionReason,

                payoutMethod:
                  payoutMethod,

                payoutReference:
                  payoutReference,
              }),
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
            'Could not update request.',
        );
      }

      if (
        result.submission
      ) {
        const updated =
          result.submission as
            SellSubmission;

        setSelected(
          updated,
        );

        setSubmissions(
          (current) =>
            current.map(
              (item) =>
                item.id ===
                updated.id
                  ? updated
                  : item,
            ),
        );
      }

      await loadRequests();
    } catch (actionError) {
      setError(
        actionError instanceof
          Error
          ? actionError.message
          : 'Could not update request.',
      );
    } finally {
      setBusy(false);
    }
  }

  /* =========================================
     FILTER
  ========================================= */

  const filtered =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return submissions.filter(
        (item) => {
          const matchesStatus =
            filter === 'All' ||
            item.status ===
              filter;

          const matchesSearch =
            !query ||
            item.item_name
              .toLowerCase()
              .includes(
                query,
              ) ||
            item.seller_name
              .toLowerCase()
              .includes(
                query,
              ) ||
            item.email
              .toLowerCase()
              .includes(
                query,
              );

          return (
            matchesStatus &&
            matchesSearch
          );
        },
      );
    }, [
      submissions,
      search,
      filter,
    ]);

  const sellerEarningPreview =
    approvedPrice &&
    sellerPercentage
      ? Number(
          approvedPrice,
        ) *
        (Number(
          sellerPercentage,
        ) /
          100)
      : 0;

  /* =========================================
     PAGE
  ========================================= */

  return (
    <AdminShell>
      <div className="admin-top">
        <div>
          <span className="eyebrow">
            Consignment
          </span>

          <h1>
            Sell Requests
          </h1>

          <p className="muted">
            Review customer items, approve listings, and manage seller payouts.
          </p>
        </div>
      </div>

      {error &&
        !selected && (
        <div className="notice brown">
          {error}
        </div>
      )}

      {/* CONTROLS */}

      <div className="admin-card admin-sell-controls">
        <div className="search-wrap">
          <Search
            size={17}
          />

          <input
            value={
              search
            }
            onChange={(
              event,
            ) =>
              setSearch(
                event.target
                  .value,
              )
            }
            placeholder="Search seller or item"
          />
        </div>

        <select
          className="control"
          value={
            filter
          }
          onChange={(
            event,
          ) =>
            setFilter(
              event.target
                .value,
            )
          }
        >
          {FILTERS.map(
            (item) => (
              <option
                key={
                  item
                }
                value={
                  item
                }
              >
                {item}
              </option>
            ),
          )}
        </select>
      </div>

      {/* TABLE */}

      <div className="admin-card">
        {loading ? (
          <div className="empty-state">
            <h3>
              Loading sell requests…
            </h3>
          </div>
        ) : !filtered.length ? (
          <div className="empty-state">
            <h3>
              No sell requests.
            </h3>

            <p className="muted">
              New customer submissions will appear here.
            </p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>
                    Item
                  </th>

                  <th>
                    Seller
                  </th>

                  <th>
                    Expected
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Submitted
                  </th>

                  <th>
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {filtered.map(
                  (
                    submission,
                  ) => (
                    <tr
                      key={
                        submission.id
                      }
                    >
                      <td>
                        <div className="table-product">
                          <img
                            className="thumb"
                            src={
                              submission
                                .images?.[0] ||
                              '/noupload.png'
                            }
                            alt={
                              submission.item_name
                            }
                          />

                          <div>
                            <b>
                              {
                                submission.item_name
                              }
                            </b>

                            <br />

                            <span className="muted">
                              {
                                submission.category
                              }
                              {' · '}
                              {submission.brand ||
                                'Unbranded'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <b>
                          {
                            submission.seller_name
                          }
                        </b>

                        <br />

                        <small className="muted">
                          {
                            submission.email
                          }
                        </small>
                      </td>

                      <td>
                        {submission.expected_price !=
                        null
                          ? money(
                              submission.expected_price,
                            )
                          : '—'}
                      </td>

                      <td>
                        <span
                          className={`admin-sell-status ${statusClass(
                            submission.status,
                          )}`}
                        >
                          {
                            submission.status
                          }
                        </span>
                      </td>

                      <td>
                        {formatDate(
                          submission.created_at,
                        )}
                      </td>

                      <td>
                        <button
                          type="button"
                          className="mini-btn"
                          onClick={() =>
                            openReview(
                              submission,
                            )
                          }
                        >
                          <Eye
                            size={
                              14
                            }
                          />

                          Review
                        </button>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =====================================
          REVIEW MODAL
      ====================================== */}

      {selected && (
        <div className="modal-backdrop">
          <div className="modal admin-sell-modal">
            <div className="modal-head">
              <div>
                <span className="eyebrow">
                  Sell request
                </span>

                <h3>
                  {
                    selected.item_name
                  }
                </h3>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelected(
                    null,
                  );

                  setError(
                    '',
                  );
                }}
                aria-label="Close"
              >
                <X />
              </button>
            </div>

            {/* STATUS */}

            <div className="admin-sell-review-status">
              <span
                className={`admin-sell-status ${statusClass(
                  selected.status,
                )}`}
              >
                {
                  selected.status
                }
              </span>

              <span className="muted">
                Submitted{' '}
                {formatDate(
                  selected.created_at,
                )}
              </span>
            </div>

            {/* PHOTOS */}

            <div className="admin-sell-photo-grid">
              {(selected.images ||
                []).map(
                (
                  image,
                  index,
                ) => (
                  <a
                    key={`${image}-${index}`}
                    href={
                      image
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src={
                        image
                      }
                      alt={`${selected.item_name} photo ${
                        index +
                        1
                      }`}
                    />
                  </a>
                ),
              )}
            </div>

            {/* DETAILS */}

            <div className="admin-sell-detail-grid">
              <div>
                <span>
                  Seller
                </span>

                <b>
                  {
                    selected.seller_name
                  }
                </b>
              </div>

              <div>
                <span>
                  Email
                </span>

                <b>
                  {
                    selected.email
                  }
                </b>
              </div>

              <div>
                <span>
                  Phone
                </span>

                <b>
                  {
                    selected.phone
                  }
                </b>
              </div>

              <div>
                <span>
                  Handoff
                </span>

                <b>
                  {selected.delivery_method ||
                    'Not selected'}
                </b>
              </div>

              <div>
                <span>
                  Category
                </span>

                <b>
                  {
                    selected.category
                  }
                </b>
              </div>

              <div>
                <span>
                  Brand
                </span>

                <b>
                  {selected.brand ||
                    'Unbranded'}
                </b>
              </div>

              <div>
                <span>
                  Size
                </span>

                <b>
                  {selected.size ||
                    'N/A'}
                </b>
              </div>

              <div>
                <span>
                  Condition
                </span>

                <b>
                  {
                    selected.condition
                  }
                </b>
              </div>
            </div>

            <div className="admin-sell-description">
              <b>
                Customer description
              </b>

              <p>
                {
                  selected.description
                }
              </p>

              {selected.seller_notes && (
                <>
                  <b>
                    Seller notes
                  </b>

                  <p>
                    {
                      selected.seller_notes
                    }
                  </p>
                </>
              )}
            </div>

            {/* REVIEW PRICE */}

            <div className="admin-sell-price-box">
              <div className="field">
                <label>
                  Customer expected price
                </label>

                <div className="admin-sell-readonly">
                  {selected.expected_price !=
                  null
                    ? money(
                        selected.expected_price,
                      )
                    : 'Not specified'}
                </div>
              </div>

              <div className="field">
                <label>
                  Approved selling price
                </label>

                <input
                  className="control"
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    approvedPrice
                  }
                  onChange={(
                    event,
                  ) =>
                    setApprovedPrice(
                      event.target
                        .value,
                    )
                  }
                  placeholder="e.g. 2000"
                />
              </div>

              <div className="field">
                <label>
                  Seller share (%)
                </label>

                <input
                  className="control"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={
                    sellerPercentage
                  }
                  onChange={(
                    event,
                  ) =>
                    setSellerPercentage(
                      event.target
                        .value,
                    )
                  }
                />
              </div>

              <div className="field">
                <label>
                  Seller earning
                </label>

                <div className="admin-sell-readonly earning">
                  {Number.isFinite(
                    sellerEarningPreview,
                  )
                    ? money(
                        sellerEarningPreview,
                      )
                    : '—'}
                </div>
              </div>
            </div>

            {/* REJECTION */}

            <div className="field admin-sell-rejection">
              <label>
                Rejection reason
              </label>

              <textarea
                className="control"
                value={
                  rejectionReason
                }
                onChange={(
                  event,
                ) =>
                  setRejectionReason(
                    event.target
                      .value,
                  )
                }
                placeholder="Explain why the item was not accepted."
              />
            </div>

            {/* PAYOUT */}

            {(selected.status ===
              'Sold' ||
              selected.status ===
                'Payout Pending' ||
              selected.status ===
                'Paid') && (
              <div className="admin-sell-payout-box">
                <div className="field">
                  <label>
                    Payout method
                  </label>

                  <input
                    className="control"
                    value={
                      payoutMethod
                    }
                    onChange={(
                      event,
                    ) =>
                      setPayoutMethod(
                        event.target
                          .value,
                      )
                    }
                    placeholder="e.g. Cash, eSewa, Bank"
                  />
                </div>

                <div className="field">
                  <label>
                    Payout reference
                  </label>

                  <input
                    className="control"
                    value={
                      payoutReference
                    }
                    onChange={(
                      event,
                    ) =>
                      setPayoutReference(
                        event.target
                          .value,
                      )
                    }
                    placeholder="Optional reference"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="notice brown">
                {
                  error
                }
              </div>
            )}

            {/* ACTIONS */}

            <div className="admin-sell-actions">
              {selected.status ===
                'Submitted' && (
                <button
                  type="button"
                  className="btn secondary"
                  disabled={
                    busy
                  }
                  onClick={() =>
                    runAction(
                      'under-review',
                    )
                  }
                >
                  <Eye
                    size={
                      16
                    }
                  />

                  Start review
                </button>
              )}

              {(selected.status ===
                'Submitted' ||
                selected.status ===
                  'Under Review' ||
                selected.status ===
                  'Rejected') && (
                <button
                  type="button"
                  className="btn sage"
                  disabled={
                    busy
                  }
                  onClick={() =>
                    runAction(
                      'approve',
                    )
                  }
                >
                  <Check
                    size={
                      16
                    }
                  />

                  Approve
                </button>
              )}

              {(selected.status ===
                'Submitted' ||
                selected.status ===
                  'Under Review' ||
                selected.status ===
                  'Approved') && (
                <button
                  type="button"
                  className="btn secondary"
                  disabled={
                    busy
                  }
                  onClick={() =>
                    runAction(
                      'reject',
                    )
                  }
                >
                  <XCircle
                    size={
                      16
                    }
                  />

                  Reject
                </button>
              )}

              {selected.status ===
                'Approved' &&
                !selected.product_id && (
                  <button
                    type="button"
                    className="btn sage"
                    disabled={
                      busy
                    }
                    onClick={() =>
                      runAction(
                        'list',
                      )
                    }
                  >
                    <PackagePlus
                      size={
                        16
                      }
                    />

                    Create product
                  </button>
                )}

              {selected.status ===
                'Listed' && (
                <button
                  type="button"
                  className="btn sage"
                  disabled={
                    busy
                  }
                  onClick={() =>
                    runAction(
                      'sold',
                    )
                  }
                >
                  <DollarSign
                    size={
                      16
                    }
                  />

                  Mark sold
                </button>
              )}

              {selected.status ===
                'Sold' && (
                <button
                  type="button"
                  className="btn secondary"
                  disabled={
                    busy
                  }
                  onClick={() =>
                    runAction(
                      'payout-pending',
                    )
                  }
                >
                  Payout pending
                </button>
              )}

              {selected.status ===
                'Payout Pending' && (
                <button
                  type="button"
                  className="btn sage"
                  disabled={
                    busy
                  }
                  onClick={() =>
                    runAction(
                      'paid',
                    )
                  }
                >
                  <Check
                    size={
                      16
                    }
                  />

                  Mark paid
                </button>
              )}

              {busy && (
                <span className="muted">
                  Saving…
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}