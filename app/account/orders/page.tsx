'use client';

import Link from 'next/link';
import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  useRouter,
} from 'next/navigation';

import {
  useStore,
} from '@/components/store-provider';

import {
  createClient,
} from '@/lib/supabase/client';

import {
  money,
} from '@/lib/format';

import {
  Order,
} from '@/lib/types';

/*
 * Orders created after this update contain
 * the Supabase customer user ID.
 *
 * We don't need to change lib/types.ts because
 * we can extend Order locally.
 */
type CustomerOrder =
  Order & {
    userId?: string;
  };

function tone(status: string) {
  if (
    [
      'Delivered',
      'Approved',
      'Processing',
      'Shipped',
    ].includes(status)
  ) {
    return 'good';
  }

  if (
    status ===
    'Payment Rejected'
  ) {
    return 'bad';
  }

  if (
    status ===
    'Payment Verification Required'
  ) {
    return 'warn';
  }

  return '';
}

export default function OrdersPage() {
  const { orders, ready } =
    useStore();

  const router =
    useRouter();

  const [userId, setUserId] =
    useState<string | null>(
      null
    );

  const [
    authChecked,
    setAuthChecked,
  ] = useState(false);

  useEffect(() => {
    const supabase =
      createClient();

    async function checkUser() {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        setUserId(null);
        setAuthChecked(true);

        router.replace(
          '/login'
        );

        return;
      }

      setUserId(user.id);
      setAuthChecked(true);
    }

    checkUser();

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (
            !session?.user
          ) {
            setUserId(null);

            router.replace(
              '/login'
            );

            return;
          }

          setUserId(
            session.user.id
          );
        }
      );

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  /*
   * SECURITY FIX:
   *
   * Only show orders matching the currently
   * logged-in Supabase user ID.
   */
  const myOrders =
    useMemo(() => {
      if (!userId) {
        return [];
      }

      return (
        orders as CustomerOrder[]
      ).filter(
        (order) =>
          order.userId ===
          userId
      );
    }, [orders, userId]);

  if (
    !ready ||
    !authChecked
  ) {
    return (
      <div className="container content-page">
        <div className="empty-state">
          <h3>
            Loading your orders…
          </h3>
        </div>
      </div>
    );
  }

  if (!userId) {
    return null;
  }

  return (
    <div className="container">
      <div className="page-hero">
        <span className="eyebrow">
          Your account
        </span>

        <h1>
          Order history.
        </h1>
      </div>

      {myOrders.length ? (
        myOrders.map(
          (order) => (
            <article
              className="order-card"
              key={order.id}
            >
              <div className="order-head">
                <div>
                  <b>
                    {order.id}
                  </b>

                  <p
                    className="muted"
                    style={{
                      margin:
                        '4px 0 0',
                    }}
                  >
                    {new Date(
                      order.createdAt
                    ).toLocaleString()}
                  </p>
                </div>

                <span
                  className={`status ${tone(
                    order.status
                  )}`}
                >
                  {order.status}
                </span>
              </div>

              {order.items.map(
                (item) => (
                  <div
                    className="summary-row"
                    key={
                      item.productId
                    }
                  >
                    <span>
                      {item.name} ×{' '}
                      {item.quantity}
                    </span>

                    <b>
                      {money(
                        item.price *
                          item.quantity
                      )}
                    </b>
                  </div>
                )
              )}

              <div className="summary-row total">
                <span>
                  Total ·{' '}
                  {
                    order.paymentMethod
                  }
                </span>

                <span>
                  {money(
                    order.total
                  )}
                </span>
              </div>

              {order.paymentMethod ===
                'QR' && (
                <p
                  className="muted"
                  style={{
                    fontSize:
                      '.8rem',
                  }}
                >
                  Transaction ID:{' '}
                  {order.transactionId ||
                    '—'}
                </p>
              )}
            </article>
          )
        )
      ) : (
        <div className="empty-state">
          <h3>
            No orders yet.
          </h3>

          <p className="muted">
            Orders placed with
            this account will
            appear here.
          </p>

          <Link
            className="btn"
            href="/shop"
          >
            Shop the latest drop
          </Link>
        </div>
      )}
    </div>
  );
}
