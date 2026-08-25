'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ChevronDown,
  ChevronUp,
  Search,
} from 'lucide-react';

import AdminShell from '@/components/admin-shell';
import { money } from '@/lib/format';

import {
  OrderStatus,
  PaymentMethod,
} from '@/lib/types';

const statuses: OrderStatus[] = [
  'Pending',
  'Payment Verification Required',
  'Payment Rejected',
  'Approved',
  'Processing',
  'Shipped',
  'Delivered',
];

const ORDERS_PER_PAGE = 8;

type AdminOrder = {
  id: string;
  createdAt: string;

  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    postalCode: string;
  };

  items: Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
  }>;

  subtotal: number;
  shipping: number;
  discount: number;
  total: number;

  paymentMethod: PaymentMethod;

  transactionId?: string;
  paymentProofUrl?: string;
  promoCode?: string;

  status: OrderStatus;
};

export default function AdminOrders() {
  const [orders, setOrders] =
    useState<AdminOrder[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [
    updatingId,
    setUpdatingId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    expandedId,
    setExpandedId,
  ] =
    useState<string | null>(
      null,
    );

  const [search, setSearch] =
    useState('');

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<
      'All' | OrderStatus
    >('All');

  const [
    paymentFilter,
    setPaymentFilter,
  ] =
    useState<
      'All' | PaymentMethod
    >('All');

  const [
    currentPage,
    setCurrentPage,
  ] = useState(1);

  /*
   * LOAD ORDERS
   */
  const loadOrders =
    useCallback(async () => {
      setLoading(true);
      setError('');

      try {
        const response =
          await fetch(
            '/api/admin/orders',
            {
              cache:
                'no-store',
            },
          );

        const payload =
          await response
            .json()
            .catch(
              () => ({}),
            );

        if (!response.ok) {
          throw new Error(
            payload.error ||
              'Could not load orders.',
          );
        }

        setOrders(
          Array.isArray(
            payload.orders,
          )
            ? payload.orders
            : [],
        );
      } catch (
        loadError
      ) {
        setError(
          loadError instanceof
          Error
            ? loadError.message
            : 'Could not load orders.',
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  /*
   * UPDATE ORDER STATUS
   */
  async function updateStatus(
    orderId: string,
    status: OrderStatus,
  ) {
    setUpdatingId(
      orderId,
    );

    setError('');

    try {
      const response =
        await fetch(
          '/api/admin/orders',
          {
            method:
              'PATCH',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                orderId,
                status,
              }),
          },
        );

      const payload =
        await response
          .json()
          .catch(
            () => ({}),
          );

      if (!response.ok) {
        throw new Error(
          payload.error ||
            'Could not update order.',
        );
      }

      setOrders(
        (current) =>
          current.map(
            (order) =>
              order.id ===
              orderId
                ? {
                    ...order,
                    status,
                  }
                : order,
          ),
      );
    } catch (
      updateError
    ) {
      setError(
        updateError instanceof
        Error
          ? updateError.message
          : 'Could not update order.',
      );

      await loadOrders();
    } finally {
      setUpdatingId(
        null,
      );
    }
  }

  /*
   * SEARCH + FILTER
   */
  const filteredOrders =
    useMemo(() => {
      const term =
        search
          .trim()
          .toLowerCase();

      return orders.filter(
        (order) => {
          const matchesStatus =
            statusFilter ===
              'All' ||
            order.status ===
              statusFilter;

          const matchesPayment =
            paymentFilter ===
              'All' ||
            order.paymentMethod ===
              paymentFilter;

          const searchable =
            [
              order.id,
              order.customer.name,
              order.customer.email,
              order.customer.phone,
            ]
              .join(' ')
              .toLowerCase();

          const matchesSearch =
            !term ||
            searchable.includes(
              term,
            );

          return (
            matchesStatus &&
            matchesPayment &&
            matchesSearch
          );
        },
      );
    }, [
      orders,
      search,
      statusFilter,
      paymentFilter,
    ]);

  /*
   * PAGINATION
   */
  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredOrders.length /
          ORDERS_PER_PAGE,
      ),
    );

  const paginatedOrders =
    useMemo(() => {
      const start =
        (currentPage - 1) *
        ORDERS_PER_PAGE;

      return filteredOrders.slice(
        start,
        start +
          ORDERS_PER_PAGE,
      );
    }, [
      filteredOrders,
      currentPage,
    ]);

  /*
   * Reset page when filters change.
   */
  useEffect(() => {
    setCurrentPage(1);
    setExpandedId(null);
  }, [
    search,
    statusFilter,
    paymentFilter,
  ]);

  useEffect(() => {
    if (
      currentPage >
      totalPages
    ) {
      setCurrentPage(
        totalPages,
      );
    }
  }, [
    currentPage,
    totalPages,
  ]);

  function toggleDetails(
    id: string,
  ) {
    setExpandedId(
      (current) =>
        current === id
          ? null
          : id,
    );
  }

  function clearFilters() {
    setSearch('');
    setStatusFilter('All');
    setPaymentFilter('All');
  }

  return (
    <AdminShell>
      {/* HEADER */}

      <div className="admin-top">
        <div>
          <span className="eyebrow">
            Fulfillment +
            payment
          </span>

          <h1>Orders</h1>

          <p className="muted">
            Manage customer
            orders, payments and
            fulfillment.
          </p>
        </div>

        <button
          className="btn ghost"
          type="button"
          onClick={() =>
            void loadOrders()
          }
          disabled={loading}
        >
          {loading
            ? 'Refreshing…'
            : 'Refresh'}
        </button>
      </div>

      {/* ERROR */}

      {error && (
        <div
          className="notice"
          style={{
            marginBottom:
              16,
            color:
              '#9b4136',
          }}
        >
          {error}
        </div>
      )}

      {/* FILTER BAR */}

      <div className="admin-orders-toolbar">
        <div className="admin-order-search">
          <Search
            size={18}
            aria-hidden="true"
          />

          <input
            id="admin-order-search"
            name="admin-order-search"
            className="control"
            type="search"
            value={search}
            onChange={(
              event,
            ) =>
              setSearch(
                event.target
                  .value,
              )
            }
            placeholder="Search order, name, email or phone..."
            aria-label="Search orders"
          />
        </div>

        <select
          id="admin-order-status-filter"
          name="admin-order-status-filter"
          className="control"
          value={
            statusFilter
          }
          aria-label="Filter orders by status"
          onChange={(
            event,
          ) =>
            setStatusFilter(
              event.target
                .value as
                | 'All'
                | OrderStatus,
            )
          }
        >
          <option value="All">
            All statuses
          </option>

          {statuses.map(
            (status) => (
              <option
                key={
                  status
                }
                value={
                  status
                }
              >
                {status}
              </option>
            ),
          )}
        </select>

        <select
          id="admin-order-payment-filter"
          name="admin-order-payment-filter"
          className="control"
          value={
            paymentFilter
          }
          aria-label="Filter orders by payment method"
          onChange={(
            event,
          ) =>
            setPaymentFilter(
              event.target
                .value as
                | 'All'
                | PaymentMethod,
            )
          }
        >
          <option value="All">
            All payments
          </option>

          <option value="COD">
            COD
          </option>

          <option value="QR">
            QR
          </option>
        </select>
      </div>

      {/* RESULT COUNT */}

      {!loading &&
        orders.length >
          0 && (
          <div className="admin-orders-count">
            <span className="muted">
              Showing{' '}
              {
                filteredOrders.length
              }{' '}
              of{' '}
              {orders.length}{' '}
              orders
            </span>

            {(search ||
              statusFilter !==
                'All' ||
              paymentFilter !==
                'All') && (
              <button
                type="button"
                className="admin-clear-filter"
                onClick={
                  clearFilters
                }
              >
                Clear filters
              </button>
            )}
          </div>
        )}

      {/* ORDERS */}

      {loading ? (
        <div className="admin-card">
          <div className="empty-state">
            Loading orders…
          </div>
        </div>
      ) : paginatedOrders.length ? (
        <div className="admin-orders-list">
          {paginatedOrders.map(
            (order) => {
              const expanded =
                expandedId ===
                order.id;

              return (
                <article
                  className={`admin-order-item ${
                    expanded
                      ? 'expanded'
                      : ''
                  }`}
                  key={
                    order.id
                  }
                >
                  {/* COMPACT SUMMARY */}

                  <div className="admin-order-summary">
                    <div className="admin-order-id">
                      <b>
                        {
                          order.id
                        }
                      </b>

                      <span className="muted">
                        {new Date(
                          order.createdAt,
                        ).toLocaleString()}
                      </span>
                    </div>

                    <div className="admin-order-customer">
                      <b>
                        {
                          order
                            .customer
                            .name
                        }
                      </b>

                      <span className="muted">
                        {
                          order
                            .customer
                            .email
                        }
                      </span>
                    </div>

                    <div className="admin-order-payment">
                      <span className="admin-order-label">
                        Payment
                      </span>

                      <b>
                        {
                          order.paymentMethod
                        }
                      </b>
                    </div>

                    <div className="admin-order-status">
                      <select
                        className="control"
                        value={
                          order.status
                        }
                        disabled={
                          updatingId ===
                          order.id
                        }
                        aria-label={`Status for order ${order.id}`}
                        onChange={(
                          event,
                        ) =>
                          void updateStatus(
                            order.id,
                            event
                              .target
                              .value as OrderStatus,
                          )
                        }
                      >
                        {statuses.map(
                          (
                            status,
                          ) => (
                            <option
                              key={
                                status
                              }
                              value={
                                status
                              }
                            >
                              {
                                status
                              }
                            </option>
                          ),
                        )}
                      </select>
                    </div>

                    <div className="admin-order-total">
                      <span className="admin-order-label">
                        Total
                      </span>

                      <b>
                        {money(
                          order.total,
                        )}
                      </b>
                    </div>

                    <button
                      type="button"
                      className="admin-order-expand"
                      onClick={() =>
                        toggleDetails(
                          order.id,
                        )
                      }
                      aria-expanded={
                        expanded
                      }
                    >
                      <span>
                        {expanded
                          ? 'Hide details'
                          : 'View details'}
                      </span>

                      {expanded ? (
                        <ChevronUp
                          size={
                            17
                          }
                        />
                      ) : (
                        <ChevronDown
                          size={
                            17
                          }
                        />
                      )}
                    </button>
                  </div>

                  {/* EXPANDED DETAILS */}

                  {expanded && (
                    <div className="admin-order-details">
                      {/* CUSTOMER */}

                      <section className="admin-order-detail-section">
                        <h4>
                          Customer
                        </h4>

                        <div className="admin-order-info-list">
                          <div>
                            <span>
                              Name
                            </span>

                            <b>
                              {
                                order
                                  .customer
                                  .name
                              }
                            </b>
                          </div>

                          <div>
                            <span>
                              Email
                            </span>

                            <b>
                              {
                                order
                                  .customer
                                  .email
                              }
                            </b>
                          </div>

                          <div>
                            <span>
                              Phone
                            </span>

                            <b>
                              {
                                order
                                  .customer
                                  .phone
                              }
                            </b>
                          </div>

                          <div>
                            <span>
                              Address
                            </span>

                            <b>
                              {
                                order
                                  .customer
                                  .address
                              }
                              ,{' '}
                              {
                                order
                                  .customer
                                  .city
                              }{' '}
                              {
                                order
                                  .customer
                                  .postalCode
                              }
                            </b>
                          </div>
                        </div>
                      </section>

                      {/* ITEMS */}

                      <section className="admin-order-detail-section">
                        <h4>
                          Items
                        </h4>

                        {order.items.map(
                          (
                            item,
                            index,
                          ) => (
                            <div
                              className="summary-row"
                              key={`${item.productId}-${index}`}
                            >
                              <span>
                                {
                                  item.name
                                }{' '}
                                ×{' '}
                                {
                                  item.quantity
                                }
                              </span>

                              <b>
                                {money(
                                  item.price *
                                    item.quantity,
                                )}
                              </b>
                            </div>
                          ),
                        )}

                        <div className="summary-row">
                          <span>
                            Subtotal
                          </span>

                          <b>
                            {money(
                              order.subtotal,
                            )}
                          </b>
                        </div>

                        {order.discount >
                          0 && (
                          <div className="summary-row">
                            <span>
                              Discount
                            </span>

                            <b>
                              −
                              {money(
                                order.discount,
                              )}
                            </b>
                          </div>
                        )}

                        <div className="summary-row total">
                          <span>
                            Total
                          </span>

                          <span>
                            {money(
                              order.total,
                            )}
                          </span>
                        </div>
                      </section>

                      {/* PAYMENT */}

                      <section className="admin-order-detail-section">
                        <h4>
                          Payment
                        </h4>

                        <div className="admin-order-info-list">
                          <div>
                            <span>
                              Method
                            </span>

                            <b>
                              {
                                order.paymentMethod
                              }
                            </b>
                          </div>

                          {order.promoCode && (
                            <div>
                              <span>
                                Promo
                              </span>

                              <b>
                                {
                                  order.promoCode
                                }
                              </b>
                            </div>
                          )}

                          {order.paymentMethod ===
                            'QR' && (
                            <div>
                              <span>
                                Transaction
                                ID
                              </span>

                              <b>
                                {order.transactionId ||
                                  '—'}
                              </b>
                            </div>
                          )}
                        </div>

                        {/* QR PAYMENT */}

                        {order.paymentMethod ===
                          'QR' && (
                          <div className="admin-qr-review">
                            {order.paymentProofUrl ? (
                              <a
                                href={
                                  order.paymentProofUrl
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <img
                                  src={
                                    order.paymentProofUrl
                                  }
                                  className="admin-payment-proof"
                                  alt="Customer payment proof"
                                />
                              </a>
                            ) : (
                              <p className="muted">
                                No
                                payment
                                proof is
                                available.
                              </p>
                            )}

                            <div className="inline-actions">
                              <button
                                type="button"
                                className="btn sage"
                                disabled={
                                  updatingId ===
                                  order.id
                                }
                                onClick={() =>
                                  void updateStatus(
                                    order.id,
                                    'Approved',
                                  )
                                }
                              >
                                Approve
                                QR
                              </button>

                              <button
                                type="button"
                                className="btn danger"
                                disabled={
                                  updatingId ===
                                  order.id
                                }
                                onClick={() =>
                                  void updateStatus(
                                    order.id,
                                    'Payment Rejected',
                                  )
                                }
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        )}
                      </section>
                    </div>
                  )}
                </article>
              );
            },
          )}

          {/* PAGINATION */}

          {totalPages >
            1 && (
            <div className="admin-orders-pagination">
              <button
                type="button"
                className="btn ghost"
                disabled={
                  currentPage ===
                  1
                }
                onClick={() =>
                  setCurrentPage(
                    (
                      current,
                    ) =>
                      Math.max(
                        1,
                        current -
                          1,
                      ),
                  )
                }
              >
                ← Previous
              </button>

              <span className="muted">
                Page{' '}
                {currentPage}{' '}
                of{' '}
                {totalPages}
              </span>

              <button
                type="button"
                className="btn ghost"
                disabled={
                  currentPage ===
                  totalPages
                }
                onClick={() =>
                  setCurrentPage(
                    (
                      current,
                    ) =>
                      Math.min(
                        totalPages,
                        current +
                          1,
                      ),
                  )
                }
              >
                Next →
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="admin-card">
          <div className="empty-state">
            {orders.length
              ? 'No orders match your filters.'
              : 'No orders found in Supabase.'}
          </div>
        </div>
      )}
    </AdminShell>
  );
}
