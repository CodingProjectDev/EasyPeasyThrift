-- EasyPeasyThrift store settings update
-- Run this ONCE in Supabase SQL Editor before using the new Admin Settings page.

-- 1) Add customer-facing shipping text.
alter table public.store_settings
add column if not exists shipping_info text;

update public.store_settings
set shipping_info = coalesce(
  nullif(trim(shipping_info), ''),
  'Depends on product and location'
)
where id = 1;

alter table public.store_settings
alter column shipping_info
set default 'Depends on product and location';

-- 2) Disable the old automatic fixed/free-shipping calculation.
--
-- The existing place_order() function treats threshold 0 as free shipping,
-- so orders keep shipping=0 and customers are shown shipping_info instead.
update public.store_settings
set
  shipping_fee = 0,
  free_shipping_threshold = 0
where id = 1;

-- 3) Ensure the singleton settings row exists.
insert into public.store_settings (
  id,
  shipping_info,
  shipping_fee,
  free_shipping_threshold
)
values (
  1,
  'Depends on product and location',
  0,
  0
)
on conflict (id) do update
set
  shipping_info = coalesce(
    nullif(trim(public.store_settings.shipping_info), ''),
    excluded.shipping_info
  ),
  shipping_fee = 0,
  free_shipping_threshold = 0;

-- 4) Public customers can read settings.
alter table public.store_settings
enable row level security;

drop policy if exists
  "public reads store settings"
on public.store_settings;

create policy
  "public reads store settings"
on public.store_settings
for select
using (true);

-- 5) Product image bucket is reused for store logo/QR assets.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'product-images',
  'product-images',
  true,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id)
do update set
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp'
  ];

NOTIFY pgrst, 'reload schema';

-- Verification
select
  id,
  store_name,
  tagline,
  store_email,
  store_phone,
  shipping_info,
  return_policy,
  cod_enabled,
  qr_enabled,
  logo_path,
  qr_image_path,
  shipping_fee,
  free_shipping_threshold
from public.store_settings
where id = 1;
