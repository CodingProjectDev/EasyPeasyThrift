'use client';

import { useEffect, useState } from 'react';

import AdminShell from '@/components/admin-shell';
import { ProductImage } from '@/components/product-image';
import { useStore } from '@/components/store-provider';
import { Product } from '@/lib/types';

export default function Inventory() {
  const { products, updateProduct } = useStore();
  const [drafts, setDrafts] = useState<Record<string, number>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setDrafts(
      Object.fromEntries(
        products.map((product) => [product.id, product.inventory]),
      ),
    );
  }, [products]);

  async function saveInventory(product: Product) {
    const inventory = Math.max(0, Math.floor(Number(drafts[product.id] ?? product.inventory)));
    const nextProduct = { ...product, inventory };

    setSavingId(product.id);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: nextProduct }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.product) {
        throw new Error(payload.error || 'Could not save inventory.');
      }

      const saved = payload.product as Product;
      updateProduct(saved);
      setDrafts((current) => ({ ...current, [saved.id]: saved.inventory }));
      setMessage(`${saved.name} inventory saved.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save inventory.');
      setDrafts((current) => ({ ...current, [product.id]: product.inventory }));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <AdminShell>
      <div className="admin-top">
        <div>
          <span className="eyebrow">Stock control</span>
          <h1>Inventory</h1>
          <p className="muted">
            Inventory changes are saved to Supabase and immediately affect checkout availability.
          </p>
        </div>
      </div>

      {error && <div className="notice" style={{ marginBottom: 16, color: '#9b4136' }}>{error}</div>}
      {message && <div className="notice sage" style={{ marginBottom: 16 }}>{message}</div>}

      <div className="admin-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Type</th>
              <th>Current stock</th>
              <th>Alert</th>
              <th>Set stock</th>
              <th>Save</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>
                  <div className="table-product">
                    <ProductImage className="thumb" src={product.images[0]} alt={product.name} />
                    <b>{product.name}</b>
                  </div>
                </td>
                <td>{product.oneOfOne ? 'One-of-One' : 'Standard'}</td>
                <td><b>{product.inventory}</b></td>
                <td>
                  {product.inventory === 0 ? (
                    <span className="status bad">Sold Out</span>
                  ) : product.inventory <= 1 ? (
                    <span className="status warn">Low stock</span>
                  ) : (
                    <span className="status good">In stock</span>
                  )}
                </td>
                <td>
                  <input
                    className="control"
                    style={{ width: 90 }}
                    type="number"
                    min="0"
                    max={product.oneOfOne ? 1 : undefined}
                    step="1"
                    value={drafts[product.id] ?? product.inventory}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [product.id]: Number(event.target.value),
                      }))
                    }
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="mini-btn"
                    disabled={
                      savingId === product.id ||
                      (drafts[product.id] ?? product.inventory) === product.inventory
                    }
                    onClick={() => void saveInventory(product)}
                  >
                    {savingId === product.id ? 'Saving…' : 'Save'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
