-- DOES NOT TOUCH THE SUBMISSION PATH. Data clean-up only: removes the two wrong "SEM — Setup Fee" lines of the client "MS Farm Bureau Agents"
-- (that client has no setup fee). Stops WITHOUT changing anything unless the data is exactly as expected. Backs up first. One transaction.
do $$
declare
  v_client uuid; v_ids uuid[]; v_n int; v_cnt int; v_other record; v_bad text;
  c_lines constant text := 'campaign_lines_msfarm_setupfee_backup_20261015';
  c_months constant text := 'campaign_months_msfarm_setupfee_backup_20261015';
  c_known constant uuid := '436bc626-cdf7-45ca-bcd8-db6ef7b86a0a';   -- the Oct 9 line (Lance Wedgeworth) found earlier
begin
  -- 1. exactly one client with that name
  select count(*), min(id::text)::uuid into v_n, v_client from clients where lower(btrim(name)) = 'ms farm bureau agents';
  if v_n <> 1 then raise exception 'STOPPED, nothing changed: expected exactly 1 client named "MS Farm Bureau Agents", found %', v_n; end if;
  -- 2. exactly two setup-fee lines for it, both shaped like the ones we found
  select array_agg(id order by id), count(*) into v_ids, v_n from campaign_lines where client_id = v_client and billing_type = 'setup_fee';
  if v_n <> 2 then raise exception 'STOPPED, nothing changed: expected exactly 2 setup-fee lines for this client, found %', v_n; end if;
  if not (c_known = any(v_ids)) then raise exception 'STOPPED, nothing changed: the known Oct 9 setup-fee line (%) is not one of the two found', c_known; end if;
  select count(*) into v_n from campaign_lines where id = any(v_ids) and coalesce(accounting_only, false) = true and status = 'active' and tactic_label like '% — Setup Fee';
  if v_n <> 2 then raise exception 'STOPPED, nothing changed: the two lines are not both active, accounting-only "— Setup Fee" lines'; end if;
  -- 3. exactly one month row each, $200
  select count(*) into v_n from (select campaign_line_id from campaign_months where campaign_line_id = any(v_ids) group by campaign_line_id having count(*) = 1 and max(gross_budget) = 200 and min(gross_budget) = 200) x;
  if v_n <> 2 then raise exception 'STOPPED, nothing changed: each line must have exactly one month row of $200'; end if;
  -- 4. nothing else points at these lines (any table with a campaign_line_id column other than campaign_months, e.g. status history)
  for v_other in select table_name, column_name from information_schema.columns where table_schema = 'public' and column_name = 'campaign_line_id' and table_name <> 'campaign_months'
                   and table_name not in (select relname from pg_class where relkind in ('v', 'm')) loop
    execute format('select count(*) from public.%I where %I = any($1)', v_other.table_name, v_other.column_name) into v_cnt using v_ids;
    if v_cnt > 0 then raise exception 'STOPPED, nothing changed: % row(s) in "%" point at these lines', v_cnt, v_other.table_name; end if;
  end loop;
  -- 5. no delete-triggers on the two tables that could do something unexpected
  select string_agg(tgname, ', ') into v_bad from pg_trigger where tgrelid in ('public.campaign_lines'::regclass, 'public.campaign_months'::regclass) and not tgisinternal and (tgtype & 8) <> 0;
  if v_bad is not null then raise exception 'STOPPED, nothing changed: delete triggers exist (%)', v_bad; end if;
  -- 6. backups must not already exist
  if to_regclass('public.' || c_lines) is not null or to_regclass('public.' || c_months) is not null then raise exception 'STOPPED, nothing changed: the backup tables already exist'; end if;

  -- do it
  execute format('create table public.%I as select * from public.campaign_lines where id = any($1)', c_lines) using v_ids;
  execute format('create table public.%I as select * from public.campaign_months where campaign_line_id = any($1)', c_months) using v_ids;
  execute format('alter table public.%I enable row level security', c_lines);
  execute format('alter table public.%I enable row level security', c_months);
  delete from campaign_months where campaign_line_id = any(v_ids);
  delete from campaign_lines where id = any(v_ids);

  -- verify
  select count(*) into v_n from campaign_lines where id = any(v_ids);
  if v_n <> 0 then raise exception 'VERIFY FAILED: % line(s) still there (everything is rolled back)', v_n; end if;
  execute format('select count(*) from public.%I', c_lines) into v_n;
  execute format('select count(*) from public.%I', c_months) into v_cnt;
  if v_n <> 2 or v_cnt <> 2 then raise exception 'VERIFY FAILED: backups hold % line(s) and % month row(s), expected 2 and 2 (everything is rolled back)', v_n, v_cnt; end if;
  raise notice 'DONE: removed 2 setup-fee lines (and their 2 month rows) for MS Farm Bureau Agents. Backups: % and %.', c_lines, c_months;
end $$;
