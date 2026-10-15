// Group change history: the live admin_save_group + history lines. Proves old behaviour is unchanged (AM can't touch pricing, partial updates, returns id)
// and that history records only real changes. Runs the OLD live function and the NEW one side by side on identical data.
const { check, done } = require('./lib'); const fs = require('fs'), path = require('path');
let PGlite; try { ({ PGlite } = require('@electric-sql/pglite')); } catch (e) { console.log('SKIPPED (@electric-sql/pglite is not installed)'); process.exit(0); }
const F = f => fs.readFileSync(path.join(__dirname, 'fixtures', f), 'utf8');
const canon = v => JSON.stringify(v, (k, x) => x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort()) : x);
const SETUP = `create schema if not exists extensions;
 create function admin_resolve_role(a text, b text) returns text language sql as $$ select case when b = 'pw' and a = 'Carol' then 'am' when b = 'pw' and a = 'Jon' then 'super' else null end $$;
 create table groups(id uuid primary key default gen_random_uuid(), name text, io_slug text, am_name text, am_email text, am_calendar_url text, brand_color text, logo_url text, trello_board_id text, trello_email text, io_recipient text, has_koc boolean default true, from_name text, from_email text, io_pricing jsonb, portal_domain text, created_at timestamptz default now(), brand_color2 text, am_trello_handle text, active boolean default true, logo_dark_bg boolean default false, accounting_overrides jsonb, digital_strategist_name text, social_strategist_id uuid, web_strategist_id uuid, additional_card_trello_handle text, additional_card_member_role text, covering_strategist_name text, hide_from_strategist boolean default false);`;
const G = 'a0000000-0000-4000-8000-000000000001';
async function mk(sqlFiles) { const db = new PGlite(); await db.exec(SETUP); for (const f of sqlFiles) await db.exec(F(f)); await db.exec(`insert into groups(id,name,io_slug,am_name,io_pricing,accounting_overrides,trello_email,portal_domain) values ('${G}','Acme','acme','Carol','{"a":1}','{"x":2}','t@x.com','p.com')`); return db; }
(async () => {
  const oldDb = await mk(['live-admin-save-group.2026-10-15.sql']);
  const db = await mk(['admin-save-group-with-history.proposed.sql']);
  const save = async (d, who, data, id) => { try { return (await d.query('select admin_save_group($1,$2,$3::uuid,$4::jsonb) r', [who, 'pw', id === undefined ? G : id, JSON.stringify(data)])).rows[0].r; } catch (e) { return 'ERR ' + e.message; } };
  const grp = async d => (await d.query('select to_jsonb(g) - \'created_at\' j from groups g order by name')).rows.map(r => r.j);
  const hist = async (who = 'Jon', d = db) => { try { return (await d.query('select admin_get_group_history($1,$2,$3) r', [who, 'pw', G])).rows[0].r; } catch (e) { return 'ERR ' + e.message; } };
  const steps = [['Jon', { am_name: 'Dana', am_email: 'd@x.com' }], ['Carol', { io_pricing: { a: 9 }, accounting_overrides: { x: 9 }, brand_color: '#fff' }], ['Jon', { io_pricing: { a: 9 }, has_koc: false }], ['Jon', { active: false, io_recipient: '' }], ['Jon', {}]];
  let same = true;
  for (const [w, d] of steps) { const a = await save(oldDb, w, d), b = await save(db, w, d); if (a !== b && !(typeof a === 'string' && a.length === 36)) same = false; if (canon(await grp(oldDb)) !== canon(await grp(db))) same = false; }
  check('every save leaves the group row exactly as the old live function did (AM pricing strip, partial updates, trello_email/portal_domain untouched)', same, true);
  const h = await hist(); if (typeof h === 'string') console.log('HIST ERR', h); const byAct = h.map(x => x.action);
  check('history: one entry per save that changed something, newest first (4 updates, the empty save and... none for no-ops)', [h.length, byAct.every(a => a === 'updated')], [4, true]);
  const am = h.find(x => x.changes.am_name); check('records from/to and who', [am.changes.am_name.from, am.changes.am_name.to, am.changed_by, am.changes.am_email.to], ['Carol', 'Dana', 'Jon', 'd@x.com']);
  const carol = h.find(x => x.changed_by === 'Carol'); check('an AM save: brand colour logged, pricing NOT changed so not logged', Object.keys(carol.changes).sort(), ['brand_color']);
  const jon3 = h.find(x => x.changes.io_pricing); check('pricing change is logged as changed (super)', [Object.keys(jon3.changes).sort().join(), canon(jon3.changes.io_pricing.to)], ['has_koc,io_pricing', canon({ a: 9 })]);
  const last = h[0]; check('blank counts as unchanged: io_recipient null -> "" not logged, only active', Object.keys(last.changes), ['active']);
  const before = (await hist()).length; await save(db, 'Jon', { name: 'Acme', am_name: 'Dana' }); check('saving identical values adds nothing', (await hist()).length, before);
  check('untracked columns never appear', h.some(x => x.changes.trello_email || x.changes.portal_domain || x.changes.created_at), false);
  const id2 = await save(db, 'Jon', { name: 'New Co', io_slug: 'newco' }, null); const h2 = (await db.query('select action, changes from group_change_history where group_id = $1', [id2])).rows;
  check('creating a group is logged as created', [h2.length, h2[0].action, h2[0].changes.name.to], [1, 'created', 'New Co']);
  check('a bad login cannot save or read', [await save(db, 'Nobody', { name: 'x' }), await hist('Nobody')].map(m => /Invalid admin credentials/.test(m)), [true, true]);
  check('both AMs and supers may read history', [(await hist('Carol')).length > 0, (await hist('Jon')).length > 0], [true, true]);
  let anon = 'read'; try { await db.exec('set role anon'); } catch (e) { anon = 'norole'; }
  check('the table has row-level security on', (await db.query("select relrowsecurity r from pg_class where relname='group_change_history'")).rows[0].r, true);
  done();
})();
