select tablename, policyname, cmd, roles::text
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
