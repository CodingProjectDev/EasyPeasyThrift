'use client';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { Product } from '@/lib/types';
import { money } from '@/lib/format';
import { useStore } from './store-provider';
import { ProductImage } from './product-image';

export default function ProductCard({ product }: { product: Product }) {
  const { wishlist, toggleWishlist } = useStore(); const sold = product.inventory <= 0;
  return <article className={`product-card ${sold ? 'sold' : ''}`}>
    <div className="product-image-wrap">
      <Link href={`/product/${product.slug}`}><ProductImage src={product.images[0]} alt={product.name}/></Link>
      <div className="badges">{product.newArrival && <span className="badge sage">New Arrival</span>}{product.vintageFind && <span className="badge brown">Vintage Find</span>}{product.oneOfOne && <span className="badge dark">One-of-One</span>}</div>
      {sold && <div className="sold-overlay">SOLD OUT</div>}
      <button className={`heart-btn ${wishlist.includes(product.id) ? 'active' : ''}`} onClick={() => toggleWishlist(product.id)} aria-label="Wishlist"><Heart size={18} fill={wishlist.includes(product.id) ? 'currentColor' : 'none'}/></button>
    </div>
    <div className="product-meta"><div><Link href={`/product/${product.slug}`} className="product-name">{product.name}</Link><p>{product.brand} · {product.size} · {product.condition}</p></div><strong>{money(product.price)}</strong></div>
  </article>
}
