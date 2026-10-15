// Group editor > History tab: real renderer functions (jsdom). Reads what admin_get_group_history returns, shows who/when/from->to,
// hides pricing numbers, escapes text, works for empty history, and shows a clear message if the database function is not there yet.
const { read, fn, check, done } = require('./lib');
let JSDOM; try { ({ JSDOM } = require('jsdom')); } catch (e) { console.log('SKIPPED (jsdom is not installed)'); process.exit(0); }
const admin = read('admin/index.html'), shared = read('shared.js');
const constBlock = admin.match(/const GROUP_HISTORY_LABELS = \{[\s\S]*?\};\n/)[0];
const win = new JSDOM('<body><input id="admin-group-id" value="g1"><div id="admin-history-body"></div></body>', { runScripts: 'outside-only' }).window;
win.eval([fn(shared, 'esc'), constBlock, 'var ALL_STRATEGISTS = [{ id: "s1", name: "Sam Social" }]; var currentAdminUser = { name: "Jon", pw: "pw" }; var LAST = null; var NEXT = null;',
  'async function sb(path, o) { LAST = { path, body: JSON.parse(o.body) }; if (NEXT instanceof Error) throw NEXT; return NEXT; }',
  fn(admin, 'groupHistoryValue'), fn(admin, 'groupHistoryEntryHtml'), fn(admin, 'adminRenderGroupHistory')].join('\n'));
const run = async (rows) => { win.NEXT = rows; await win.adminRenderGroupHistory(); return win.document.getElementById('admin-history-body').innerHTML; };
(async () => {
  let h = await run([
    { changed_at: '2026-10-15T14:05:00Z', changed_by: 'Carol', action: 'updated', changes: { am_name: { from: 'Carol', to: 'Dana' }, active: { from: true, to: false }, io_recipient: { from: null, to: 'a@x.com' }, io_pricing: { from: { a: 1 }, to: { a: 99 } }, social_strategist_id: { from: null, to: 's1' }, has_koc: { from: true, to: false }, brand_color: { from: '#fff', to: '<b>x</b>' } } },
    { changed_at: '2026-10-01T10:00:00Z', changed_by: 'Jon', action: 'created', changes: { name: { from: null, to: 'Acme' } } }]);
  check('asks the database with the login and this group', [win.LAST.path, win.LAST.body.p_name, win.LAST.body.p_pw, win.LAST.body.p_group_id], ['rpc/admin_get_group_history', 'Jon', 'pw', 'g1']);
  check('shows who, readable names, and from -> to', [/Carol/.test(h), /Account Manager: <span[^>]*>Carol<\/span> → <strong>Dana/.test(h), /Status: <span[^>]*>Active<\/span> → <strong>Archived/.test(h), /IO recipients: <span[^>]*>\(blank\)<\/span> → <strong>a@x\.com/.test(h), /Social Strategist: <span[^>]*>\(blank\)<\/span> → <strong>Sam Social/.test(h), /Kickoff call: <span[^>]*>Yes<\/span> → <strong>No/.test(h)], [true, true, true, true, true, true]);
  check('pricing shows only "changed", never the numbers', [/Custom pricing changed/.test(h), /99/.test(h)], [true, false]);
  check('a created entry says so', /Jon[^<]*created this group/.test(h), true);
  check('typed text is escaped, not run as HTML', [/&lt;b&gt;x&lt;\/b&gt;/.test(h), /<b>x<\/b>/.test(h)], [true, false]);
  check('empty history gives a friendly message', /No changes recorded yet/.test(await run([])), true);
  check('if the database function does not exist yet, a plain message (no crash)', /Could not load history: boom/.test(await run(new win.Error('boom'))), true);
  win.document.getElementById('admin-group-id').value = '';
  check('a group that is not saved yet explains history starts at first save', /Save the group first/.test(await run([])), true);
  const a = admin; check('History tab exists for edit and is hidden for a new group', [/id="tab-btn-history"/.test(a), /'tab-btn-history'\)\.style\.display = ''/.test(a), /'tab-btn-history'\)\.style\.display = 'none'/.test(a)], [true, true, true]);
  done();
})();
