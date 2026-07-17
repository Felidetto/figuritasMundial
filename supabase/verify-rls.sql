-- Verificación RLS y grants (solo lectura de metadatos)
select
  tablename,
  policyname,
  cmd,
  roles::text
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- Funciones RPC: quién puede ejecutar
select
  p.proname as function_name,
  array_agg(distinct pg_get_userbyid(d.grantee) order by pg_get_userbyid(d.grantee)) as grantees
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
left join pg_proc_acl d on d.oid = p.oid
where n.nspname = 'public'
  and p.proname in (
    'create_reservation',
    'complete_checkout',
    'confirm_payment',
    'cancel_order',
    'adjust_inventory',
    'adjust_inventory_delta',
    'sync_full_catalog',
    'expire_reservations',
    'calculate_order_pricing'
  )
group by p.proname
order by p.proname;
