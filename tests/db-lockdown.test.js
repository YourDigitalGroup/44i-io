// Embed-key lockdown (SQL): run against the LIVE function text Claire pasted (2026-10-15) in a throwaway Postgres with real roles (anon / authenticated / service_role) and row-level security.
// Proves: the old no-key functions lose public access but the key versions keep working; the two public-read policies go; the owner and service role keep access; the rollback restores everything;
// and the two new login-protected replacement functions work for the right people only. Functions not pasted are stubs (only their permissions are tested).
const { check, done } = require('./lib'); const fs = require('fs'), path = require('path');
let PGlite; try { ({ PGlite } = require('@electric-sql/pglite')); } catch (e) { console.log('SKIPPED (@electric-sql/pglite is not installed)'); process.exit(0); }
const F = f => fs.readFileSync(path.join(__dirname, 'fixtures', f), 'utf8');
const G = 'a0000000-0000-4000-8000-000000000001', C = 'c0000000-0000-4000-8000-000000000001', C2 = 'c0000000-0000-4000-8000-000000000002';
// every signature the lockdown names (old) and the key twin that must stay
const OLD = [...F('lockdown.sql').matchAll(/revoke execute on function public\.(\w+)\(([^)]*)\)/g), ...F('lockdown-section3-playbook.sql').matchAll(/revoke execute on function public\.(\w+)\(([^)]*)\)/g)].map(m => [m[1], m[2]]);
const TWIN = { companion_get_active_services: 'text, uuid', companion_get_client_trello_list: 'text, uuid', companion_get_intake_responses: 'text, uuid, uuid[]', companion_get_order_trello_cards: 'text, uuid, uuid[]',
  companion_submit_request: 'text, uuid, uuid, text, text, jsonb, text, text, uuid, uuid', delete_group_draft: 'uuid, text', find_or_create_ae: 'text, jsonb', find_or_create_client: 'text, jsonb', get_client_aes: 'text, uuid',
  get_client_agents: 'text, uuid', get_client_counties: 'text, uuid', get_client_details: 'text, uuid', get_client_service_flights: 'text, uuid', get_group_drafts: 'text', log_draft_save: 'text, text, text',
  set_client_trello_list_id: 'text, uuid, text', save_group_draft: 'text, uuid, text, text, jsonb', get_group_clients: 'text', get_group_aes: 'text' };
const PASTED = new Set(['get_client_agents', 'get_client_counties', 'get_group_aes', 'get_group_clients', 'get_group_roster', 'set_client_trello_list_id']);
(async () => {
  const db = new PGlite();
  await db.exec(`create schema if not exists extensions; create role anon nologin; create role authenticated nologin; create role service_role nologin;
    grant usage on schema public to anon, authenticated, service_role, public;
    create table groups(id uuid primary key, name text, io_slug text); create table clients(id uuid primary key, group_id uuid, name text, hidden boolean default false, trello_list_id text);
    create table agents(id uuid primary key default gen_random_uuid(), client_id uuid, name text, active boolean default true); create table counties(id uuid primary key default gen_random_uuid(), client_id uuid, name text, active boolean default true);
    create table ae(id uuid primary key default gen_random_uuid(), group_id uuid, name text, trello_handle text, email text, market text, role text, active boolean default true, sells boolean default true);
    create table notification_settings(id int primary key, always_bcc_recipients text); create table group_service_overrides(id int primary key, note text); alter table group_service_overrides enable row level security; create policy "Public can read group_service_overrides" on group_service_overrides for select to public using (true); insert into group_service_overrides values (1, 'x');
    alter table groups enable row level security; alter table clients enable row level security; alter table notification_settings enable row level security;
    create policy groups_public_read on groups for select to anon, authenticated using (true);
    create policy notification_settings_public_read on notification_settings for select to anon, authenticated using (true);
    grant all on all tables in schema public to anon, authenticated, service_role;
    create function admin_resolve_role(a text, b text) returns text language sql as $$ select case when b = 'pw' and a = 'Carol' then 'am' when b = 'pw' and a = 'Jon' then 'super' when b = 'pw' and a = 'Sam' then 'strategist' else null end $$;
    create function group_id_for_embed_key(p_t text) returns uuid language sql as $$ select case when p_t = 'goodkey' then '${G}'::uuid else null end $$;
    insert into groups values ('${G}', 'Acme Group', 'acme'); insert into clients values ('${C}', '${G}', 'Client One', false, null), ('${C2}', '${G}', 'Client Two', false, 'LISTX');
    insert into agents(client_id, name, active) values ('${C}', 'Ann', true), ('${C}', 'Old Agent', false); insert into counties(client_id, name) values ('${C}', 'Hinds');
    insert into ae(group_id, name, email) values ('${G}', 'Eve AE', 'eve@x.com'); insert into notification_settings values (1, 'team@x.com');`);
  await db.exec(F('live-lockdown-functions.2026-10-15.sql'));
  // stubs for every other signature named in the lockdown, and the key twins that are not pasted
  const have = new Set((await db.query(`select p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' k from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'`)).rows.map(r => r.k));
  const args = (list) => list.split(',').map((t, i) => `p${i} ${t.trim()}`).join(', ');
  const stub = (n, a) => db.exec(`create function public.${n}(${a}) returns int language sql security definer as 'select 1'`);
  for (const [n, a] of OLD) { const sig = n + '(' + a.split(',').map((t, i) => `p${i} ${t.trim()}`).join(', ') + ')'; if (!PASTED.has(n) && !have.has(sig)) { try { await stub(n, args(a)); } catch (e) { /* already pasted under real arg names */ } } }
  for (const [n, a] of Object.entries(TWIN)) { if (!PASTED.has(n)) await stub(n, args(a)).catch(() => {}); }
  await db.exec(`create function public.resolve_rate(p_scope text) returns int language sql as 'select 1';`);
  await db.exec(F('lockdown-prerequisites.sql'));
  await db.exec('grant execute on all functions in schema public to anon, authenticated, service_role');
  const can = async (role, n, a) => (await db.query(`select has_function_privilege('${role}', 'public.${n}(${a})', 'execute') r`)).rows[0].r;
  const asRole = async (role, sql) => { await db.exec(`set role ${role}`); try { return (await db.query(sql)).rows; } catch (e) { return 'ERR ' + e.message; } finally { await db.exec('reset role'); } };
  const oldAll = async role => { const out = []; for (const [n, a] of OLD) out.push(await can(role, n, a)); return out; };
  check('every signature the lockdown names exists (a typo would have stopped the revoke)', OLD.length, 21);
  check('BEFORE: anon can run every old function, read the group table and the always-BCC list', [(await oldAll('anon')).every(Boolean), (await asRole('anon', 'select * from groups')).length, (await asRole('anon', 'select * from notification_settings')).length], [true, 1, 1]);
  check('BEFORE: anon can read the unused group_service_overrides table', (await asRole('anon', 'select * from group_service_overrides')).length, 1);
  // ---- run sections 1 and 2 ----
  await db.exec(F('lockdown.sql'));
  const s12 = OLD.filter(([n]) => !['save_group_draft', 'get_group_roster', 'get_group_clients', 'get_group_aes'].includes(n) || (n === 'get_client_names'));
  const play = [['save_group_draft', 'uuid, uuid, text, text, jsonb'], ['get_group_roster', 'uuid'], ['get_group_clients', 'uuid'], ['get_group_aes', 'uuid']];
  const gone = []; for (const [n, a] of OLD.filter(x => !play.some(p => p[0] === x[0] && p[1] === x[1]))) gone.push([await can('anon', n, a), await can('authenticated', n, a), await can('public', n, a)]);
  check('AFTER sections 1-2: the 17 old no-key functions are closed to anon, authenticated and everyone else', gone.every(g => g.every(v => v === false)) && gone.length === 17, true);
  check('...the Playbook-possible functions are still open (they are section 3)', await Promise.all(play.map(([n, a]) => can('anon', n, a))), [true, true, true, true]);
  check('...the KEY versions (same names, p_t first) are untouched and open', (await Promise.all(Object.entries(TWIN).map(([n, a]) => can('anon', n, a)))).every(Boolean), true);
  check('...the owner and the service role keep access to the closed ones', [await can('service_role', 'get_client_agents', 'uuid'), await can('service_role', 'find_or_create_client', 'jsonb')], [true, true]);
  check('...anon calling a closed one is refused; a keyed form call still works and is scoped to its group', [/permission denied/.test(await asRole('anon', `select * from get_client_agents('${C}')`)), (await asRole('anon', `select name from get_group_clients('goodkey') order by name`)).map(r => r.name), (await asRole('anon', `select name from get_client_agents('goodkey', '${C}')`)).map(r => r.name), /invalid or revoked embed key/.test(await asRole('anon', `select * from get_group_clients('wrongkey')`))], [true, ['Client One', 'Client Two'], ['Ann'], true]);
  check('...the group table and the always-BCC list now return NOTHING to anon and to a signed-in user (policies gone, RLS still on)', [(await asRole('anon', 'select * from groups')).length, (await asRole('authenticated', 'select * from groups')).length, (await asRole('anon', 'select * from notification_settings')).length], [0, 0, 0]);
  check('...the owner can still read them (Admin goes through its login-protected functions)', [(await db.query('select count(*)::int n from groups')).rows[0].n, (await asRole('anon', `select count(*)::int n from admin_get_groups('Jon', 'pw')`))[0].n], [1, 1]);
  { const v = await db.query((F('lockdown-verify.sql').split('\n\n-- And the two policies')[0]).replace(/;\s*$/, '')); const s1 = v.rows.filter(r => r.part === 'section_1'), s3 = v.rows.filter(r => r.part === 'section_3');
    check('the verification query (lockdown-verify.sql) shows after Section 1: all 17 closed to anon and signed-in users, service role still open; Section 3 ones still open', [s1.length, s1.every(r => r.anon_can_run === false && r.signed_in_can_run === false && r.service_role_can_run === true), s3.length, s3.every(r => r.anon_can_run === true)], [17, true, 4, true]); }
  check('...and its policy check lists no policy after Section 2', (await db.query(`select policyname from pg_policies where schemaname = 'public' and policyname in ('notification_settings_public_read', 'groups_public_read', 'Public can read group_service_overrides')`)).rows.length, 0);
  check('...and the unused group_service_overrides table (2C) returns nothing to anon', (await asRole('anon', 'select * from group_service_overrides')).length, 0);
  // ---- section 3 ----
  await db.exec(F('lockdown-section3-playbook.sql'));
  check('AFTER section 3: the Playbook-possible functions are closed to anon, but the service role keeps them', [await Promise.all(play.map(([n, a]) => can('anon', n, a))), await Promise.all(play.map(([n, a]) => can('service_role', n, a)))], [[false, false, false, false], [true, true, true, true]]);
  check('...the key versions of those still work', [(await asRole('anon', `select name from get_group_aes('goodkey')`)).map(r => r.name)], [['Eve AE']]);
  // ---- rollback ----
  await db.exec(F('lockdown-rollback.sql'));
  check('ROLLBACK: every old function is open again, the policies are back, and the anon reads of the group table, the always-BCC list and the unused table work as before', [(await oldAll('anon')).every(Boolean), (await asRole('anon', 'select * from groups')).length, (await asRole('anon', 'select * from notification_settings')).length, (await asRole('anon', 'select * from group_service_overrides')).length], [true, 1, 1, 1]);
  { const rows = F('live-policies.2026-10-15.csv').trim().split('\n').slice(1).map(l => l.match(/("([^"]*)"|[^,]+)/g).map(x => x.replace(/^"|"$/g, '')));
    const rec = n => rows.find(r => r[1] === n), got = n => db.query(`select cmd, roles::text r, qual from pg_policies where policyname = $1`, [n]).then(r => r.rows[0]);
    const three = ['groups_public_read', 'notification_settings_public_read', 'Public can read group_service_overrides']; const out = [];
    for (const n of three) { const g = await got(n), c = rec(n); out.push(g && g.cmd === c[2] && g.r.replace(/\s/g, '') === c[3] && g.qual === c[4]); }
    check('the policies the rollback re-creates match the live pg_policies rows Claire pasted (command, roles, USING) exactly', out, [true, true, true]); }
  check('...and the rollback is repeatable and the lockdown can be run again (idempotent both ways)', (await db.exec(F('lockdown.sql')), await db.exec(F('lockdown-rollback.sql')), await db.exec(F('lockdown.sql')), (await asRole('anon', 'select * from groups')).length), 0);
  // ---- new login-protected replacements ----
  const call = (who, pw, sql) => asRole('anon', sql.replace('$W', who).replace('$P', pw));
  check('admin_get_notification_settings: super and AM get the row; wrong login refused; strategist / accounting refused', [(await call('Jon', 'pw', `select always_bcc_recipients from admin_get_notification_settings('$W', '$P')`))[0].always_bcc_recipients, (await call('Carol', 'pw', `select count(*)::int n from admin_get_notification_settings('$W', '$P')`))[0].n, /Invalid admin credentials/.test(await call('Jon', 'bad', `select * from admin_get_notification_settings('$W', '$P')`)), /restricted/.test(await call('Sam', 'pw', `select * from admin_get_notification_settings('$W', '$P')`))], ['team@x.com', 1, true, true]);
  check('admin_set_client_trello_list_id: AM sets it; wrong login and strategist refused; unknown client refused; the old public function is not needed', [(await call('Carol', 'pw', `select admin_set_client_trello_list_id('$W', '$P', '${C}', 'NEWLIST')`)).length, (await db.query(`select trello_list_id from clients where id = '${C}'`)).rows[0].trello_list_id, /Invalid admin credentials/.test(await call('Carol', 'bad', `select admin_set_client_trello_list_id('$W', '$P', '${C}', 'X')`)), /restricted/.test(await call('Sam', 'pw', `select admin_set_client_trello_list_id('$W', '$P', '${C}', 'X')`)), /not found/.test(await call('Jon', 'pw', `select admin_set_client_trello_list_id('$W', '$P', 'c0000000-0000-4000-8000-0000000000ff', 'X')`)), (await db.query(`select trello_list_id from clients where id = '${C}'`)).rows[0].trello_list_id], [1, 'NEWLIST', true, true, true, 'NEWLIST']);
  check('the Strategist portal can use admin_get_agents / admin_get_counties with its own login (no new SQL): same rows as the old public functions once the inactive ones are filtered out', [(await call('Sam', 'pw', `select name from admin_get_agents('$W', '$P', '${C}') where active order by name`)).map(r => r.name), (await call('Sam', 'pw', `select name from admin_get_counties('$W', '$P', '${C}') where active`)).map(r => r.name), /Invalid admin credentials/.test(await call('Sam', 'bad', `select * from admin_get_agents('$W', '$P', '${C}')`))], [['Ann'], ['Hinds'], true]);
  done();
})();
