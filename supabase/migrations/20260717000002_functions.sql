-- Funciones de negocio — reservas, precios, expiración

-- Generar código público LAM-XXXXX
create or replace function generate_public_code(prefix text default 'LAM')
returns text
language plpgsql
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text;
  i int;
begin
  result := prefix || '-';
  for i in 1..5 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return result;
end;
$$;

-- Obtener setting con default
create or replace function get_setting(p_key text, p_default jsonb default 'null'::jsonb)
returns jsonb
language sql
stable
as $$
  select coalesce((select value from settings where key = p_key), p_default);
$$;

-- Calcular precio desde reglas en BD
create or replace function calculate_order_pricing(p_qty int)
returns table(subtotal int, rule_name text, is_promo boolean)
language plpgsql
stable
as $$
declare
  v_min_pickup int;
  v_rule record;
  v_subtotal int;
begin
  v_min_pickup := coalesce((get_setting('min_pickup_qty') ->> 0)::int, 15);

  if p_qty < v_min_pickup then
    raise exception 'MIN_QUANTITY' using errcode = 'P0001';
  end if;

  -- Promoción exacta (ej. 50 láminas)
  select pr.name, pr.fixed_total
  into v_rule
  from pricing_rules pr
  where pr.active = true
    and pr.rule_type = 'fixed_exact'
    and pr.min_qty = p_qty
    and (pr.max_qty is null or pr.max_qty = p_qty)
  order by pr.priority desc
  limit 1;

  if found then
    return query select v_rule.fixed_total, v_rule.name, true;
    return;
  end if;

  -- Tramo por cantidad
  select pr.name, pr.price_per_unit
  into v_rule
  from pricing_rules pr
  where pr.active = true
    and pr.rule_type = 'tier'
    and p_qty >= pr.min_qty
    and (pr.max_qty is null or p_qty <= pr.max_qty)
  order by pr.priority desc, pr.min_qty desc
  limit 1;

  if not found then
    raise exception 'NO_PRICING_RULE' using errcode = 'P0002';
  end if;

  v_subtotal := p_qty * v_rule.price_per_unit;
  return query select v_subtotal, v_rule.name, false;
end;
$$;

-- Costo de despacho
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

  v_cost := coalesce((get_setting('shipping_cost') ->> 0)::int, 4490);
  return v_cost;
end;
$$;

-- Expirar reservas vencidas (idempotente)
create or replace function expire_reservations()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
  v_rec record;
  v_item record;
begin
  for v_rec in
    select id, status
    from reservations
    where status in ('reserved', 'awaiting_payment')
      and expires_at < now()
    for update skip locked
  loop
    for v_item in
      select sticker_id, qty
      from reservation_items
      where reservation_id = v_rec.id
    loop
      update inventory
      set reserved_stock = reserved_stock - v_item.qty
      where sticker_id = v_item.sticker_id
        and reserved_stock >= v_item.qty;

      insert into inventory_movements (sticker_id, qty_delta, movement_type, reason, reference_type, reference_id)
      values (v_item.sticker_id, v_item.qty, 'release', 'Reserva expirada', 'reservation', v_rec.id);
    end loop;

    update reservations
    set status = 'expired', updated_at = now()
    where id = v_rec.id;

    update orders
    set status = 'expired', updated_at = now()
    where reservation_id = v_rec.id
      and status = 'awaiting_payment';

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- Crear reserva atómica
create or replace function create_reservation(
  p_items jsonb,
  p_access_token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_sticker_id uuid;
  v_qty int;
  v_total_qty int := 0;
  v_available int;
  v_reservation_id uuid;
  v_public_code text;
  v_subtotal int;
  v_rule_name text;
  v_is_promo boolean;
  v_ttl_minutes int;
  v_expires_at timestamptz;
  v_unavailable jsonb := '[]'::jsonb;
  v_sticker record;
  v_sorted_ids uuid[];
begin
  perform expire_reservations();

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART' using errcode = 'P0004';
  end if;

  -- Agregar items duplicados por sticker_id
  CREATE TEMP TABLE _agg_items (
    sticker_id uuid,
    qty int
  ) ON COMMIT DROP;

  INSERT INTO _agg_items (sticker_id, qty)
  SELECT (elem ->> 'sticker_id')::uuid, sum((elem ->> 'qty')::int)
  FROM jsonb_array_elements(p_items) elem
  GROUP BY 1;

  -- Calcular cantidad total
  SELECT coalesce(sum(qty), 0) INTO v_total_qty FROM _agg_items;

  -- Validar mínimo y precio
  select cp.subtotal, cp.rule_name, cp.is_promo
  into v_subtotal, v_rule_name, v_is_promo
  from calculate_order_pricing(v_total_qty) cp;

  -- Ordenar IDs para evitar deadlocks
  SELECT array_agg(sticker_id ORDER BY sticker_id)
  INTO v_sorted_ids
  FROM _agg_items;

  -- Verificar disponibilidad con lock
  FOREACH v_sticker_id IN ARRAY v_sorted_ids
  LOOP
    SELECT qty INTO v_qty FROM _agg_items WHERE sticker_id = v_sticker_id;

    select s.code, s.enabled, i.physical_stock, i.reserved_stock, i.sold_stock,
           greatest(i.physical_stock - i.reserved_stock - i.sold_stock, 0) as available_qty
    into v_sticker
    from stickers s
    join inventory i on i.sticker_id = s.id
    where s.id = v_sticker_id
    for update of i;

    if not found or not v_sticker.enabled then
      v_unavailable := v_unavailable || jsonb_build_object('sticker_id', v_sticker_id, 'code', coalesce(v_sticker.code, '?'));
      continue;
    end if;

    if v_sticker.available_qty < v_qty then
      v_unavailable := v_unavailable || jsonb_build_object('sticker_id', v_sticker_id, 'code', v_sticker.code);
    end if;
  end loop;

  if jsonb_array_length(v_unavailable) > 0 then
    return jsonb_build_object(
      'success', false,
      'error', 'STOCK_CONFLICT',
      'unavailable', v_unavailable
    );
  end if;

  -- Generar código único
  loop
    v_public_code := generate_public_code('LAM');
    exit when not exists (select 1 from reservations where public_code = v_public_code);
  end loop;

  v_ttl_minutes := coalesce((get_setting('reservation_ttl_minutes') ->> 0)::int, 30);
  v_expires_at := now() + (v_ttl_minutes || ' minutes')::interval;

  insert into reservations (public_code, access_token_hash, status, item_count, subtotal, total, expires_at)
  values (v_public_code, p_access_token_hash, 'reserved', v_total_qty, v_subtotal, v_subtotal, v_expires_at)
  returning id into v_reservation_id;

  FOR v_item IN SELECT sticker_id, qty FROM _agg_items
  LOOP
    v_sticker_id := v_item.sticker_id;
    v_qty := v_item.qty;

    insert into reservation_items (reservation_id, sticker_id, qty, unit_price)
    values (v_reservation_id, v_sticker_id, v_qty, 0);

    update inventory
    set reserved_stock = reserved_stock + v_qty
    where sticker_id = v_sticker_id;

    insert into inventory_movements (sticker_id, qty_delta, movement_type, reason, reference_type, reference_id)
    values (v_sticker_id, -v_qty, 'reserve', 'Reserva creada', 'reservation', v_reservation_id);
  end loop;

  return jsonb_build_object(
    'success', true,
    'reservation_id', v_reservation_id,
    'public_code', v_public_code,
    'expires_at', v_expires_at,
    'item_count', v_total_qty,
    'subtotal', v_subtotal,
    'total', v_subtotal,
    'rule_name', v_rule_name,
    'is_promo', v_is_promo
  );

exception
  when sqlstate 'P0001' then
    return jsonb_build_object('success', false, 'error', 'MIN_QUANTITY');
  when others then
    raise;
end;
$$;

-- Completar checkout → pedido awaiting_payment
create or replace function complete_checkout(
  p_reservation_id uuid,
  p_access_token_hash text,
  p_customer jsonb,
  p_delivery_method text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res record;
  v_customer_id uuid;
  v_order_id uuid;
  v_shipping int;
  v_total int;
  v_payment_hours int;
  v_expires_at timestamptz;
  v_item record;
begin
  perform expire_reservations();

  select * into v_res
  from reservations
  where id = p_reservation_id
    and access_token_hash = p_access_token_hash
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'NOT_FOUND');
  end if;

  if v_res.status <> 'reserved' then
    if v_res.status = 'expired' then
      return jsonb_build_object('success', false, 'error', 'EXPIRED');
    end if;
    return jsonb_build_object('success', false, 'error', 'INVALID_STATUS');
  end if;

  if v_res.expires_at < now() then
    perform expire_reservations();
    return jsonb_build_object('success', false, 'error', 'EXPIRED');
  end if;

  v_shipping := calculate_shipping_cost(v_res.item_count, p_delivery_method);
  v_total := v_res.subtotal + v_shipping;

  insert into customers (full_name, whatsapp, email, marketplace_username, region, commune, address, notes)
  values (
    p_customer ->> 'full_name',
    p_customer ->> 'whatsapp',
    nullif(p_customer ->> 'email', ''),
    nullif(p_customer ->> 'marketplace_username', ''),
    p_customer ->> 'region',
    p_customer ->> 'commune',
    nullif(p_customer ->> 'address', ''),
    nullif(p_customer ->> 'notes', '')
  )
  returning id into v_customer_id;

  v_payment_hours := coalesce((get_setting('payment_ttl_hours') ->> 0)::int, 5);
  v_expires_at := now() + (v_payment_hours || ' hours')::interval;

  insert into orders (
    reservation_id, public_code, access_token_hash, customer_id,
    status, item_count, subtotal, shipping_cost, total, delivery_method, expires_at
  )
  values (
    v_res.id, v_res.public_code, v_res.access_token_hash, v_customer_id,
    'awaiting_payment', v_res.item_count, v_res.subtotal, v_shipping, v_total, p_delivery_method, v_expires_at
  )
  returning id into v_order_id;

  for v_item in
    select ri.sticker_id, ri.qty, s.code
    from reservation_items ri
    join stickers s on s.id = ri.sticker_id
    where ri.reservation_id = v_res.id
  loop
    insert into order_items (order_id, sticker_id, sticker_code, qty, unit_price)
    values (v_order_id, v_item.sticker_id, v_item.code, v_item.qty, 0);
  end loop;

  update reservations
  set status = 'awaiting_payment',
      customer_id = v_customer_id,
      shipping_cost = v_shipping,
      total = v_total,
      delivery_method = p_delivery_method,
      expires_at = v_expires_at,
      updated_at = now()
  where id = v_res.id;

  return jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'public_code', v_res.public_code,
    'total', v_total,
    'shipping_cost', v_shipping,
    'expires_at', v_expires_at
  );
end;
$$;

-- Confirmar pago (admin)
create or replace function confirm_payment(p_order_id uuid, p_admin_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_item record;
begin
  select o.*, r.id as res_id
  into v_order
  from orders o
  join reservations r on r.id = o.reservation_id
  where o.id = p_order_id
  for update of o;

  if not found then
    return jsonb_build_object('success', false, 'error', 'NOT_FOUND');
  end if;

  if v_order.status not in ('awaiting_payment', 'payment_reported') then
    return jsonb_build_object('success', false, 'error', 'INVALID_STATUS');
  end if;

  if v_order.expires_at < now() then
    return jsonb_build_object('success', false, 'error', 'EXPIRED');
  end if;

  for v_item in
    select oi.sticker_id, oi.qty
    from order_items oi
    where oi.order_id = v_order.id
  loop
    update inventory
    set physical_stock = physical_stock - v_item.qty,
        reserved_stock = reserved_stock - v_item.qty,
        sold_stock = sold_stock + v_item.qty
    where sticker_id = v_item.sticker_id;

    insert into inventory_movements (sticker_id, qty_delta, movement_type, reason, reference_type, reference_id, admin_id)
    values (v_item.sticker_id, -v_item.qty, 'sale', 'Pago confirmado', 'order', v_order.id, p_admin_id);
  end loop;

  update orders set status = 'paid', updated_at = now() where id = v_order.id;
  update reservations set status = 'converted', updated_at = now() where id = v_order.res_id;

  return jsonb_build_object('success', true);
end;
$$;

-- Cancelar pedido/reserva (admin)
create or replace function cancel_order(p_order_id uuid, p_admin_id uuid, p_reason text default 'Cancelado')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_item record;
begin
  select o.*, r.id as res_id, r.status as res_status
  into v_order
  from orders o
  join reservations r on r.id = o.reservation_id
  where o.id = p_order_id
  for update of o;

  if not found then
    return jsonb_build_object('success', false, 'error', 'NOT_FOUND');
  end if;

  if v_order.status in ('paid', 'delivered', 'cancelled', 'expired') then
    return jsonb_build_object('success', false, 'error', 'INVALID_STATUS');
  end if;

  for v_item in
    select oi.sticker_id, oi.qty
    from order_items oi
    where oi.order_id = v_order.id
  loop
    update inventory
    set reserved_stock = greatest(reserved_stock - v_item.qty, 0)
    where sticker_id = v_item.sticker_id;

    insert into inventory_movements (sticker_id, qty_delta, movement_type, reason, reference_type, reference_id, admin_id)
    values (v_item.sticker_id, v_item.qty, 'release', p_reason, 'order', v_order.id, p_admin_id);
  end loop;

  update orders set status = 'cancelled', updated_at = now() where id = v_order.id;
  update reservations set status = 'cancelled', updated_at = now() where id = v_order.res_id;

  return jsonb_build_object('success', true);
end;
$$;

-- Ajuste de stock admin
create or replace function adjust_inventory(
  p_sticker_id uuid,
  p_new_physical int,
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
  v_old int;
  v_delta int;
begin
  if p_new_physical < 0 then
    return jsonb_build_object('success', false, 'error', 'INVALID_STOCK');
  end if;

  select physical_stock into v_old
  from inventory
  where sticker_id = p_sticker_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'NOT_FOUND');
  end if;

  if p_new_physical < (select reserved_stock + sold_stock from inventory where sticker_id = p_sticker_id) then
    return jsonb_build_object('success', false, 'error', 'BELOW_RESERVED');
  end if;

  v_delta := p_new_physical - v_old;

  update inventory set physical_stock = p_new_physical where sticker_id = p_sticker_id;

  insert into inventory_movements (sticker_id, qty_delta, movement_type, reason, reference_type, admin_id)
  values (p_sticker_id, v_delta, 'adjustment', coalesce(p_comment, p_reason), 'manual', p_admin_id);

  return jsonb_build_object('success', true, 'delta', v_delta);
end;
$$;
