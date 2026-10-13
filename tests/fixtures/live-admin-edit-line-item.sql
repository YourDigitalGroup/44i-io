-- FIXTURE (2026-10-14): the LIVE admin_edit_order_line_item as Claire pasted it, with the month_budgets / module_names / budget_mode branches replaced by `null;` (this fixture is only used
-- to test the generic branch: qty, recurring, fee, spend, dates, variant). If the real function changes, paste the new text here (keep the stubs) and re-run the tests.
CREATE OR REPLACE FUNCTION public.admin_edit_order_line_item(p_name text, p_pw text, p_order_id uuid, p_service_id text, p_field text, p_new_value text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_role text;
  v_idx int;
  v_old_value text;
  v_line_items jsonb;
  v_new_avg numeric;
  v_month_budget jsonb;
begin
  v_role := admin_resolve_role(p_name, p_pw);
  if v_role is null then raise exception 'Invalid admin credentials'; end if;

  if p_field not in ('recurring', 'spend', 'fee', 'start_date', 'end_date', 'notes', 'month_budgets', 'tactic_variant', 'module_names', 'qty', 'budget_mode') then
    raise exception 'Field % is not editable', p_field;
  end if;

  select line_items into v_line_items from orders where id = p_order_id;
  if v_line_items is null then raise exception 'Order % not found', p_order_id; end if;

  select (t.pos - 1) into v_idx
  from jsonb_array_elements(v_line_items) with ordinality as t(item, pos)
  where t.item->>'service_id' = p_service_id
  limit 1;

  if v_idx is null then raise exception 'Service % not found on this order', p_service_id; end if;

  v_old_value := v_line_items -> v_idx ->> p_field;

  if p_field = 'month_budgets' then
    null;
  elsif p_field = 'module_names' then
    null;
  elsif p_field = 'budget_mode' then
    null;
  else
    update orders set
      line_items = jsonb_set(
        line_items,
        array[v_idx::text, p_field],
        case when p_field in ('recurring','spend','fee','qty') then to_jsonb(p_new_value::numeric) else to_jsonb(p_new_value) end
      ),
      is_revised = true,
      edit_history = coalesce(edit_history, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
        'service_id', p_service_id, 'field', p_field, 'old_value', v_old_value, 'new_value', p_new_value,
        'edited_by', p_name, 'edited_at', now()
      ))
    where id = p_order_id;

    if p_field in ('fee', 'recurring') then
      update campaign_months set gross_budget = p_new_value::numeric
      where campaign_line_id in (
        select id from campaign_lines
        where order_id = p_order_id and service_id = p_service_id
          and billing_type in ('recurring', 'one_time')
      );
    elsif p_field = 'spend' then
      update campaign_months set gross_budget = p_new_value::numeric
      where campaign_line_id in (
        select id from campaign_lines
        where order_id = p_order_id and service_id = p_service_id and billing_type = 'spend'
      );
    elsif p_field = 'start_date' then
      update campaign_lines set flight_start = p_new_value::date
      where order_id = p_order_id and service_id = p_service_id
        and billing_type not in ('hosting_proration', 'setup_fee');
    elsif p_field = 'end_date' then
      update campaign_lines set flight_end = p_new_value::date
      where order_id = p_order_id and service_id = p_service_id
        and billing_type not in ('hosting_proration', 'setup_fee');
    elsif p_field = 'tactic_variant' then
      update campaign_lines set tactic_label = p_new_value
      where order_id = p_order_id and service_id = p_service_id
        and billing_type not in ('hosting_proration', 'setup_fee');
    end if;
  end if;
end;
$function$;
