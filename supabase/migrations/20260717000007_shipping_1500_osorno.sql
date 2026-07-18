-- Despacho $1.500 solo en Osorno

update settings set value = '1500', updated_at = now() where key = 'shipping_cost';

insert into settings (key, value) values ('shipping_city', '"Osorno"')
on conflict (key) do update set value = excluded.value, updated_at = now();

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

  v_cost := coalesce((get_setting('shipping_cost') ->> 0)::int, 1500);
  return v_cost;
end;
$$;

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
  v_shipping_city text;
  v_commune text;
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

  if p_delivery_method = 'shipping' then
    v_shipping_city := lower(trim(both '"' from coalesce(
      get_setting('shipping_city') ->> 0,
      get_setting('pickup_city') ->> 0,
      'Osorno'
    )));
    v_commune := lower(trim(p_customer ->> 'commune'));
    if v_commune <> v_shipping_city then
      return jsonb_build_object('success', false, 'error', 'SHIPPING_OSORNO_ONLY');
    end if;
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
