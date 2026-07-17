-- Seed — settings, precios, catálogo completo y stock de ejemplo

-- Settings y precios (idempotente)
insert into settings (key, value) values
  ('store_name', '"Láminas 2026"'),
  ('min_pickup_qty', '15'),
  ('min_shipping_qty', '50'),
  ('shipping_cost', '4490'),
  ('reservation_ttl_minutes', '30'),
  ('payment_ttl_hours', '5'),
  ('pickup_city', '"Osorno"'),
  ('whatsapp', '"+56900000000"'),
  ('bank_instructions', '{"bank": "Banco Ejemplo", "account_type": "Cuenta Vista", "account_number": "00000000000", "holder": "Titular Ejemplo", "rut": "12.345.678-9"}'),
  ('pickup_address', '"Dirección de retiro — configurable en admin"')
on conflict (key) do update set value = excluded.value, updated_at = now();

insert into pricing_rules (name, rule_type, min_qty, max_qty, price_per_unit, priority)
select * from (values
  ('Tramo 15-24', 'tier'::pricing_rule_type, 15, 24, 500, 10),
  ('Tramo 25-39', 'tier'::pricing_rule_type, 25, 39, 450, 20),
  ('Tramo 40-49', 'tier'::pricing_rule_type, 40, 49, 425, 30),
  ('Tramo 51+', 'tier'::pricing_rule_type, 51, null::int, 400, 50)
) as v(name, rule_type, min_qty, max_qty, price_per_unit, priority)
where not exists (select 1 from pricing_rules where name = v.name);

insert into pricing_rules (name, rule_type, min_qty, max_qty, fixed_total, priority)
select 'Promo 50 láminas', 'fixed_exact'::pricing_rule_type, 50, 50, 20000, 100
where not exists (select 1 from pricing_rules where name = 'Promo 50 láminas');

-- Catálogo completo (980 códigos)
select sync_full_catalog();

-- Stock de ejemplo para validar estados visuales
do $$
declare
  v_id uuid;
begin
  -- Helper: set stock by code
  create temp table if not exists _seed_stock (code text, stock int) on commit drop;
  truncate _seed_stock;

  insert into _seed_stock (code, stock) values
    ('00', 1),
    ('FWC 1', 2),
    ('FWC 2', 0),
    ('MEX 1', 3),
    ('ARG 10', 1),
    ('BRA 5', 0),
    ('ARG 1', 2),
    ('ARG 2', 5),
    ('ESP 3', 1),
    ('GER 7', 4),
    ('FRA 12', 0),
    ('PAN 1', 2);

  -- FWC 3-15 con stock variado para pruebas E2E
  for i in 3..15 loop
    insert into _seed_stock values ('FWC ' || i, (i % 4));
  end loop;

  update inventory i
  set physical_stock = ss.stock,
      reserved_stock = 0,
      sold_stock = 0,
      updated_at = now()
  from stickers s
  join _seed_stock ss on ss.code = s.code
  where i.sticker_id = s.id;
end $$;
