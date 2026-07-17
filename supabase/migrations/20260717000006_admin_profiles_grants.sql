-- admin_profiles lacked SELECT grants; login and is_super_admin() could not read profiles.

grant select on admin_profiles to authenticated, service_role;

-- Allow authenticated users to read their own profile via RLS (admin_profiles_self).
-- service_role bypasses RLS but still needs table grants for PostgREST.
