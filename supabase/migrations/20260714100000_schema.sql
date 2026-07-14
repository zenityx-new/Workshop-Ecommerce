-- =====================================================================
-- Phase 0 — Schema: enums, tables, indexes
-- Multi-vendor marketplace (buyer / seller / admin)
-- =====================================================================

-- ---------- Enums ----------
create type public.user_role         as enum ('buyer', 'seller', 'admin');
create type public.user_status       as enum ('active', 'banned');
create type public.application_status as enum ('pending', 'approved', 'rejected');
create type public.shop_status       as enum ('active', 'suspended');
create type public.order_status      as enum (
  'awaiting_payment', 'pending', 'confirmed', 'shipped', 'delivered', 'completed', 'cancelled'
);
create type public.payment_method    as enum ('cod', 'promptpay');
create type public.payment_status    as enum ('unpaid', 'submitted', 'verified', 'rejected');
create type public.coupon_type       as enum ('percent', 'amount');

-- ---------- Users ----------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        public.user_role   not null default 'buyer',
  status      public.user_status not null default 'active',
  full_name   text,
  phone       text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- Seller onboarding ----------
create table public.seller_applications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null unique references auth.users(id) on delete cascade,
  shop_name     text not null,
  id_card_number text,
  id_card_url   text,           -- path in private bucket seller-documents
  extra_doc_url text,
  phone         text,
  address       text,
  status        public.application_status not null default 'pending',
  reject_reason text,
  reviewed_by   uuid references auth.users(id),
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.shops (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null unique references auth.users(id) on delete cascade,
  name          text not null unique,
  slug          text not null unique,
  description   text,
  logo_url      text,
  banner_url    text,
  promptpay_id  text,           -- phone or national id used to receive PromptPay
  status        public.shop_status not null default 'active',
  suspend_reason text,
  rating_avg    numeric(3,2) not null default 0,
  rating_count  integer      not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.shop_warnings (
  id          uuid primary key default gen_random_uuid(),
  shop_id     uuid not null references public.shops(id) on delete cascade,
  reason      text not null,
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now()
);

-- ---------- Catalog ----------
create table public.categories (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,
  slug          text not null unique,
  requires_size boolean not null default false,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);

create table public.products (
  id          uuid primary key default gen_random_uuid(),
  shop_id     uuid not null references public.shops(id) on delete cascade,
  category_id uuid not null references public.categories(id),
  name        text not null,
  slug        text,
  description text,
  price       numeric(12,2) not null check (price >= 0),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.product_variants (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  name        text not null default 'default',   -- size label, e.g. 'S','M','42'
  sku         text,
  price       numeric(12,2) check (price >= 0),   -- null => fall back to product.price
  stock       integer not null default 0 check (stock >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (product_id, name)
);

create table public.product_images (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  url         text not null,          -- path in public bucket products
  is_primary  boolean not null default false,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------- Buyer data ----------
create table public.addresses (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  recipient_name text not null,
  phone          text not null,
  line1          text not null,
  sub_district   text,   -- ตำบล/แขวง
  district       text,   -- อำเภอ/เขต
  province       text not null,
  postal_code    text not null,
  is_default     boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table public.carts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.cart_items (
  id          uuid primary key default gen_random_uuid(),
  cart_id     uuid not null references public.carts(id) on delete cascade,
  variant_id  uuid not null references public.product_variants(id) on delete cascade,
  quantity    integer not null check (quantity > 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (cart_id, variant_id)
);

create table public.wishlists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_id, product_id)
);

-- ---------- Promotions ----------
create table public.coupons (
  id          uuid primary key default gen_random_uuid(),
  shop_id     uuid not null references public.shops(id) on delete cascade,
  code        text not null,
  type        public.coupon_type not null,
  value       numeric(12,2) not null check (value > 0),
  min_order   numeric(12,2) not null default 0 check (min_order >= 0),
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  used_count  integer not null default 0,
  starts_at   timestamptz,
  ends_at     timestamptz,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (shop_id, code)
);

-- ---------- Orders (1 order = 1 shop) ----------
create table public.orders (
  id                uuid primary key default gen_random_uuid(),
  order_no          text not null unique,
  checkout_group_id uuid not null,   -- groups multi-shop orders from one checkout
  buyer_id          uuid not null references auth.users(id),
  shop_id           uuid not null references public.shops(id),
  status            public.order_status  not null default 'pending',
  payment_method    public.payment_method not null,
  coupon_id         uuid references public.coupons(id),
  coupon_code       text,
  subtotal          numeric(12,2) not null default 0,
  discount          numeric(12,2) not null default 0,
  shipping_fee      numeric(12,2) not null default 0,
  total             numeric(12,2) not null default 0,
  -- shipping address snapshot
  ship_recipient    text not null,
  ship_phone        text not null,
  ship_line1        text not null,
  ship_sub_district text,
  ship_district     text,
  ship_province     text not null,
  ship_postal_code  text not null,
  -- fulfillment
  carrier           text,
  tracking_no       text,
  cancel_reason     text,
  cancelled_by      uuid references auth.users(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  paid_at           timestamptz,
  shipped_at        timestamptz,
  delivered_at      timestamptz,
  completed_at      timestamptz,
  cancelled_at      timestamptz
);

create table public.order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders(id) on delete cascade,
  product_id   uuid references public.products(id),
  variant_id   uuid references public.product_variants(id),
  product_name text not null,          -- snapshot
  variant_name text not null,          -- snapshot
  unit_price   numeric(12,2) not null, -- snapshot
  quantity     integer not null check (quantity > 0),
  line_total   numeric(12,2) not null,
  created_at   timestamptz not null default now()
);

create table public.order_status_history (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  status      public.order_status not null,
  note        text,
  changed_by  uuid references auth.users(id),
  created_at  timestamptz not null default now()
);

create table public.payments (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references public.orders(id) on delete cascade,
  method           public.payment_method not null,
  amount           numeric(12,2) not null,
  status           public.payment_status not null default 'unpaid',
  slip_url         text,               -- path in private bucket payment-slips
  promptpay_payload text,              -- QR payload string
  submitted_at     timestamptz,
  verified_at      timestamptz,
  verified_by      uuid references auth.users(id),
  reject_reason    text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ---------- Reviews / notifications / audit ----------
create table public.reviews (
  id                uuid primary key default gen_random_uuid(),
  order_item_id     uuid not null unique references public.order_items(id) on delete cascade,
  product_id        uuid not null references public.products(id) on delete cascade,
  shop_id           uuid not null references public.shops(id) on delete cascade,
  buyer_id          uuid not null references auth.users(id) on delete cascade,
  rating            integer not null check (rating between 1 and 5),
  comment           text,
  image_urls        text[] not null default '{}',
  seller_reply      text,
  seller_replied_at timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null,
  title       text not null,
  body        text,
  link        text,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

create table public.admin_audit_logs (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid not null references auth.users(id),
  action      text not null,
  target_type text,
  target_id   uuid,
  detail      jsonb,
  created_at  timestamptz not null default now()
);

-- ---------- Indexes ----------
create index idx_products_shop        on public.products(shop_id);
create index idx_products_category    on public.products(category_id);
create index idx_products_active      on public.products(is_active);
create index idx_variants_product     on public.product_variants(product_id);
create index idx_images_product       on public.product_images(product_id);
create index idx_addresses_user       on public.addresses(user_id);
create index idx_cart_items_cart      on public.cart_items(cart_id);
create index idx_wishlists_user       on public.wishlists(user_id);
create index idx_coupons_shop         on public.coupons(shop_id);
create index idx_orders_buyer         on public.orders(buyer_id);
create index idx_orders_shop          on public.orders(shop_id);
create index idx_orders_group         on public.orders(checkout_group_id);
create index idx_orders_status        on public.orders(status);
create index idx_order_items_order    on public.order_items(order_id);
create index idx_status_history_order on public.order_status_history(order_id);
create index idx_payments_order       on public.payments(order_id);
create index idx_reviews_product      on public.reviews(product_id);
create index idx_reviews_shop         on public.reviews(shop_id);
create index idx_notifications_user   on public.notifications(user_id, is_read);
create index idx_audit_admin          on public.admin_audit_logs(admin_id);

-- Only one default address per user (partial unique index)
create unique index uniq_default_address_per_user
  on public.addresses(user_id) where (is_default);
