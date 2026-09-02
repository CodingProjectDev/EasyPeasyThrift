import { Product, ProductCondition } from '@/lib/types';

export function isUuid(value?: string) {
  if (!value) return false;

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function productFromRow(row: any): Product {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    price: Number(row.price),
    compareAt:
      row.compare_at == null
        ? undefined
        : Number(row.compare_at),
    category: String(row.category),
    size: String(row.size),
    condition: String(row.condition) as ProductCondition,
    brand: String(row.brand),
    measurements:
      row.measurements && typeof row.measurements === 'object'
        ? row.measurements
        : {},
    description: String(row.description || ''),
    tiktokUrl: row.tiktok_url
      ? String(row.tiktok_url)
      : undefined,
    images: Array.isArray(row.images)
      ? row.images.map(String)
      : [],
    inventory: Number(row.inventory || 0),
    shippingFee:
      row.shipping_fee == null
        ? undefined
        : Number(row.shipping_fee),
    freeShipping: Boolean(row.free_shipping),
    oneOfOne: Boolean(row.one_of_one),
    newArrival: Boolean(row.new_arrival),
    vintageFind: Boolean(row.vintage_find),
    featured: Boolean(row.featured),
    createdAt: row.created_at
      ? new Date(row.created_at).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
  };
}
