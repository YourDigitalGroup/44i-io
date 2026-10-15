// RENEWAL BUNDLE (draft, NOT live): the live order trigger function `create_campaign_lines_from_order` (text confirmed live 2026-10-15 by md5)
// vs the proposed one, both run in an in-memory Postgres (pglite) against the same orders.
//   A. an IO-form order never renews an existing line any more (spend AND flat services): it always starts new lines.
//   B. an order that revives a Complete/Cancelled/Paused AGENT line writes a campaign_status_history row.
// Everything else must behave identically. The "live" half of each scenario must reproduce what happens today (so the test also proves the harness is faithful).
// Needs: npm install @electric-sql/pglite
const { check, done } = require('./lib'); const fs = require('fs'), path = require('path');
let PGlite; try { ({ PGlite } = require('@electric-sql/pglite')); } catch (e) { console.log('SKIPPED (@electric-sql/pglite is not installed: run "npm install @electric-sql/pglite" in the tests folder)'); process.exit(0); }
const fx = f => fs.readFileSync(path.join(__dirname, 'fixtures', f), 'utf8');
const SCHEMA = `
 create table services(id text primary key, section text, label text, accounting_label text, billing_type text, pricing_mode text, auto_split_labels jsonb, is_cpm_adjustment boolean default false);
 create table orders(id uuid primary key default gen_random_uuid(), client_id uuid, group_id uuid, campaign_start date, line_items jsonb, agent_splits jsonb);
 create table campaign_lines(id uuid primary key default gen_random_uuid(), order_id uuid, client_id uuid, group_id uuid, service_id text, tactic_label text, split_label text, flight_start date, flight_end date,
   order_line_notes text, billing_type text, budget_entry_mode text, status text default 'pending', accounting_only boolean default false, agent_name text, county text, has_addl_targeting boolean default false,
   has_offline_visits boolean default false, budget_varies_by_month boolean default false, last_renewed_at timestamptz, last_renewed_previous_end_date date);
 create table campaign_months(id uuid primary key default gen_random_uuid(), campaign_line_id uuid, month date, gross_budget numeric);
 create table accounting_map(service_id text, pair_with_service_id text);
 create table counties(id uuid primary key default gen_random_uuid(), client_id uuid, name text);
 create table agents(id uuid primary key default gen_random_uuid(), client_id uuid, county_id uuid, name text);
 create table campaign_status_history(id uuid primary key default gen_random_uuid(), campaign_line_id uuid, old_status text, new_status text, reason text, changed_by text, changed_at timestamptz default now());
 insert into services values ('fb-bp','social','Facebook','Facebook Ads','monthly','spend',null,false), ('seo-bp','seo','SEO Business Pro','SEO','monthly','flat',null,false),
   ('lt-event','lt','Event','Event','monthly','spend','["Event A","Event B"]',false), ('w-hosting','web','Website','Website','monthly','flat',null,false),
   ('sem-bp','sem','SEM','SEM','monthly','spend',null,false), ('farm-sem','sem','Farm Bureau SEM','Farm SEM','monthly','spend',null,false);`;
const CLIENT = 'c0000000-0000-0000-0000-000000000001', GROUP = 'a0000000-0000-0000-0000-000000000001';
const make = async (functionFile) => { const db = new PGlite(); await db.exec(SCHEMA); await db.exec(fx(functionFile));
  await db.exec('create trigger trg_create_campaign_lines after insert on public.orders for each row execute function create_campaign_lines_from_order()'); return db; };
const order = (db, items, splits, start) => db.query('insert into orders(client_id, group_id, campaign_start, line_items, agent_splits) values ($1,$2,$3,$4,$5) returning id', [CLIENT, GROUP, start || '2027-01-01', JSON.stringify(items), JSON.stringify(splits || [])]);
const spendItem = (sid, spend, s, e) => ({ service_id: sid, spend, start_date: s || '2027-01-01', end_date: e || '2027-03-31', label: sid });
const flatItem = (sid, rec, s, e) => ({ service_id: sid, recurring: rec, spend: 0, start_date: s || '2027-01-01', end_date: e || '2027-12-31', label: sid });
const lines = async (db, where) => (await db.query(`select service_id, tactic_label, status, accounting_only, flight_start::text fs, flight_end::text fe, agent_name, county, billing_type bt, (select count(*) from campaign_months m where m.campaign_line_id = l.id)::int months from campaign_lines l ${where || ''} order by service_id, tactic_label, fs, fe, agent_name nulls first`)).rows;
const hist = async db => (await db.query('select old_status, new_status, reason from campaign_status_history order by changed_at')).rows;
const run = async (name, fnFile, steps) => { const db = await make(fnFile); const out = await steps(db); await db.close(); return out; };

(async () => {
  const LIVE = 'live-create-campaign-lines-from-order.as-pasted-2026-10-12.sql', NEW = 'create-campaign-lines-from-order.proposed-renewal-bundle.DRAFT.sql';
  const both = async (steps) => ({ live: await run('live', LIVE, steps), next: await run('new', NEW, steps) });

  // S1 three spend orders back to back, nothing activated: three pending lines either way
  let r = await both(async db => { for (let i = 0; i < 3; i++) await order(db, [spendItem('fb-bp', 500 + i)]); return await lines(db); });
  check('S1 three spend orders, nothing activated: THREE pending lines today and after (unchanged)', [r.live.length, r.next.length, JSON.stringify(r.live) === JSON.stringify(r.next)], [3, 3, true]);

  // S2 a spend line the strategist activated, then a repeat order
  r = await both(async db => { await order(db, [spendItem('fb-bp', 500, '2027-01-01', '2027-03-31')]); await db.query("update campaign_lines set status = 'active'"); await order(db, [spendItem('fb-bp', 800, '2027-04-01', '2027-06-30')]); return await lines(db); });
  check('S2 TODAY: a repeat order RENEWS the one active line (1 line, end moved to Jun 30, start kept Jan 1)', [r.live.length, r.live[0].fs, r.live[0].fe], [1, '2027-01-01', '2027-06-30']);
  check('S2 AFTER: the repeat order starts a NEW pending line; the active line is untouched (2 lines, first still Jan 1 - Mar 31)', [r.next.length, r.next.map(l => l.status).sort(), r.next.find(l => l.status === 'active').fe, r.next.find(l => l.status === 'pending').fs], [2, ['active', 'pending'], '2027-03-31', '2027-04-01']);

  // S3 flat service (SEO) twice: today the second order renews the first (Perrys)
  r = await both(async db => { await order(db, [flatItem('seo-bp', 750, '2027-01-01', '2027-12-31')]); await order(db, [flatItem('seo-bp', 750, '2027-03-01', '2028-02-28')]); return await lines(db, "where tactic_label not like '%(SEO)'"); });
  check('S3 TODAY: the second SEO order renews the first SEO line (1 line; start kept Jan 1, end moved to Feb 28 2028)', [r.live.length, r.live[0].fs, r.live[0].fe], [1, '2027-01-01', '2028-02-28']);
  check('S3 AFTER: the second SEO order makes its own line with its own dates (2 lines; the first is untouched)', [r.next.length, r.next.map(l => l.fs + '..' + l.fe)], [2, ['2027-01-01..2027-12-31', '2027-03-01..2028-02-28']]);
  check('S3 AFTER: each SEO order adds its own LLO + Rep Monitoring pair (same as today -- the pair was always inserted per order)', await both(async db => { await order(db, [flatItem('seo-bp', 750)]); await order(db, [flatItem('seo-bp', 750)]); return (await lines(db, "where tactic_label like '%(SEO)'")).length; }).then(x => [x.live, x.next]), [4, 4]);

  // S4 a client with exactly one active line and a SHORTER repeat order: today it shortens the end date
  r = await both(async db => { await order(db, [spendItem('sem-bp', 1000, '2027-01-01', '2027-12-31')]); await db.query("update campaign_lines set status = 'active'"); await order(db, [spendItem('sem-bp', 1000, '2027-02-01', '2027-04-30')]); return await lines(db); });
  check('S4 TODAY: a shorter repeat order SHORTENS the active line to Apr 30 (the audit finding)', [r.live.length, r.live[0].fe], [1, '2027-04-30']);
  check('S4 AFTER: the active line keeps Dec 31 and the new order is a separate pending line', [r.next.length, r.next.find(l => l.status === 'active').fe], [2, '2027-12-31']);

  // S5 auto-split service always creates its own lines; unchanged
  r = await both(async db => { await order(db, [spendItem('lt-event', 400)]); await db.query("update campaign_lines set status = 'active'"); await order(db, [spendItem('lt-event', 400)]); return await lines(db); });
  check('S5 auto-split labels (Event A / Event B): own lines every order, identical today and after (4 lines)', [r.live.length, r.next.length, JSON.stringify(r.live) === JSON.stringify(r.next)], [4, 4, true]);

  // S6 agent split renewal: a Complete agent line is revived; renewal still happens, and AFTER it leaves a history row
  const split = (n, c, amt, s, e) => ({ service_id: 'farm-sem', agent_name: n, county: c, amount: amt, start_date: s || '2027-01-01', end_date: e || '2027-06-30', is_new_agent: false, is_new_county: false });
  r = await both(async db => { await order(db, [spendItem('farm-sem', 100, '2026-06-01', '2026-12-31')], [split('Ann', 'Hinds', 100, '2026-06-01', '2026-12-31')]); await db.query("update campaign_lines set status = 'complete' where agent_name = 'Ann'");
    await order(db, [spendItem('farm-sem', 100, '2027-01-01', '2027-06-30')], [split('Ann', 'Hinds', 100)]); return { l: (await lines(db, "where agent_name = 'Ann'")), h: await hist(db) }; });
  check('S6 an agent line is still RENEWED by an order today and after (1 line, revived to pending, end Jun 30 2027)', [r.live.l.length, r.live.l[0].status, r.live.l[0].fe, r.next.l.length, r.next.l[0].status, r.next.l[0].fe], [1, 'pending', '2027-06-30', 1, 'pending', '2027-06-30']);
  check('S6 history: TODAY no row is written (why Strategist files it under Complete); AFTER one row complete -> pending, "Renewed by order"', [r.live.h, r.next.h], [[], [{ old_status: 'complete', new_status: 'pending', reason: 'Renewed by order' }]]);
  r = await both(async db => { await order(db, [spendItem('farm-sem', 100)], [split('Bob', 'Rankin', 100)]); await db.query("update campaign_lines set status = 'active' where agent_name = 'Bob'"); await order(db, [spendItem('farm-sem', 100)], [split('Bob', 'Rankin', 100)]); return await hist(db); });
  check('S6b renewing an agent line that is already ACTIVE writes no history row (nothing changed status)', [r.live, r.next], [[], []]);

  // S7 hosting proration + setup fee lines unchanged
  r = await both(async db => { await order(db, [{ ...flatItem('w-hosting', 69), prorated_hosting_amt: 120, hosting_start_date: '2027-02-10', setup_fee_amt: 200 }]); return { l: await lines(db), m: (await db.query('select to_char(month, $$YYYY-MM$$) m, gross_budget::float g from campaign_months m join campaign_lines l on l.id = m.campaign_line_id order by tactic_label, month')).rows }; });
  check('S7 hosting proration (month of hosting start) and setup-fee lines: identical today and after', [JSON.stringify(r.live) === JSON.stringify(r.next), r.live.l.length], [true, 3]);

  // S8 agent line with county NULL never matches an old line (county = null is never true): a new line each time, today and after
  r = await both(async db => { await order(db, [spendItem('farm-sem', 100)], [{ ...split('Cal', null, 100), county: null }]); await order(db, [spendItem('farm-sem', 100)], [{ ...split('Cal', null, 100), county: null }]); return (await lines(db, "where agent_name = 'Cal'")).length; });
  check('S8 an agent split with NO county creates a new line every order (today and after): 2 lines -- a quirk this change does not touch', [r.live, r.next], [2, 2]);

  // S9 an order with no line items does not error and writes nothing
  r = await both(async db => { await order(db, []); return (await lines(db)).length; });
  check('S9 an order with no services writes nothing and does not fail', [r.live, r.next], [0, 0]);

  // S10 months: a normal first spend order writes one month per month of the flight; a varying plan writes its own amounts -- unchanged
  r = await both(async db => { await order(db, [{ ...spendItem('fb-bp', 300, '2027-01-01', '2027-03-31'), month_budgets: [{ month: '2027-01', amount: 100 }, { month: '2027-02', amount: 200 }, { month: '2027-03', amount: 300 }], budget_mode: 'custom' }]); return (await db.query('select to_char(month, $$YYYY-MM$$) m, gross_budget::float g, (select budget_varies_by_month from campaign_lines l where l.id = campaign_line_id) v from campaign_months order by month')).rows; });
  check('S10 a varying plan writes its own month amounts and flags the line as varying: identical today and after', [JSON.stringify(r.live) === JSON.stringify(r.next), r.next.map(x => x.g), r.next[0].v], [true, [100, 200, 300], true]);
  done();
})();
