CREATE OR REPLACE FUNCTION public.admin_save_group(p_name text, p_pw text, p_group_id uuid, p_data jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_role text;
  v_id uuid;
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
  else
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
  end if;

  return v_id;
end;
$function$
