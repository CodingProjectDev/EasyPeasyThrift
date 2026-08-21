'use client';
import Link from 'next/link';
import ProductGrid from '@/components/product-grid';
import { useStore } from '@/components/store-provider';
import { ArrowRight, Leaf, Ruler, Sparkles, Tag } from 'lucide-react';

export default function HomePage(){
  const { products } = useStore();
  const featured = products.filter(p=>p.featured && p.inventory>0).slice(0,4);
  const newArrivals = [...products].filter(p=>p.newArrival).slice(0,4);
  return <>
    <section className="hero"><div className="hero-grid"><div className="hero-copy"><span className="eyebrow">Curated thrift · one piece at a time</span><h1>Wear something nobody else has.</h1><p>Pre-loved fashion with personality, honest condition notes, and measurements that make secondhand shopping feel easy.</p><div className="hero-actions"><Link href="/shop" className="btn">Shop the drop <ArrowRight size={17}/></Link><Link href="/about" className="btn secondary">Why EasyPeasy?</Link></div></div><div className="hero-media"><img src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1400&q=88" alt="Curated thrift clothing rack"/><div className="hero-sticker">one-of-one finds<br/>before they’re gone ✦</div></div></div></section>

    <section className="section"><div className="container"><div className="section-head"><div><span className="eyebrow">Shop your mood</span><h2>Find your next favorite.</h2></div><Link href="/shop" className="link-arrow">Shop all →</Link></div><div className="category-grid">
      <Link href="/shop?category=Jackets" className="category-card"><img src="https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=900&q=82" alt="Jackets"/><div><h3>Jackets</h3><p>Layers with history</p></div></Link>
      <Link href="/shop?category=Denim" className="category-card"><img src="https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=900&q=82" alt="Denim"/><div><h3>Denim</h3><p>Broken-in, not worn out</p></div></Link>
      <Link href="/shop?category=Accessories" className="category-card"><img src="https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=82" alt="Accessories"/><div><h3>Accessories</h3><p>Small piece, big energy</p></div></Link>
    </div></div></section>

    <section className="section"><div className="container"><div className="section-head"><div><span className="eyebrow">Just landed</span><h2>New arrivals</h2></div><Link href="/shop?sort=newest" className="link-arrow">See everything →</Link></div><ProductGrid products={newArrivals}/></div></section>

    <section className="section"><div className="container"><div className="why-grid"><div className="why-image"><img src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1100&q=86" alt="Vintage clothing shop"/></div><div className="why-copy"><span className="eyebrow" style={{color:'#c5d5c1'}}>Why thrift?</span><h2>More style. Less sameness.</h2><p>Thrifting keeps great clothes in motion and gives you pieces with character. We inspect every item, show the details clearly, and keep quantities honest.</p><div className="why-points"><div className="why-point"><Leaf size={20}/><b>Lower impact</b><span>Extend the life of clothes already made.</span></div><div className="why-point"><Sparkles size={20}/><b>One-of-one energy</b><span>Unique pieces, not endless duplicates.</span></div><div className="why-point"><Ruler size={20}/><b>Measured for you</b><span>Key garment measurements on every listing.</span></div><div className="why-point"><Tag size={20}/><b>Fairly priced</b><span>Clear pricing based on brand, rarity, and condition.</span></div></div></div></div></div></section>

    <section className="section"><div className="container"><div className="section-head"><div><span className="eyebrow">EasyPeasy edit</span><h2>Featured finds</h2></div></div><ProductGrid products={featured}/></div></section>

    <section className="section"><div className="container"><div className="newsletter"><div><span className="eyebrow" style={{color:'#d7e2d4'}}>Don’t miss the good stuff</span><h2>Fresh drops, vintage gems, zero spam.</h2><p>Get first look at new arrivals and occasional promo codes.</p></div><form onSubmit={e=>{e.preventDefault();alert('You’re on the list! Demo signup saved locally only.')}}><input type="email" required placeholder="you@example.com"/><button className="btn">Join</button></form></div></div></section>

    <section className="section"><div className="container"><div className="section-head"><div><span className="eyebrow">@easypeasy.thrift</span><h2>Styled in real life.</h2></div></div><div className="insta-grid">
      {['photo-1515886657613-9f3515b0c78f','photo-1485968579580-b6d095142e6e','photo-1539109136881-3be0616acf4b','photo-1529139574466-a303027c1d8b','photo-1490481651871-ab68de25d43d'].map(id=><img key={id} src={`https://images.unsplash.com/${id}?auto=format&fit=crop&w=600&q=80`} alt="Thrift style inspiration"/>)}
    </div></div></section>
  </>
}
