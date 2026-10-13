// The LIVE database function admin_edit_order_line_item (fixture in tests/fixtures) run in an in-memory Postgres (pglite): what a quantity edit does to the order and Accounting's months.
// Needs: npm install @electric-sql/pglite   (in the tests folder or anywhere on NODE_PATH)
const { check, done } = require('./lib'); const fs = require('fs'), path = require('path');
let PGlite; try { ({ PGlite } = require('@electric-sql/pglite')); } catch (e) { console.log('SKIPPED (@electric-sql/pglite is not installed: run "npm install @electric-sql/pglite" in the tests folder)'); process.exit(0); }
const O = '00000000-0000-0000-0000-0000000000a1', L = '00000000-0000-0000-0000-0000000000b1';
async function mk(qty, rec) { const db = new PGlite();
  await db.exec(`create function admin_resolve_role(a text,b text) returns text language sql as $$ select 'super'::text $$;
    create table orders(id uuid primary key, io_number text, line_items jsonb, edit_history jsonb, is_revised boolean);
    create table campaign_lines(id uuid primary key, order_id uuid, service_id text, billing_type text, flight_start date, flight_end date, tactic_label text);
    create table campaign_months(id serial, campaign_line_id uuid, month date, gross_budget numeric);
    insert into orders(id,io_number,line_items) values ('${O}','x','[{"service_id":"w-email","qty":${qty},"recurring":${rec},"fee":0,"unit_fee":0}]');
    insert into campaign_lines values ('${L}','${O}','w-email','recurring','2026-10-14','2027-12-31','x');
    insert into campaign_months(campaign_line_id,month,gross_budget) values ('${L}','2026-10-01',${rec}),('${L}','2026-11-01',${rec});`);
  await db.exec(fs.readFileSync(path.join(__dirname, 'fixtures/live-admin-edit-line-item.sql'), 'utf8')); return db; }
const call = (db, f, v) => db.query(`select admin_edit_order_line_item('C','x','${O}'::uuid,'w-email','${f}','${v}')`);
const st = async d => (await d.query(`select (line_items->0->>'qty') qty, (line_items->0->>'recurring') recurring, (line_items->0->>'fee') fee, (select string_agg(gross_budget::text, ',' order by month) from campaign_months) months from orders`)).rows[0];
(async () => {
  let d = await mk(1, 7.5); await call(d, 'qty', '7'); await call(d, 'recurring', '52.5');
  check('Admin now sends quantity then the scaled monthly amount: order AND every Accounting month follow', await st(d), { qty: '7', recurring: '52.5', fee: '0', months: '52.5,52.5' });
  d = await mk(1, 7.5); await call(d, 'qty', '7'); await call(d, 'fee', '0');
  check('KNOWN OLD BEHAVIOUR (what happened to STMM): qty + fee=0 leaves the amount and zeroes Accounting', await st(d), { qty: '7', recurring: '7.5', fee: '0', months: '0,0' });
  d = await mk(7, 52.5); await call(d, 'qty', '3'); await call(d, 'recurring', '22.5');
  check('a later 7 -> 3 edit gives 22.50 everywhere', await st(d), { qty: '3', recurring: '22.5', fee: '0', months: '22.5,22.5' });
  d = await mk(1, 7.5); let msg = ''; try { await call(d, 'bogus', '1'); } catch (e) { msg = e.message; }
  check('a field that is not editable is refused', /not editable/.test(msg), true);
  done();
})();
