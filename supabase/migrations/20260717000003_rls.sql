-- Row Level Security

alter table sections enable row level security;
alter table stickers enable row level security;
alter table inventory enable row level security;
alter table pricing_rules enable row level security;
alter table settings enable row level security;
alter table customers enable row level security;
alter table reservations enable row level security;
alter table reservation_items enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table inventory_movements enable row level security;
alter table admin_profiles enable row level security;

-- Helper: es admin
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

-- Catálogo público (lectura)
create policy "sections_public_read" on sections for select using (true);
create policy "stickers_public_read" on stickers for select using (true);
create policy "inventory_public_read" on inventory for select using (true);
create policy "pricing_public_read" on pricing_rules for select using (active = true);

-- Settings: lectura pública solo keys no sensibles
create policy "settings_public_read" on settings for select
  using (key in ('min_pickup_qty', 'min_shipping_qty', 'shipping_cost', 'reservation_ttl_minutes', 'payment_ttl_hours', 'store_name', 'pickup_city'));

-- Admin full access
create policy "sections_admin" on sections for all using (is_admin()) with check (is_admin());
create policy "stickers_admin" on stickers for all using (is_admin()) with check (is_admin());
create policy "inventory_admin" on inventory for all using (is_admin()) with check (is_admin());
create policy "pricing_admin" on pricing_rules for all using (is_admin()) with check (is_admin());
create policy "settings_admin" on settings for all using (is_admin()) with check (is_admin());
create policy "movements_admin" on inventory_movements for all using (is_admin()) with check (is_admin());
create policy "admin_profiles_self" on admin_profiles for select using (id = auth.uid() or is_admin());

-- Customers: sin acceso público directo
create policy "customers_admin" on customers for all using (is_admin()) with check (is_admin());

-- Reservas/pedidos: sin acceso anon directo (solo vía RPC service role o token server-side)
create policy "reservations_admin" on reservations for all using (is_admin()) with check (is_admin());
create policy "reservation_items_admin" on reservation_items for all using (is_admin()) with check (is_admin());
create policy "orders_admin" on orders for all using (is_admin()) with check (is_admin());
create policy "order_items_admin" on order_items for all using (is_admin()) with check (is_admin());

-- Grants para funciones RPC
grant execute on function expire_reservations() to authenticated, anon, service_role;
grant execute on function create_reservation(jsonb, text) to service_role;
grant execute on function complete_checkout(uuid, text, jsonb, text) to service_role;
grant execute on function confirm_payment(uuid, uuid) to service_role;
grant execute on function cancel_order(uuid, uuid, text) to service_role;
grant execute on function adjust_inventory(uuid, int, text, uuid, text) to service_role;
grant execute on function calculate_order_pricing(int) to anon, authenticated, service_role;
grant select on sticker_catalog to anon, authenticated, service_role;
