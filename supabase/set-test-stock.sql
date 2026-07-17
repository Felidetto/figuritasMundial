-- Stock de prueba para smoke test local (idempotente)
select adjust_inventory(
  (select id from stickers where code = 'FWC 1' limit 1),
  2,
  'ajuste inicial',
  (select id from admin_profiles limit 1),
  'stock prueba smoke'
) as fwc_1;

select adjust_inventory(
  (select id from stickers where code = 'ARG 10' limit 1),
  1,
  'ajuste inicial',
  (select id from admin_profiles limit 1),
  'stock prueba smoke'
) as arg_10;

select adjust_inventory(
  (select id from stickers where code = 'BRA 5' limit 1),
  3,
  'ajuste inicial',
  (select id from admin_profiles limit 1),
  'stock prueba smoke'
) as bra_5;

select s.code, s.physical_stock, s.available_qty
from sticker_catalog s
where s.code in ('FWC 1', 'ARG 10', 'BRA 5')
order by s.code;
