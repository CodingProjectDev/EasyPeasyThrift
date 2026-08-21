import { Product } from './types';

export const categories = ['Jackets', 'Tops', 'Denim', 'Dresses', 'Bottoms', 'Accessories'];

export const demoProducts: Product[] = [
  {
    id: '11111111-1111-4111-8111-111111111111', slug: '90s-leather-bomber', name: "90s Leather Bomber", price: 68, compareAt: 92,
    category: 'Jackets', size: 'M', condition: 'Excellent', brand: 'Vintage', inventory: 1,
    oneOfOne: true, vintageFind: true, featured: true, createdAt: '2026-08-20',
    measurements: { Chest: '22 in', Length: '25 in', Sleeve: '24 in' },
    description: 'Soft broken-in leather bomber with a relaxed 90s silhouette, ribbed trim, and clean lining. A true one-off statement layer.',
    images: ['https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1200&q=85','https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=1200&q=85']
  },
  {
    id: '22222222-2222-4222-8222-222222222222', slug: 'sage-workwear-overshirt', name: 'Sage Workwear Overshirt', price: 42,
    category: 'Tops', size: 'L', condition: 'Like New', brand: 'Uniqlo U', inventory: 1,
    oneOfOne: true, newArrival: true, featured: true, createdAt: '2026-08-21',
    measurements: { Chest: '23 in', Length: '28 in', Shoulder: '19 in' },
    description: 'Structured cotton overshirt in muted sage. Easy to layer, minimal branding, and clean utility details.',
    images: ['https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=1200&q=85','https://images.unsplash.com/photo-1607345366928-199ea26cfe3e?auto=format&fit=crop&w=1200&q=85']
  },
  {
    id: '33333333-3333-4333-8333-333333333333', slug: 'washed-straight-denim', name: 'Washed Straight Denim', price: 36,
    category: 'Denim', size: '32', condition: 'Excellent', brand: "Levi's", inventory: 1,
    oneOfOne: true, newArrival: true, createdAt: '2026-08-19',
    measurements: { Waist: '32 in', Rise: '11 in', Inseam: '30 in' },
    description: 'Classic straight-leg denim with a naturally faded blue wash and soft vintage feel.',
    images: ['https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=1200&q=85','https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=1200&q=85']
  },
  {
    id: '44444444-4444-4444-8444-444444444444', slug: 'floral-midi-dress', name: 'Floral Midi Dress', price: 34,
    category: 'Dresses', size: 'S', condition: 'Like New', brand: 'Zara', inventory: 1,
    oneOfOne: true, newArrival: true, featured: true, createdAt: '2026-08-21',
    measurements: { Bust: '18 in', Waist: '15 in', Length: '46 in' },
    description: 'Flowy floral midi with a flattering waist and soft drape. Lightweight and ready for late-summer days.',
    images: ['https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1200&q=85','https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85']
  },
  {
    id: '55555555-5555-4555-8555-555555555555', slug: 'brown-corduroy-jacket', name: 'Brown Corduroy Jacket', price: 48,
    category: 'Jackets', size: 'M', condition: 'Good', brand: 'Gap', inventory: 1,
    oneOfOne: true, vintageFind: true, createdAt: '2026-08-13',
    measurements: { Chest: '21.5 in', Length: '26 in', Sleeve: '23.5 in' },
    description: 'Warm brown corduroy with visible vintage character and a boxy fit. Minor wear adds to the texture.',
    images: ['https://images.unsplash.com/photo-1592878849122-facb97520f9e?auto=format&fit=crop&w=1200&q=85']
  },
  {
    id: '66666666-6666-4666-8666-666666666666', slug: 'graphic-tour-tee', name: 'Faded Graphic Tour Tee', price: 28,
    category: 'Tops', size: 'XL', condition: 'Good', brand: 'Vintage', inventory: 0,
    oneOfOne: true, vintageFind: true, createdAt: '2026-08-10',
    measurements: { Chest: '24 in', Length: '29 in' },
    description: 'Authentic worn-in graphic tee with a soft hand, natural fade, and relaxed oversized shape.',
    images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=85']
  },
  {
    id: '77777777-7777-4777-8777-777777777777', slug: 'pleated-trousers', name: 'Pleated Everyday Trousers', price: 39,
    category: 'Bottoms', size: '30', condition: 'Excellent', brand: 'COS', inventory: 1,
    oneOfOne: true, featured: true, createdAt: '2026-08-15',
    measurements: { Waist: '30 in', Rise: '12 in', Inseam: '29 in' },
    description: 'Relaxed pleated trousers with clean tailoring and an easy tapered leg.',
    images: ['https://images.unsplash.com/photo-1506629082955-511b1aa562c8?auto=format&fit=crop&w=1200&q=85']
  },
  {
    id: '88888888-8888-4888-8888-888888888888', slug: 'mini-shoulder-bag', name: 'Chocolate Mini Shoulder Bag', price: 31,
    category: 'Accessories', size: 'One Size', condition: 'Excellent', brand: 'Mango', inventory: 1,
    oneOfOne: true, newArrival: true, createdAt: '2026-08-20',
    measurements: { Width: '10 in', Height: '6 in', Strap: '18 in' },
    description: 'Compact chocolate-brown shoulder bag with a clean shape and minimal hardware.',
    images: ['https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1200&q=85']
  },
  {
    id: '99999999-9999-4999-8999-999999999999', slug: 'cream-knit-cardigan', name: 'Cream Knit Cardigan', price: 33,
    category: 'Tops', size: 'M', condition: 'Excellent', brand: '& Other Stories', inventory: 1,
    oneOfOne: true, featured: true, createdAt: '2026-08-16',
    measurements: { Chest: '20 in', Length: '23 in', Sleeve: '24 in' },
    description: 'Soft cream cardigan with a slightly cropped fit and substantial knit texture.',
    images: ['https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=1200&q=85']
  },
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', slug: 'vintage-silk-scarf', name: 'Vintage Silk Scarf', price: 19,
    category: 'Accessories', size: 'One Size', condition: 'Good', brand: 'Unbranded', inventory: 1,
    oneOfOne: true, vintageFind: true, createdAt: '2026-08-09',
    measurements: { Width: '27 in', Length: '27 in' },
    description: 'Printed square scarf with warm earth tones and a soft silk hand. Light vintage wear at edges.',
    images: ['https://images.unsplash.com/photo-1601924994987-69e26d50dc26?auto=format&fit=crop&w=1200&q=85']
  }
];
