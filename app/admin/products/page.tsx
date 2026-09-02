'use client';

import {
  useState,
} from 'react';

import type {
  ChangeEvent,
  FormEvent,
} from 'react';

import {
  ImagePlus,
  Plus,
  Trash2,
  X,
} from 'lucide-react';

import AdminShell from '@/components/admin-shell';
import { ProductImage } from '@/components/product-image';
import { useStore } from '@/components/store-provider';
import { money } from '@/lib/format';

import type {
  Product,
  ProductCondition,
} from '@/lib/types';

const blank = {
  name: '',
  price: '',
  brand: '',
  size: 'M',
  condition: 'Excellent' as ProductCondition,
  category: '',
  inventory: 1,
  shippingFee: '',
  image: '',
  tiktokUrl: '',
  description: '',
};

const MAX_PRODUCT_IMAGES = 5;
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const MAX_IMAGE_SIDE = 1600;
const JPEG_QUALITY = 0.84;

type DraftImage =
  | {
      id: string;
      kind: 'existing';
      src: string;
    }
  | {
      id: string;
      kind: 'new';
      src: string;
      file: File;
    };

type ShippingMode =
  | 'manual'
  | 'free'
  | 'fixed';

/* =========================================
   IMAGE HELPERS
   ========================================= */

function isHeic(file: File) {
  const name =
    file.name.toLowerCase();

  return (
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    name.endsWith('.heic') ||
    name.endsWith('.heif')
  );
}

function loadImage(blob: Blob) {
  return new Promise<HTMLImageElement>(
    (resolve, reject) => {
      const url =
        URL.createObjectURL(blob);

      const image =
        new Image();

      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
      };

      image.onerror = () => {
        URL.revokeObjectURL(url);

        reject(
          new Error(
            'This image format could not be opened.',
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
    MAX_UPLOAD_BYTES
  ) {
    throw new Error(
      `Image "${file.name}" is too large. Please choose an image under 20 MB.`,
    );
  }

  let source: Blob = file;

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
      `"${file.name}" is not a supported image.`,
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

  canvas.width = width;
  canvas.height = height;

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
          (value) =>
            value
              ? resolve(
                  value,
                )
              : reject(
                  new Error(
                    'Could not convert this image.',
                  ),
                ),
          'image/jpeg',
          JPEG_QUALITY,
        );
      },
    );

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
        60,
      ) ||
    'product';

  return new File(
    [blob],
    `${stem}.jpg`,
    {
      type:
        'image/jpeg',
    },
  );
}

function oldUnsupportedImage(
  src?: string,
) {
  if (!src) {
    return false;
  }

  return (
    src.startsWith(
      'blob:',
    ) ||
    src.startsWith(
      'data:image/heic',
    ) ||
    src.startsWith(
      'data:image/heif',
    )
  );
}

function isPlaceholderImage(
  src?: string,
) {
  return (
    !src ||
    src ===
      '/noupload.png'
  );
}

function slugify(
  name: string,
) {
  const base =
    name
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        '-',
      )
      .replace(
        /^-|-$/g,
        '',
      ) ||
    'product';

  return `${base}-${Date.now()
    .toString()
    .slice(-6)}`;
}

/* =========================================
   DISCOUNT HELPERS
   ========================================= */

function getDiscountPercent(
  product?: Product | null,
) {
  if (
    !product?.compareAt ||
    product.compareAt <=
      product.price
  ) {
    return null;
  }

  return Math.round(
    (1 -
      product.price /
        product.compareAt) *
      100,
  );
}

/* =========================================
   ADMIN PRODUCTS
   ========================================= */

export default function AdminProducts() {
  const {
    products,
    addProduct,
    deleteProduct,
    updateProduct,
  } = useStore();

  const [
    open,
    setOpen,
  ] =
    useState(false);

  const [
    edit,
    setEdit,
  ] =
    useState<Product | null>(
      null,
    );

  const [
    draftImages,
    setDraftImages,
  ] =
    useState<
      DraftImage[]
    >([]);

  const [
    photoError,
    setPhotoError,
  ] =
    useState('');

  const [
    processingPhoto,
    setProcessingPhoto,
  ] =
    useState(false);

  const [
    uploadingPhoto,
    setUploadingPhoto,
  ] =
    useState(false);

  const [
    shippingMode,
    setShippingMode,
  ] =
    useState<ShippingMode>(
      'manual',
    );

  /* =========================================
     PHOTO CLEANUP
     ========================================= */

  function revokeDraftImages(
    images:
      DraftImage[],
  ) {
    for (
      const image of images
    ) {
      if (
        image.kind ===
          'new' &&
        image.src.startsWith(
          'blob:',
        )
      ) {
        URL.revokeObjectURL(
          image.src,
        );
      }
    }
  }

  function closeModal() {
    revokeDraftImages(
      draftImages,
    );

    setDraftImages([]);
    setPhotoError('');
    setProcessingPhoto(
      false,
    );
    setUploadingPhoto(
      false,
    );
    setShippingMode(
      'manual',
    );
    setEdit(null);
    setOpen(false);
  }

  /* =========================================
     OPEN PRODUCT FORM
     ========================================= */

  function launch(
    product?: Product,
  ) {
    revokeDraftImages(
      draftImages,
    );

    const current =
      product || null;

    const allImages =
      current?.images || [];

    const unsupported =
      allImages.filter(
        (src) =>
          oldUnsupportedImage(
            src,
          ),
      );

    const usableImages =
      allImages.filter(
        (src) =>
          !oldUnsupportedImage(
            src,
          ) &&
          !isPlaceholderImage(
            src,
          ),
      );

    const existing:
      DraftImage[] =
      usableImages
        .slice(
          0,
          MAX_PRODUCT_IMAGES,
        )
        .map(
          (
            src,
            index,
          ) => ({
            id: `existing-${index}-${src}`,
            kind:
              'existing',
            src,
          }),
        );

    setEdit(
      current,
    );

    setDraftImages(
      existing,
    );

    setPhotoError(
      unsupported.length
        ? `${unsupported.length} older image${
            unsupported.length ===
            1
              ? ''
              : 's'
          } could not be recovered. Please upload again if needed.`
        : '',
    );

    setProcessingPhoto(
      false,
    );

    setUploadingPhoto(
      false,
    );

    setShippingMode(
      current?.freeShipping
        ? 'free'
        : current?.shippingFee != null
          ? 'fixed'
          : 'manual',
    );

    setOpen(true);
  }

  /* =========================================
     SELECT MULTIPLE PHOTOS
     ========================================= */

  async function handlePhotoChange(
    event:
      ChangeEvent<HTMLInputElement>,
  ) {
    const files =
      Array.from(
        event.target.files ||
          [],
      );

    /*
     * Allows selecting the same
     * file again later.
     */
    event.target.value =
      '';

    if (!files.length) {
      return;
    }

    const availableSlots =
      MAX_PRODUCT_IMAGES -
      draftImages.length;

    if (
      availableSlots <= 0
    ) {
      setPhotoError(
        'Maximum 5 photos allowed. Remove a photo before adding another.',
      );

      return;
    }

    if (
      files.length >
      availableSlots
    ) {
      setPhotoError(
        `You can add only ${availableSlots} more photo${
          availableSlots ===
          1
            ? ''
            : 's'
        }. Maximum is 5.`,
      );

      return;
    }

    setPhotoError('');
    setProcessingPhoto(
      true,
    );

    try {
      const preparedFiles =
        await Promise.all(
          files.map(
            prepareImage,
          ),
        );

      const newImages:
        DraftImage[] =
        preparedFiles.map(
          (file) => ({
            id:
              crypto.randomUUID(),

            kind:
              'new',

            file,

            src:
              URL.createObjectURL(
                file,
              ),
          }),
        );

      setDraftImages(
        (current) => [
          ...current,
          ...newImages,
        ],
      );
    } catch (error) {
      setPhotoError(
        error instanceof Error
          ? error.message
          : 'Could not process the selected images.',
      );
    } finally {
      setProcessingPhoto(
        false,
      );
    }
  }

  /* =========================================
     REMOVE ONE PHOTO
     ========================================= */

  function removePhoto(
    id: string,
  ) {
    setDraftImages(
      (current) => {
        const target =
          current.find(
            (image) =>
              image.id === id,
          );

        if (
          target?.kind ===
            'new' &&
          target.src.startsWith(
            'blob:',
          )
        ) {
          URL.revokeObjectURL(
            target.src,
          );
        }

        return current.filter(
          (image) =>
            image.id !== id,
        );
      },
    );

    setPhotoError('');
  }

  /* =========================================
     MAKE PHOTO MAIN
     ========================================= */

  function makeMainPhoto(
    id: string,
  ) {
    setDraftImages(
      (current) => {
        const index =
          current.findIndex(
            (image) =>
              image.id ===
              id,
          );

        if (
          index <= 0
        ) {
          return current;
        }

        const selected =
          current[index];

        return [
          selected,
          ...current.filter(
            (
              _,
              currentIndex,
            ) =>
              currentIndex !==
              index,
          ),
        ];
      },
    );
  }

  /* =========================================
     UPLOAD ONE PHOTO
     ========================================= */

  async function uploadPhoto(
    file: File,
  ) {
    const form =
      new FormData();

    form.append(
      'file',
      file,
    );

    const response =
      await fetch(
        '/api/admin/product-image',
        {
          method:
            'POST',
          body: form,
        },
      );

    const payload =
      await response
        .json()
        .catch(
          () => ({}),
        );

    if (
      !response.ok ||
      !payload.url
    ) {
      throw new Error(
        payload.error ||
          'Photo upload failed.',
      );
    }

    return String(
      payload.url,
    );
  }

  /* =========================================
     UPLOAD NEW PHOTOS
     KEEP EXISTING PHOTOS
     ========================================= */

  async function uploadDraftPhotos() {
    const urls:
      string[] = [];

    for (
      const image of
      draftImages
    ) {
      if (
        image.kind ===
        'existing'
      ) {
        urls.push(
          image.src,
        );

        continue;
      }

      const uploadedUrl =
        await uploadPhoto(
          image.file,
        );

      urls.push(
        uploadedUrl,
      );
    }

    return urls;
  }

  /* =========================================
     SAVE PRODUCT DATABASE
     ========================================= */

  async function saveProductToDatabase(
    product: Product,
  ) {
    const response =
      await fetch(
        '/api/admin/products',
        {
          method:
            'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify({
              product,
            }),
        },
      );

    const payload =
      await response
        .json()
        .catch(
          () => ({}),
        );

    if (
      !response.ok ||
      !payload.product
    ) {
      throw new Error(
        payload.error ||
          'Could not save product.',
      );
    }

    return payload.product as Product;
  }

  /* =========================================
     SUBMIT PRODUCT
     ========================================= */

  async function submit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      processingPhoto ||
      uploadingPhoto
    ) {
      return;
    }

    const form =
      new FormData(
        event.currentTarget,
      );

    const name =
      String(
        form.get('name') ||
          '',
      ).trim();

    const current =
      edit;

    const imageUrl =
      String(
        form.get('image') ||
          '',
      ).trim();

    if (!name) {
      return;
    }

    const regularPrice =
      Number(
        form.get(
          'price',
        ),
      );

    const enteredDiscount =
      Number(
        form.get(
          'discountPercent',
        ) || 0,
      );

    const discountPercent =
      Math.max(
        0,
        Math.min(
          100,
          Number.isFinite(
            enteredDiscount,
          )
            ? enteredDiscount
            : 0,
        ),
      );

    if (
      !Number.isFinite(
        regularPrice,
      ) ||
      regularPrice < 0
    ) {
      setPhotoError(
        'Please enter a valid regular price.',
      );

      return;
    }

    const salePrice =
      discountPercent > 0
        ? Math.round(
            regularPrice *
              (1 -
                discountPercent /
                  100) *
              100,
          ) / 100
        : regularPrice;

    const selectedShippingMode =
      String(
        form.get(
          'shippingMode',
        ) || 'manual',
      ) as ShippingMode;

    const shippingFeeText =
      String(
        form.get(
          'shippingFee',
        ) || '',
      ).trim();

    const shippingFee =
      selectedShippingMode ===
      'fixed'
        ? Number(
            shippingFeeText,
          )
        : undefined;

    if (
      selectedShippingMode ===
        'fixed' &&
      (
        shippingFeeText === '' ||
        !Number.isFinite(
          shippingFee,
        ) ||
        Number(
          shippingFee,
        ) < 0
      )
    ) {
      setPhotoError(
        'Please enter a valid shipping fee.',
      );

      return;
    }

    setPhotoError('');
    setUploadingPhoto(
      true,
    );

    try {
      let images =
        await uploadDraftPhotos();

      /*
       * Optional manual image URL.
       * It is added after uploaded /
       * existing photos.
       */
      if (
        imageUrl &&
        !images.includes(
          imageUrl,
        )
      ) {
        if (
          images.length >=
          MAX_PRODUCT_IMAGES
        ) {
          throw new Error(
            'Maximum 5 product photos allowed. Remove one photo before adding an image URL.',
          );
        }

        images.push(
          imageUrl,
        );
      }

      /*
       * No images = local placeholder.
       */
      if (
        images.length ===
        0
      ) {
        images = [
          '/noupload.png',
        ];
      }

      const draft:
        Product = {
        id:
          current?.id ||
          crypto.randomUUID(),

        slug:
          current?.slug ||
          slugify(name),

        name,

        /*
         * price = actual sale price
         * the customer pays.
         */
        price:
          salePrice,

        /*
         * compareAt = original price.
         * No discount clears it.
         */
        compareAt:
          discountPercent > 0
            ? regularPrice
            : undefined,

        category:
          String(
            form.get(
              'category',
            ) || '',
          ).trim(),

        size:
          String(
            form.get(
              'size',
            ) || '',
          ),

        condition:
          String(
            form.get(
              'condition',
            ),
          ) as ProductCondition,

        brand:
          String(
            form.get(
              'brand',
            ) || '',
          ).trim(),

        measurements: {
          Chest:
            String(
              form.get(
                'chest',
              ) ||
                'Not listed',
            ),

          Length:
            String(
              form.get(
                'length',
              ) ||
                'Not listed',
            ),
        },

        description:
          String(
            form.get(
              'description',
            ) || '',
          ),

        tiktokUrl:
          String(
            form.get(
              'tiktokUrl',
            ) || '',
          ).trim() ||
          undefined,

        images,

        inventory:
          Number(
            form.get(
              'inventory',
            ),
          ),

        shippingFee:
          selectedShippingMode ===
          'fixed'
            ? Number(
                shippingFee,
              )
            : undefined,

        freeShipping:
          selectedShippingMode ===
          'free',

        oneOfOne:
          form.get(
            'oneOfOne',
          ) === 'on',

        newArrival:
          form.get(
            'newArrival',
          ) === 'on',

        featured:
          form.get(
            'featured',
          ) === 'on',

        vintageFind:
          form.get(
            'vintageFind',
          ) === 'on',

        createdAt:
          current?.createdAt ||
          new Date()
            .toISOString()
            .slice(
              0,
              10,
            ),
      };

      const saved =
        await saveProductToDatabase(
          draft,
        );

      if (current) {
        /*
         * Old local-only IDs can
         * become Supabase UUIDs.
         */
        if (
          current.id !==
          saved.id
        ) {
          deleteProduct(
            current.id,
          );

          addProduct(
            saved,
          );
        } else {
          updateProduct(
            saved,
          );
        }
      } else {
        addProduct(
          saved,
        );
      }

      closeModal();
    } catch (error) {
      setPhotoError(
        error instanceof Error
          ? error.message
          : 'Could not save this product.',
      );
    } finally {
      setUploadingPhoto(
        false,
      );
    }
  }

  /* =========================================
     DELETE PRODUCT
     ========================================= */

  async function removeProduct(
    product: Product,
  ) {
    if (
      !confirm(
        `Delete ${product.name}?`,
      )
    ) {
      return;
    }

    const response =
      await fetch(
        `/api/admin/products?id=${encodeURIComponent(
          product.id,
        )}`,
        {
          method:
            'DELETE',
        },
      );

    const payload =
      await response
        .json()
        .catch(
          () => ({}),
        );

    if (!response.ok) {
      alert(
        payload.error ||
          'Could not delete product.',
      );

      return;
    }

    deleteProduct(
      product.id,
    );
  }

  /* =========================================
     PAGE
     ========================================= */

  return (
    <AdminShell>
      <div className="admin-top">
        <div>
          <span className="eyebrow">
            Catalog
          </span>

          <h1>
            Products
          </h1>

          <p className="muted">
            Products saved here are stored in Supabase and can be checked out from any device.
          </p>
        </div>

        <button
          type="button"
          className="btn sage"
          onClick={() =>
            launch()
          }
        >
          <Plus
            size={16}
          />

          Add product
        </button>
      </div>

      {/* PRODUCT TABLE */}

      <div className="admin-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>
                Product
              </th>

              <th>
                Category
              </th>

              <th>
                Size
              </th>

              <th>
                Condition
              </th>

              <th>
                Price
              </th>

              <th>
                Stock
              </th>

              <th>
                Shipping
              </th>

              <th>
                Flags
              </th>

              <th>
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {products.map(
              (product) => (
                <tr
                  key={
                    product.id
                  }
                >
                  <td>
                    <div className="table-product">
                      <ProductImage
                        className="thumb"
                        src={
                          product
                            .images[0] ||
                          '/noupload.png'
                        }
                        alt={
                          product.name
                        }
                      />

                      <div>
                        <b>
                          {
                            product.name
                          }
                        </b>

                        <br />

                        <span className="muted">
                          {
                            product.brand
                          }
                        </span>

                        {product
                          .images
                          .length >
                          1 && (
                          <>
                            <br />

                            <small className="muted">
                              {
                                product
                                  .images
                                  .length
                              }{' '}
                              photos
                            </small>
                          </>
                        )}
                      </div>
                    </div>
                  </td>

                  <td>
                    {
                      product.category
                    }
                  </td>

                  <td>
                    {
                      product.size
                    }
                  </td>

                  <td>
                    {
                      product.condition
                    }
                  </td>

                  <td>
                    {product.compareAt &&
                    product.compareAt >
                      product.price ? (
                      <div className="admin-sale-price">
                        <b>
                          {money(
                            product.price,
                          )}
                        </b>

                        <del>
                          {money(
                            product.compareAt,
                          )}
                        </del>

                        <small>
                          -
                          {getDiscountPercent(
                            product,
                          )}
                          % OFF
                        </small>
                      </div>
                    ) : (
                      money(
                        product.price,
                      )
                    )}
                  </td>

                  <td
                    className={
                      product.inventory <=
                      1
                        ? 'low-stock'
                        : ''
                    }
                  >
                    {
                      product.inventory
                    }
                  </td>

                  <td>
                    {product.freeShipping
                      ? 'FREE'
                      : product.shippingFee != null
                        ? money(
                            product.shippingFee,
                          )
                        : 'By location'}
                  </td>

                  <td>
                    {[
                      product.oneOfOne &&
                        '1/1',

                      product.newArrival &&
                        'New',

                      product.featured &&
                        'Featured',

                      product.vintageFind &&
                        'Vintage',
                    ]
                      .filter(
                        Boolean,
                      )
                      .join(
                        ' · ',
                      )}
                  </td>

                  <td>
                    <div className="inline-actions">
                      <button
                        type="button"
                        className="mini-btn"
                        onClick={() =>
                          launch(
                            product,
                          )
                        }
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="mini-btn danger"
                        onClick={() =>
                          removeProduct(
                            product,
                          )
                        }
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>

      {/* PRODUCT MODAL */}

      {open && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-head">
              <h3>
                {edit
                  ? 'Edit product'
                  : 'Add product'}
              </h3>

              <button
                type="button"
                onClick={
                  closeModal
                }
                aria-label="Close product form"
              >
                <X />
              </button>
            </div>

            <form
              className="admin-form"
              onSubmit={
                submit
              }
            >
              {/* NAME */}

              <div>
                <label>
                  Name
                </label>

                <input
                  name="name"
                  defaultValue={
                    edit?.name ||
                    blank.name
                  }
                  required
                />
              </div>

              {/* REGULAR PRICE */}

              <div>
                <label>
                  Regular price
                </label>

                <input
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={
                    edit?.compareAt ??
                    edit?.price ??
                    blank.price
                  }
                  placeholder="e.g. 1899"
                  required
                />

                <small className="muted">
                  Original price before discount.
                </small>
              </div>

              {/* DISCOUNT */}

              <div>
                <label>
                  Discount (%)
                </label>

                <input
                  name="discountPercent"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  defaultValue={
                    getDiscountPercent(
                      edit,
                    ) ?? ''
                  }
                  placeholder="0"
                />

                <small className="muted">
                  Example: 32 means 32% OFF. Enter 0 for no discount.
                </small>
              </div>

              {/* BRAND */}

              <div>
                <label>
                  Brand
                </label>

                <input
                  name="brand"
                  defaultValue={
                    edit?.brand ||
                    blank.brand
                  }
                  required
                />
              </div>

              {/* SIZE */}

              <div>
                <label>
                  Size
                </label>

                <input
                  name="size"
                  defaultValue={
                    edit?.size ||
                    blank.size
                  }
                  required
                />
              </div>

              {/* CONDITION */}

              <div>
                <label>
                  Condition
                </label>

                <select
                  name="condition"
                  defaultValue={
                    edit?.condition ||
                    blank.condition
                  }
                >
                  {[
                    'Like New',
                    'Excellent',
                    'Good',
                    'Fair',
                  ].map(
                    (
                      condition,
                    ) => (
                      <option
                        key={
                          condition
                        }
                      >
                        {
                          condition
                        }
                      </option>
                    ),
                  )}
                </select>
              </div>

              {/* CATEGORY */}

              <div>
                <label>
                  Category
                </label>

                <input
                  name="category"
                  defaultValue={
                    edit?.category ||
                    blank.category
                  }
                  placeholder="e.g. Hoodies, Shoes, Sarees"
                  required
                />
              </div>

              {/* INVENTORY */}

              <div>
                <label>
                  Inventory
                </label>

                <input
                  name="inventory"
                  type="number"
                  min="0"
                  defaultValue={
                    edit?.inventory ??
                    blank.inventory
                  }
                  required
                />
              </div>

              {/* SHIPPING */}

              <div>
                <label>
                  Shipping
                </label>

                <select
                  name="shippingMode"
                  value={
                    shippingMode
                  }
                  onChange={(
                    event,
                  ) =>
                    setShippingMode(
                      event.target
                        .value as ShippingMode,
                    )
                  }
                >
                  <option value="manual">
                    Depends on product and location
                  </option>

                  <option value="free">
                    Free shipping
                  </option>

                  <option value="fixed">
                    Custom shipping fee
                  </option>
                </select>

                <small className="muted">
                  Choose how shipping should be handled for this product.
                </small>
              </div>

              <div>
                <label>
                  Shipping fee (Rs.)
                </label>

                <input
                  name="shippingFee"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={
                    edit?.shippingFee ??
                    blank.shippingFee
                  }
                  disabled={
                    shippingMode !==
                    'fixed'
                  }
                  required={
                    shippingMode ===
                    'fixed'
                  }
                  placeholder="e.g. 250"
                />

                <small className="muted">
                  {shippingMode ===
                  'free'
                    ? 'Customer will not be charged shipping for this product.'
                    : shippingMode ===
                        'fixed'
                      ? 'This amount will be added to checkout automatically.'
                      : 'Shipping will be confirmed separately based on product and location.'}
                </small>
              </div>

              {/* MULTIPLE PHOTO UPLOAD */}

              <div className="photo-field">
                <label>
                  Upload photos
                </label>

                <label
                  className="photo-picker"
                  htmlFor="product-photo"
                >
                  <ImagePlus
                    size={19}
                  />

                  <span>
                    {draftImages.length >=
                    MAX_PRODUCT_IMAGES
                      ? 'Maximum 5 photos'
                      : draftImages.length
                        ? `Add photos (${draftImages.length}/5)`
                        : 'Choose up to 5 photos'}
                  </span>
                </label>

                <input
                    id="product-photo"
                    className="native-photo-input"
                    name="photo"
                    type="file"
                    multiple
                    accept="image/*,.heic,.heif"
                    disabled={
                      processingPhoto ||
                      uploadingPhoto ||
                      draftImages.length >= MAX_PRODUCT_IMAGES
                    }
                    onChange={handlePhotoChange}
                  />

                <small className="muted">
                  Up to 5 photos. JPG, PNG, WEBP, HEIC or HEIF. HEIC/HEIF is converted automatically.
                </small>
              </div>

              {/* OPTIONAL IMAGE URL */}

              <div>
                <label>
                  Or image URL
                </label>

                <input
                  name="image"
                  defaultValue=""
                  placeholder="Optional extra image URL"
                />

                <small className="muted">
                  Optional. Counts toward the 5-photo maximum.
                </small>
              </div>

              {/* TIKTOK */}

              <div className="full">
                <label>
                  TikTok video link
                </label>

                <input
                  name="tiktokUrl"
                  type="url"
                  defaultValue={
                    edit?.tiktokUrl ||
                    blank.tiktokUrl
                  }
                  placeholder="Paste TikTok video link"
                />
              </div>

              {/* PHOTO PREVIEW */}

              {(draftImages.length >
                0 ||
                photoError ||
                processingPhoto ||
                uploadingPhoto) && (
                <div className="full product-photo-preview-wrap">
                  <div className="product-photo-preview-head">
                    <div>
                      <b>
                        Photo preview
                      </b>

                      <div className="muted product-photo-count">
                        {
                          draftImages.length
                        }
                        /
                        {
                          MAX_PRODUCT_IMAGES
                        }{' '}
                        photos
                      </div>
                    </div>

                    {processingPhoto && (
                      <span className="muted">
                        Processing photos…
                      </span>
                    )}

                    {uploadingPhoto && (
                      <span className="muted">
                        Saving product…
                      </span>
                    )}
                  </div>

                  {photoError && (
                    <div className="photo-error">
                      {
                        photoError
                      }
                    </div>
                  )}

                  {draftImages.length >
                    0 && (
                    <div className="product-photo-preview-grid">
                      {draftImages.map(
                        (
                          image,
                          index,
                        ) => (
                          <div
                            className="product-photo-preview-item"
                            key={
                              image.id
                            }
                          >
                            <div className="product-photo-preview-image">
                              <ProductImage
                                src={
                                  image.src
                                }
                                alt={`Product photo ${
                                  index +
                                  1
                                }`}
                              />

                              {index ===
                                0 && (
                                <span className="photo-main-badge">
                                  Main photo
                                </span>
                              )}
                            </div>

                            <div className="product-photo-preview-actions">
                              {index >
                                0 && (
                                <button
                                  type="button"
                                  className="mini-btn"
                                  onClick={() =>
                                    makeMainPhoto(
                                      image.id,
                                    )
                                  }
                                >
                                  Make main
                                </button>
                              )}

                              <button
                                type="button"
                                className="mini-btn danger"
                                onClick={() =>
                                  removePhoto(
                                    image.id,
                                  )
                                }
                              >
                                <Trash2
                                  size={
                                    14
                                  }
                                />

                                Remove
                              </button>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* MEASUREMENTS */}

              <div>
                <label>
                  Chest / Width
                </label>

                <input
                  name="chest"
                  defaultValue={
                    edit
                      ?.measurements
                      .Chest ||
                    ''
                  }
                />
              </div>

              <div>
                <label>
                  Length
                </label>

                <input
                  name="length"
                  defaultValue={
                    edit
                      ?.measurements
                      .Length ||
                    ''
                  }
                />
              </div>

              {/* DESCRIPTION */}

              <div className="full">
                <label>
                  Description
                </label>

                <textarea
                  name="description"
                  defaultValue={
                    edit
                      ?.description ||
                    blank.description
                  }
                  required
                />
              </div>

              {/* FLAGS */}

              <label>
                <input
                  type="checkbox"
                  name="oneOfOne"
                  defaultChecked={
                    edit?.oneOfOne ??
                    true
                  }
                />{' '}
                One-of-One
              </label>

              <label>
                <input
                  type="checkbox"
                  name="newArrival"
                  defaultChecked={
                    edit?.newArrival
                  }
                />{' '}
                New Arrival
              </label>

              <label>
                <input
                  type="checkbox"
                  name="featured"
                  defaultChecked={
                    edit?.featured
                  }
                />{' '}
                Featured
              </label>

              <label>
                <input
                  type="checkbox"
                  name="vintageFind"
                  defaultChecked={
                    edit
                      ?.vintageFind
                  }
                />{' '}
                Vintage Find
              </label>

              {/* SAVE */}

              <div className="full">
                <button
                  className="btn sage"
                  disabled={
                    processingPhoto ||
                    uploadingPhoto
                  }
                >
                  {processingPhoto
                    ? 'Processing photos…'
                    : uploadingPhoto
                      ? 'Saving product…'
                      : edit
                        ? 'Save changes'
                        : 'Add product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminShell>
  );
}