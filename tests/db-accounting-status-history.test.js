// accounting_get_status_history (proposed, read-only) run in an in-memory Postgres (pglite): who may call it, what it returns, paging, and that it writes nothing.
// Needs: npm install @electric-sql/pglite   (in the tests folder or anywhere on NODE_PATH)
const { check, done } = require('./lib'); const fs = require('fs'), path = require('path');
let PGlite; try { ({ PGlite } = require('@electric-sql/pglite')); } catch (e) { console.log('SKIPPED (@electric-sql/pglite is not installed: run "npm install @electric-sql/pglite" in the tests folder)'); process.exit(0); }
(async () => {
  const db = new PGlite();
  await db.exec(`create function admin_resolve_role(a text, b text) returns text language sql as $$ select case when b <> 'pw' then null else a end $$;
    create table campaign_status_history(id serial primary key, campaign_line_id uuid, old_status text, new_status text, changed_at timestamptz, changed_by text, reason text);`);
  const L1 = '00000000-0000-0000-0000-000000000001', L2 = '00000000-0000-0000-0000-000000000002';
  for (let i = 0; i < 7; i++) await db.query(`insert into campaign_status_history(campaign_line_id, old_status, new_status, changed_at, changed_by, reason) values ($1,'active','paused',$2,'x','secret reason')`, [i % 2 ? L1 : L2, `2026-0${1 + (i % 6)}-1${i}T12:00:00-05:00`]);
  await db.exec(fs.readFileSync(path.join(__dirname, 'fixtures/accounting-get-status-history.proposed.sql'), 'utf8'));
  const call = (who, pw, lim, off) => db.query(`select accounting_get_status_history('${who}','${pw}',${lim == null ? 'null' : lim},${off == null ? 'null' : off}) r`);
  const before = (await db.query('select count(*)::int c from campaign_status_history')).rows[0].c;
  const all = (await call('accounting', 'pw')).rows.map(x => x.r);
  check('accounting login: returns every history row as an object with exactly the four fields the page needs', [all.length, Object.keys(all[0]).sort()], [7, ['campaign_line_id', 'changed_at', 'new_status', 'old_status']]);
  check('it does not leak other columns (who clicked, the reason)', JSON.stringify(all).includes('secret reason'), false);
  check('a super admin may call it too', (await call('super', 'pw')).rows.length, 7);
  let msg = ''; try { await call('am', 'pw'); await db.query(`select 1`); } catch (e) { msg = e.message; }
  // the stub returns the name as the role, so 'am' is a valid login but NOT an accounting role
  check('an Account Manager login is refused', /restricted/.test(msg), true);
  msg = ''; try { await call('accounting', 'wrong'); } catch (e) { msg = e.message; }
  check('a wrong password is refused', /Invalid accounting credentials/.test(msg), true);
  const p1 = (await call('accounting', 'pw', 3, 0)).rows.map(x => x.r), p2 = (await call('accounting', 'pw', 3, 3)).rows.map(x => x.r), p3 = (await call('accounting', 'pw', 3, 6)).rows.map(x => x.r), p4 = (await call('accounting', 'pw', 3, 9)).rows;
  const paged = [...p1, ...p2, ...p3].map(x => x.changed_at + x.campaign_line_id);
  check('paging in threes (like the page does) returns all 7 rows once each, then an empty page', [paged.length, new Set(paged).size, p4.length], [7, 7, 0]);
  check('it is read-only: the table is exactly as it was', (await db.query('select count(*)::int c from campaign_status_history')).rows[0].c, before);
  done();
})();
