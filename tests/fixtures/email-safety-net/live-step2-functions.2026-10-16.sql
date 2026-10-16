-- The LIVE definitions Claire pasted on 2026-10-16 (pg_get_functiondef), unchanged, used by the Step 2 tests.
CREATE OR REPLACE FUNCTION public.admin_get_orders(p_name text, p_pw text, p_days integer DEFAULT 90)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_role text;
begin
  v_role := admin_resolve_role(p_name, p_pw);

  if v_role is null then
    raise exception 'Invalid admin credentials';
  end if;

  return query
  select to_jsonb(o.*) || jsonb_build_object('_client_name', coalesce(c.name, '(unknown)'))
  from orders o
  left join clients c on c.id = o.client_id
  where o.created_at >= now() - make_interval(days => p_days)
    and coalesce(c.hidden, false) = false
  order by o.created_at desc;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_set_order_trello_state(p_name text, p_pw text, p_order_id uuid, p_data jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_role text;
  v_key text;
begin
  v_role := admin_resolve_role(p_name, p_pw);
  if v_role is null then raise exception 'Invalid admin credentials'; end if;

  if p_data is null or jsonb_typeof(p_data) <> 'object' then raise exception 'p_data must be a JSON object'; end if;
  for v_key in select jsonb_object_keys(p_data) loop
    if v_key not in ('trello_card_ids', 'trello_client_list_id', 'trello_synced', 'trello_synced_at') then
      raise exception 'Field % cannot be set here', v_key;
    end if;
  end loop;
  if p_data ? 'trello_card_ids' and jsonb_typeof(p_data->'trello_card_ids') <> 'object' then raise exception 'trello_card_ids must be a JSON object'; end if;
  if p_data ? 'trello_synced' and jsonb_typeof(p_data->'trello_synced') <> 'boolean' then raise exception 'trello_synced must be true or false'; end if;

  if not exists (select 1 from orders where id = p_order_id) then raise exception 'Order % not found', p_order_id; end if;

  update orders set
    trello_card_ids       = case when p_data ? 'trello_card_ids'       then p_data->'trello_card_ids'                     else trello_card_ids end,
    trello_client_list_id = case when p_data ? 'trello_client_list_id' then nullif(p_data->>'trello_client_list_id', '')  else trello_client_list_id end,
    trello_synced         = case when p_data ? 'trello_synced'         then (p_data->>'trello_synced')::boolean           else trello_synced end,
    trello_synced_at      = case when p_data ? 'trello_synced_at'      then nullif(p_data->>'trello_synced_at', '')::timestamptz else trello_synced_at end
  where id = p_order_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_group_for_embed_key(p_t text)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_group uuid := group_id_for_embed_key(p_t);
begin
  if v_group is null then
    raise exception 'invalid or revoked embed key';
  end if;
  return query
  select jsonb_build_object(
    'id', g.id, 'name', g.name, 'io_slug', g.io_slug, 'active', g.active,
    'logo_url', g.logo_url, 'logo_dark_bg', g.logo_dark_bg, 'brand_color', g.brand_color,
    'io_pricing', g.io_pricing, 'has_koc', g.has_koc,
    'am_name', g.am_name, 'am_calendar_url', g.am_calendar_url, 'am_email', g.am_email,
    'trello_board_id', g.trello_board_id, 'am_trello_handle', g.am_trello_handle,
    'additional_card_trello_handle', g.additional_card_trello_handle,
    'io_recipient', g.io_recipient
  )
  from groups g
  where g.id = v_group;
end;
$function$;
