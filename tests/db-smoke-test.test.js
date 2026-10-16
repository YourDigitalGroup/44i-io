// The rebuilt smoke test (tests/queries/smoke-test-submission-path.sql) against the LIVE order trigger text in a throwaway Postgres: passes on a healthy trigger, FAILS loudly on a broken one,
// and in both cases leaves no trace (every row it made is rolled back).
const { check, done } = require('./lib'); const fs = require('fs'), path = require('path');
let PGlite; try { ({ PGlite } = require('@electric-sql/pglite')); } catch (e) { console.log('SKIPPED (@electric-sql/pglite is not installed)'); process.exit(0); }
const F = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
const SCHEMA = `create schema if not exists extensions;
 create table services(id text primary key, section text, label text, accounting_label text, billing_type text, pricing_mode text, auto_split_labels jsonb, is_cpm_adjustment boolean default false);
 create table orders(id uuid primary key default gen_random_uuid(), client_id uuid, group_id uuid, campaign_start date, line_items jsonb, agent_splits jsonb, created_at timestamptz default now(), io_number text unique);
 create table campaign_lines(id uuid primary key default gen_random_uuid(), order_id uuid, client_id uuid, group_id uuid, service_id text, tactic_label text, split_label text, flight_start date, flight_end date,
   order_line_notes text, billing_type text, budget_entry_mode text, status text default 'pending', accounting_only boolean default false, agent_name text, county text, has_addl_targeting boolean default false,
   has_offline_visits boolean default false, budget_varies_by_month boolean default false, last_renewed_at timestamptz, last_renewed_previous_end_date date);
 create table campaign_months(id uuid primary key default gen_random_uuid(), campaign_line_id uuid, month date, gross_budget numeric);
 create table accounting_map(service_id text, pair_with_service_id text); create table counties(id uuid primary key default gen_random_uuid(), client_id uuid, name text);
 create table agents(id uuid primary key default gen_random_uuid(), client_id uuid, county_id uuid, name text);
 create table campaign_status_history(id uuid primary key default gen_random_uuid(), campaign_line_id uuid, old_status text, new_status text, reason text, changed_by text, changed_at timestamptz default now());
 insert into services values ('fb-bp','social','Facebook','Facebook Ads','monthly','spend',null,false);`;
const mk = async () => { const db = new PGlite(); await db.exec(SCHEMA); await db.exec(F('fixtures/live-create-campaign-lines-from-order.as-pasted-2026-10-12.sql'));
  await db.exec('create trigger trg_create_campaign_lines after insert on public.orders for each row execute function create_campaign_lines_from_order()');
  await db.exec(`insert into orders(client_id, group_id, campaign_start, line_items, io_number, created_at) values ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '2026-09-01', '[{"service_id":"fb-bp","spend":500,"start_date":"2026-09-01","end_date":"2026-11-30","label":"fb-bp"}]', 'IO-REAL-1', now() - interval '3 days')`); return db; };
const run = async (db) => { try { await db.exec(F('queries/smoke-test-submission-path.sql')); return 'NO MESSAGE'; } catch (e) { return e.message; } };
const counts = async db => { const q = async t => (await db.query(`select count(*)::int n from ${t}`)).rows[0].n; return [await q('orders'), await q('campaign_lines'), await q('campaign_months')]; };
(async () => {
  let db = await mk(); await db.exec(`select 1`); const real = await db.query('select id from orders limit 1');
  // give the real order its lines the way a real submission would (clone it once through the trigger, committed) so the smoke test has a real order with lines to copy
  await db.exec(`update orders set io_number = io_number`); await db.exec(`delete from orders`);
  await db.exec(`insert into orders(client_id, group_id, campaign_start, line_items, io_number, created_at) values ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '2026-09-01', '[{"service_id":"fb-bp","spend":500,"start_date":"2026-09-01","end_date":"2026-11-30","label":"fb-bp"}]', 'IO-REAL-1', now() - interval '3 days')`);
  const before = await counts(db), msg = await run(db), after = await counts(db);
  check('healthy trigger: the message says PASSED and reports the lines it made', [/^SMOKE TEST PASSED/.test(msg), /made [1-9]\d* campaign line/.test(msg)], [true, true]);
  check('...and it leaves NO trace: the same number of orders, lines and month rows afterwards', after, before);
  // a broken trigger: the same function but one column name wrong (the 2026-09-24 kind of mistake)
  const bad = await mk(); await bad.exec(F('fixtures/live-create-campaign-lines-from-order.as-pasted-2026-10-12.sql').replace(/split_label/g, 'split_labelx'));
  const bBefore = (await counts(bad)).join(), bmsg = await run(bad);
  check('broken trigger (a wrong column name): the smoke test does NOT say PASSED, it shows the real error, and still leaves no trace', [/^SMOKE TEST PASSED/.test(bmsg), /split_labelx|column/.test(bmsg), (await counts(bad)).join() === bBefore], [false, true, true]);
  // a trigger that silently makes nothing
  const quiet = await mk(); await quiet.exec('drop trigger trg_create_campaign_lines on public.orders');
  const qmsg = await run(quiet);
  check('trigger missing (orders save but no lines appear): the message says FAILED, not PASSED', [/^SMOKE TEST FAILED|COULD NOT RUN/.test(qmsg)], [true]);
  done();
})();
