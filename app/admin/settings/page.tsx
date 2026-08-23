'use client';

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
} from 'react';

import AdminShell from '@/components/admin-shell';
import {
  StoreSettings,
  useStore,
} from '@/components/store-provider';

type UploadKind = 'qr' | 'logo';

export default function SettingsPage() {
  const {
    settings,
    saveSettings,
  } = useStore();

  const [draft, setDraft] =
    useState<StoreSettings>(settings);

  const [saving, setSaving] =
    useState(false);

  const [uploading, setUploading] =
    useState<UploadKind | null>(null);

  const [message, setMessage] =
    useState('');

  const [error, setError] =
    useState('');

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  async function upload(
    event: ChangeEvent<HTMLInputElement>,
    kind: UploadKind,
  ) {
    const file =
      event.target.files?.[0];

    if (!file) return;

    setError('');
    setMessage('');
    setUploading(kind);

    try {
      const form = new FormData();
      form.append('file', file);
      form.append('kind', kind);

      const response = await fetch(
        '/api/admin/settings-image',
        {
          method: 'POST',
          body: form,
        },
      );

      const payload = await response
        .json()
        .catch(() => ({}));

      if (!response.ok || !payload.url) {
        throw new Error(
          payload.error ||
            'Could not upload image.',
        );
      }

      setDraft((current) =>
        kind === 'qr'
          ? {
              ...current,
              qrImage: String(payload.url),
            }
          : {
              ...current,
              logoImage: String(payload.url),
            },
      );
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : 'Could not upload image.',
      );
    } finally {
      setUploading(null);
      event.target.value = '';
    }
  }

  async function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setSaving(true);
    setMessage('');
    setError('');

    try {
      await saveSettings(draft);

      setMessage(
        'Store settings saved. Customers will now see the updated information.',
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Could not save settings.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell>
      <div className="admin-top">
        <div>
          <span className="eyebrow">
            Store configuration
          </span>

          <h1>Settings</h1>

          <p className="muted">
            Everything here is editable by Admin
            and shared with customers through
            Supabase.
          </p>
        </div>
      </div>

      <form
        className="admin-card"
        onSubmit={submit}
      >
        <div className="admin-form">
          <div>
            <label>Store name</label>

            <input
              value={draft.storeName}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  storeName:
                    event.target.value,
                })
              }
              required
            />
          </div>

          <div>
            <label>Tagline</label>

            <input
              value={draft.tagline}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  tagline:
                    event.target.value,
                })
              }
              required
            />
          </div>

          <div className="full">
            <label>Top announcement bar</label>

            <input
              value={draft.announcementText}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  announcementText:
                    event.target.value,
                })
              }
              maxLength={160}
              placeholder="Flexible shipping • One-of-a-kind finds. Easy shopping."
            />

            <small className="muted">
              This appears in the black bar at the top of the customer website.
              Leave it blank to hide the announcement bar.
            </small>
          </div>

          <div>
            <label>Store email</label>

            <input
              type="email"
              value={draft.storeEmail}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  storeEmail:
                    event.target.value,
                })
              }
              placeholder="hello@example.com"
            />
          </div>

          <div>
            <label>Store phone</label>

            <input
              value={draft.storePhone}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  storePhone:
                    event.target.value,
                })
              }
              placeholder="+977..."
            />
          </div>

          <div>
            <label>Instagram URL</label>
            <input
              type="url"
              value={draft.instagramUrl || ''}
              onChange={(event) =>
                setDraft({ ...draft, instagramUrl: event.target.value })
              }
              placeholder="https://instagram.com/yourstore"
            />
          </div>

          <div>
            <label>TikTok URL</label>
            <input
              type="url"
              value={draft.tiktokUrl || ''}
              onChange={(event) =>
                setDraft({ ...draft, tiktokUrl: event.target.value })
              }
              placeholder="https://tiktok.com/@yourstore"
            />
          </div>

          <div className="full">
            <label>Pinterest URL</label>
            <input
              type="url"
              value={draft.pinterestUrl || ''}
              onChange={(event) =>
                setDraft({ ...draft, pinterestUrl: event.target.value })
              }
              placeholder="https://pinterest.com/yourstore"
            />
          </div>

          <div className="full">
            <label>
              Shipping fee / information
            </label>

            <input
              value={draft.shippingInfo}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  shippingInfo:
                    event.target.value,
                })
              }
              placeholder="Depends on product and location"
              required
            />

            <small className="muted">
              Example: Depends on product and
              location. This text is shown to
              customers; shipping is not
              automatically added to the online
              product total.
            </small>
          </div>

          <div className="full">
            <label>Return policy</label>

            <textarea
              rows={7}
              value={draft.returnPolicy}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  returnPolicy:
                    event.target.value,
                })
              }
              required
            />
          </div>

          <div className="full">
            <label>Store logo</label>

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={uploading !== null}
              onChange={(event) =>
                void upload(event, 'logo')
              }
            />

            {uploading === 'logo' && (
              <p className="muted">
                Uploading logo…
              </p>
            )}

            {draft.logoImage && (
              <div>
                <img
                  src={draft.logoImage}
                  alt="Current store logo"
                  style={{
                    maxWidth: 220,
                    maxHeight: 80,
                    objectFit: 'contain',
                    background: 'white',
                    padding: 8,
                    borderRadius: 12,
                    marginTop: 10,
                  }}
                />

                <div>
                  <button
                    type="button"
                    className="mini-btn danger"
                    style={{ marginTop: 8 }}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        logoImage: undefined,
                      })
                    }
                  >
                    Remove logo
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="full">
            <label>
              Store QR code image
            </label>

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={uploading !== null}
              onChange={(event) =>
                void upload(event, 'qr')
              }
            />

            {uploading === 'qr' && (
              <p className="muted">
                Uploading QR code…
              </p>
            )}

            {draft.qrImage && (
              <div>
                <img
                  src={draft.qrImage}
                  alt="Current store QR"
                  style={{
                    width: 180,
                    height: 180,
                    objectFit: 'contain',
                    background: 'white',
                    padding: 8,
                    borderRadius: 12,
                    marginTop: 10,
                  }}
                />

                <div>
                  <button
                    type="button"
                    className="mini-btn danger"
                    style={{ marginTop: 8 }}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        qrImage: undefined,
                      })
                    }
                  >
                    Remove QR image
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="setting-row">
          <div>
            <b>Cash on Delivery</b>
            <div className="muted">
              Allow COD at checkout.
            </div>
          </div>

          <label className="switch">
            <input
              type="checkbox"
              checked={draft.codEnabled}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  codEnabled:
                    event.target.checked,
                })
              }
            />
            <i />
          </label>
        </div>

        <div className="setting-row">
          <div>
            <b>QR Payment</b>

            <div className="muted">
              Require screenshot +
              transaction/reference ID.
            </div>
          </div>

          <label className="switch">
            <input
              type="checkbox"
              checked={draft.qrEnabled}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  qrEnabled:
                    event.target.checked,
                })
              }
            />
            <i />
          </label>
        </div>

        {error && (
          <div
            className="notice"
            style={{
              marginTop: 16,
              color: '#9b4136',
            }}
          >
            {error}
          </div>
        )}

        {message && (
          <div
            className="notice sage"
            style={{ marginTop: 16 }}
          >
            {message}
          </div>
        )}

        <button
          className="btn sage"
          style={{ marginTop: 18 }}
          disabled={
            saving || uploading !== null
          }
        >
          {saving
            ? 'Saving…'
            : 'Save settings'}
        </button>
      </form>
    </AdminShell>
  );
}
