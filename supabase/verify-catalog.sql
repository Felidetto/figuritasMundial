-- Verificación post-despliegue del catálogo
select
  (select count(*) from stickers) as stickers_count,
  (select count(*) from inventory) as inventory_count,
  (select count(*) from sections) as sections_count,
  (select count(*) from (
    select section_id, code from stickers group by section_id, code having count(*) > 1
  ) d) as duplicate_pairs,
  (select count(*) from stickers s left join inventory i on i.sticker_id = s.id where i.id is null) as stickers_without_inventory,
  (select count(*) from inventory where physical_stock < 0 or reserved_stock < 0 or sold_stock < 0) as negative_stock,
  (select count(*) from inventory where reserved_stock + sold_stock > physical_stock) as over_committed,
  (select exists(select 1 from stickers where code = '00')) as has_00,
  (select exists(select 1 from stickers where code = 'FWC 1')) as has_fwc_1,
  (select exists(select 1 from stickers where code = 'FWC 19')) as has_fwc_19,
  (select exists(select 1 from stickers where code = 'ARG 1')) as has_arg_1,
  (select exists(select 1 from stickers where code = 'ARG 20')) as has_arg_20;
