-- The LIVE definitions Claire pasted on 2026-10-15 (pg_get_functiondef), unchanged, used by the lockdown tests. Functions NOT listed here are stubbed in the test.
CREATE OR REPLACE FUNCTION public.admin_get_agents(p_name text, p_pw text, p_client_id uuid)
 RETURNS SETOF agents
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare v_role text;
begin
  v_role := admin_resolve_role(p_name, p_pw);
  if v_role is null then raise exception 'Invalid admin credentials'; end if;
  return query select * from agents where client_id = p_client_id order by name;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_counties(p_name text, p_pw text, p_client_id uuid)
 RETURNS SETOF counties
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare v_role text;
begin
  v_role := admin_resolve_role(p_name, p_pw);
  if v_role is null then raise exception 'Invalid admin credentials'; end if;
  return query select * from counties where client_id = p_client_id order by name;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_groups(p_name text, p_pw text)
 RETURNS SETOF groups
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_role text;
begin
  v_role := admin_resolve_role(p_name, p_pw);
  if v_role is null then raise exception 'Invalid admin credentials'; end if;
  if v_role in ('strategist', 'accounting') then raise exception 'Admin portal access is restricted'; end if;
  return query select * from groups order by name;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_client_agents(p_client_id uuid)
 RETURNS SETOF agents
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  select * from agents where client_id = p_client_id and active = true order by name;
$function$;

CREATE OR REPLACE FUNCTION public.get_client_agents(p_t text, p_client_id uuid)
 RETURNS SETOF agents
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_group uuid := group_id_for_embed_key(p_t);
begin
  if v_group is null then
    raise exception 'invalid or revoked embed key';
  end if;
  return query
  select * from agents
  where client_id = p_client_id and active = true
    and exists (select 1 from clients c where c.id = p_client_id and c.group_id = v_group)
  order by name;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_client_counties(p_client_id uuid)
 RETURNS SETOF counties
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  select * from counties where client_id = p_client_id and active = true order by name;
$function$;

CREATE OR REPLACE FUNCTION public.get_client_counties(p_t text, p_client_id uuid)
 RETURNS SETOF counties
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_group uuid := group_id_for_embed_key(p_t);
begin
  if v_group is null then
    raise exception 'invalid or revoked embed key';
  end if;
  return query
  select * from counties
  where client_id = p_client_id and active = true
    and exists (select 1 from clients c where c.id = p_client_id and c.group_id = v_group)
  order by name;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_group_aes(p_group_id uuid)
 RETURNS TABLE(id uuid, name text, trello_handle text, email text, market text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  select a.id, a.name, a.trello_handle, a.email, a.market
  from ae a
  where a.group_id = p_group_id and a.active = true and a.sells = true
  order by a.name;
$function$;

CREATE OR REPLACE FUNCTION public.get_group_aes(p_t text)
 RETURNS TABLE(id uuid, name text, trello_handle text, email text, market text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_group uuid := group_id_for_embed_key(p_t);
begin
  if v_group is null then
    raise exception 'invalid or revoked embed key';
  end if;
  return query
  select a.id, a.name, a.trello_handle, a.email, a.market
  from ae a
  where a.group_id = v_group and a.active = true and a.sells = true
  order by a.name;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_group_clients(p_group_id uuid)
 RETURNS TABLE(id uuid, name text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  select c.id, c.name
  from clients c
  where c.group_id = p_group_id
    and coalesce(c.hidden, false) = false
  order by c.name;
$function$;

CREATE OR REPLACE FUNCTION public.get_group_clients(p_t text)
 RETURNS TABLE(id uuid, name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_group uuid := group_id_for_embed_key(p_t);
begin
  if v_group is null then
    raise exception 'invalid or revoked embed key';
  end if;
  return query
  select c.id, c.name
  from clients c
  where c.group_id = v_group
    and coalesce(c.hidden, false) = false
  order by c.name;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_group_roster(p_group_id uuid)
 RETURNS TABLE(id uuid, name text, trello_handle text, email text, market text, role text, active boolean)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  select a.id, a.name, a.trello_handle, a.email, a.market, a.role, a.active
  from ae a
  where a.group_id = p_group_id
  order by a.name;
$function$;

CREATE OR REPLACE FUNCTION public.set_client_trello_list_id(p_client_id uuid, p_trello_list_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
begin
  update clients set trello_list_id = p_trello_list_id where id = p_client_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.set_client_trello_list_id(p_t text, p_client_id uuid, p_trello_list_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_group uuid := group_id_for_embed_key(p_t);
begin
  if v_group is null then
    raise exception 'invalid or revoked embed key';
  end if;
  update clients set trello_list_id = p_trello_list_id
  where id = p_client_id and group_id = v_group;
end;
$function$;
