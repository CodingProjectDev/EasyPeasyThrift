# EasyPeasy-Thrift

A mobile-first thrift-fashion e-commerce starter built with Next.js + TypeScript. It includes a complete customer storefront, COD + QR-only checkout, one-of-one inventory behavior, and a protected `/admin` dashboard.

## What is included

- Home: hero, categories, new arrivals, featured edit, why thrift, newsletter, Instagram-style section, footer
- Shop: search, category, price, size, condition, brand, sorting
- Product: photos, price, size, condition, measurements, description, brand, badges, wishlist, related products, recently viewed, sold-out state
- Cart + checkout
- Payments: **Cash on Delivery** and **QR Payment only**
- QR checkout: store QR, screenshot upload, transaction/reference ID, `Payment Verification Required`
- Customer login/signup demo, wishlist, order history
- About, FAQ, Shipping & Returns, Contact
- `/admin`: dashboard, products, orders, inventory, customers, discounts, settings
- Admin QR approve/reject controls
- Product photo upload in the local demo
- Settings for logo, store information, shipping, returns, QR image, COD on/off, QR on/off
- Supabase SQL schema with atomic order/inventory function and private payment-proof storage bucket
- Vercel-ready environment setup

## Run locally in VS Code

1. Open the `EasyPeasy-Thrift` folder in VS Code.
2. Open Terminal.
3. Run:

```bash
npm install
npm run dev
```

4. Open `http://localhost:3000`.

### Local admin login

For development only, if you do not create an `.env.local`, the fallback login is:

- Email: `admin@easypeasy.local`
- Password: `easypeasy-demo`

Open `http://localhost:3000/admin`.

**Do not deploy with fallback credentials.** Production intentionally refuses fallback admin credentials.

## Production environment variables

Copy `.env.example` to `.env.local` for local database testing, and add the same secrets to Vercel → Project → Settings → Environment Variables.

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ADMIN_EMAIL=your-private-admin-email
ADMIN_PASSWORD=a-long-unique-password
ADMIN_SESSION_SECRET=at-least-32-random-characters
```

Never expose `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, or `ADMIN_SESSION_SECRET` in browser code or commit them to Git.

## Product photo uploads

The admin product form now uses a durable upload flow instead of storing full photos inside `localStorage`.

- In local VS Code development, uploaded product images are saved under `public/uploads/` and the product stores a `/uploads/...` URL.
- JPG, PNG, WEBP, HEIC, and HEIF are accepted. HEIC/HEIF photos are converted to browser-compatible JPEG before upload.
- When Supabase is configured, the same admin form uploads product photos to the public `product-images` Storage bucket created by `supabase/schema.sql`. This is the mode to use on Vercel.
- Vercel's filesystem is not permanent, so production image uploads intentionally require Supabase Storage.

If products created with an older build show a broken-image icon, click **Edit**, choose that photo again, and click **Save changes**. The old unsupported/local image value cannot be reconstructed automatically.

## Supabase setup

1. Create a Supabase project.
2. Open SQL Editor.
3. Run `supabase/schema.sql`.
4. For the included demo catalog, optionally run `supabase/seed.sql`. The seeded UUIDs match the frontend demo product IDs, so the QR/COD order API can write real Supabase orders immediately.
5. Replace demo products with your real inventory when ready.
6. If you switch customer auth to Supabase Auth, create the matching profile row after signup and add your admin Auth user UUID to `public.admin_users`.
7. Replace the demo QR in Admin → Settings with the real store payment QR.

The SQL function `place_order(...)` locks product rows during checkout, checks inventory, calculates totals from database prices, creates the order, creates order items, and decrements inventory atomically. For `one_of_one=true`, a successful sale sets inventory to `0`.

## Demo mode vs production mode

The included UI works immediately using browser `localStorage`. That is intentional so you can see and test every screen before creating a database. Browser storage is **not a production backend**: another device will not see those orders or inventory changes.

The `/api/orders` and `/api/payment-proof` routes are already prepared for Supabase. Once Supabase is configured and your catalog uses database UUIDs, move product reads, customer auth, admin CRUD, order history, discounts, and settings from local demo state to Supabase queries. The schema is included so that migration is straightforward.

## QR payment behavior

1. Customer selects QR Payment.
2. Store QR is displayed.
3. Customer uploads a screenshot and enters the transaction/reference ID.
4. Order status starts as `Payment Verification Required`.
5. Admin views the order and approves or rejects it.
6. Approved → Processing → Shipped → Delivered.

COD starts as Pending → Processing → Shipped → Delivered.

No Stripe, PayPal, credit/debit card, Apple Pay, Google Pay, or other gateway is included.

## Deploy to Vercel

1. Push this folder to GitHub.
2. In Vercel, choose **Add New → Project** and import the repository.
3. Framework should auto-detect as Next.js.
4. Add the production environment variables above.
5. Deploy.

## Before taking real orders

- Replace demo Unsplash product imagery with your own product photos.
- Replace the placeholder QR with your real payment QR.
- Set a strong production admin password/session secret.
- Connect catalog, admin CRUD, auth, orders, discounts, and settings to Supabase instead of localStorage.
- Add server-side email/order notifications if wanted.
- Finalize your shipping and return policy.
- Test QR verification, inventory race conditions, mobile checkout, and sold-out behavior with two browsers/devices.

## Visual direction

The UI uses cream, sage green, brown, and black with editorial serif typography, rounded fashion photography, lightweight motion, large tap targets, and responsive layouts intended to feel like a real thrift brand rather than a generic marketplace template.
