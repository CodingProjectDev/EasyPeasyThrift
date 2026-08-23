-- EasyPeasy-Thrift Supabase schema
-- Run this in Supabase SQL Editor for a production database.

create extension if not exists pgcrypto;

do $$ begin
  create type public.payment_method as enum ('COD','QR');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_status as enum ('Pending','Payment Verification Required','Payment Rejected','Approved','Processing','Shipped','Delivered');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  price numeric(10,2) not null check (price >= 0),
  compare_at numeric(10,2),
  category text not null,
  size text not null,
  condition text not null check (condition in ('Like New','Excellent','Good','Fair')),
  brand text not null,
  measurements jsonb not null default '{}'::jsonb,
  images text[] not null default '{}',
  inventory integer not null default 0 check (inventory >= 0),
  one_of_one boolean not null default true,
  new_arrival boolean not null default false,
  vintage_find boolean not null default false,
  featured boolean not null default false,
  active boolean not null default true,
  tiktok_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint one_of_one_stock check (not one_of_one or inventory <= 1)
);

create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null check (discount_type in ('percentage','fixed')),
  value numeric(10,2) not null check (value > 0),
  expires_at timestamptz not null,
  active boolean not null default true,
  usage_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  public_order_id text not null unique,
  customer_id uuid references auth.users(id) on delete set null,
  email text not null,
  full_name text not null,
  phone text not null,
  address text not null,
  city text not null,
  postal_code text not null,
  subtotal numeric(10,2) not null,
  shipping numeric(10,2) not null default 0,
  discount numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  payment_method public.payment_method not null,
  transaction_id text,
  payment_proof_path text,
  status public.order_status not null,
  promo_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint qr_payment_fields check (
    payment_method = 'COD' or (transaction_id is not null and payment_proof_path is not null)
  )
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  unit_price numeric(10,2) not null,
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.store_settings (
  id integer primary key default 1 check (id = 1),
  store_name text not null default 'EasyPeasy-Thrift',
  tagline text not null default 'Secondhand. Standout. So Easy.',
  store_email text,
  store_phone text,
  logo_path text,
  qr_image_path text,
  shipping_info text not null default 'Depends on product and location',
  instagram_url text,
  tiktok_url text,
  pinterest_url text,
  shipping_fee numeric(10,2) not null default 0,
  free_shipping_threshold numeric(10,2) not null default 0,
  return_policy text not null default 'Please make sure you check the item carefully before purchasing. By completing your purchase, you agree to this return policy.',
  cod_enabled boolean not null default true,
  qr_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.store_settings (
  id,
  shipping_info,
  shipping_fee,
  free_shipping_threshold
)
values (1, 'Depends on product and location', 0, 0)
on conflict (id) do update set
  shipping_info = coalesce(nullif(trim(public.store_settings.shipping_info), ''), excluded.shipping_info),
  shipping_fee = 0,
  free_shipping_threshold = 0;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at before update on public.products for each row execute function public.set_updated_at();
drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at before update on public.orders for each row execute function public.set_updated_at();
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists store_settings_set_updated_at on public.store_settings;
create trigger store_settings_set_updated_at before update on public.store_settings for each row execute function public.set_updated_at();

-- Atomic checkout: validates inventory, payment options, and promo codes,
-- creates the order, creates line items, and decrements stock in one transaction.
create or replace function public.place_order(
  p_customer_id uuid,
  p_email text,
  p_full_name text,
  p_phone text,
  p_address text,
  p_city text,
  p_postal_code text,
  p_payment_method text,
  p_transaction_id text,
  p_payment_proof_path text,
  p_promo_code text,
  p_items jsonb
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid := gen_random_uuid();
  v_public_order_id text := 'EP-' || upper(substr(replace(v_order_id::text,'-',''),1,8));
  v_subtotal numeric(10,2) := 0;
  v_shipping numeric(10,2) := 0;
  v_discount numeric(10,2) := 0;
  v_total numeric(10,2) := 0;
  v_status public.order_status;
  v_method public.payment_method;
  v_item jsonb;
  v_product public.products%rowtype;
  v_qty integer;
  v_promo public.promo_codes%rowtype;
  v_cod_enabled boolean := true;
  v_qr_enabled boolean := true;
begin
  if p_customer_id is null then
    raise exception 'Customer account is required';
  end if;

  if p_payment_method not in ('COD','QR') then
    raise exception 'Unsupported payment method';
  end if;

  v_method := p_payment_method::public.payment_method;

  select cod_enabled, qr_enabled
  into v_cod_enabled, v_qr_enabled
  from public.store_settings
  where id = 1;

  if v_method = 'COD' and not coalesce(v_cod_enabled, true) then
    raise exception 'Cash on Delivery is currently disabled';
  end if;

  if v_method = 'QR' and not coalesce(v_qr_enabled, true) then
    raise exception 'QR Payment is currently disabled';
  end if;

  if v_method = 'QR'
     and (
       coalesce(trim(p_transaction_id),'') = ''
       or coalesce(trim(p_payment_proof_path),'') = ''
     ) then
    raise exception 'QR payment requires transaction ID and payment proof';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Order must contain items';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    if coalesce(v_item->>'product_id','') = '' then
      raise exception 'Product ID is required';
    end if;

    v_qty := coalesce((v_item->>'quantity')::integer, 0);
    if v_qty < 1 then
      raise exception 'Product quantity must be at least 1';
    end if;

    select * into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid
      and active = true
    for update;

    if not found then raise exception 'Product unavailable: %', v_item->>'product_id'; end if;
    if v_product.inventory < v_qty then raise exception 'Not enough inventory for %', v_product.name; end if;
    if v_product.one_of_one and v_qty <> 1 then raise exception 'One-of-one items can only be purchased once'; end if;

    v_subtotal := v_subtotal + (v_product.price * v_qty);
  end loop;

  if coalesce(trim(p_promo_code),'') <> '' then
    select * into v_promo
    from public.promo_codes
    where upper(code) = upper(trim(p_promo_code))
      and active = true
      and expires_at >= now()
    for update;

    if not found then raise exception 'Promo code is invalid or expired'; end if;

    if v_promo.discount_type = 'percentage' then
      v_discount := round(v_subtotal * (v_promo.value / 100.0), 2);
    else
      v_discount := least(v_subtotal, v_promo.value);
    end if;
  end if;

  v_total := greatest(0, v_subtotal - v_discount);
  v_status := case
    when v_method = 'QR' then 'Payment Verification Required'::public.order_status
    else 'Pending'::public.order_status
  end;

  insert into public.orders(
    id,public_order_id,customer_id,email,full_name,phone,address,city,postal_code,
    subtotal,shipping,discount,total,payment_method,transaction_id,payment_proof_path,status,promo_code
  )
  values(
    v_order_id,v_public_order_id,p_customer_id,p_email,p_full_name,p_phone,p_address,p_city,p_postal_code,
    v_subtotal,v_shipping,v_discount,v_total,v_method,p_transaction_id,p_payment_proof_path,v_status,
    case when v_promo.id is not null then v_promo.code else null end
  );

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item->>'quantity')::integer;

    select * into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid
    for update;

    insert into public.order_items(order_id,product_id,product_name,unit_price,quantity)
    values(v_order_id,v_product.id,v_product.name,v_product.price,v_qty);

    update public.products
    set inventory = case when one_of_one then 0 else inventory - v_qty end
    where id = v_product.id;
  end loop;

  if v_promo.id is not null then
    update public.promo_codes
    set usage_count = usage_count + 1
    where id = v_promo.id;
  end if;

  return v_public_order_id;
end $$;

revoke all on function public.place_order(
  uuid,text,text,text,text,text,text,text,text,text,text,jsonb
) from public;
revoke all on function public.place_order(
  uuid,text,text,text,text,text,text,text,text,text,text,jsonb
) from anon;
revoke all on function public.place_order(
  uuid,text,text,text,text,text,text,text,text,text,text,jsonb
) from authenticated;
grant execute on function public.place_order(
  uuid,text,text,text,text,text,text,text,text,text,text,jsonb
) to service_role;

-- Public catalog, private customer/order data, admin-only mutations.
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.profiles enable row level security;
alter table public.promo_codes enable row level security;
alter table public.store_settings enable row level security;
alter table public.admin_users enable row level security;

create or replace function public.is_admin(uid uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.admin_users where user_id=uid);
$$;

drop policy if exists "public can view active products" on public.products;
create policy "public can view active products" on public.products for select using (active=true or public.is_admin(auth.uid()));
drop policy if exists "admins manage products" on public.products;
create policy "admins manage products" on public.products for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists "customers view own orders" on public.orders;
create policy "customers view own orders" on public.orders for select using (
  customer_id = auth.uid()
  or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  or public.is_admin(auth.uid())
);
drop policy if exists "admins manage orders" on public.orders;
create policy "admins manage orders" on public.orders for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists "customers view own order items" on public.order_items;
create policy "customers view own order items" on public.order_items for select using (
  exists(
    select 1
    from public.orders o
    where o.id = order_id
      and (
        o.customer_id = auth.uid()
        or lower(o.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        or public.is_admin(auth.uid())
      )
  )
);
drop policy if exists "admins manage order items" on public.order_items;
create policy "admins manage order items" on public.order_items for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists "profiles self or admin" on public.profiles;
create policy "profiles self or admin" on public.profiles for select using (id=auth.uid() or public.is_admin(auth.uid()));
drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles for update using (id=auth.uid()) with check (id=auth.uid());

drop policy if exists "public reads active promo metadata" on public.promo_codes;
create policy "public reads active promo metadata" on public.promo_codes for select using (active=true and expires_at>=now() or public.is_admin(auth.uid()));
drop policy if exists "admins manage promos" on public.promo_codes;
create policy "admins manage promos" on public.promo_codes for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists "public reads store settings" on public.store_settings;
create policy "public reads store settings" on public.store_settings for select using (true);
drop policy if exists "admins manage settings" on public.store_settings;
create policy "admins manage settings" on public.store_settings for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Private bucket for payment screenshots. The included Next.js API uses the service role.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('payment-proofs','payment-proofs',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];

-- Optional product-image bucket for future production uploads.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('product-images','product-images',true,10485760,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=10485760,allowed_mime_types=array['image/jpeg','image/png','image/webp'];

-- Keep inventory correct when a QR order is rejected and if a rejected
-- order is later reactivated.
create or replace function public.sync_inventory_on_qr_rejection()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_inventory integer;
  v_one_of_one boolean;
begin
  if new.payment_method <> 'QR' then
    return new;
  end if;

  if new.status = 'Payment Rejected'
     and old.status is distinct from 'Payment Rejected' then
    update public.products p
    set inventory = case
      when p.one_of_one then 1
      else p.inventory + oi.quantity
    end
    from public.order_items oi
    where oi.order_id = new.id
      and oi.product_id = p.id;

    return new;
  end if;

  if old.status = 'Payment Rejected'
     and new.status is distinct from 'Payment Rejected' then
    for v_item in
      select product_id, product_name, quantity
      from public.order_items
      where order_id = new.id
    loop
      if v_item.product_id is null then
        raise exception 'Cannot reactivate order because product % was deleted', v_item.product_name;
      end if;

      select inventory, one_of_one
      into v_inventory, v_one_of_one
      from public.products
      where id = v_item.product_id
      for update;

      if not found then
        raise exception 'Cannot reactivate order because product % is unavailable', v_item.product_name;
      end if;

      if v_inventory < v_item.quantity then
        raise exception 'Cannot reactivate order: not enough stock for %', v_item.product_name;
      end if;

      update public.products
      set inventory = case
        when v_one_of_one then 0
        else inventory - v_item.quantity
      end
      where id = v_item.product_id;
    end loop;
  end if;

  return new;
end $$;

drop trigger if exists orders_restore_inventory_on_reject on public.orders;
drop trigger if exists orders_sync_inventory_on_qr_rejection on public.orders;
create trigger orders_sync_inventory_on_qr_rejection
before update of status on public.orders
for each row execute function public.sync_inventory_on_qr_rejection();
