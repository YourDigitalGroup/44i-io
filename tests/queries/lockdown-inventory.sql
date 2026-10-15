-- READ-ONLY. Does NOT touch the submission path (it only reads catalog information; nothing is changed).
-- Lockdown preparation: what the public (anon) role can reach today. Run each query on its own and send me the results.

-- 1. Every row-level-security policy in the public schema (looking for groups_public_read and the three anon orders policies)
select tablename, policyname, cmd, roles::text as roles, qual, with_check
from pg_policies where schemaname = 'public'
order by tablename, policyname;

-- 2. Every function the public (anon) role can run, with its exact argument list
select p.proname as function_name, pg_get_function_identity_arguments(p.oid) as arguments, p.prosecdef as security_definer
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')
order by p.proname, arguments;

-- 3. Which tables the public (anon) role can read or write directly
select table_name, string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where grantee = 'anon' and table_schema = 'public'
group by table_name order by table_name;
