-- ROLLBACK COPY: admin_correct_order_service exactly as it was live on 2026-10-14 (yearly fees fell through to a one-time fee).
-- Run this only to undo the yearly-fee fix. Order-correction function only; does not touch the submission path.
CREATE OR REPLACE FUNCTION public.admin_correct_order_service(p_name text, p_pw text, p_order_id uuid, p_old_service_id text, p_new_service_id text, p_qty numeric, p_unit_amount numeric, p_start_date date, p_end_date date, p_tactic_variant text, p_notes text, p_reason text, p_confirmed boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_role text;
  v_client_id uuid; v_group_id uuid; v_items jsonb; v_splits jsonb; v_campaign_start date;
  v_idx int; v_old_item jsonb;
  o_label text; o_section text; o_cpm boolean; o_autosplit jsonb; o_setup boolean; o_hosting text; o_acct text;
  n_label text; n_acct text; n_section text; n_workflow text; n_billing text; n_pricing text; n_koc text;
  n_cpm boolean; n_autosplit jsonb; n_setup boolean; n_hosting text; n_variants jsonb; n_active boolean;
  v_model text; v_qty numeric; v_item jsonb; v_tactic_label text;
  v_old_line_ids uuid[]; v_bad int; v_removed int;
  v_month date; v_end_month date; v_m date; v_new_line_id uuid; v_existing int;
  v_recurring numeric; v_fee numeric; v_spend numeric; v_closed date;
  v_old_desc text; v_new_desc text;
begin
  v_role := admin_resolve_role(p_name, p_pw);
  if v_role is null then raise exception 'Invalid admin credentials'; end if;
  if v_role not in ('am', 'super') then
    raise exception 'Only account managers and super admins can correct a service';
  end if;
  if not coalesce(p_confirmed, false) then
    raise exception 'Please confirm the correct service with the AE before correcting it';
  end if;
  if p_reason is null or length(trim(p_reason)) < 3 then
    raise exception 'A reason is required (for example: AE selected the wrong service)';
  end if;
  if p_start_date is null then raise exception 'A start date is required'; end if;
  if p_end_date is not null and p_end_date < p_start_date then
    raise exception 'The end date cannot be before the start date';
  end if;
  v_qty := coalesce(p_qty, 1);
  if v_qty <= 0 then raise exception 'Quantity must be greater than zero'; end if;
  if p_unit_amount is null or p_unit_amount <= 0 then
    raise exception 'An amount greater than zero is required';
  end if;
  if p_old_service_id = p_new_service_id then
    raise exception 'The replacement is the same service';
  end if;

  select client_id, group_id, line_items, agent_splits, campaign_start
    into v_client_id, v_group_id, v_items, v_splits, v_campaign_start
  from orders where id = p_order_id;
  if v_items is null then raise exception 'Order % not found', p_order_id; end if;
  if v_client_id is null then raise exception 'This order has no client record, so it cannot be corrected here'; end if;

  select (t.pos - 1), t.item into v_idx, v_old_item
  from jsonb_array_elements(v_items) with ordinality as t(item, pos)
  where t.item->>'service_id' = p_old_service_id
  limit 1;
  if v_idx is null then raise exception 'The service being replaced is not on this order'; end if;

  if exists (select 1 from jsonb_array_elements(v_items) t(item) where t.item->>'service_id' = p_new_service_id) then
    raise exception 'The replacement service is already on this order';
  end if;

  if exists (select 1 from jsonb_array_elements(coalesce(v_splits, '[]'::jsonb)) s
             where s->>'service_id' in (p_old_service_id, p_new_service_id)) then
    raise exception 'This order splits that service by agent and county, which Correct Service does not handle yet. Use Cancel and a new IO instead';
  end if;

  select label, accounting_label, section, coalesce(is_cpm_adjustment, false), to_jsonb(auto_split_labels),
         coalesce(auto_add_setup_fee, false), hosting_prompt_type
    into o_label, o_acct, o_section, o_cpm, o_autosplit, o_setup, o_hosting
  from services where id = p_old_service_id;
  o_label := coalesce(o_acct, o_label, v_old_item->>'label', p_old_service_id);

  select label, accounting_label, section, workflow, billing_type, pricing_mode, koc_requirement,
         coalesce(is_cpm_adjustment, false), to_jsonb(auto_split_labels), coalesce(auto_add_setup_fee, false),
         hosting_prompt_type, to_jsonb(tactic_variants), coalesce(active, true)
    into n_label, n_acct, n_section, n_workflow, n_billing, n_pricing, n_koc,
         n_cpm, n_autosplit, n_setup, n_hosting, n_variants, n_active
  from services where id = p_new_service_id;
  if n_label is null then raise exception 'The replacement service was not found in the catalog'; end if;
  if not n_active then raise exception 'The replacement service is not active in the catalog'; end if;

  if o_section = 'seo' or n_section = 'seo' then
    raise exception 'SEO services build several placeholder lines, which Correct Service does not handle yet. Use Cancel and a new IO instead';
  end if;
  if o_cpm or n_cpm then
    raise exception 'Add-on modifiers (like Offline Visits Tracking) cannot be corrected here. Use Cancel and a new IO instead';
  end if;
  if (o_autosplit is not null and jsonb_typeof(o_autosplit) = 'array' and jsonb_array_length(o_autosplit) > 0)
     or (n_autosplit is not null and jsonb_typeof(n_autosplit) = 'array' and jsonb_array_length(n_autosplit) > 0) then
    raise exception 'That service is split into several campaign lines automatically, which Correct Service does not handle yet. Use Cancel and a new IO instead';
  end if;
  if o_setup or n_setup
     or coalesce((v_old_item->>'setup_fee_amt')::numeric, 0) > 0 then
    raise exception 'That service carries a setup fee, which Correct Service does not handle yet. Use Cancel and a new IO instead';
  end if;
  if o_hosting is not null or n_hosting is not null
     or coalesce((v_old_item->>'prorated_hosting_amt')::numeric, 0) > 0 then
    raise exception 'That service involves hosting, which Correct Service does not handle yet. Use Cancel and a new IO instead';
  end if;

  if n_variants is not null and jsonb_typeof(n_variants) = 'array' and jsonb_array_length(n_variants) > 0 then
    if nullif(trim(coalesce(p_tactic_variant, '')), '') is null then
      raise exception 'Pick which variant of % this is', n_label;
    end if;
    if not exists (select 1 from jsonb_array_elements_text(n_variants) v where v = p_tactic_variant) then
      raise exception 'That variant is not one of the options for %', n_label;
    end if;
  elsif nullif(trim(coalesce(p_tactic_variant, '')), '') is not null then
    raise exception '% has no variants to pick from', n_label;
  end if;

  v_model := case when n_pricing = 'spend' then 'spend'
                  when n_billing = 'monthly' then 'recurring'
                  else 'fee' end;
  v_spend     := case when v_model = 'spend'     then p_unit_amount else 0 end;
  v_recurring := case when v_model = 'recurring' then p_unit_amount * v_qty else 0 end;
  v_fee       := case when v_model = 'fee'       then p_unit_amount * v_qty else 0 end;
  v_tactic_label := coalesce(nullif(trim(coalesce(p_tactic_variant, '')), ''), n_acct, n_label);

  select array_agg(id) into v_old_line_ids
  from campaign_lines where order_id = p_order_id and service_id = p_old_service_id;

  if v_old_line_ids is not null then
    if exists (select 1 from campaign_lines where id = any(v_old_line_ids) and coalesce(status, 'active') not in ('active', 'pending')) then
      raise exception 'That service is already complete or cancelled. Use Cancel or Renew instead';
    end if;
    if exists (select 1 from campaign_lines where id = any(v_old_line_ids) and last_renewed_at is not null) then
      raise exception 'A renewal already extended that service, so it is not just this order''s line. Use Cancel instead';
    end if;
    select count(*) into v_bad from campaign_months cm
    where cm.campaign_line_id = any(v_old_line_ids)
      and (cm.actual_spend is not null or cm.actual_clicks is not null or cm.actual_impressions is not null
           or cm.actual_conversions is not null or cm.actual_total_visits is not null
           or cm.in_platform_override is not null or cm.goal_override is not null
           or coalesce(cm.paused, false) or cm.confirmed_by is not null or cm.confirmed_at is not null);
    if v_bad > 0 then
      raise exception 'Someone has already recorded results or made changes on that service''s months. Use Cancel instead';
    end if;
    if exists (select 1 from campaign_status_history where campaign_line_id = any(v_old_line_ids))
       or exists (select 1 from campaign_optimize_log where campaign_line_id = any(v_old_line_ids))
       or exists (select 1 from pending_requests where campaign_line_id = any(v_old_line_ids)) then
      raise exception 'A strategist has already started work on that service (status changes, log entries, or requests exist). Use Cancel instead';
    end if;
    select m into v_closed from (
      select cm.month as m from campaign_months cm where cm.campaign_line_id = any(v_old_line_ids)
      union select date_trunc('month', p_start_date)::date
    ) months
    where exists (select 1 from accounting_month_close c where c.month = months.m)
    limit 1;
    if v_closed is not null then
      raise exception 'Accounting has closed %. A correction would change a closed month', to_char(v_closed, 'Mon YYYY');
    end if;
  else
    select m into v_closed from (select date_trunc('month', p_start_date)::date as m) months
    where exists (select 1 from accounting_month_close c where c.month = months.m);
    if v_closed is not null then
      raise exception 'Accounting has closed %. A correction would change a closed month', to_char(v_closed, 'Mon YYYY');
    end if;
  end if;

  select count(*) into v_existing from campaign_lines
  where client_id = v_client_id and service_id = p_new_service_id and tactic_label = v_tactic_label
    and status = 'active' and coalesce(accounting_only, false) = (v_model <> 'spend')
    and (v_old_line_ids is null or not (id = any(v_old_line_ids)));
  if v_existing = 1 then
    raise exception 'This client already has % running. That looks like a renewal: use Renew on the existing campaign instead', v_tactic_label;
  end if;

  v_item := jsonb_build_object(
    'service_id', p_new_service_id,
    'label', n_label,
    'accounting_label', n_acct,
    'section', n_section,
    'fee', v_fee,
    'recurring', v_recurring,
    'spend', v_spend,
    'qty', v_qty,
    'unit_fee', case when v_model = 'fee' then p_unit_amount else 0 end,
    'setup_fee_amt', null,
    'notes', coalesce(p_notes, ''),
    'tactic_variant', nullif(trim(coalesce(p_tactic_variant, '')), ''),
    'module_names', null,
    'workflow', n_workflow,
    'requires_koc', coalesce(n_koc, 'none') = 'required',
    'hosting_choice', null, 'hosting_package', null, 'prorated_hosting_amt', null,
    'hosting_fee', null, 'hosting_start_date', null,
    'start_date', p_start_date,
    'end_date', p_end_date,
    'month_budgets', null,
    'budget_mode', case when v_model = 'spend' then 'monthly' else null end
  );

  v_removed := coalesce(array_length(v_old_line_ids, 1), 0);
  if v_removed > 0 then
    delete from campaign_months where campaign_line_id = any(v_old_line_ids);
    delete from campaign_lines where id = any(v_old_line_ids);
  end if;

  v_month := date_trunc('month', coalesce(p_start_date, v_campaign_start, now()))::date;
  if v_model = 'spend' then
    insert into campaign_lines (order_id, client_id, group_id, service_id, tactic_label, flight_start, flight_end, order_line_notes, billing_type, budget_entry_mode)
    values (p_order_id, v_client_id, v_group_id, p_new_service_id, v_tactic_label, p_start_date, p_end_date, p_notes, 'spend', 'monthly')
    returning id into v_new_line_id;
    v_end_month := date_trunc('month', coalesce(p_end_date, p_start_date, v_campaign_start, now()))::date;
    for v_m in select generate_series(v_month, v_end_month, interval '1 month')::date loop
      insert into campaign_months (campaign_line_id, month, gross_budget) values (v_new_line_id, v_m, v_spend);
    end loop;
  else
    insert into campaign_lines (order_id, client_id, group_id, service_id, tactic_label, flight_start, flight_end, order_line_notes, accounting_only, status, billing_type)
    values (p_order_id, v_client_id, v_group_id, p_new_service_id, v_tactic_label, p_start_date, p_end_date, p_notes, true, 'active',
            case when v_recurring > 0 then 'recurring' else 'one_time' end)
    returning id into v_new_line_id;
    insert into campaign_months (campaign_line_id, month, gross_budget)
    values (v_new_line_id, v_month, case when v_recurring > 0 then v_recurring else v_fee end);
  end if;

  v_old_desc := coalesce(nullif(trim(coalesce(v_old_item->>'tactic_variant', '')), ''), o_label);
  update orders set
    line_items = jsonb_set(v_items, array[v_idx::text], v_item),
    is_revised = true,
    edit_history = coalesce(edit_history, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
      'service_id', p_new_service_id,
      'field', 'service_correction',
      'old_value', null,
      'new_value', jsonb_build_object(
        'old_service_id', p_old_service_id, 'old_label', v_old_desc,
        'new_service_id', p_new_service_id, 'new_label', v_tactic_label,
        'qty', v_qty, 'unit_amount', p_unit_amount, 'model', v_model,
        'old_total', coalesce((v_old_item->>'fee')::numeric, 0) + coalesce((v_old_item->>'recurring')::numeric, 0) + coalesce((v_old_item->>'spend')::numeric, 0),
        'new_total', v_fee + v_recurring + v_spend,
        'reason', trim(p_reason), 'confirmed_by', p_name
      )::text,
      'edited_by', p_name,
      'edited_at', now()
    ))
  where id = p_order_id;

  return jsonb_build_object(
    'old_label', v_old_desc, 'new_label', v_tactic_label, 'new_service_id', p_new_service_id,
    'model', v_model, 'new_line_id', v_new_line_id, 'removed_lines', v_removed,
    'new_item', v_item
  );
end;
$function$;
