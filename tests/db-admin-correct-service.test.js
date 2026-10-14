// admin_correct_order_service, run in an in-memory Postgres (pglite): correcting an order line to a YEARLY service (Hosting Fee) must be
// written as RECURRING like the IO form does, not as a one-time fee. The "LIVE" copy is the function as it was on 2026-10-14 (one line differs).
// Needs: npm install @electric-sql/pglite   (in the tests folder or anywhere on NODE_PATH)
const { check, done } = require('./lib'); const fs = require('fs'), path = require('path');
let PGlite; try { ({ PGlite } = require('@electric-sql/pglite')); } catch (e) { console.log('SKIPPED (@electric-sql/pglite is not installed: run "npm install @electric-sql/pglite" in the tests folder)'); process.exit(0); }
const NEW = fs.readFileSync(path.join(__dirname, 'fixtures/admin-correct-order-service.proposed.sql'), 'utf8');
const LIVE = NEW.replace("when n_billing in ('monthly', 'yearly', 'annual') then 'recurring'", "when n_billing = 'monthly' then 'recurring'");
if (LIVE === NEW) throw new Error('MISSING in the fixture: the v_model line to compare against');
const O = '00000000-0000-0000-0000-0000000000a1', C = '00000000-0000-0000-0000-0000000000c1', LN = '00000000-0000-0000-0000-0000000000b1';
async function mk(sql) { const db = new PGlite();
  await db.exec(`create function admin_resolve_role(a text,b text) returns text language sql as $$ select 'super'::text $$;
    create table services(id text primary key, label text, accounting_label text, section text, workflow text, billing_type text, pricing_mode text, koc_requirement text, is_cpm_adjustment boolean, auto_split_labels text[], auto_add_setup_fee boolean, hosting_prompt_type text, tactic_variants text[], active boolean);
    create table orders(id uuid primary key, client_id uuid, group_id uuid, line_items jsonb, agent_splits jsonb, campaign_start date, is_revised boolean, edit_history jsonb);
    create table campaign_lines(id uuid primary key default gen_random_uuid(), order_id uuid, client_id uuid, group_id uuid, service_id text, tactic_label text, flight_start date, flight_end date, order_line_notes text, billing_type text, budget_entry_mode text, accounting_only boolean, status text, last_renewed_at timestamptz);
    create table campaign_months(id serial, campaign_line_id uuid, month date, gross_budget numeric, actual_spend numeric, actual_clicks numeric, actual_impressions numeric, actual_conversions numeric, actual_total_visits numeric, in_platform_override numeric, goal_override numeric, paused boolean, confirmed_by text, confirmed_at timestamptz);
    create table campaign_status_history(campaign_line_id uuid); create table campaign_optimize_log(campaign_line_id uuid); create table pending_requests(campaign_line_id uuid); create table accounting_month_close(month date);
    insert into services(id,label,section,billing_type,pricing_mode,koc_requirement,active) values
      ('w-flat','Website Setup','web-ot','one_time','flat','none',true), ('w-hosting','Hosting Fee*','web-ot','yearly','flat','none',true), ('w-annual','Annual Thing','web-ot','annual','flat','none',true),
      ('wm-hosting','Hosting Only','web-mo','monthly','flat','none',true), ('w-onetime2','Domain Transfer','web-ot','one_time','flat','none',true), ('sem','SEM','sem','monthly','spend','none',true);
    insert into orders(id,client_id,line_items,campaign_start) values ('${O}','${C}','[{"service_id":"w-flat","label":"Website Setup","fee":175,"recurring":0,"spend":0}]','2027-01-01');
    insert into campaign_lines(id,order_id,client_id,service_id,tactic_label,billing_type,accounting_only,status,flight_start) values ('${LN}','${O}','${C}','w-flat','Website Setup','one_time',true,'active','2027-01-01');
    insert into campaign_months(campaign_line_id,month,gross_budget) values ('${LN}','2027-01-01',175);`);
  await db.exec(sql); return db; }
const correct = (db, to, amt) => db.query(`select admin_correct_order_service('C','x','${O}'::uuid,'w-flat','${to}',1,${amt},'2027-01-01'::date,'2027-01-31'::date,null,'','AE picked the wrong service',true) r`);
const read = async db => { const o = (await db.query(`select line_items->0 li from orders`)).rows[0].li; const l = (await db.query(`select billing_type, accounting_only, status from campaign_lines`)).rows;
  const m = (await db.query(`select gross_budget::float g from campaign_months`)).rows; return { fee: o.fee, recurring: o.recurring, unit_fee: o.unit_fee, lines: l.length, lineType: l[0] && l[0].billing_type, accountingOnly: l[0] && l[0].accounting_only, months: m.map(x => x.g) }; };
(async () => {
  let d = await mk(LIVE); await correct(d, 'w-hosting', 450);
  check('LIVE function (the bug): a corrected yearly Hosting Fee is stored as a ONE-TIME fee', await read(d), { fee: 450, recurring: 0, unit_fee: 450, lines: 1, lineType: 'one_time', accountingOnly: true, months: [450] });
  d = await mk(NEW); const r = (await correct(d, 'w-hosting', 450)).rows[0].r;
  check('NEW function: a corrected yearly Hosting Fee is RECURRING (like the IO form), one Accounting line, $450 in the start month', await read(d), { fee: 0, recurring: 450, unit_fee: 0, lines: 1, lineType: 'recurring', accountingOnly: true, months: [450] });
  check('NEW function: reports the model as recurring and writes the edit-history entry', [r.model, r.removed_lines, (await d.query(`select edit_history->0->>'field' f, is_revised from orders`)).rows[0]], ['recurring', 1, { f: 'service_correction', is_revised: true }]);
  d = await mk(NEW); await correct(d, 'w-annual', 100);
  check("NEW function: billing type 'annual' is treated the same as 'yearly'", (await read(d)).recurring, 100);
  d = await mk(NEW); await correct(d, 'wm-hosting', 69);
  check('NEW function: a MONTHLY service is unchanged (recurring)', await read(d), { fee: 0, recurring: 69, unit_fee: 0, lines: 1, lineType: 'recurring', accountingOnly: true, months: [69] });
  d = await mk(NEW); await correct(d, 'w-onetime2', 200);
  check('NEW function: a ONE-TIME service is unchanged (fee)', await read(d), { fee: 200, recurring: 0, unit_fee: 200, lines: 1, lineType: 'one_time', accountingOnly: true, months: [200] });
  d = await mk(NEW); await correct(d, 'sem', 1500);
  const sem = (await d.query(`select billing_type, accounting_only from campaign_lines`)).rows[0];
  check('NEW function: an ad-spend service is unchanged (spend line, Strategist-tracked)', [sem.billing_type, !!sem.accounting_only], ['spend', false]);
  d = await mk(NEW); let msg = ''; try { await d.query(`select admin_correct_order_service('C','x','${O}'::uuid,'w-flat','w-hosting',1,450,'2027-01-31'::date,'2027-01-01'::date,null,'','reason here',true)`); } catch (e) { msg = e.message; }
  check('NEW function: its safety checks still work (end before start is refused)', /cannot be before the start date/.test(msg), true);
  done();
})();
