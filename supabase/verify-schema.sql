select
  (select count(*)::int from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE') as public_tables,
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public') as public_functions,
  (select count(*)::int from pg_views where schemaname = 'public') as public_views;

select table_name
from information_schema.tables
where table_schema = 'public' and table_type = 'BASE TABLE'
order by table_name;

select p.proname as function_name
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.proname;
