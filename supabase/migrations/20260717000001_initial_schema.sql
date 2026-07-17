-- Láminas 2026 — esquema MVP
create extension if not exists "pgcrypto";

-- ─── Tipos ───────────────────────────────────────────────────────────────────
create type pricing_rule_type as enum ('tier', 'fixed_exact');
create type reservation_status as enum ('reserved', 'awaiting_payment', 'expired', 'cancelled', 'converted');
create type order_status as enum ('awaiting_payment', 'payment_reported', 'paid', 'delivered', 'cancelled', 'expired');
create type movement_type as enum ('reserve', 'release', 'sale', 'adjustment', 'restock');

-- ─── Admin ───────────────────────────────────────────────────────────────────
create table admin_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

-- ─── Catálogo ────────────────────────────────────────────────────────────────
create table sections (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table stickers (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references sections(id) on delete cascade,
  code text not null,
  name text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (section_id, code)
);

create index idx_stickers_section on stickers(section_id);
create index idx_stickers_code on stickers(code);
create index idx_stickers_enabled on stickers(enabled) where enabled = true;

create table inventory (
  id uuid primary key default gen_random_uuid(),
  sticker_id uuid not null unique references stickers(id) on delete cascade,
  physical_stock int not null default 0 check (physical_stock >= 0),
  reserved_stock int not null default 0 check (reserved_stock >= 0),
  sold_stock int not null default 0 check (sold_stock >= 0),
  check (reserved_stock + sold_stock <= physical_stock)
);

-- ─── Precios y configuración ─────────────────────────────────────────────────
create table pricing_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rule_type pricing_rule_type not null,
  min_qty int not null check (min_qty >= 1),
  max_qty int,
  price_per_unit int,
  fixed_total int,
  priority int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (max_qty is null or max_qty >= min_qty),
  check (
    (rule_type = 'tier' and price_per_unit is not null and fixed_total is null)
    or (rule_type = 'fixed_exact' and fixed_total is not null)
  )
);

create table settings (
  key text primary key,
  value jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- ─── Clientes ────────────────────────────────────────────────────────────────
create table customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  whatsapp text not null,
  email text,
  marketplace_username text,
  region text not null,
  commune text not null,
  address text,
  notes text,
  created_at timestamptz not null default now()
);

-- ─── Reservas ────────────────────────────────────────────────────────────────
create table reservations (
  id uuid primary key default gen_random_uuid(),
  public_code text not null unique,
  access_token_hash text not null,
  status reservation_status not null default 'reserved',
  customer_id uuid references customers(id),
  item_count int not null default 0 check (item_count >= 0),
  subtotal int not null default 0 check (subtotal >= 0),
  shipping_cost int not null default 0 check (shipping_cost >= 0),
  total int not null default 0 check (total >= 0),
  delivery_method text check (delivery_method in ('pickup', 'shipping')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_reservations_status_expires on reservations(status, expires_at);
create index idx_reservations_public_code on reservations(public_code);

create table reservation_items (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references reservations(id) on delete cascade,
  sticker_id uuid not null references stickers(id),
  qty int not null check (qty >= 1),
  unit_price int not null default 0,
  unique (reservation_id, sticker_id)
);

-- ─── Pedidos ─────────────────────────────────────────────────────────────────
create table orders (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null unique references reservations(id),
  public_code text not null unique,
  access_token_hash text not null,
  customer_id uuid not null references customers(id),
  status order_status not null default 'awaiting_payment',
  item_count int not null check (item_count >= 1),
  subtotal int not null check (subtotal >= 0),
  shipping_cost int not null default 0 check (shipping_cost >= 0),
  total int not null check (total >= 0),
  delivery_method text not null check (delivery_method in ('pickup', 'shipping')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_orders_status on orders(status);
create index idx_orders_public_code on orders(public_code);
create index idx_orders_token on orders(access_token_hash);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  sticker_id uuid not null references stickers(id),
  sticker_code text not null,
  qty int not null check (qty >= 1),
  unit_price int not null default 0
);

-- ─── Movimientos de inventario ───────────────────────────────────────────────
create table inventory_movements (
  id uuid primary key default gen_random_uuid(),
  sticker_id uuid not null references stickers(id),
  qty_delta int not null,
  movement_type movement_type not null,
  reason text,
  reference_type text,
  reference_id uuid,
  admin_id uuid references admin_profiles(id),
  created_at timestamptz not null default now()
);

create index idx_inventory_movements_sticker on inventory_movements(sticker_id, created_at desc);

-- ─── Vista catálogo ──────────────────────────────────────────────────────────
create or replace view sticker_catalog as
select
  s.id,
  s.code,
  s.name,
  s.enabled,
  sec.id as section_id,
  sec.code as section_code,
  sec.name as section_name,
  sec.sort_order as section_sort_order,
  i.physical_stock,
  i.reserved_stock,
  i.sold_stock,
  greatest(i.physical_stock - i.reserved_stock - i.sold_stock, 0) as available_qty
from stickers s
join sections sec on sec.id = s.section_id
join inventory i on i.sticker_id = s.id;
