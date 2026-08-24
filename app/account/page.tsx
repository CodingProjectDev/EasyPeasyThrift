'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Heart,
  LogOut,
  Package,
  User,
} from 'lucide-react';

import { createClient } from '@/lib/supabase/client';

type ProfileInfo = {
  name: string;
  email: string;
  phone: string;
};

export default function AccountPage() {
  const router = useRouter();

  const [profile, setProfile] =
    useState<ProfileInfo>({
      name: '',
      email: '',
      phone: '',
    });

  const [loading, setLoading] =
    useState(true);

  async function logout() {
    const supabase = createClient();

    await supabase.auth.signOut();

    router.replace('/login');
    router.refresh();
  }

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        router.replace('/login');
        return;
      }

      let name =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        '';

      let phone =
        user.phone ||
        user.user_metadata?.phone ||
        '';

      /*
       * Try to get the customer's latest
       * saved checkout information.
       */
      const { data: latestOrder } =
        await supabase
          .from('orders')
          .select('full_name, phone')
          .eq('customer_id', user.id)
          .order('created_at', {
            ascending: false,
          })
          .limit(1)
          .maybeSingle();

      if (latestOrder) {
        name =
          name ||
          String(
            latestOrder.full_name || '',
          );

        phone =
          phone ||
          String(
            latestOrder.phone || '',
          );
      }

      setProfile({
        name: name || 'Not provided',
        email:
          user.email ||
          'Not provided',
        phone:
          phone || 'Not provided',
      });

      setLoading(false);
    }

    void loadProfile();
  }, [router]);

  if (loading) {
    return (
      <div className="container content-page">
        <div className="empty-state">
          <h3>Loading profile…</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-hero">
        <span className="eyebrow">
          Your account
        </span>

        <h1>My Profile.</h1>
      </div>

      <div
        style={{
          maxWidth: 760,
          marginBottom: 70,
        }}
      >
        <div className="panel">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 22,
            }}
          >
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: '50%',
                background: '#dfe9dd',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <User size={22} />
            </div>

            <div>
              <h3
                style={{
                  fontFamily: 'inherit',
                  marginBottom: 3,
                }}
              >
                Account information
              </h3>

              <span className="muted">
                Your EasyPeasy-Thrift account
              </span>
            </div>
          </div>

          <div className="summary-row">
            <span>Name</span>
            <b>{profile.name}</b>
          </div>

          <div className="summary-row">
            <span>Email</span>
            <b>{profile.email}</b>
          </div>

          <div className="summary-row">
            <span>Phone</span>
            <b>{profile.phone}</b>
          </div>
        </div>

        <div
          className="panel"
          style={{
            marginTop: 18,
          }}
        >
          <h3
            style={{
              fontFamily: 'inherit',
              marginBottom: 18,
            }}
          >
            Quick links
          </h3>

          <Link
            href="/account/orders"
            className="summary-row"
            style={{
              alignItems: 'center',
              padding: '14px 0',
            }}
          >
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontWeight: 700,
              }}
            >
              <Package size={19} />
              My Orders
            </span>

            <span>→</span>
          </Link>

          <Link
            href="/wishlist"
            className="summary-row"
            style={{
              alignItems: 'center',
              padding: '14px 0',
            }}
          >
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontWeight: 700,
              }}
            >
              <Heart size={19} />
              Wishlist
            </span>

            <span>→</span>
          </Link>
        </div>

        <button
          type="button"
          className="btn danger"
          onClick={logout}
          style={{
            marginTop: 18,
            width: '100%',
          }}
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </div>
  );
}
