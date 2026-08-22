'use client';

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
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
import { Product, ProductCondition } from '@/lib/types';

const blank = {
  name: '',
  price: '',
  brand: '',
  size: 'M',
  condition: 'Excellent' as ProductCondition,
  category: '',
  inventory: 1,
  image: '',
  tiktokUrl: '',
  description: '',
};

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const MAX_IMAGE_SIDE = 1600;
const JPEG_QUALITY = 0.84;

function isHeic(file: File) {
  const name = file.name.toLowerCase();
  return (
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    name.endsWith('.heic') ||
    name.endsWith('.heif')
  );
}

function loadImage(blob: Blob) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('This image format could not be opened.'));
    };

    image.src = url;
  });
}

async function prepareImage(file: File) {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('Image is too large. Please choose an image under 20 MB.');
  }

  let source: Blob = file;

  if (isHeic(file)) {
    const heic2any = (await import('heic2any')).default;
    const converted = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.9,
    });

    source = Array.isArray(converted) ? converted[0] : converted;
  } else if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file.');
  }

  const image = await loadImage(source);
  const naturalWidth = image.naturalWidth || image.width;
  const naturalHeight = image.naturalHeight || image.height;
  const scale = Math.min(
    1,
    MAX_IMAGE_SIDE / Math.max(naturalWidth, naturalHeight),
  );

  const width = Math.max(1, Math.round(naturalWidth * scale));
  const height = Math.max(1, Math.round(naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Your browser could not process this image.');

  context.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) =>
        value
          ? resolve(value)
          : reject(new Error('Could not convert this image.')),
      'image/jpeg',
      JPEG_QUALITY,
    );
  });

  const stem =
    file.name
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .slice(0, 60) || 'product';

  return new File([blob], `${stem}.jpg`, { type: 'image/jpeg' });
}

function oldUnsupportedImage(src?: string) {
  if (!src) return false;
  return (
    src.startsWith('blob:') ||
    src.startsWith('data:image/heic') ||
    src.startsWith('data:image/heif')
  );
}

function slugify(name: string) {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'product';

  return `${base}-${Date.now().toString().slice(-6)}`;
}

export default function AdminProducts() {
  const {
    products,
    addProduct,
    deleteProduct,
    updateProduct,
  } = useStore();

  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Product | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoName, setPhotoName] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (!open) {
      if (photoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreview);
      }
      setPhotoFile(null);
      setPhotoPreview('');
      setPhotoName('');
      setPhotoError('');
      setProcessingPhoto(false);
      setUploadingPhoto(false);
    }
  }, [open, photoPreview]);

  function launch(product?: Product) {
    const current = product || null;
    setEdit(current);
    setPhotoFile(null);
    setPhotoPreview(current?.images[0] || '');
    setPhotoName('');
    setPhotoError(
      oldUnsupportedImage(current?.images[0])
        ? 'This older uploaded photo cannot be recovered. Please choose the photo again and save.'
        : '',
    );
    setProcessingPhoto(false);
    setUploadingPhoto(false);
    setOpen(true);
  }

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setPhotoError('');
    if (!file) return;

    setProcessingPhoto(true);
    setPhotoName(file.name);

    try {
      const prepared = await prepareImage(file);

      if (photoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreview);
      }

      setPhotoFile(prepared);
      setPhotoPreview(URL.createObjectURL(prepared));
    } catch (error) {
      setPhotoFile(null);
      setPhotoName('');
      setPhotoError(
        error instanceof Error ? error.message : 'Could not process this image.',
      );
      event.target.value = '';
    } finally {
      setProcessingPhoto(false);
    }
  }

  function clearPhoto() {
    if (photoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview);
    }

    setPhotoFile(null);
    setPhotoPreview('');
    setPhotoName('');
    setPhotoError('');

    const input = document.getElementById(
      'product-photo',
    ) as HTMLInputElement | null;

    if (input) input.value = '';
  }

  async function uploadSelectedPhoto() {
    if (!photoFile) return null;

    const form = new FormData();
    form.append('file', photoFile);

    const response = await fetch('/api/admin/product-image', {
      method: 'POST',
      body: form,
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload.url) {
      throw new Error(payload.error || 'Photo upload failed.');
    }

    return String(payload.url);
  }

  async function saveProductToDatabase(product: Product) {
    const response = await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload.product) {
      throw new Error(payload.error || 'Could not save product.');
    }

    return payload.product as Product;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (processingPhoto || uploadingPhoto) return;

    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') || '').trim();
    const current = edit;
    const imageUrl = String(form.get('image') || '').trim();

    if (!name) return;

    setPhotoError('');
    setUploadingPhoto(true);

    try {
      const uploadedUrl = await uploadSelectedPhoto();

      const currentImage = oldUnsupportedImage(current?.images[0])
        ? ''
        : current?.images[0] || '';

      const image =
        uploadedUrl ||
        imageUrl ||
        currentImage ||
        'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=1000&q=80';

      const draft: Product = {
        id: current?.id || crypto.randomUUID(),
        slug: current?.slug || slugify(name),
        name,
        price: Number(form.get('price')),
        category: String(form.get('category') || '').trim(),
        size: String(form.get('size') || ''),
        condition: String(form.get('condition')) as ProductCondition,
        brand: String(form.get('brand') || '').trim(),
        measurements: {
          Chest: String(form.get('chest') || 'Not listed'),
          Length: String(form.get('length') || 'Not listed'),
        },
        description: String(form.get('description') || ''),
        tiktokUrl: String(form.get('tiktokUrl') || '').trim() || undefined,
        images: [image],
        inventory: Number(form.get('inventory')),
        oneOfOne: form.get('oneOfOne') === 'on',
        newArrival: form.get('newArrival') === 'on',
        featured: form.get('featured') === 'on',
        vintageFind: form.get('vintageFind') === 'on',
        createdAt:
          current?.createdAt || new Date().toISOString().slice(0, 10),
      };

      const saved = await saveProductToDatabase(draft);

      if (current) {
        // Old local-only custom IDs become real Supabase UUIDs here.
        if (current.id !== saved.id) {
          deleteProduct(current.id);
          addProduct(saved);
        } else {
          updateProduct(saved);
        }
      } else {
        addProduct(saved);
      }

      setOpen(false);
    } catch (error) {
      setPhotoError(
        error instanceof Error ? error.message : 'Could not save this product.',
      );
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function removeProduct(product: Product) {
    if (!confirm(`Delete ${product.name}?`)) return;

    const response = await fetch(
      `/api/admin/products?id=${encodeURIComponent(product.id)}`,
      { method: 'DELETE' },
    );

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      alert(payload.error || 'Could not delete product.');
      return;
    }

    deleteProduct(product.id);
  }

  return (
    <AdminShell>
      <div className="admin-top">
        <div>
          <span className="eyebrow">Catalog</span>
          <h1>Products</h1>
          <p className="muted">
            Products saved here are now stored in Supabase and can be checked
            out from any device.
          </p>
        </div>

        <button className="btn sage" onClick={() => launch()}>
          <Plus size={16} /> Add product
        </button>
      </div>

      <div className="admin-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Size</th>
              <th>Condition</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Flags</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>
                  <div className="table-product">
                    <ProductImage
                      className="thumb"
                      src={product.images[0]}
                      alt={product.name}
                    />
                    <div>
                      <b>{product.name}</b>
                      <br />
                      <span className="muted">{product.brand}</span>
                    </div>
                  </div>
                </td>
                <td>{product.category}</td>
                <td>{product.size}</td>
                <td>{product.condition}</td>
                <td>{money(product.price)}</td>
                <td className={product.inventory <= 1 ? 'low-stock' : ''}>
                  {product.inventory}
                </td>
                <td>
                  {[
                    product.oneOfOne && '1/1',
                    product.newArrival && 'New',
                    product.featured && 'Featured',
                    product.vintageFind && 'Vintage',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </td>
                <td>
                  <div className="inline-actions">
                    <button className="mini-btn" onClick={() => launch(product)}>
                      Edit
                    </button>
                    <button
                      className="mini-btn danger"
                      onClick={() => removeProduct(product)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-head">
              <h3>{edit ? 'Edit product' : 'Add product'}</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close product form"
              >
                <X />
              </button>
            </div>

            <form className="admin-form" onSubmit={submit}>
              <div>
                <label>Name</label>
                <input
                  name="name"
                  defaultValue={edit?.name || blank.name}
                  required
                />
              </div>

              <div>
                <label>Price</label>
                <input
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={edit?.price ?? blank.price}
                  required
                />
              </div>

              <div>
                <label>Brand</label>
                <input
                  name="brand"
                  defaultValue={edit?.brand || blank.brand}
                  required
                />
              </div>

              <div>
                <label>Size</label>
                <input
                  name="size"
                  defaultValue={edit?.size || blank.size}
                  required
                />
              </div>

              <div>
                <label>Condition</label>
                <select
                  name="condition"
                  defaultValue={edit?.condition || blank.condition}
                >
                  {['Like New', 'Excellent', 'Good', 'Fair'].map((condition) => (
                    <option key={condition}>{condition}</option>
                  ))}
                </select>
              </div>

              <div>
                <label>Category</label>
                <input
                  name="category"
                  defaultValue={edit?.category || blank.category}
                  placeholder="e.g. Hoodies, Shoes, Sarees"
                  required
                />
              </div>

              <div>
                <label>Inventory</label>
                <input
                  name="inventory"
                  type="number"
                  min="0"
                  defaultValue={edit?.inventory ?? 1}
                  required
                />
              </div>

              <div className="photo-field">
                <label>Upload photo</label>
                <label className="photo-picker" htmlFor="product-photo">
                  <ImagePlus size={19} />
                  <span>
                    {photoName || (photoPreview ? 'Change photo' : 'Choose photo')}
                  </span>
                </label>

                <input
                  id="product-photo"
                  className="native-photo-input"
                  name="photo"
                  type="file"
                  accept="image/*,.heic,.heif"
                  onChange={handlePhotoChange}
                />

                <small className="muted">
                  JPG, PNG, WEBP, HEIC or HEIF. HEIC/HEIF is converted
                  automatically.
                </small>
              </div>

              <div>
                <label>Or image URL</label>
                <input
                  name="image"
                  defaultValue={
                    edit?.images[0]?.startsWith('http') ||
                    edit?.images[0]?.startsWith('/')
                      ? edit.images[0]
                      : blank.image
                  }
                  placeholder="https://..."
                />
              </div>

              <div className="full">
                <label>TikTok video link</label>
                <input
                  name="tiktokUrl"
                  type="url"
                  defaultValue={edit?.tiktokUrl || blank.tiktokUrl}
                  placeholder="Paste TikTok video link"
                />
              </div>

              {(photoPreview ||
                photoError ||
                processingPhoto ||
                uploadingPhoto) && (
                <div className="full product-photo-preview-wrap">
                  <div className="product-photo-preview-head">
                    <div>
                      <b>Photo preview</b>
                      {processingPhoto && (
                        <span className="muted"> Converting image…</span>
                      )}
                      {uploadingPhoto && (
                        <span className="muted"> Saving product…</span>
                      )}
                    </div>

                    {photoPreview && (
                      <button
                        type="button"
                        className="mini-btn danger"
                        onClick={clearPhoto}
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    )}
                  </div>

                  {photoError && <div className="photo-error">{photoError}</div>}

                  {photoPreview && (
                    <ProductImage
                      className="product-photo-preview"
                      src={photoPreview}
                      alt="Selected product preview"
                    />
                  )}
                </div>
              )}

              <div>
                <label>Chest / Width</label>
                <input
                  name="chest"
                  defaultValue={edit?.measurements.Chest || ''}
                />
              </div>

              <div>
                <label>Length</label>
                <input
                  name="length"
                  defaultValue={edit?.measurements.Length || ''}
                />
              </div>

              <div className="full">
                <label>Description</label>
                <textarea
                  name="description"
                  defaultValue={edit?.description || blank.description}
                  required
                />
              </div>

              <label>
                <input
                  type="checkbox"
                  name="oneOfOne"
                  defaultChecked={edit?.oneOfOne ?? true}
                />{' '}
                One-of-One
              </label>

              <label>
                <input
                  type="checkbox"
                  name="newArrival"
                  defaultChecked={edit?.newArrival}
                />{' '}
                New Arrival
              </label>

              <label>
                <input
                  type="checkbox"
                  name="featured"
                  defaultChecked={edit?.featured}
                />{' '}
                Featured
              </label>

              <label>
                <input
                  type="checkbox"
                  name="vintageFind"
                  defaultChecked={edit?.vintageFind}
                />{' '}
                Vintage Find
              </label>

              <div className="full">
                <button
                  className="btn sage"
                  disabled={processingPhoto || uploadingPhoto}
                >
                  {processingPhoto
                    ? 'Converting photo…'
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
