// Email safety net STEP 2 SQL (draft, not live): the new columns, the backfill, and the three re-created functions, run in a real Postgres (pglite) on the LIVE function texts
// (pasted 2026-10-16 / run 2026-10-15). Proves: nothing existing changes, the new field works for the right people only, the order trigger still writes identical lines.
const { check, done } = require('./lib'); const fs = require('fs'), path = require('path');
let PGlite; try { ({ PGlite } = require('@electric-sql/pglite')); } catch (e) { console.log('SKIPPED (@electric-sql/pglite is not installed)'); process.exit(0); }
const F = (f, d = 'fixtures') => fs.readFileSync(path.join(__dirname, d, f), 'utf8'), E = f => F(f, 'fixtures/email-safety-net');
const canon = v => JSON.stringify(v, (k, x) => x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort()) : x);
const CLIENT = 'c0000000-0000-0000-0000-000000000001', GROUP = 'a0000000-0000-0000-0000-000000000001';
const SCHEMA = `create schema if not exists extensions;
 create table services(id text primary key, section text, label text, accounting_label text, billing_type text, pricing_mode text, auto_split_labels jsonb, is_cpm_adjustment boolean default false);
 create table clients(id uuid primary key, name text, hidden boolean default false, group_id uuid);
 create table orders(id uuid primary key default gen_random_uuid(), client_id uuid, group_id uuid, campaign_start date, line_items jsonb, agent_splits jsonb, created_at timestamptz default now(),
   trello_card_ids jsonb, trello_client_list_id text, trello_synced boolean, trello_synced_at timestamptz);
 create table campaign_lines(id uuid primary key default gen_random_uuid(), order_id uuid, client_id uuid, group_id uuid, service_id text, tactic_label text, split_label text, flight_start date, flight_end date,
   order_line_notes text, billing_type text, budget_entry_mode text, status text default 'pending', accounting_only boolean default false, agent_name text, county text, has_addl_targeting boolean default false,
   has_offline_visits boolean default false, budget_varies_by_month boolean default false, last_renewed_at timestamptz, last_renewed_previous_end_date date);
 create table campaign_months(id uuid primary key default gen_random_uuid(), campaign_line_id uuid, month date, gross_budget numeric);
 create table accounting_map(service_id text, pair_with_service_id text); create table counties(id uuid primary key default gen_random_uuid(), client_id uuid, name text);
 create table agents(id uuid primary key default gen_random_uuid(), client_id uuid, county_id uuid, name text);
 create table campaign_status_history(id uuid primary key default gen_random_uuid(), campaign_line_id uuid, old_status text, new_status text, reason text, changed_by text, changed_at timestamptz default now());
 insert into services values ('fb-bp','social','Facebook','Facebook Ads','monthly','spend',null,false), ('seo-bp','seo','SEO Business Pro','SEO','monthly','flat',null,false);
 create table groups(id uuid primary key default gen_random_uuid(), name text, io_slug text, am_name text, am_email text, am_calendar_url text, brand_color text, logo_url text, trello_board_id text, trello_email text, io_recipient text, has_koc boolean default true, from_name text, from_email text, io_pricing jsonb, portal_domain text, created_at timestamptz default now(), brand_color2 text, am_trello_handle text, active boolean default true, logo_dark_bg boolean default false, accounting_overrides jsonb, digital_strategist_name text, social_strategist_id uuid, web_strategist_id uuid, additional_card_trello_handle text, additional_card_member_role text, covering_strategist_name text, hide_from_strategist boolean default false);
 create table group_change_history(id uuid primary key default gen_random_uuid(), group_id uuid not null, changed_at timestamptz not null default now(), changed_by text, action text not null, changes jsonb not null default '{}'::jsonb);
 create function admin_resolve_role(a text, b text) returns text language sql as $$ select case when b = 'pw' and a = 'Carol' then 'am' when b = 'pw' and a = 'Jon' then 'super' else null end $$;
 create function group_id_for_embed_key(p_t text) returns uuid language sql as $$ select case when p_t = 'goodkey' then '${GROUP}'::uuid else null end $$;
 insert into clients values ('${CLIENT}', 'Acme', false, '${GROUP}');`;
const mk = async (step2) => { const db = new PGlite(); await db.exec(SCHEMA); await db.exec(F('live-create-campaign-lines-from-order.as-pasted-2026-10-12.sql'));
  await db.exec('create trigger trg_create_campaign_lines after insert on public.orders for each row execute function create_campaign_lines_from_order()');
  await db.exec(E('live-step2-functions.2026-10-16.sql')); await db.exec(F('admin-save-group-with-history.proposed.sql'));
  await db.exec(`insert into groups(id, name, io_slug, am_name, am_email, io_recipient, io_pricing, accounting_overrides) values ('${GROUP}', 'Acme Group', 'acme', 'Carol', 'am@x.test', 'io@x.test', '{"a":1}', '{"x":2}')`);
  await db.exec(`insert into orders(id, client_id, group_id, campaign_start, line_items, created_at, trello_synced) values ('d0000000-0000-0000-0000-000000000001', '${CLIENT}', '${GROUP}', '2026-09-01', '[{"service_id":"fb-bp","spend":500,"start_date":"2026-09-01","end_date":"2026-11-30","label":"fb-bp"}]', now() - interval '30 days', true), ('d0000000-0000-0000-0000-000000000002', '${CLIENT}', '${GROUP}', '2026-10-01', '[{"service_id":"seo-bp","recurring":300,"spend":0,"start_date":"2026-10-01","end_date":"2027-09-30","label":"seo-bp"}]', now() - interval '3 days', true)`);
  if (step2) await db.exec(E('step2.sql')); return db; };
const lines = async db => (await db.query(`select service_id, status, billing_type, flight_start::text fs, flight_end::text fe, accounting_only from campaign_lines order by service_id, flight_start`)).rows;
const newOrder = db => db.query(`insert into orders(client_id, group_id, campaign_start, line_items) values ('${CLIENT}', '${GROUP}', '2027-01-01', '[{"service_id":"fb-bp","spend":700,"start_date":"2027-01-01","end_date":"2027-03-31","label":"fb-bp"}]') returning id`);
(async () => {
  const before = await mk(false), after = await mk(true);
  const ex = (await after.query('select count(*)::int n, count(email_sent_at)::int sent, bool_and(email_sent_at = created_at) same from orders')).rows[0];
  check('the existing orders are backfilled as sent (email_sent_at = created_at); nothing is left looking unsent', [ex.n, ex.sent, ex.same], [2, 2, true]);
  await newOrder(before); await newOrder(after);
  check('a NEW order after the block has an empty email_sent_at (not yet sent) and the order trigger still writes exactly the same campaign lines as before the block', [(await after.query(`select email_sent_at from orders order by created_at desc limit 1`)).rows[0].email_sent_at, canon(await lines(after)) === canon(await lines(before))], [null, true]);
  // backfill again
  const again = E('step2-backfill-again.sql').replace('MERGE_TIME_HERE', new Date(Date.now() + 3600000).toISOString());
  await after.exec(again); check('the second backfill (run after the form merge, with the merge time filled in) marks orders before that time as sent', (await after.query('select count(*)::int n from orders where email_sent_at is null')).rows[0].n, 0);
  await newOrder(after); await after.exec(E('step2-backfill-again.sql').replace('MERGE_TIME_HERE', new Date(Date.now() - 3600000).toISOString()));
  check('...and leaves orders placed AFTER that time untouched', (await after.query('select count(*)::int n from orders where email_sent_at is null')).rows[0].n, 1);
  // admin_set_order_trello_state
  const O = 'd0000000-0000-0000-0000-000000000001';
  const call = async (who, pw, data) => { try { await after.query('select admin_set_order_trello_state($1,$2,$3,$4::jsonb)', [who, pw, O, JSON.stringify(data)]); return 'ok'; } catch (e) { return e.message; } };
  const row = async () => (await after.query('select trello_synced s, email_sent_at::text e, total_check from (select trello_synced, email_sent_at, 1 total_check from orders where id = $1) x', [O])).rows[0];
  check('an AM can set email_sent_at on an order of any age; a wrong login and unknown fields are still refused', [await call('Carol', 'pw', { email_sent_at: '2026-10-16T12:00:00Z' }), (await row()).e !== null, /Invalid admin credentials/.test(await call('Carol', 'bad', { email_sent_at: '2026-10-16T12:00:00Z' })), /cannot be set here/.test(await call('Carol', 'pw', { total_onetime: 1 })), /cannot be set here/.test(await call('Carol', 'pw', { created_at: '2099-01-01' }))], ['ok', true, true, true, true]);
  check('the Trello fields still work exactly as before and do not disturb the email time', [await call('Jon', 'pw', { trello_synced: false }), (await row()).s, (await row()).e !== null], ['ok', false, true]);
  // admin_get_orders
  const list = (await after.query(`select * from admin_get_orders('Jon', 'pw', 90)`)).rows.map(r => Object.values(r)[0]);
  check('Admin\'s order list (live function, unchanged) carries email_sent_at by itself', [list.length > 0, list.every(o => 'email_sent_at' in o)], [true, true]);
  // admin_save_group: same behaviour + the new field
  const save = async (db, who, data, id) => { try { return (await db.query('select admin_save_group($1,$2,$3::uuid,$4::jsonb) r', [who, 'pw', id === undefined ? GROUP : id, JSON.stringify(data)])).rows[0].r; } catch (e) { return 'ERR ' + e.message; } };
  const grp = async db => (await db.query(`select to_jsonb(g) - 'created_at' - 'no_team_copy' j from groups g order by name`)).rows.map(r => r.j);
  const steps = [['Jon', { am_name: 'Dana', io_recipient: 'a@x.test,b@x.test' }], ['Carol', { io_pricing: { a: 9 }, brand_color: '#fff' }], ['Jon', { has_koc: false, active: false }], ['Jon', {}]];
  let same = true; for (const [w, d] of steps) { await save(before, w, d); await save(after, w, d); if (canon(await grp(before)) !== canon(await grp(after))) same = false; }
  check('admin_save_group: every old behaviour is identical (AM pricing strip, partial updates, history) apart from the new column', [same, (await before.query('select count(*)::int n from group_change_history')).rows[0].n === (await after.query('select count(*)::int n from group_change_history')).rows[0].n], [true, true]);
  await save(after, 'Carol', { no_team_copy: true }); const flag = async () => (await after.query(`select no_team_copy from groups where id = '${GROUP}'`)).rows[0].no_team_copy;
  check('no_team_copy: an AM can switch it on; an unrelated save leaves it alone; the History tab records it; a save with it omitted does not reset it', [await flag(), (await save(after, 'Jon', { am_name: 'Eli' }), await flag()), (await after.query(`select changes from group_change_history where changes ? 'no_team_copy'`)).rows.length], [true, true, 1]);
  const newId = await save(after, 'Jon', { name: 'New Co', io_slug: 'newco' }, null);
  check('a new group defaults to team copy ON (no_team_copy false)', (await after.query('select no_team_copy from groups where id = $1', [newId])).rows[0].no_team_copy, false);
  // get_group_for_embed_key
  const b2 = await mk(false), a2 = await mk(true);   // fresh copies: the two above have had different saves by now
  const g0 = (await b2.query(`select * from get_group_for_embed_key('goodkey')`)).rows[0], g1 = (await a2.query(`select * from get_group_for_embed_key('goodkey')`)).rows[0];
  const a0 = Object.values(g0)[0], a1 = Object.values(g1)[0], k0 = Object.keys(a0);
  check('get_group_for_embed_key: returns exactly what it did plus no_team_copy; the old keys keep their values; a bad key is still refused', [canon(Object.fromEntries(k0.map(k => [k, a1[k]]))) === canon(a0), Object.keys(a1).filter(k => !k0.includes(k)), /invalid or revoked embed key/.test(await a2.query(`select * from get_group_for_embed_key('nope')`).then(() => '', e => e.message))], [true, ['no_team_copy'], true]);
  await a2.query(`update groups set no_team_copy = true`); check('...and the form sees the switch as true once it is on', Object.values((await a2.query(`select * from get_group_for_embed_key('goodkey')`)).rows[0])[0].no_team_copy, true);
  done();
})();
