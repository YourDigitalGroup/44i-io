-- DOES NOT TOUCH THE SUBMISSION PATH. Group change history (admin only). ONE block, run as a whole:
--  1. a new table `group_change_history` (not readable by the public site: row-level security on, no policies);
--  2. `admin_save_group` -- the live function with ONLY the history lines added (same signature, same saving behaviour, same permissions);
--  3. a new read function `admin_get_group_history` (login required) that Admin's group editor History tab calls.
-- Rollback: re-run tests/fixtures/live-admin-save-group.2026-10-15.sql (the previous live function). The table can stay.
create table if not exists public.group_change_history (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null,
  changed_at timestamptz not null default now(),
  changed_by text,
  action text not null,
  changes jsonb not null default '{}'::jsonb
);
create index if not exists group_change_history_group_idx on public.group_change_history (group_id, changed_at desc);
alter table public.group_change_history enable row level security;

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
    'digital_strategist_name','covering_strategist_name','social_strategist_id','web_strategist_id','hide_from_strategist'];
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
      digital_strategist_name, covering_strategist_name, social_strategist_id, web_strategist_id, hide_from_strategist
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
      coalesce((p_data->>'hide_from_strategist')::boolean, false)
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
      hide_from_strategist    = case when p_data ? 'hide_from_strategist' then coalesce((p_data->>'hide_from_strategist')::boolean, false) else hide_from_strategist end
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

CREATE OR REPLACE FUNCTION public.admin_get_group_history(p_name text, p_pw text, p_group_id uuid, p_limit integer DEFAULT 100)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_role text;
begin
  v_role := admin_resolve_role(p_name, p_pw);
  if v_role is null then raise exception 'Invalid admin credentials'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('changed_at', h.changed_at, 'changed_by', h.changed_by, 'action', h.action, 'changes', h.changes) order by h.changed_at desc, h.id)
    from (select * from public.group_change_history where group_id = p_group_id order by changed_at desc, id limit greatest(1, least(coalesce(p_limit, 100), 500))) h
  ), '[]'::jsonb);
end;
$function$;
