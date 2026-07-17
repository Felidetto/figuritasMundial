-- Super Admin, pricing v2, dashboard RPCs, inventory security

-- ─── 1. Rol en admin_profiles ───────────────────────────────────────────────
alter table admin_profiles
  add column if not exists role text;

update admin_profiles set role = 'admin' where role is null;

alter table admin_profiles
  alter column role set default 'admin';

alter table admin_profiles
  alter column role set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'admin_profiles_role_check'
  ) then
    alter table admin_profiles
      add constraint admin_profiles_role_check
      check (role in ('admin', 'super_admin'));
  end if;
end $$;

update admin_profiles set role = 'super_admin';

-- ─── 2. Funciones de autorización ───────────────────────────────────────────
create or replace function is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from admin_profiles
    where id = auth.uid() and role = 'super_admin'
  );
$$;

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from admin_profiles where id = auth.uid()
  );
$$;

-- ─── 3. Precios (regla comercial definitiva) ────────────────────────────────
create or replace function calculate_order_pricing(p_qty int)
returns table(subtotal int, rule_name text, is_promo boolean)
language plpgsql
stable
as $$
declare
  v_unit int := 400;
  v_pack_base int := 15000;
  v_pack_qty int := 50;
  v_subtotal int;
  v_rule text;
  v_promo boolean := false;
begin
  if p_qty is null or p_qty < 1 then
    raise exception 'MIN_QUANTITY' using errcode = 'P0001';
  end if;

  if p_qty < v_pack_qty then
    v_subtotal := p_qty * v_unit;
    v_rule := 'unitario';
  elsif p_qty = v_pack_qty then
    v_subtotal := v_pack_base;
    v_rule := 'pack_50';
    v_promo := true;
  else
    v_subtotal := v_pack_base + (p_qty - v_pack_qty) * v_unit;
    v_rule := 'pack_50_plus';
  end if;

  return query select v_subtotal, v_rule, v_promo;
end;
$$;

-- ─── 4. Despacho ────────────────────────────────────────────────────────────
create or replace function calculate_shipping_cost(p_qty int, p_method text)
returns int
language plpgsql
stable
as $$
declare
  v_min_shipping int;
  v_cost int;
begin
  if p_method is distinct from 'shipping' then
    return 0;
  end if;

  v_min_shipping := coalesce((get_setting('min_shipping_qty') ->> 0)::int, 50);
  if p_qty < v_min_shipping then
    raise exception 'SHIPPING_MIN_NOT_MET' using errcode = 'P0003';
  end if;

  v_cost := coalesce((get_setting('shipping_cost') ->> 0)::int, 2000);
  return v_cost;
end;
$$;

-- ─── 5. Actualizar settings y pricing_rules ─────────────────────────────────
insert into settings (key, value) values
  ('min_pickup_qty', '1'),
  ('min_shipping_qty', '50'),
  ('shipping_cost', '2000')
on conflict (key) do update set value = excluded.value, updated_at = now();

update settings set value = '1' where key = 'min_pickup_qty';
update settings set value = '50' where key = 'min_shipping_qty';
update settings set value = '2000' where key = 'shipping_cost';

delete from pricing_rules where name in (
  'Unitario 1-49', 'Pack 50', 'Pack 50+',
  '15-24', '25-39', '40-49', '51+', 'Promo 50'
);

insert into pricing_rules (name, rule_type, min_qty, max_qty, price_per_unit, fixed_total, priority, active)
values
  ('Unitario 1-49', 'tier', 1, 49, 400, null, 10, true),
  ('Pack 50', 'fixed_exact', 50, 50, null, 15000, 100, true),
  ('Pack 50+', 'tier', 51, null, 400, null, 50, true);

-- ─── 6. Auditoría de pedidos ────────────────────────────────────────────────
create table if not exists order_status_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  from_status order_status,
  to_status order_status not null,
  admin_id uuid references admin_profiles(id),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_order_status_logs_order on order_status_logs(order_id, created_at desc);

alter table order_status_logs enable row level security;

drop policy if exists order_status_logs_super_admin on order_status_logs;
create policy order_status_logs_super_admin on order_status_logs
  for all using (is_super_admin()) with check (is_super_admin());

-- ─── 7. Mejorar adjust_inventory_delta ──────────────────────────────────────
create or replace function adjust_inventory_delta(
  p_sticker_id uuid,
  p_delta int,
  p_reason text,
  p_admin_id uuid,
  p_comment text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current int;
  v_new int;
  v_committed int;
  v_movement_type movement_type;
begin
  if not exists (
    select 1 from admin_profiles where id = p_admin_id and role = 'super_admin'
  ) then
    return jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  end if;

  select physical_stock, reserved_stock + sold_stock
  into v_current, v_committed
  from inventory
  where sticker_id = p_sticker_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'NOT_FOUND');
  end if;

  v_new := v_current + p_delta;

  if v_new < 0 then
    return jsonb_build_object('success', false, 'error', 'NEGATIVE_STOCK');
  end if;

  if v_new < v_committed then
    return jsonb_build_object(
      'success', false,
      'error', 'BELOW_COMMITTED',
      'message', format('Stock (%s) no puede ser menor que comprometido (%s)', v_new, v_committed)
    );
  end if;

  v_movement_type := case
    when p_delta > 0 then 'restock'::movement_type
    else 'adjustment'::movement_type
  end;

  update inventory set physical_stock = v_new where sticker_id = p_sticker_id;

  insert into inventory_movements (
    sticker_id, qty_delta, movement_type, reason, reference_type, admin_id
  ) values (
    p_sticker_id, p_delta, v_movement_type, p_reason, 'manual', p_admin_id
  );

  return jsonb_build_object('success', true, 'new_stock', v_new, 'delta', p_delta);
end;
$$;

-- ─── 8. Dashboard stats RPC ─────────────────────────────────────────────────
create or replace function get_admin_dashboard_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'America/Santiago')::date;
  v_month_start date := date_trunc('month', now() at time zone 'America/Santiago')::date;
  v_result jsonb;
begin
  if not is_super_admin() then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'sales_today_count', (
      select count(*)::int from orders
      where status in ('paid', 'delivered')
        and (created_at at time zone 'America/Santiago')::date = v_today
    ),
    'sales_month_count', (
      select count(*)::int from orders
      where status in ('paid', 'delivered')
        and (created_at at time zone 'America/Santiago')::date >= v_month_start
    ),
    'revenue_today', coalesce((
      select sum(total)::int from orders
      where status in ('paid', 'delivered')
        and (created_at at time zone 'America/Santiago')::date = v_today
    ), 0),
    'revenue_month', coalesce((
      select sum(total)::int from orders
      where status in ('paid', 'delivered')
        and (created_at at time zone 'America/Santiago')::date >= v_month_start
    ), 0),
    'pending_payment', (select count(*)::int from orders where status in ('awaiting_payment', 'payment_reported')),
    'paid_orders', (select count(*)::int from orders where status = 'paid'),
    'delivered_orders', (select count(*)::int from orders where status = 'delivered'),
    'stickers_sold', coalesce((select sum(sold_stock)::int from inventory), 0),
    'stock_available', coalesce((select sum(greatest(physical_stock - reserved_stock - sold_stock, 0))::int from inventory), 0),
    'codes_with_stock', (select count(*)::int from inventory where physical_stock > reserved_stock + sold_stock),
    'codes_out_of_stock', (select count(*)::int from inventory where physical_stock <= reserved_stock + sold_stock),
    'active_reservations', (select count(*)::int from reservations where status in ('reserved', 'awaiting_payment')),
    'expiring_soon', (
      select count(*)::int from reservations
      where status in ('reserved', 'awaiting_payment')
        and expires_at <= now() + interval '10 minutes'
    ),
    'physical_total', coalesce((select sum(physical_stock)::int from inventory), 0),
    'reserved_total', coalesce((select sum(reserved_stock)::int from inventory), 0)
  ) into v_result;

  return v_result;
end;
$$;

create or replace function get_sticker_movements(p_sticker_id uuid, p_limit int default 20)
returns setof inventory_movements
language sql
stable
security definer
set search_path = public
as $$
  select im.*
  from inventory_movements im
  where im.sticker_id = p_sticker_id
    and is_super_admin()
  order by im.created_at desc
  limit p_limit;
$$;

grant execute on function is_super_admin() to authenticated, service_role;
grant execute on function get_admin_dashboard_stats() to authenticated, service_role;
grant execute on function get_sticker_movements(uuid, int) to authenticated, service_role;
