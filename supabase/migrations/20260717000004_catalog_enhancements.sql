-- Mejoras catálogo: number, display_order, updated_at, sync idempotente

alter table stickers
  add column if not exists number int not null default 0,
  add column if not exists display_order int not null default 0;

alter table inventory
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_stickers_display_order on stickers(section_id, display_order);

-- Vista actualizada (drop required when column layout changes)
drop view if exists sticker_catalog;

create view sticker_catalog as
select
  s.id,
  s.code,
  s.number,
  s.display_order,
  s.name,
  s.enabled,
  sec.id as section_id,
  sec.code as section_code,
  sec.name as section_name,
  sec.sort_order as section_sort_order,
  i.physical_stock,
  i.reserved_stock,
  i.sold_stock,
  i.updated_at as inventory_updated_at,
  greatest(i.physical_stock - i.reserved_stock - i.sold_stock, 0) as available_qty
from stickers s
join sections sec on sec.id = s.section_id
left join inventory i on i.sticker_id = s.id;

grant select on sticker_catalog to anon, authenticated, service_role;

-- Ajuste delta (+/- stock)
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
begin
  select physical_stock into v_current
  from inventory where sticker_id = p_sticker_id for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'NOT_FOUND');
  end if;

  v_new := v_current + p_delta;
  select reserved_stock + sold_stock into v_committed
  from inventory where sticker_id = p_sticker_id;

  if v_new < 0 then
    return jsonb_build_object('success', false, 'error', 'NEGATIVE_STOCK');
  end if;

  if v_new < v_committed then
    return jsonb_build_object(
      'success', false,
      'error', 'BELOW_COMMITTED',
      'message', format('No se puede bajar de %s (reservado + vendido)', v_committed)
    );
  end if;

  update inventory
  set physical_stock = v_new, updated_at = now()
  where sticker_id = p_sticker_id;

  insert into inventory_movements (sticker_id, qty_delta, movement_type, reason, reference_type, admin_id)
  values (p_sticker_id, p_delta, 'adjustment', coalesce(p_comment, p_reason), 'manual', p_admin_id);

  return jsonb_build_object('success', true, 'new_stock', v_new, 'delta', p_delta);
end;
$$;

grant execute on function adjust_inventory_delta(uuid, int, text, uuid, text) to service_role;

-- Sincronizar catálogo completo (idempotente)
create or replace function sync_full_catalog()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sections jsonb := '[
    {"code":"00","name":"Especial","sort":0,"single":"00"},
    {"code":"FWC","name":"FIFA World Cup","sort":1,"from":1,"to":19},
    {"code":"MEX","name":"México","sort":100,"from":1,"to":20},
    {"code":"RSA","name":"Sudáfrica","sort":101,"from":1,"to":20},
    {"code":"KOR","name":"Corea del Sur","sort":102,"from":1,"to":20},
    {"code":"CZE","name":"Rep. Checa","sort":103,"from":1,"to":20},
    {"code":"CAN","name":"Canadá","sort":104,"from":1,"to":20},
    {"code":"BIH","name":"Bosnia","sort":105,"from":1,"to":20},
    {"code":"QAT","name":"Catar","sort":106,"from":1,"to":20},
    {"code":"SUI","name":"Suiza","sort":107,"from":1,"to":20},
    {"code":"BRA","name":"Brasil","sort":108,"from":1,"to":20},
    {"code":"MAR","name":"Marruecos","sort":109,"from":1,"to":20},
    {"code":"HAI","name":"Haití","sort":110,"from":1,"to":20},
    {"code":"SCO","name":"Escocia","sort":111,"from":1,"to":20},
    {"code":"USA","name":"Estados Unidos","sort":112,"from":1,"to":20},
    {"code":"PAR","name":"Paraguay","sort":113,"from":1,"to":20},
    {"code":"AUS","name":"Australia","sort":114,"from":1,"to":20},
    {"code":"TUR","name":"Turquía","sort":115,"from":1,"to":20},
    {"code":"GER","name":"Alemania","sort":116,"from":1,"to":20},
    {"code":"CUW","name":"Curazao","sort":117,"from":1,"to":20},
    {"code":"CIV","name":"Costa de Marfil","sort":118,"from":1,"to":20},
    {"code":"ECU","name":"Ecuador","sort":119,"from":1,"to":20},
    {"code":"NED","name":"Países Bajos","sort":120,"from":1,"to":20},
    {"code":"JPN","name":"Japón","sort":121,"from":1,"to":20},
    {"code":"SWE","name":"Suecia","sort":122,"from":1,"to":20},
    {"code":"TUN","name":"Túnez","sort":123,"from":1,"to":20},
    {"code":"BEL","name":"Bélgica","sort":124,"from":1,"to":20},
    {"code":"EGY","name":"Egipto","sort":125,"from":1,"to":20},
    {"code":"IRN","name":"Irán","sort":126,"from":1,"to":20},
    {"code":"NZL","name":"Nueva Zelanda","sort":127,"from":1,"to":20},
    {"code":"ESP","name":"España","sort":128,"from":1,"to":20},
    {"code":"CPV","name":"Cabo Verde","sort":129,"from":1,"to":20},
    {"code":"KSA","name":"Arabia Saudita","sort":130,"from":1,"to":20},
    {"code":"URU","name":"Uruguay","sort":131,"from":1,"to":20},
    {"code":"FRA","name":"Francia","sort":132,"from":1,"to":20},
    {"code":"SEN","name":"Senegal","sort":133,"from":1,"to":20},
    {"code":"IRQ","name":"Irak","sort":134,"from":1,"to":20},
    {"code":"NOR","name":"Noruega","sort":135,"from":1,"to":20},
    {"code":"ARG","name":"Argentina","sort":136,"from":1,"to":20},
    {"code":"ALG","name":"Argelia","sort":137,"from":1,"to":20},
    {"code":"AUT","name":"Austria","sort":138,"from":1,"to":20},
    {"code":"JOR","name":"Jordania","sort":139,"from":1,"to":20},
    {"code":"POR","name":"Portugal","sort":140,"from":1,"to":20},
    {"code":"COD","name":"RD Congo","sort":141,"from":1,"to":20},
    {"code":"UZB","name":"Uzbekistán","sort":142,"from":1,"to":20},
    {"code":"COL","name":"Colombia","sort":143,"from":1,"to":20},
    {"code":"ENG","name":"Inglaterra","sort":144,"from":1,"to":20},
    {"code":"CRO","name":"Croacia","sort":145,"from":1,"to":20},
    {"code":"GHA","name":"Ghana","sort":146,"from":1,"to":20},
    {"code":"PAN","name":"Panini","sort":147,"from":1,"to":20}
  ]'::jsonb;
  v_sec jsonb;
  v_section_id uuid;
  v_from int;
  v_to int;
  v_n int;
  v_code text;
  v_sticker_id uuid;
  v_count int := 0;
begin
  for v_sec in select * from jsonb_array_elements(v_sections)
  loop
    insert into sections (code, name, sort_order)
    values (
      v_sec->>'code',
      v_sec->>'name',
      (v_sec->>'sort')::int
    )
    on conflict (code) do update
      set name = excluded.name, sort_order = excluded.sort_order
    returning id into v_section_id;

    if v_sec ? 'single' then
      v_code := v_sec->>'single';
      insert into stickers (section_id, code, number, display_order, name, enabled)
      values (v_section_id, v_code, 0, 0, 'Lámina ' || v_code, true)
      on conflict (section_id, code) do update
        set number = excluded.number, display_order = excluded.display_order
      returning id into v_sticker_id;

      insert into inventory (sticker_id, physical_stock)
      values (v_sticker_id, 0)
      on conflict (sticker_id) do nothing;

      v_count := v_count + 1;
    else
      v_from := (v_sec->>'from')::int;
      v_to := (v_sec->>'to')::int;
      for v_n in v_from..v_to loop
        v_code := (v_sec->>'code') || ' ' || v_n;
        insert into stickers (section_id, code, number, display_order, name, enabled)
        values (v_section_id, v_code, v_n, v_n, 'Lámina ' || v_code, true)
        on conflict (section_id, code) do update
          set number = excluded.number, display_order = excluded.display_order
        returning id into v_sticker_id;

        insert into inventory (sticker_id, physical_stock)
        values (v_sticker_id, 0)
        on conflict (sticker_id) do nothing;

        v_count := v_count + 1;
      end loop;
    end if;
  end loop;

  return jsonb_build_object('success', true, 'stickers_synced', v_count);
end;
$$;

grant execute on function sync_full_catalog() to service_role;
