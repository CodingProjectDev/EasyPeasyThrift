'use client';

import Link from 'next/link';

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
} from 'react';

import {
  CheckCircle2,
  ImagePlus,
  PackageCheck,
  Trash2,
} from 'lucide-react';

import {
  createClient,
} from '@/lib/supabase/client';

const MAX_PHOTOS = 5;

const MAX_ORIGINAL_BYTES =
  20 * 1024 * 1024;

const MAX_PREPARED_BYTES =
  4 * 1024 * 1024;

const MAX_IMAGE_SIDE = 1600;

const JPEG_QUALITY = 0.82;

type SelectedPhoto = {
  id: string;
  file: File;
  preview: string;
};

/* =========================================
   IMAGE HELPERS
========================================= */

function isHeic(
  file: File,
) {
  const name =
    file.name.toLowerCase();

  return (
    file.type ===
      'image/heic' ||
    file.type ===
      'image/heif' ||
    name.endsWith(
      '.heic',
    ) ||
    name.endsWith(
      '.heif',
    )
  );
}

function loadImage(
  blob: Blob,
) {
  return new Promise<HTMLImageElement>(
    (
      resolve,
      reject,
    ) => {
      const url =
        URL.createObjectURL(
          blob,
        );

      const image =
        new Image();

      image.onload = () => {
        URL.revokeObjectURL(
          url,
        );

        resolve(
          image,
        );
      };

      image.onerror = () => {
        URL.revokeObjectURL(
          url,
        );

        reject(
          new Error(
            'This image could not be opened.',
          ),
        );
      };

      image.src = url;
    },
  );
}

async function prepareImage(
  file: File,
) {
  if (
    file.size >
    MAX_ORIGINAL_BYTES
  ) {
    throw new Error(
      `${file.name} is too large. Maximum original photo size is 20 MB.`,
    );
  }

  let source: Blob =
    file;

  /*
   * Convert iPhone HEIC/HEIF
   * into JPEG first.
   */
  if (isHeic(file)) {
    const heic2any =
      (
        await import(
          'heic2any'
        )
      ).default;

    const converted =
      await heic2any({
        blob: file,
        toType:
          'image/jpeg',
        quality: 0.9,
      });

    source =
      Array.isArray(
        converted,
      )
        ? converted[0]
        : converted;
  } else if (
    !file.type.startsWith(
      'image/',
    )
  ) {
    throw new Error(
      `${file.name} is not a supported image.`,
    );
  }

  const image =
    await loadImage(
      source,
    );

  const naturalWidth =
    image.naturalWidth ||
    image.width;

  const naturalHeight =
    image.naturalHeight ||
    image.height;

  const scale =
    Math.min(
      1,
      MAX_IMAGE_SIDE /
        Math.max(
          naturalWidth,
          naturalHeight,
        ),
    );

  const width =
    Math.max(
      1,
      Math.round(
        naturalWidth *
          scale,
      ),
    );

  const height =
    Math.max(
      1,
      Math.round(
        naturalHeight *
          scale,
      ),
    );

  const canvas =
    document.createElement(
      'canvas',
    );

  canvas.width =
    width;

  canvas.height =
    height;

  const context =
    canvas.getContext(
      '2d',
    );

  if (!context) {
    throw new Error(
      'Your browser could not process this image.',
    );
  }

  context.drawImage(
    image,
    0,
    0,
    width,
    height,
  );

  const blob =
    await new Promise<Blob>(
      (
        resolve,
        reject,
      ) => {
        canvas.toBlob(
          (value) => {
            if (!value) {
              reject(
                new Error(
                  'Could not prepare this image.',
                ),
              );

              return;
            }

            resolve(
              value,
            );
          },

          'image/jpeg',

          JPEG_QUALITY,
        );
      },
    );

  if (
    blob.size >
    MAX_PREPARED_BYTES
  ) {
    throw new Error(
      `${file.name} is still too large after processing. Please choose a smaller photo.`,
    );
  }

  const stem =
    file.name
      .replace(
        /\.[^.]+$/,
        '',
      )
      .replace(
        /[^a-zA-Z0-9_-]+/g,
        '-',
      )
      .slice(
        0,
        50,
      ) ||
    'sell-item';

  return new File(
    [blob],
    `${stem}.jpg`,
    {
      type:
        'image/jpeg',
    },
  );
}

/* =========================================
   SELL PAGE
========================================= */

export default function SellPage() {
  const [
    authChecked,
    setAuthChecked,
  ] =
    useState(false);

  const [
    userId,
    setUserId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    userEmail,
    setUserEmail,
  ] =
    useState('');

  const [
    photos,
    setPhotos,
  ] =
    useState<
      SelectedPhoto[]
    >([]);

  const [
    processingPhotos,
    setProcessingPhotos,
  ] =
    useState(false);

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
    successId,
    setSuccessId,
  ] =
    useState('');

  /* =========================================
     CUSTOMER LOGIN
  ========================================= */

  useEffect(() => {
    const supabase =
      createClient();

    async function loadUser() {
      const {
        data: {
          user,
        },
      } =
        await supabase.auth.getUser();

      setUserId(
        user?.id ||
          null,
      );

      setUserEmail(
        user?.email ||
          '',
      );

      setAuthChecked(
        true,
      );
    }

    void loadUser();

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        (
          _event,
          session,
        ) => {
          setUserId(
            session?.user
              ?.id ||
              null,
          );

          setUserEmail(
            session?.user
              ?.email ||
              '',
          );

          setAuthChecked(
            true,
          );
        },
      );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /* =========================================
     SELECT PHOTOS
  ========================================= */

  async function handlePhotoChange(
    event:
      ChangeEvent<HTMLInputElement>,
  ) {
    const selected =
      Array.from(
        event.target
          .files ||
          [],
      );

    event.target.value =
      '';

    if (!selected.length) {
      return;
    }

    const available =
      MAX_PHOTOS -
      photos.length;

    if (
      available <= 0
    ) {
      setError(
        'Maximum 5 photos allowed.',
      );

      return;
    }

    if (
      selected.length >
      available
    ) {
      setError(
        `You can add only ${available} more photo${
          available === 1
            ? ''
            : 's'
        }.`,
      );

      return;
    }

    setError('');

    setProcessingPhotos(
      true,
    );

    try {
      const prepared =
        await Promise.all(
          selected.map(
            prepareImage,
          ),
        );

      const additions:
        SelectedPhoto[] =
        prepared.map(
          (file) => ({
            id:
              crypto.randomUUID(),

            file,

            preview:
              URL.createObjectURL(
                file,
              ),
          }),
        );

      setPhotos(
        (current) => [
          ...current,
          ...additions,
        ],
      );
    } catch (photoError) {
      setError(
        photoError instanceof
          Error
          ? photoError.message
          : 'Could not process the selected photos.',
      );
    } finally {
      setProcessingPhotos(
        false,
      );
    }
  }

  /* =========================================
     REMOVE PHOTO
  ========================================= */

  function removePhoto(
    id: string,
  ) {
    setPhotos(
      (current) => {
        const target =
          current.find(
            (photo) =>
              photo.id ===
              id,
          );

        if (target) {
          URL.revokeObjectURL(
            target.preview,
          );
        }

        return current.filter(
          (photo) =>
            photo.id !==
            id,
        );
      },
    );

    setError('');
  }

  /* =========================================
     CLEAN LOCAL PREVIEWS
  ========================================= */

  function clearPhotos() {
    for (
      const photo of
      photos
    ) {
      URL.revokeObjectURL(
        photo.preview,
      );
    }

    setPhotos([]);
  }

  /* =========================================
     UPLOAD ONE PHOTO
  ========================================= */

  async function uploadPhoto(
    file: File,
    submissionId: string,
    accessToken: string,
  ) {
    const body =
      new FormData();

    body.append(
      'file',
      file,
    );

    body.append(
      'submissionId',
      submissionId,
    );

    const response =
      await fetch(
        '/api/sell/images',
        {
          method:
            'POST',

          headers: {
            Authorization:
              `Bearer ${accessToken}`,
          },

          body,
        },
      );

    const result =
      await response
        .json()
        .catch(
          () => ({}),
        );

    if (
      !response.ok ||
      !result.url ||
      !result.path
    ) {
      throw new Error(
        result.error ||
          'Photo upload failed.',
      );
    }

    return {
      url:
        String(
          result.url,
        ),

      path:
        String(
          result.path,
        ),
    };
  }

  /* =========================================
     CLEAN UP FAILED UPLOADS
  ========================================= */

  async function cleanupUploads(
    paths: string[],
    accessToken: string,
  ) {
    if (!paths.length) {
      return;
    }

    try {
      await fetch(
        '/api/sell/images',
        {
          method:
            'DELETE',

          headers: {
            'Content-Type':
              'application/json',

            Authorization:
              `Bearer ${accessToken}`,
          },

          body:
            JSON.stringify({
              paths,
            }),
        },
      );
    } catch {
      /*
       * Cleanup failure should not
       * hide the original submission error.
       */
    }
  }

  /* =========================================
     SUBMIT SELL REQUEST
  ========================================= */

  async function submit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      busy ||
      processingPhotos
    ) {
      return;
    }

    if (!userId) {
      setError(
        'Please login before submitting an item.',
      );

      return;
    }

    if (
      photos.length < 1
    ) {
      setError(
        'Please upload at least one photo of the item.',
      );

      return;
    }

    const formElement =
      event.currentTarget;

    const form =
      new FormData(
        formElement,
      );

    setError('');
    setBusy(true);

    let accessToken =
      '';

    const uploadedPaths:
      string[] = [];

    try {
      const supabase =
        createClient();

      const {
        data: {
          session,
        },
        error:
          sessionError,
      } =
        await supabase.auth.getSession();

      if (
  sessionError ||
  !session?.access_token
) {
  window.location.href =
    `/login?next=${encodeURIComponent(
      '/sell',
    )}`;

  return;
}
      accessToken =
        session.access_token;

      /*
       * Generate one ID before
       * uploading photos.
       *
       * Photos and database record
       * use the same submission ID.
       */
      const submissionId =
        crypto.randomUUID();

      const imageUrls:
        string[] = [];

      /*
       * Upload sequentially.
       * This is friendlier to mobile
       * connections than sending all
       * files at once.
       */
      for (
        const photo of
        photos
      ) {
        const uploaded =
          await uploadPhoto(
            photo.file,
            submissionId,
            accessToken,
          );

        imageUrls.push(
          uploaded.url,
        );

        uploadedPaths.push(
          uploaded.path,
        );
      }

      const response =
        await fetch(
          '/api/sell',
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',

              Authorization:
                `Bearer ${accessToken}`,
            },

            body:
              JSON.stringify({
                id:
                  submissionId,

                sellerName:
                  String(
                    form.get(
                      'sellerName',
                    ) ||
                      '',
                  ).trim(),

                phone:
                  String(
                    form.get(
                      'phone',
                    ) ||
                      '',
                  ).trim(),

                itemName:
                  String(
                    form.get(
                      'itemName',
                    ) ||
                      '',
                  ).trim(),

                category:
                  String(
                    form.get(
                      'category',
                    ) ||
                      '',
                  ).trim(),

                brand:
                  String(
                    form.get(
                      'brand',
                    ) ||
                      '',
                  ).trim(),

                size:
                  String(
                    form.get(
                      'size',
                    ) ||
                      '',
                  ).trim(),

                condition:
                  String(
                    form.get(
                      'condition',
                    ) ||
                      '',
                  ),

                description:
                  String(
                    form.get(
                      'description',
                    ) ||
                      '',
                  ).trim(),

                expectedPrice:
                  String(
                    form.get(
                      'expectedPrice',
                    ) ||
                      '',
                  ).trim(),

                deliveryMethod:
                  String(
                    form.get(
                      'deliveryMethod',
                    ) ||
                      '',
                  ),

                sellerNotes:
                  String(
                    form.get(
                      'sellerNotes',
                    ) ||
                      '',
                  ).trim(),

                images:
                  imageUrls,

                imagePaths:
                  uploadedPaths,
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
            'Could not submit your item.',
        );
      }

      clearPhotos();

      formElement.reset();

      setSuccessId(
        String(
          result.id ||
            submissionId,
        ),
      );

      window.scrollTo({
        top: 0,
        behavior:
          'smooth',
      });
    } catch (submitError) {
      if (
        accessToken &&
        uploadedPaths.length
      ) {
        await cleanupUploads(
          uploadedPaths,
          accessToken,
        );
      }

      setError(
        submitError instanceof
          Error
          ? submitError.message
          : 'Could not submit your item.',
      );
    } finally {
      setBusy(false);
    }
  }

  /* =========================================
     AUTH LOADING
  ========================================= */

  if (!authChecked) {
    return (
      <div className="container content-page">
        <div className="empty-state">
          <h2>
            Loading Sell With Us…
          </h2>

          <p className="muted">
            Checking your customer account.
          </p>
        </div>
      </div>
    );
  }

  /* =========================================
     LOGIN REQUIRED
  ========================================= */

  if (!userId) {
    return (
      <div className="container content-page">
        <div className="sell-login-card">
          <span className="eyebrow">
            Sell With Us
          </span>

          <h1>
            Give your things another life.
          </h1>

          <p>
            Login or create an account to submit items for EasyPeasy-Thrift to review.
          </p>

          <div className="hero-actions">
            <Link
  href={`/login?next=${encodeURIComponent(
    '/sell',
  )}`}
  className="btn sage"
>
  Login / Sign Up
</Link>

            <Link
              href="/shop"
              className="btn secondary"
            >
              Keep shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* =========================================
     SUCCESS
  ========================================= */

  if (successId) {
    return (
      <div className="container content-page">
        <div className="sell-success-card">
          <div className="sell-success-icon">
            <CheckCircle2
              size={38}
            />
          </div>

          <span className="eyebrow">
            Submission received
          </span>

          <h1>
            Your item is under review.
          </h1>

          <p>
            Thanks for selling with EasyPeasy-Thrift. Our team will review your item, photos, condition, and requested price.
          </p>

          <div className="notice sage">
            <b>Status:</b>{' '}
            Submitted
          </div>

          <p className="muted sell-reference">
            Reference:{' '}
            {successId}
          </p>

          <div className="hero-actions">
            <button
              type="button"
              className="btn sage"
              onClick={() => {
                setSuccessId(
                  '',
                );
              }}
            >
              Submit another item
            </button>

            <Link
              href="/shop"
              className="btn secondary"
            >
              Continue shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* =========================================
     PAGE
  ========================================= */

  return (
    <div className="container">
      <div className="sell-page-hero">
        <span className="eyebrow">
          Sell With Us
        </span>

        <h1>
          Give it a fresh start.
        </h1>

        <p>
          Have something great you no longer use? Send us the details and photos. We&apos;ll review it and let you know if it&apos;s a good fit for EasyPeasy-Thrift.
        </p>

        <div className="sell-process">
          <div>
            <b>01</b>
            <span>
              Submit
            </span>
          </div>

          <div>
            <b>02</b>
            <span>
              We review
            </span>
          </div>

          <div>
            <b>03</b>
            <span>
              We list
            </span>
          </div>

          <div>
            <b>04</b>
            <span>
              You earn
            </span>
          </div>
        </div>
      </div>

      <form
        className="sell-layout"
        onSubmit={
          submit
        }
      >
        <div className="sell-main">

          {/* SELLER */}

          <section className="panel sell-section">
            <div className="sell-section-head">
              <span>
                01
              </span>

              <div>
                <h2>
                  Your details
                </h2>

                <p className="muted">
                  Tell us who is submitting the item.
                </p>
              </div>
            </div>

            <div className="sell-form-grid">
              <div className="field">
                <label>
                  Full name
                </label>

                <input
                  className="control"
                  name="sellerName"
                  autoComplete="name"
                  required
                />
              </div>

              <div className="field">
                <label>
                  Email
                </label>

                <input
                  className="control"
                  type="email"
                  value={
                    userEmail
                  }
                  readOnly
                />

                <small className="muted">
                  Linked to your customer account.
                </small>
              </div>

              <div className="field full">
                <label>
                  Phone
                </label>

                <input
                  className="control"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  required
                />
              </div>
            </div>
          </section>

          {/* ITEM */}

          <section className="panel sell-section">
            <div className="sell-section-head">
              <span>
                02
              </span>

              <div>
                <h2>
                  Item details
                </h2>

                <p className="muted">
                  Give us enough information to review the item accurately.
                </p>
              </div>
            </div>

            <div className="sell-form-grid">
              <div className="field full">
                <label>
                  Item name
                </label>

                <input
                  className="control"
                  name="itemName"
                  placeholder="e.g. Nike Air Max Shoes"
                  required
                />
              </div>

              <div className="field">
                <label>
                  Category
                </label>

                <input
                  className="control"
                  name="category"
                  placeholder="e.g. Shoes"
                  required
                />
              </div>

              <div className="field">
                <label>
                  Brand
                </label>

                <input
                  className="control"
                  name="brand"
                  placeholder="e.g. Nike"
                />
              </div>

              <div className="field">
                <label>
                  Size
                </label>

                <input
                  className="control"
                  name="size"
                  placeholder="e.g. M / 42"
                />
              </div>

              <div className="field">
                <label>
                  Condition
                </label>

                <select
                  className="control"
                  name="condition"
                  defaultValue="Excellent"
                  required
                >
                  <option value="Like New">
                    Like New
                  </option>

                  <option value="Excellent">
                    Excellent
                  </option>

                  <option value="Good">
                    Good
                  </option>

                  <option value="Fair">
                    Fair
                  </option>
                </select>
              </div>

              <div className="field">
                <label>
                  Expected price
                </label>

                <input
                  className="control"
                  name="expectedPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Optional"
                />

                <small className="muted">
                  Optional. Final listing price is approved by the store.
                </small>
              </div>

              <div className="field">
                <label>
                  Item handoff
                </label>

                <select
                  className="control"
                  name="deliveryMethod"
                  defaultValue="Discuss With Store"
                  required
                >
                  <option value="Discuss With Store">
                    Discuss With Store
                  </option>

                  <option value="Drop Off">
                    Drop Off
                  </option>

                  <option value="Pickup">
                    Pickup
                  </option>
                </select>
              </div>

              <div className="field full">
                <label>
                  Description
                </label>

                <textarea
                  className="control sell-textarea"
                  name="description"
                  placeholder="Describe the item, condition, age, defects, original purchase details, or anything else we should know."
                  required
                />
              </div>
            </div>
          </section>

          {/* PHOTOS */}

          <section className="panel sell-section">
            <div className="sell-section-head">
              <span>
                03
              </span>

              <div>
                <h2>
                  Photos
                </h2>

                <p className="muted">
                  Upload clear photos from multiple angles.
                </p>
              </div>
            </div>

            <label
              className="sell-photo-picker"
              htmlFor="sell-photos"
            >
              <ImagePlus
                size={28}
              />

              <strong>
                {photos.length
                  ? `Add photos (${photos.length}/5)`
                  : 'Choose up to 5 photos'}
              </strong>

              <span>
                JPG, PNG, WEBP, HEIC or HEIF
              </span>
            </label>

            <input
              id="sell-photos"
              className="native-photo-input"
              type="file"
              multiple
              accept="image/*,.heic,.heif"
              disabled={
                busy ||
                processingPhotos ||
                photos.length >=
                  MAX_PHOTOS
              }
              onChange={
                handlePhotoChange
              }
            />

            {processingPhotos && (
              <p className="muted">
                Preparing photos…
              </p>
            )}

            {photos.length >
              0 && (
              <div className="sell-photo-grid">
                {photos.map(
                  (
                    photo,
                    index,
                  ) => (
                    <div
                      className="sell-photo-card"
                      key={
                        photo.id
                      }
                    >
                      <img
                        src={
                          photo.preview
                        }
                        alt={`Sell item photo ${
                          index +
                          1
                        }`}
                      />

                      <span>
                        Photo{' '}
                        {index +
                          1}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          removePhoto(
                            photo.id,
                          )
                        }
                        aria-label="Remove photo"
                      >
                        <Trash2
                          size={16}
                        />
                      </button>
                    </div>
                  ),
                )}
              </div>
            )}
          </section>

          {/* NOTES */}

          <section className="panel sell-section">
            <div className="sell-section-head">
              <span>
                04
              </span>

              <div>
                <h2>
                  Anything else?
                </h2>

                <p className="muted">
                  Optional notes for our review team.
                </p>
              </div>
            </div>

            <div className="field">
              <textarea
                className="control sell-textarea"
                name="sellerNotes"
                placeholder="Pickup details, preferred contact time, additional information, etc."
              />
            </div>
          </section>
        </div>

        {/* SIDEBAR */}

        <aside className="panel sell-summary">
          <PackageCheck
            size={30}
          />

          <h3>
            Before you submit
          </h3>

          <p>
            Submitting an item does not guarantee that it will be accepted or listed.
          </p>

          <div className="sell-summary-points">
            <span>
              ✓ Upload clear photos
            </span>

            <span>
              ✓ Describe flaws honestly
            </span>

            <span>
              ✓ Final price requires approval
            </span>

            <span>
              ✓ We&apos;ll contact you after review
            </span>
          </div>

          <label className="sell-agree">
            <input
              type="checkbox"
              required
            />

            <span>
              I confirm that the information provided is accurate and that I own or have permission to sell this item.
            </span>
          </label>

          {error && (
            <div className="notice brown">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn sage"
            disabled={
              busy ||
              processingPhotos
            }
          >
            {busy
              ? 'Submitting…'
              : processingPhotos
                ? 'Preparing photos…'
                : 'Submit for review'}
          </button>

          <p className="muted sell-small-print">
            Your submission will appear as <b>Submitted</b> until our team begins reviewing it.
          </p>
        </aside>
      </form>
    </div>
  );
}