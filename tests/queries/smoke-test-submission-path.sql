-- DOES NOT KEEP ANYTHING: it clones the newest real order inside a transaction, lets the order trigger run for real, reports what it did, and then CANCELS ITSELF on purpose
-- (you will see a red "SMOKE TEST ..." message; that is the normal way this finishes). Run it right after any SQL that touches the submission path.
--   Message starts "SMOKE TEST PASSED"  -> the order trigger still works; nothing was saved.
--   Any other message                   -> something is wrong: do not leave it; tell Claude the exact text.
do $smoke$
declare
  v_src orders%rowtype;
  v_new uuid := gen_random_uuid();
  v_src_lines int; v_lines int; v_months int;
begin
  select o.* into v_src from orders o where exists (select 1 from campaign_lines l where l.order_id = o.id) order by o.created_at desc limit 1;
  if v_src.id is null then raise exception 'SMOKE TEST COULD NOT RUN: no real order with campaign lines to copy'; end if;
  select count(*) into v_src_lines from campaign_lines where order_id = v_src.id;

  create temp table smoke_order on commit drop as select * from orders where id = v_src.id;
  update smoke_order set id = v_new, created_at = now();
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'orders' and column_name = 'io_number') then
    execute format('update smoke_order set io_number = %L', 'SMOKE-' || substr(v_new::text, 1, 8));
  end if;

  insert into orders select * from smoke_order;   -- the order trigger fires here, exactly as for a real submission

  select count(*) into v_lines from campaign_lines where order_id = v_new;
  select count(*) into v_months from campaign_months m where m.campaign_line_id in (select id from campaign_lines where order_id = v_new);
  if v_lines = 0 then
    raise exception 'SMOKE TEST FAILED: the copy of the order produced NO campaign lines (the original produced %). Nothing was saved.', v_src_lines;
  end if;
  raise exception 'SMOKE TEST PASSED (nothing was saved): the order trigger fired and made % campaign line(s) and % month row(s) for the copy; the original order has % line(s).', v_lines, v_months, v_src_lines;
end
$smoke$;
