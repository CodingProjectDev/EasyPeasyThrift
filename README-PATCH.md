# EasyPeasyThrift production catalog / checkout patch

## Root cause

The deployed repository mixes two separate catalogs:

- Storefront/admin product records are loaded from browser `localStorage`.
- `/api/orders` calls Supabase `place_order`, which looks up each item in `public.products` by UUID.

New admin products used IDs such as `custom-...`, so they could appear in the browser but could never be validated by the Supabase checkout function.

## Apply

1. In Supabase SQL Editor, make sure you have already run the repository's `supabase/schema.sql`.
2. Run `supabase/production-fix.sql` from this patch.
3. Copy the four TypeScript/TSX files from this patch into the same paths in your repository.
4. Commit to GitHub and let Vercel redeploy.
5. In Admin -> Products, re-add any old custom products that existed only in browser localStorage. New/edited products are now saved to `public.products` with real UUIDs.
6. Test checkout with `Sage Workwear Overshirt`. It is seeded with UUID `22222222-2222-4222-8222-222222222222`.

## Vercel variables needed

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
- SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)
- ADMIN_EMAIL
- ADMIN_PASSWORD
- ADMIN_SESSION_SECRET

Never expose the secret/service-role key with a `NEXT_PUBLIC_` prefix.
