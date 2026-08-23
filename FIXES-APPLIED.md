# EasyPeasy-Thrift Fix Summary

This build has been cleaned up so Supabase is the source of truth for products, inventory, orders, discounts, and store settings.

## Important before deploying

1. Open your existing Supabase project.
2. Go to **SQL Editor**.
3. Run `supabase/FINAL-FIXES.sql` once.
4. Confirm the environment variables listed in `README.md` exist locally and in Vercel.
5. Redeploy and test COD + QR checkout with a customer account.

For a brand-new Supabase project, run `supabase/schema.sql` instead of `FINAL-FIXES.sql`.

Do not use `supabase/store-settings-update.sql` for the current version; it is retained only as a legacy reference.

## Main fixes included

- Admin order status now comes from Supabase and customer order history refreshes from Supabase.
- Inventory edits now save to Supabase instead of only changing the current browser.
- Promo codes now save to Supabase and checkout validates the same promo records.
- Removed the fixed/free-shipping calculation from the storefront; shipping is customer-facing information controlled by Admin.
- Store email, phone, logo, QR image, return policy, shipping information, Instagram, TikTok, and Pinterest are Admin-editable.
- Product/header category links now follow the real catalog categories instead of hardcoded category names.
- Shop price filter now adapts to the actual catalog instead of hiding products above a fixed Rs. 100,000 limit.
- Product/cart/wishlist/checkout/shop pages wait for Supabase data before showing empty/not-found states.
- QR payment-proof upload now requires a valid customer session and accepts only JPG/PNG/WEBP up to 5 MB.
- Checkout database function is server-only and validates payment-method availability, product inventory, prices, and promo codes.
- QR rejection restores stock; reactivating a rejected order reserves stock again and is blocked if stock is unavailable.
- Removed the browser-side double inventory decrement race after checkout.
- Removed artificial checkout timeouts that could report failure while the database was still finishing an order.
- Password recovery now handles Supabase recovery codes instead of getting stuck indefinitely.
- Legacy customer orders with a matching authenticated email can be displayed even if an older row is missing `customer_id`.
- Placeholder social links were removed.
- Fake newsletter/contact success messages were removed or made explicit about their current non-backend behavior.
