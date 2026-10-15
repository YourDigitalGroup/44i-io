// Clean-up block for the two wrong Farm Bureau setup-fee lines: removes exactly those two (with backups), and STOPS without changing anything
// when the data is not exactly as expected. Run in an in-memory Postgres (pglite). Read-only on the real database: this only tests the script.
const { check, done } = require('./lib'); const fs = require('fs'), path = require('path');
let PGlite; try { ({ PGlite } = require('@electric-sql/pglite')); } catch (e) { console.log('SKIPPED (@electric-sql/pglite is not installed)'); process.exit(0); }
const SQL = fs.readFileSync(path.join(__dirname, 'fixtures/cleanup-msfarm-setup-fee-lines.sql'), 'utf8');
const KNOWN = '436bc626-cdf7-45ca-bcd8-db6ef7b86a0a', OTHER = '11111111-1111-4111-8111-111111111111', REAL = '22222222-2222-4222-8222-222222222222', C = 'c0000000-0000-4000-8000-000000000001';
const make = async (opts = {}) => { const db = new PGlite();
  await db.exec(`create table clients(id uuid primary key, name text); create table campaign_lines(id uuid primary key, client_id uuid, service_id text, tactic_label text, billing_type text, accounting_only boolean, status text, agent_name text, county text);
    create table campaign_months(id uuid primary key default gen_random_uuid(), campaign_line_id uuid, month date, gross_budget numeric);
    create table campaign_status_history(id uuid primary key default gen_random_uuid(), campaign_line_id uuid, old_status text, new_status text);
    insert into clients values ('${C}', 'MS Farm Bureau Agents'), ('c0000000-0000-4000-8000-000000000002', 'Other Client');
    insert into campaign_lines values ('${KNOWN}', '${C}', 'sem-bp', 'SEM — Setup Fee', 'setup_fee', true, 'active', null, null),
      ('${OTHER}', '${C}', 'sem-bp', 'SEM — Setup Fee', 'setup_fee', true, 'active', null, null),
      ('${REAL}', '${C}', 'sem-bp', 'SEM', 'spend', false, 'active', 'Ann', 'Hinds'),
      ('33333333-3333-4333-8333-333333333333', 'c0000000-0000-4000-8000-000000000002', 'sem-bp', 'SEM — Setup Fee', 'setup_fee', true, 'active', null, null);
    insert into campaign_months(campaign_line_id, month, gross_budget) values ('${KNOWN}', '2026-10-01', 200), ('${OTHER}', '2026-10-01', 200), ('${REAL}', '2026-10-01', 100), ('${REAL}', '2026-11-01', 100), ('33333333-3333-4333-8333-333333333333', '2026-10-01', 200);`);
  if (opts.after) await db.exec(opts.after); return db; };
const counts = async db => (await db.query(`select (select count(*) from campaign_lines)::int l, (select count(*) from campaign_months)::int m`)).rows[0];
const run = async (db) => { try { await db.exec(SQL); return { ok: true }; } catch (e) { return { ok: false, msg: String(e.message) }; } };
(async () => {
  let db = await make(); let r = await run(db);
  check('happy path runs and removes exactly the two setup-fee lines (4 lines -> 2) and their two month rows (5 -> 3)', [r.ok, await counts(db)], [true, { l: 2, m: 3 }]);
  check('the real SEM line, its two months and the OTHER client\'s setup-fee line are untouched', [(await db.query(`select count(*)::int c from campaign_lines where id in ('${REAL}', '33333333-3333-4333-8333-333333333333')`)).rows[0].c, (await db.query(`select count(*)::int c from campaign_months where campaign_line_id = '${REAL}'`)).rows[0].c], [2, 2]);
  check('the backups hold the 2 lines and 2 month rows, and row-level security is on for both', [(await db.query('select count(*)::int c from campaign_lines_msfarm_setupfee_backup_20261015')).rows[0].c, (await db.query('select count(*)::int c from campaign_months_msfarm_setupfee_backup_20261015')).rows[0].c,
    (await db.query(`select bool_and(relrowsecurity) b from pg_class where relname in ('campaign_lines_msfarm_setupfee_backup_20261015', 'campaign_months_msfarm_setupfee_backup_20261015')`)).rows[0].b], [2, 2, true]);
  r = await run(db);
  check('running it a second time STOPS (backups exist / lines gone) and changes nothing', [r.ok, await counts(db)], [false, { l: 2, m: 3 }]);
  await db.exec('insert into campaign_lines_msfarm_setupfee_backup_20261015 select * from campaign_lines where false'); // sanity: backup table usable
  const stop = async (name, opts, expectMsg, preExisting = 0) => { const d = await make(opts); const before = await counts(d); const res = await run(d); const after = await counts(d); const noBackups = (await d.query(`select count(*)::int c from pg_class where relname like '%msfarm_setupfee_backup%'`)).rows[0].c;
    check(`STOPS and changes nothing when ${name}`, [res.ok, expectMsg.test(res.msg || ''), JSON.stringify(after) === JSON.stringify(before), noBackups], [false, true, true, preExisting]); };
  await stop('a third setup-fee line exists', { after: `insert into campaign_lines values (gen_random_uuid(), '${C}', 'sem-bp', 'SEM — Setup Fee', 'setup_fee', true, 'active', null, null)` }, /expected exactly 2 setup-fee lines for this client, found 3/);
  await stop('only one setup-fee line exists', { after: `delete from campaign_months where campaign_line_id = '${OTHER}'; delete from campaign_lines where id = '${OTHER}'` }, /found 1/);
  await stop('the known Oct 9 line is not among them', { after: `update campaign_lines set id = '44444444-4444-4444-8444-444444444444' where id = '${KNOWN}'; update campaign_months set campaign_line_id = '44444444-4444-4444-8444-444444444444' where campaign_line_id = '${KNOWN}'` }, /known Oct 9 setup-fee line/);
  await stop('a line has a second month row', { after: `insert into campaign_months(campaign_line_id, month, gross_budget) values ('${OTHER}', '2026-11-01', 200)` }, /exactly one month row of \$200/);
  await stop('a month amount is not 200', { after: `update campaign_months set gross_budget = 150 where campaign_line_id = '${OTHER}'` }, /exactly one month row of \$200/);
  await stop('a status-history row points at one of the lines', { after: `insert into campaign_status_history(campaign_line_id, old_status, new_status) values ('${OTHER}', 'active', 'paused')` }, /point at these lines/);
  await stop('a line is not active', { after: `update campaign_lines set status = 'cancelled' where id = '${OTHER}'` }, /not both active, accounting-only/);
  await stop('there are two clients with that name', { after: `insert into clients values (gen_random_uuid(), 'ms farm bureau agents ')` }, /expected exactly 1 client/);
  await stop('there is a delete trigger on campaign_months', { after: `create function f() returns trigger language plpgsql as $$ begin return old; end $$; create trigger t_del before delete on campaign_months for each row execute function f();` }, /delete triggers exist/);
  await stop('a backup table with that name already exists', { after: `create table campaign_lines_msfarm_setupfee_backup_20261015(x int)` }, /backup tables already exist/, 1);
  done();
})();
