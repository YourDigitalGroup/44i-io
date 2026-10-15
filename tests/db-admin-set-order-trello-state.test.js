// admin_set_order_trello_state (proposed): who may call it, that it sets ONLY the four Trello fields, refuses everything else, and leaves every other column alone.
// Run in an in-memory Postgres (pglite); the login function is a stand-in with the same shape as the real admin_resolve_role.
const { check, done } = require('./lib'); const fs = require('fs'), path = require('path');
let PGlite; try { ({ PGlite } = require('@electric-sql/pglite')); } catch (e) { console.log('SKIPPED (@electric-sql/pglite is not installed)'); process.exit(0); }
const canon = v => JSON.stringify(v, (k, x) => x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort()) : x);
(async () => {
  const db = new PGlite(); const O = 'd0000000-0000-4000-8000-000000000003';
  await db.exec(`create function admin_resolve_role(a text, b text) returns text language sql as $$ select case when b = 'pw' and a = 'Carol' then 'am' when b = 'pw' and a = 'Jon' then 'super' else null end $$;
    create table orders(id uuid primary key, line_items jsonb, total_onetime numeric, trello_card_ids jsonb, trello_client_list_id text, trello_synced boolean, trello_synced_at timestamptz, created_at timestamptz default now() - interval '9 days');
    insert into orders(id, line_items, total_onetime, trello_card_ids, trello_client_list_id, trello_synced, trello_synced_at) values ('${O}', '[{"service_id":"a"}]', 175, '{"Website":"c1"}', 'LISTOLD', false, null);`);
  await db.exec(fs.readFileSync(path.join(__dirname, 'fixtures/admin-set-order-trello-state.proposed.sql'), 'utf8'));
  const call = async (who, pw, data, id) => { try { await db.query('select admin_set_order_trello_state($1,$2,$3,$4::jsonb)', [who, pw, id || O, JSON.stringify(data)]); return 'ok'; } catch (e) { return String(e.message); } };
  const row = async () => (await db.query('select line_items, total_onetime::float t, trello_card_ids, trello_client_list_id l, trello_synced s, trello_synced_at::text at from orders where id = $1', [O])).rows[0];
  check('wrong password and unknown user are refused, nothing changes', [await call('Carol', 'bad', { trello_synced: true }), await call('Nobody', 'pw', { trello_synced: true }), (await row()).s], ['Invalid admin credentials', 'Invalid admin credentials', false]);
  check('an AM can set all four Trello fields on an order that is 9 days old', [await call('Carol', 'pw', { trello_card_ids: { Website: 'c1', SEO: 'c2', __io_card__: 'io1' }, trello_client_list_id: 'LISTNEW', trello_synced: true, trello_synced_at: '2026-10-15T12:00:00Z' }), canon((await row()).trello_card_ids), (await row()).l, (await row()).s],
    ['ok', canon({ Website: 'c1', SEO: 'c2', __io_card__: 'io1' }), 'LISTNEW', true]);
  const before = await row();
  check('a super can set just one field; the other three are left exactly as they were', [await call('Jon', 'pw', { trello_synced: false }), (await row()).s, (await row()).l, JSON.stringify((await row()).trello_card_ids) === JSON.stringify(before.trello_card_ids)], ['ok', false, 'LISTNEW', true]);
  check('every OTHER column is untouched (line items, totals)', [canon((await row()).line_items), (await row()).t], [canon([{ service_id: 'a' }]), 175]);
  check('any other field is refused (cannot rewrite totals, line items, created_at)', [await call('Carol', 'pw', { total_onetime: 1 }), await call('Carol', 'pw', { line_items: [] }), await call('Carol', 'pw', { trello_synced: true, created_at: '2099-01-01' })].map(m => /cannot be set here/.test(m)), [true, true, true]);
  check('wrong value types are refused', [await call('Carol', 'pw', { trello_card_ids: 'x' }), await call('Carol', 'pw', { trello_synced: 'yes' }), await call('Carol', 'pw', [1])].map(m => /must be/.test(m)), [true, true, true]);
  check('an order that does not exist is refused', /not found/.test(await call('Carol', 'pw', { trello_synced: true }, 'e0000000-0000-4000-8000-000000000009')), true);
  check('an empty list id clears it; an empty object is accepted and changes nothing else', [await call('Carol', 'pw', { trello_client_list_id: '' }), (await row()).l, await call('Carol', 'pw', {}), (await row()).s], ['ok', null, 'ok', false]);
  done();
})();
