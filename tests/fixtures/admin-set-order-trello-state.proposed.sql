-- DOES NOT TOUCH THE SUBMISSION PATH. New admin-only function (nothing existing is changed, the order trigger and the order insert are not touched).
-- Lets a logged-in AM/super record the result of "Retry Trello" on ONE order: the anonymous key can only update orders created in the last 2 hours,
-- so Admin cannot do this with a plain update for an older order. Only the four Trello fields can be set; anything else is refused.
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
