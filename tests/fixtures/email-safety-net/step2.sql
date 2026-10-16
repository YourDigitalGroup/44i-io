-- TOUCHES THE SUBMISSION PATH (the order form's group read and the saved order). Email safety net, STEP 2 SQL. ONE block, run as a whole, outside AE hours, then the smoke test.
--  1. orders.email_sent_at (when the order email went out; empty = not sent) + a one-time backfill so EXISTING orders do not look unsent (we assume they were sent).
--  2. groups.no_team_copy (a test group can leave the always-BCC list off its emails), default false = nothing changes for any group.
--  3. admin_set_order_trello_state: the live function + email_sent_at as a fourth settable field (every other field is still refused).
--  4. admin_save_group: the live function (with the history lines) + no_team_copy (saved, and recorded in the History tab).
--  5. get_group_for_embed_key: the live function + no_team_copy in the answer the forms read on load.
-- The order trigger and the order insert are NOT changed. Built on the live texts pasted 2026-10-16 (and the admin_save_group run 2026-10-15).
-- Rollback: re-run the previous function texts (tests/fixtures/email-safety-net/live-step2-functions.2026-10-16.sql, tests/fixtures/admin-save-group-with-history.proposed.sql); the two columns can stay unused.
alter table public.orders add column if not exists email_sent_at timestamptz;
update public.orders set email_sent_at = created_at where email_sent_at is null;
alter table public.groups add column if not exists no_team_copy boolean not null default false;

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
    if v_key not in ('trello_card_ids', 'trello_client_list_id', 'trello_synced', 'trello_synced_at', 'email_sent_at') then
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
    trello_synced_at      = case when p_data ? 'trello_synced_at'      then nullif(p_data->>'trello_synced_at', '')::timestamptz else trello_synced_at end,
    email_sent_at         = case when p_data ? 'email_sent_at'         then nullif(p_data->>'email_sent_at', '')::timestamptz         else email_sent_at end
  where id = p_order_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_save_group(p_name text, p_pw text, p_group_id uuid, p_data jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_role text;
  v_id uuid;
  v_old jsonb;
  v_new jsonb;
  v_changes jsonb := '{}'::jsonb;
  v_key text;
  v_tracked constant text[] := array['name','io_slug','am_name','am_email','am_calendar_url','am_trello_handle','additional_card_trello_handle','additional_card_member_role',
    'brand_color','brand_color2','logo_url','logo_dark_bg','trello_board_id','from_name','from_email','io_recipient','has_koc','io_pricing','accounting_overrides','active',
    'digital_strategist_name','covering_strategist_name','social_strategist_id','web_strategist_id','hide_from_strategist','no_team_copy'];
begin
  v_role := admin_resolve_role(p_name, p_pw);

  if v_role is null then
    raise exception 'Invalid admin credentials';
  end if;

  if v_role = 'am' then
    p_data := p_data - 'io_pricing' - 'accounting_overrides';
  end if;

  if p_group_id is null then
    insert into groups (
      name, io_slug, am_name, am_email, am_calendar_url, am_trello_handle,
      additional_card_trello_handle, additional_card_member_role,
      brand_color, brand_color2, logo_url, logo_dark_bg, trello_board_id,
      from_name, from_email, io_recipient, has_koc, io_pricing, accounting_overrides,
      digital_strategist_name, covering_strategist_name, social_strategist_id, web_strategist_id, hide_from_strategist, no_team_copy
    ) values (
      p_data->>'name', p_data->>'io_slug', p_data->>'am_name', p_data->>'am_email',
      p_data->>'am_calendar_url', p_data->>'am_trello_handle',
      p_data->>'additional_card_trello_handle', p_data->>'additional_card_member_role',
      p_data->>'brand_color', p_data->>'brand_color2', p_data->>'logo_url',
      coalesce((p_data->>'logo_dark_bg')::boolean, false),
      p_data->>'trello_board_id', p_data->>'from_name', p_data->>'from_email',
      p_data->>'io_recipient', coalesce((p_data->>'has_koc')::boolean, true),
      case when p_data ? 'io_pricing' then p_data->'io_pricing' else null end,
      case when p_data ? 'accounting_overrides' then p_data->'accounting_overrides' else null end,
      p_data->>'digital_strategist_name', p_data->>'covering_strategist_name', (p_data->>'social_strategist_id')::uuid, (p_data->>'web_strategist_id')::uuid,
      coalesce((p_data->>'hide_from_strategist')::boolean, false), coalesce((p_data->>'no_team_copy')::boolean, false)
    )
    returning id into v_id;
    -- CHANGE HISTORY: a new group is recorded as created
    select to_jsonb(g) into v_new from groups g where g.id = v_id;
    insert into group_change_history (group_id, changed_by, action, changes)
    values (v_id, p_name, 'created', jsonb_build_object('name', jsonb_build_object('from', null, 'to', v_new->'name')));
  else
    -- CHANGE HISTORY: remember the row as it is before this save
    select to_jsonb(g) into v_old from groups g where g.id = p_group_id;
    update groups set
      name                  = case when p_data ? 'name' then p_data->>'name' else name end,
      io_slug               = case when p_data ? 'io_slug' then p_data->>'io_slug' else io_slug end,
      am_name               = case when p_data ? 'am_name' then p_data->>'am_name' else am_name end,
      am_email              = case when p_data ? 'am_email' then p_data->>'am_email' else am_email end,
      am_calendar_url       = case when p_data ? 'am_calendar_url' then p_data->>'am_calendar_url' else am_calendar_url end,
      am_trello_handle      = case when p_data ? 'am_trello_handle' then p_data->>'am_trello_handle' else am_trello_handle end,
      additional_card_trello_handle = case when p_data ? 'additional_card_trello_handle' then p_data->>'additional_card_trello_handle' else additional_card_trello_handle end,
      additional_card_member_role   = case when p_data ? 'additional_card_member_role' then p_data->>'additional_card_member_role' else additional_card_member_role end,
      brand_color           = case when p_data ? 'brand_color' then p_data->>'brand_color' else brand_color end,
      brand_color2          = case when p_data ? 'brand_color2' then p_data->>'brand_color2' else brand_color2 end,
      logo_url              = case when p_data ? 'logo_url' then p_data->>'logo_url' else logo_url end,
      logo_dark_bg          = case when p_data ? 'logo_dark_bg' then (p_data->>'logo_dark_bg')::boolean else logo_dark_bg end,
      trello_board_id       = case when p_data ? 'trello_board_id' then p_data->>'trello_board_id' else trello_board_id end,
      from_name             = case when p_data ? 'from_name' then p_data->>'from_name' else from_name end,
      from_email            = case when p_data ? 'from_email' then p_data->>'from_email' else from_email end,
      io_recipient          = case when p_data ? 'io_recipient' then p_data->>'io_recipient' else io_recipient end,
      has_koc               = coalesce((p_data->>'has_koc')::boolean, has_koc),
      io_pricing            = case when p_data ? 'io_pricing' then p_data->'io_pricing' else io_pricing end,
      accounting_overrides  = case when p_data ? 'accounting_overrides' then p_data->'accounting_overrides' else accounting_overrides end,
      active                = case when p_data ? 'active' then (p_data->>'active')::boolean else active end,
      digital_strategist_name = case when p_data ? 'digital_strategist_name' then p_data->>'digital_strategist_name' else digital_strategist_name end,
      covering_strategist_name = case when p_data ? 'covering_strategist_name' then p_data->>'covering_strategist_name' else covering_strategist_name end,
      social_strategist_id    = case when p_data ? 'social_strategist_id' then (p_data->>'social_strategist_id')::uuid else social_strategist_id end,
      web_strategist_id       = case when p_data ? 'web_strategist_id' then (p_data->>'web_strategist_id')::uuid else web_strategist_id end,
      hide_from_strategist    = case when p_data ? 'hide_from_strategist' then coalesce((p_data->>'hide_from_strategist')::boolean, false) else hide_from_strategist end,
      no_team_copy            = case when p_data ? 'no_team_copy' then coalesce((p_data->>'no_team_copy')::boolean, false) else no_team_copy end
    where id = p_group_id
    returning id into v_id;
    -- CHANGE HISTORY: record only the fields that REALLY changed (blank and empty count as the same; a save that changes nothing records nothing)
    if v_id is not null and v_old is not null then
      select to_jsonb(g) into v_new from groups g where g.id = v_id;
      foreach v_key in array v_tracked loop
        if jsonb_typeof(v_old->v_key) in ('object', 'array') or jsonb_typeof(v_new->v_key) in ('object', 'array') then
          if (v_old->v_key) is distinct from (v_new->v_key) then
            v_changes := v_changes || jsonb_build_object(v_key, jsonb_build_object('from', v_old->v_key, 'to', v_new->v_key));
          end if;
        elsif coalesce(v_old->>v_key, '') is distinct from coalesce(v_new->>v_key, '') then
          v_changes := v_changes || jsonb_build_object(v_key, jsonb_build_object('from', v_old->v_key, 'to', v_new->v_key));
        end if;
      end loop;
      if v_changes <> '{}'::jsonb then
        insert into group_change_history (group_id, changed_by, action, changes) values (v_id, p_name, 'updated', v_changes);
      end if;
    end if;
  end if;

  return v_id;
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
    'io_recipient', g.io_recipient, 'no_team_copy', g.no_team_copy
  )
  from groups g
  where g.id = v_group;
end;
$function$;
