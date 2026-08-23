-- EasyPeasy-Thrift: Admin-editable top announcement bar
-- Safe to run repeatedly in Supabase SQL Editor.

alter table public.store_settings
  add column if not exists shipping_info text,
  add column if not exists announcement_text text;

update public.store_settings
set announcement_text = coalesce(
  announcement_text,
  'Shipping: ' || coalesce(nullif(trim(shipping_info), ''), 'Depends on product and location') ||
    ' • ' || coalesce(nullif(trim(tagline), ''), 'Secondhand. Standout. So Easy.')
)
where id = 1;

alter table public.store_settings
  alter column announcement_text
    set default 'Shipping: Depends on product and location • Secondhand. Standout. So Easy.',
  alter column announcement_text set not null;

notify pgrst, 'reload schema';

select id, announcement_text
from public.store_settings
where id = 1;
