// Clean-up block for the three wrong Farm Bureau setup-fee lines: removes exactly those three (with backups), and STOPS without changing anything
// when the data is not exactly as expected. Run in an in-memory Postgres (pglite). Only tests the script; nothing real is touched.
const { check, done } = require('./lib'); const fs = require('fs'), path = require('path');
let PGlite; try { ({ PGlite } = require('@electric-sql/pglite')); } catch (e) { console.log('SKIPPED (@electric-sql/pglite is not installed)'); process.exit(0); }
const SQL = fs.readFileSync(path.join(__dirname, 'fixtures/cleanup-msfarm-setup-fee-lines.sql'), 'utf8');
const A = 'aac2e505-17f6-4629-9ebc-7921a6e83e4e', B = '436bc626-cdf7-45ca-bcd8-db6ef7b86a0a', Cc = '4321c74a-b495-4e29-a380-8cf7a535798b';
const LATER = '55555555-5555-4555-8555-555555555555', REAL = '22222222-2222-4222-8222-222222222222', OTHERCLIENT = '33333333-3333-4333-8333-333333333333', C = 'c0000000-0000-4000-8000-000000000001';
const make = async (opts = {}) => { const db = new PGlite();
  await db.exec(`create table clients(id uuid primary key, name text); create table campaign_lines(id uuid primary key, client_id uuid, service_id text, tactic_label text, billing_type text, accounting_only boolean, status text, agent_name text, county text);
    create table campaign_months(id uuid primary key default gen_random_uuid(), campaign_line_id uuid, month date, gross_budget numeric);
    create table campaign_status_history(id uuid primary key default gen_random_uuid(), campaign_line_id uuid, old_status text, new_status text);
    insert into clients values ('${C}', 'MS Farm Bureau Agents'), ('c0000000-0000-4000-8000-000000000002', 'Other Client');
    insert into campaign_lines values ('${A}', '${C}', 'sem-bp', 'SEM — Setup Fee', 'setup_fee', true, 'active', null, null), ('${B}', '${C}', 'sem-bp', 'SEM — Setup Fee', 'setup_fee', true, 'active', null, null),
      ('${Cc}', '${C}', 'sem-bp', 'SEM — Setup Fee', 'setup_fee', true, 'active', null, null),
      ('${LATER}', '${C}', 'sem-bp', 'SEM — Setup Fee', 'setup_fee', true, 'active', null, null),
      ('${REAL}', '${C}', 'sem-bp', 'SEM', 'spend', false, 'active', 'Ann', 'Hinds'),
      ('${OTHERCLIENT}', 'c0000000-0000-4000-8000-000000000002', 'sem-bp', 'SEM — Setup Fee', 'setup_fee', true, 'active', null, null);
    insert into campaign_months(campaign_line_id, month, gross_budget) values ('${A}', '2026-10-01', 200), ('${B}', '2026-10-01', 200), ('${Cc}', '2026-11-01', 200), ('${LATER}', '2026-12-01', 200),
      ('${REAL}', '2026-10-01', 100), ('${REAL}', '2026-11-01', 100), ('${OTHERCLIENT}', '2026-10-01', 200);`);
  if (opts.after) await db.exec(opts.after); return db; };
const counts = async db => (await db.query(`select (select count(*) from campaign_lines)::int l, (select count(*) from campaign_months)::int m`)).rows[0];
const run = async (db) => { try { await db.exec(SQL); return { ok: true }; } catch (e) { return { ok: false, msg: String(e.message) }; } };
(async () => {
  let db = await make(); let r = await run(db);
  check('happy path: removes exactly the three listed lines (6 -> 3) and their three month rows (7 -> 4)', [r.ok, await counts(db)], [true, { l: 3, m: 4 }]);
  check('the real SEM line + its months, the other client\'s setup-fee line, and a FOURTH setup-fee line not on the list are all untouched', [(await db.query(`select count(*)::int c from campaign_lines where id in ('${REAL}', '${OTHERCLIENT}', '${LATER}')`)).rows[0].c, (await db.query(`select count(*)::int c from campaign_months where campaign_line_id in ('${REAL}', '${OTHERCLIENT}', '${LATER}')`)).rows[0].c], [3, 4]);
  check('the backups hold the 3 lines and 3 month rows, with row-level security on for both', [(await db.query('select count(*)::int c from campaign_lines_msfarm_setupfee_backup_20261015')).rows[0].c, (await db.query('select count(*)::int c from campaign_months_msfarm_setupfee_backup_20261015')).rows[0].c,
    (await db.query(`select bool_and(relrowsecurity) b from pg_class where relname in ('campaign_lines_msfarm_setupfee_backup_20261015', 'campaign_months_msfarm_setupfee_backup_20261015')`)).rows[0].b], [3, 3, true]);
  r = await run(db);
  check('running it a second time STOPS and changes nothing', [r.ok, await counts(db)], [false, { l: 3, m: 4 }]);
  const stop = async (name, opts, expectMsg, preExisting = 0) => { const d = await make(opts); const before = await counts(d); const res = await run(d); const after = await counts(d); const nb = (await d.query(`select count(*)::int c from pg_class where relname like '%msfarm_setupfee_backup%'`)).rows[0].c;
    check(`STOPS and changes nothing when ${name}`, [res.ok, expectMsg.test(res.msg || ''), JSON.stringify(after) === JSON.stringify(before), nb], [false, true, true, preExisting]); };
  await stop('one of the three listed lines is missing', { after: `delete from campaign_months where campaign_line_id = '${Cc}'; delete from campaign_lines where id = '${Cc}'` }, /expected the 3 listed setup-fee lines for this client, found 2/);
  await stop('one listed line belongs to another client', { after: `update campaign_lines set client_id = 'c0000000-0000-4000-8000-000000000002' where id = '${A}'` }, /found 2/);
  await stop('a listed line is not a setup-fee line any more', { after: `update campaign_lines set billing_type = 'recurring' where id = '${B}'` }, /found 2/);
  await stop('a listed line has a second month row', { after: `insert into campaign_months(campaign_line_id, month, gross_budget) values ('${B}', '2026-11-01', 200)` }, /exactly one month row of \$200/);
  await stop('a month amount is not 200', { after: `update campaign_months set gross_budget = 150 where campaign_line_id = '${A}'` }, /exactly one month row of \$200/);
  await stop('a status-history row points at a listed line', { after: `insert into campaign_status_history(campaign_line_id, old_status, new_status) values ('${Cc}', 'active', 'paused')` }, /point at these lines/);
  await stop('a listed line is not active', { after: `update campaign_lines set status = 'cancelled' where id = '${B}'` }, /not all active, accounting-only/);
  await stop('there are two clients with that name', { after: `insert into clients values (gen_random_uuid(), 'ms farm bureau agents ')` }, /expected exactly 1 client/);
  await stop('there is a delete trigger on campaign_months', { after: `create function f() returns trigger language plpgsql as $$ begin return old; end $$; create trigger t_del before delete on campaign_months for each row execute function f();` }, /delete triggers exist/);
  await stop('a backup table with that name already exists', { after: `create table campaign_lines_msfarm_setupfee_backup_20261015(x int)` }, /backup tables already exist/, 1);
  done();
})();
