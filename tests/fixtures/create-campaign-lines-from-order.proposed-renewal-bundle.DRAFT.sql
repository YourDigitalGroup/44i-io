CREATE OR REPLACE FUNCTION public.create_campaign_lines_from_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  item jsonb; split jsonb; month_budget jsonb; new_line_id uuid;
  v_tactic_label text; v_section text; v_recurring numeric; v_fee numeric;
  v_hosting_amt numeric; v_setup_fee_amt numeric; v_month date; v_flat_month date;
  v_flight_end_month date; v_split_month date; v_split_end_month date;
  v_is_modifier boolean; v_paired_tactic_id text; v_has_splits boolean;
  v_billing_type text; v_pricing_mode text; v_line_billing_type text;
  v_accounting_only boolean; v_county_id uuid; v_old_flight_end date;
  v_auto_split_labels jsonb; v_split_label text;
  v_tactic_variant_label text; v_existing_line_id uuid; v_existing_count int;
  v_hosting_start date; v_old_status text;
begin
  for item in select jsonb_array_elements(new.line_items) loop
    select section, coalesce(accounting_label, label) into v_section, v_tactic_label
    from services where id = item->>'service_id';
    v_month := date_trunc('month', coalesce((item->>'start_date')::date, new.campaign_start, now()))::date;
    v_has_splits := exists (select 1 from jsonb_array_elements(coalesce(new.agent_splits, '[]'::jsonb)) s where s->>'service_id' = item->>'service_id');
    if coalesce((item->>'spend')::numeric, 0) > 0 and not v_has_splits then
      select auto_split_labels into v_auto_split_labels from services where id = item->>'service_id';
      if v_auto_split_labels is not null and jsonb_array_length(v_auto_split_labels) > 0 then
        for v_split_label in select jsonb_array_elements_text(v_auto_split_labels) loop
          insert into campaign_lines (order_id, client_id, group_id, service_id, tactic_label, split_label, flight_start, flight_end, order_line_notes, billing_type, budget_entry_mode)
          values (new.id, new.client_id, new.group_id, item->>'service_id', coalesce(item->>'tactic_variant', v_tactic_label, item->>'label'), v_split_label, (item->>'start_date')::date, (item->>'end_date')::date, item->>'notes', 'spend', item->>'budget_mode');
        end loop;
      else
        v_tactic_variant_label := coalesce(item->>'tactic_variant', v_tactic_label, item->>'label');
        -- RENEWAL BUNDLE (A): an order from the IO form never renews an existing line any more -- it always starts a NEW one.
        -- Renewals happen through the Companion or an AM in Admin.
        insert into campaign_lines (order_id, client_id, group_id, service_id, tactic_label, flight_start, flight_end, order_line_notes, billing_type, budget_entry_mode)
        values (new.id, new.client_id, new.group_id, item->>'service_id', v_tactic_variant_label, (item->>'start_date')::date, (item->>'end_date')::date, item->>'notes', 'spend', item->>'budget_mode')
        returning id into new_line_id;
        if jsonb_typeof(item->'month_budgets') = 'array' and jsonb_array_length(item->'month_budgets') > 0 then
          update campaign_lines set budget_varies_by_month = true where id = new_line_id;
          for month_budget in select jsonb_array_elements(item->'month_budgets') loop
            if exists (select 1 from campaign_months where campaign_line_id = new_line_id and month = (month_budget->>'month' || '-01')::date) then
              update campaign_months set gross_budget = coalesce((month_budget->>'amount')::numeric, 0)
              where campaign_line_id = new_line_id and month = (month_budget->>'month' || '-01')::date;
            else
              insert into campaign_months (campaign_line_id, month, gross_budget)
              values (new_line_id, (month_budget->>'month' || '-01')::date, coalesce((month_budget->>'amount')::numeric, 0));
            end if;
          end loop;
        else
          v_flight_end_month := date_trunc('month', coalesce((item->>'end_date')::date, (item->>'start_date')::date, new.campaign_start, now()))::date;
          for v_flat_month in select generate_series(v_month, v_flight_end_month, interval '1 month')::date loop
            if exists (select 1 from campaign_months where campaign_line_id = new_line_id and month = v_flat_month) then
              update campaign_months set gross_budget = (item->>'spend')::numeric where campaign_line_id = new_line_id and month = v_flat_month;
            else
              insert into campaign_months (campaign_line_id, month, gross_budget) values (new_line_id, v_flat_month, (item->>'spend')::numeric);
            end if;
          end loop;
        end if;
      end if;
    end if;
    if v_section = 'seo' then
      insert into campaign_lines (order_id, client_id, group_id, service_id, tactic_label, flight_start, flight_end, order_line_notes)
      values
        (new.id, new.client_id, new.group_id, item->>'service_id', 'LLO (SEO)', (item->>'start_date')::date, (item->>'end_date')::date, item->>'notes'),
        (new.id, new.client_id, new.group_id, item->>'service_id', 'Rep Monitoring (SEO)', (item->>'start_date')::date, (item->>'end_date')::date, item->>'notes');
    end if;
    v_recurring := coalesce((item->>'recurring')::numeric, 0);
    v_fee := coalesce((item->>'fee')::numeric, 0);
    if coalesce((item->>'spend')::numeric, 0) = 0 and (v_recurring > 0 or v_fee > 0) and not v_has_splits then
      v_tactic_variant_label := coalesce(item->>'tactic_variant', v_tactic_label, item->>'label');
      -- RENEWAL BUNDLE (A): always a new line (see the spend branch above).
      insert into campaign_lines (order_id, client_id, group_id, service_id, tactic_label, flight_start, flight_end, order_line_notes, accounting_only, status, billing_type)
      values (new.id, new.client_id, new.group_id, item->>'service_id', v_tactic_variant_label, (item->>'start_date')::date, (item->>'end_date')::date, item->>'notes', true, 'active', case when v_recurring > 0 then 'recurring' else 'one_time' end)
      returning id into new_line_id;
      if exists (select 1 from campaign_months where campaign_line_id = new_line_id and month = v_month) then
        update campaign_months set gross_budget = case when v_recurring > 0 then v_recurring else v_fee end
        where campaign_line_id = new_line_id and month = v_month;
      else
        insert into campaign_months (campaign_line_id, month, gross_budget) values (new_line_id, v_month, case when v_recurring > 0 then v_recurring else v_fee end);
      end if;
    end if;
    v_hosting_amt := coalesce((item->>'prorated_hosting_amt')::numeric, 0);
    if v_hosting_amt > 0 then
      -- The proration belongs to the month HOSTING STARTS (the order line's hosting_start_date), not the website's start date.
      -- A missing or unreadable hosting_start_date falls back to the line's start date, exactly as before.
      v_hosting_start := null;
      begin
        v_hosting_start := nullif(btrim(item->>'hosting_start_date'), '')::date;
      exception when others then
        v_hosting_start := null;
      end;
      insert into campaign_lines (order_id, client_id, group_id, service_id, tactic_label, flight_start, flight_end, order_line_notes, accounting_only, status, billing_type)
      values (new.id, new.client_id, new.group_id, item->>'service_id', coalesce(item->>'tactic_variant', v_tactic_label, item->>'label') || ' — Hosting Proration', coalesce(v_hosting_start, (item->>'start_date')::date), (item->>'end_date')::date, item->>'notes', true, 'active', 'hosting_proration')
      returning id into new_line_id;
      insert into campaign_months (campaign_line_id, month, gross_budget) values (new_line_id, case when v_hosting_start is not null then date_trunc('month', v_hosting_start)::date else v_month end, v_hosting_amt);
    end if;
    v_setup_fee_amt := coalesce((item->>'setup_fee_amt')::numeric, 0);
    if v_setup_fee_amt > 0 then
      insert into campaign_lines (order_id, client_id, group_id, service_id, tactic_label, flight_start, flight_end, order_line_notes, accounting_only, status, billing_type)
      values (new.id, new.client_id, new.group_id, item->>'service_id', coalesce(item->>'tactic_variant', v_tactic_label, item->>'label') || ' — Setup Fee', (item->>'start_date')::date, (item->>'end_date')::date, item->>'notes', true, 'active', 'setup_fee')
      returning id into new_line_id;
      insert into campaign_months (campaign_line_id, month, gross_budget) values (new_line_id, v_month, v_setup_fee_amt);
    end if;
  end loop;
  for item in select jsonb_array_elements(new.line_items) loop
    select s.is_cpm_adjustment into v_is_modifier from services s where s.id = item->>'service_id';
    if v_is_modifier then
      for v_paired_tactic_id in select am.service_id from accounting_map am where am.pair_with_service_id = item->>'service_id' loop
        update campaign_lines set has_addl_targeting = case when v_paired_tactic_id = 'yttv-bp' then true else has_addl_targeting end, has_offline_visits = case when v_paired_tactic_id <> 'yttv-bp' then true else has_offline_visits end
        where order_id = new.id and service_id = v_paired_tactic_id;
      end loop;
    end if;
  end loop;
  for split in select jsonb_array_elements(coalesce(new.agent_splits, '[]'::jsonb)) loop
    select section, coalesce(accounting_label, label), billing_type, pricing_mode into v_section, v_tactic_label, v_billing_type, v_pricing_mode from services where id = split->>'service_id';
    if v_pricing_mode = 'spend' then v_accounting_only := false; v_line_billing_type := 'spend';
    else v_accounting_only := true; v_line_billing_type := case when v_billing_type = 'monthly' then 'recurring' else 'one_time' end;
    end if;
    select id into new_line_id from campaign_lines where client_id = new.client_id and service_id = split->>'service_id' and agent_name = split->>'agent_name' and county = split->>'county' limit 1;
    if new_line_id is null then
      insert into campaign_lines (order_id, client_id, group_id, service_id, tactic_label, flight_start, flight_end, agent_name, county, status, accounting_only, billing_type)
      values (new.id, new.client_id, new.group_id, split->>'service_id', coalesce(v_tactic_label, split->>'service_id'), (split->>'start_date')::date, (split->>'end_date')::date, split->>'agent_name', split->>'county', case when v_accounting_only then 'active' else 'pending' end, v_accounting_only, v_line_billing_type)
      returning id into new_line_id;
    else
      select flight_end, status into v_old_flight_end, v_old_status from campaign_lines where id = new_line_id;
      update campaign_lines set
        flight_end = coalesce((split->>'end_date')::date, flight_end),
        order_id = new.id,
        billing_type = coalesce(billing_type, v_line_billing_type),
        status = case when status in ('complete', 'cancelled', 'paused') and not v_accounting_only then 'pending' else status end,
        last_renewed_at = now(),
        last_renewed_previous_end_date = v_old_flight_end
      where id = new_line_id;
      -- RENEWAL BUNDLE (B): reviving a Complete / Cancelled / Paused agent line is a status change, so log it (Strategist reads this history).
      if v_old_status in ('complete', 'cancelled', 'paused') and not v_accounting_only then
        insert into campaign_status_history (campaign_line_id, old_status, new_status, reason, changed_by, changed_at)
        values (new_line_id, v_old_status, 'pending', 'Renewed by order', 'order form', now());
      end if;
    end if;
    v_month := date_trunc('month', coalesce((split->>'start_date')::date, new.campaign_start, now()))::date;
    v_split_end_month := date_trunc('month', coalesce((split->>'end_date')::date, (split->>'start_date')::date, new.campaign_start, now()))::date;
    for v_split_month in select generate_series(v_month, v_split_end_month, interval '1 month')::date loop
      if exists (select 1 from campaign_months where campaign_line_id = new_line_id and month = v_split_month) then
        update campaign_months set gross_budget = (split->>'amount')::numeric where campaign_line_id = new_line_id and month = v_split_month;
      else
        insert into campaign_months (campaign_line_id, month, gross_budget) values (new_line_id, v_split_month, (split->>'amount')::numeric);
      end if;
    end loop;
    v_county_id := null;
    if (split->>'is_new_county')::boolean and split->>'county' is not null then
      select id into v_county_id from counties where client_id = new.client_id and name = split->>'county';
      if v_county_id is null then insert into counties (client_id, name) values (new.client_id, split->>'county') returning id into v_county_id; end if;
    end if;
    if (split->>'is_new_agent')::boolean and split->>'agent_name' is not null then
      if not exists (select 1 from agents where client_id = new.client_id and name = split->>'agent_name') then insert into agents (client_id, county_id, name) values (new.client_id, v_county_id, split->>'agent_name'); end if;
    end if;
  end loop;
  return new;
end;
$function$
