-- Catálogo estructural remoto (sin stock ficticio)
-- Ejecutar: pnpm exec supabase db execute --linked -f supabase/seed-remote-catalog.sql

select sync_full_catalog();

-- Configuración base (idempotente)
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
