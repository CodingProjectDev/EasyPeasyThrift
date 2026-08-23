# EasyPeasy-Thrift

EasyPeasy-Thrift is a Next.js + TypeScript thrift-store application with a Supabase-backed catalog, customer authentication, orders, inventory, promo codes, store settings, product images, QR payment proofs, and a protected admin dashboard.

## Current architecture

Supabase is the production source of truth for:

- products and inventory
- customer authentication
- orders and order items
- order status
- promo codes
- store information and payment settings
- product/store images
- QR payment proof uploads

Browser `localStorage` is used only for customer cart, wishlist, and recently-viewed state. Orders, inventory, discounts, and admin settings are **not** stored locally.

## Features

### Customer storefront

- Responsive home, shop, product, cart, checkout, wishlist, FAQ, About, Contact, Shipping & Returns
- Search/filter/sort
- One-of-One, New Arrival, Vintage Find, Featured, and Sold Out states
- Customer login/signup and password recovery with Supabase Auth
- Customer order history loaded directly from Supabase
- Cash on Delivery and QR Payment controls managed by Admin
- QR payment proof upload + transaction/reference ID
- Customer-facing shipping text instead of a fixed shipping/free-shipping calculation
- Store logo, email, phone, return policy, Instagram, TikTok, and Pinterest from Admin Settings

### Admin

- Protected `/admin` dashboard
- Products stored in Supabase
- Durable Supabase Storage image uploads
- Orders loaded from Supabase
- Order status changes saved to Supabase and reflected on the customer side
- QR proof review with signed private URLs
- Inventory edits saved to Supabase
- Customer summaries derived from real orders
- Promo codes stored in Supabase and validated by checkout
- Store settings stored in Supabase

## Required environment variables

Create `.env.local` locally and add the same variables in Vercel → Project → Settings → Environment Variables.

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key

# Server only. Prefer the current Supabase secret key.
SUPABASE_SECRET_KEY=your-secret-key

# Optional legacy fallback if your project still uses it:
# SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

ADMIN_EMAIL=your-private-admin-email
ADMIN_PASSWORD=use-a-long-unique-password
ADMIN_SESSION_SECRET=use-at-least-32-random-characters
```

Never expose the Supabase secret/service-role key, admin password, or admin session secret with a `NEXT_PUBLIC_` prefix or commit them to Git.

## Supabase setup

### New Supabase project

1. Create the project.
2. Open Supabase → SQL Editor.
3. Run `supabase/schema.sql`.
4. Optional: run `supabase/seed.sql` if you want the sample catalog.
5. Configure the environment variables above.
6. In Supabase Auth URL configuration, add your local and deployed URLs as appropriate for login/password recovery.

### Existing EasyPeasy-Thrift Supabase project

Run:

```text
supabase/FINAL-FIXES.sql
```

This migration adds/repairs the current store-settings fields, social links, product TikTok field, storage buckets, payment-method enforcement, checkout RPC permissions, legacy-order customer visibility, and QR rejection/reactivation inventory behavior.

If your old database never received the original product catalog patch, also review `supabase/production-fix.sql`.

## Important database behavior

`place_order(...)` is server-only. The browser cannot call the privileged checkout RPC directly.

The function:

- validates the selected payment method against Admin Settings
- validates product IDs and quantities
- locks product rows during checkout
- uses database prices rather than browser-submitted prices
- validates active/non-expired promo codes
- creates the order and order items atomically
- decrements inventory atomically
- sets one-of-one items to stock `0`
- leaves shipping at `0` because shipping is confirmed separately based on product/location

For QR orders, changing an order to `Payment Rejected` restores reserved inventory. If Admin later tries to reactivate that rejected order, inventory is reserved again; the status change is blocked if the stock is no longer available.

## Product and store images

Admin product uploads accept JPG, PNG, WEBP, HEIC, and HEIF. HEIC/HEIF is converted in the browser to JPEG before upload.

With Supabase configured, product images and Admin Settings images are saved in the public `product-images` bucket. Vercel's local filesystem is not used for production uploads.

QR payment proof accepts JPG, PNG, or WEBP up to 5 MB and is stored in the private `payment-proofs` bucket. The upload endpoint requires a valid logged-in customer session.

## Run locally

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

Admin:

```text
http://localhost:3000/admin
```

For local development only, if Admin environment variables are omitted, the code has this fallback:

```text
Email: admin@easypeasy.local
Password: easypeasy-demo
```

Production does not allow the fallback admin credentials.

## Deploy to Vercel

1. Push the project to GitHub.
2. Import the repository into Vercel.
3. Add all required environment variables.
4. Make sure the Supabase SQL migration has been applied.
5. Deploy.
6. Test with two accounts/browsers before taking real orders.

## Pre-launch test checklist

- Customer signup/login/logout
- Forgot/reset password redirect URLs
- Admin login/logout
- Add/edit/delete product
- Product image upload
- Inventory edit and refresh from another browser
- COD checkout
- QR checkout and proof upload
- QR approve/reject
- Reject → reactivate stock behavior
- Customer order status after Admin changes it
- Promo create/disable/delete and checkout validation
- Store information/settings on customer pages
- Mobile cart/checkout/admin tables

## Known non-core placeholders

The newsletter section intentionally does not collect email addresses until you connect a newsletter provider. The Contact form also does not submit to a backend yet; customers are directed to the store email/phone instead. These placeholders do not affect checkout, orders, inventory, or authentication.
