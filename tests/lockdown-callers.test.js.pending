// PENDING (applies with the lockdown patch): the Admin and Strategist pages stop using the functions/tables that lose public access, and use the login-protected replacements.
const { read, fn, check, done } = require('./lib');
let JSDOM; try { ({ JSDOM } = require('jsdom')); } catch (e) { console.log('SKIPPED (jsdom is not installed)'); process.exit(0); }
const admin = read('admin/index.html'), strat = read('strategist/index.html'), shared = read('shared.js');
const mk = (html) => new JSDOM(html, { runScripts: 'outside-only' }).window;
(async () => {
  // Admin Settings tab
  let w = mk('<body><textarea id="notif-always_bcc_recipients"></textarea></body>');
  w.eval([fn(shared, 'esc'), `var NOTIF_LOADED = false, __calls = [], currentAdminUser = { name: 'Jon', pw: 'x' }; function showToast() {} async function sb(path, o) { __calls.push({ path, body: o && o.body ? JSON.parse(o.body) : null }); return [{ id: 1, always_bcc_recipients: 'team@x.com' }]; }`, fn(admin, 'loadAdminNotificationSettings')].join('\n'));
  await w.loadAdminNotificationSettings();
  check('Settings tab reads the always-BCC list through admin_get_notification_settings with the login (not the table)', [w.eval('__calls[0].path'), w.eval('__calls[0].body.p_name'), w.document.getElementById('notif-always_bcc_recipients').value], ['rpc/admin_get_notification_settings', 'Jon', 'team@x.com']);
  // approval email BCC
  w = mk('<body></body>');
  w.eval([`var __calls = [], currentAdminUser = { name: 'Carol', pw: 'x' }, allGroups = [{ id: 'g1', io_recipient: 'io@x.com' }]; async function sb(path, o) { __calls.push({ path, body: o && o.body ? JSON.parse(o.body) : null }); return [{ id: 1, always_bcc_recipients: 'a@x.com, b@x.com' }]; }`, fn(admin, 'adminResolutionRecipients')].join('\n'));
  const rec = await w.adminResolutionRecipients('ae@x.com', 'g1');
  check('the approval email still gets the always-BCC list, now through the login-protected function', [w.eval('__calls[0].path'), w.eval('__calls[0].body.p_name'), JSON.stringify(rec).includes('a@x.com'), JSON.stringify(rec).includes('b@x.com')], ['rpc/admin_get_notification_settings', 'Carol', true, true]);
  // Reconcile: link a client to a list
  w = mk('<body><select id="reconcile-select-0"><option value="LISTA" selected>A</option></select></body>');
  w.eval([`var __calls = [], currentAdminUser = { name: 'Carol', pw: 'x' }, RECONCILE_ROWS = [{ client: { id: 'c1', name: 'Client One' } }]; function showToast() {} function renderAdminReconcile() {} function dismissReconcileRow() {} async function sb(path, o) { __calls.push({ path, body: JSON.parse(o.body) }); return null; }`, fn(admin, 'confirmReconcileRow')].join('\n'));
  await w.confirmReconcileRow(0);
  check('Reconcile links the client through admin_set_client_trello_list_id with the login', [w.eval('__calls[0].path'), w.eval('__calls[0].body.p_name'), w.eval('__calls[0].body.p_client_id'), w.eval('__calls[0].body.p_trello_list_id')], ['rpc/admin_set_client_trello_list_id', 'Carol', 'c1', 'LISTA']);
  // Strategist import pickers
  w = mk('<body><select id="import-client"><option value="cl1" data-multi-agent="1" selected>C</option></select><div id="import-agent-county-wrap"></div><select id="import-county"></select><select id="import-agent"></select></body>');
  w.eval([fn(shared, 'esc'), `var __calls = [], currentStrategistUser = { name: 'Sam', pw: '' }; async function sb(path, o) { __calls.push({ path, body: JSON.parse(o.body) }); return path.endsWith('counties') ? [{ name: 'Hinds', active: true }, { name: 'Old County', active: false }] : [{ name: 'Ann', active: true }, { name: 'Gone', active: false }]; }`, fn(strat, 'strategistImportClientChanged')].join('\n'));
  await w.strategistImportClientChanged();
  check('Strategist pickers use the login-protected functions, send the strategist login, and leave out inactive agents/counties like the old functions did', [w.eval('__calls.map(c => c.path)'), w.eval('__calls[0].body.p_name'), w.eval('__calls[0].body.p_client_id'), [...w.document.getElementById('import-agent').options].map(o => o.textContent), [...w.document.getElementById('import-county').options].map(o => o.textContent)], [['rpc/admin_get_counties', 'rpc/admin_get_agents'], 'Sam', 'cl1', ['— Select —', 'Ann'], ['— Select —', 'Hinds']]);
  // nothing outside the order form / Companion calls a closed function or reads the two tables directly
  const closed = ['companion_get_active_services', 'companion_get_client_trello_list', 'companion_get_intake_responses', 'companion_get_order_trello_cards', 'companion_submit_request', 'delete_group_draft', 'find_or_create_ae', 'find_or_create_client', 'get_client_aes', 'get_client_agents', 'get_client_counties', 'get_client_details', 'get_client_service_flights', 'get_group_drafts', 'log_draft_save', 'set_client_trello_list_id', 'get_client_names'];
  const pages = { admin, strategist: strat, accounting: read('accounting/index.html'), shared };
  const offenders = []; Object.entries(pages).forEach(([pg, src]) => closed.forEach(n => { if (new RegExp("rpc/" + n + "['\"`]").test(src)) offenders.push(pg + ':' + n); }));
  check('Admin, Strategist, Accounting and shared.js no longer call any function the lockdown closes', offenders, []);
  check('Admin no longer reads the notification_settings table directly', /sb\('notification_settings\?/.test(admin), false);
  done();
})();
