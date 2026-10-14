// Admin editors open on FRESH data (2026-10-14 logic audit): an editor saves the whole record it opened, so opening it from a list loaded long ago could
// silently undo newer changes (an IO submission writing a client's Trello list link, another AM saving the group). The list is reloaded just before an
// editor opens when it is more than 20 seconds old, and the editor does NOT open if that reload fails.
const { read, fn, grab, check, done } = require('./lib');
let JSDOM; try { ({ JSDOM } = require('jsdom')); } catch (e) { console.log('SKIPPED (jsdom is not installed: run "npm install jsdom" in the tests folder)'); process.exit(0); }
const admin = read('admin/index.html');
const win = new JSDOM(admin, { runScripts: 'outside-only' }).window;
win.Element.prototype.scrollIntoView = () => {};
win.eval([
  grab(admin, /const ADMIN_FRESH_MS = \d+;/).replace('const ', 'var '), grab(admin, /const ADMIN_LIST_LOADED_AT = \{\};/).replace('const ', 'var '),
  fn(read('shared.js'), 'esc'), fn(admin, 'adminFreshenList'), fn(admin, 'populateAeGroupDropdown'), fn(admin, 'adminEditAe'),
  `var ALL_AES = [{ id: 'ae1', name: 'Ann', trello_handle: 'ann', email: 'OLD@x.test', market: 'Des Moines', group_id: 'g1' }], allGroups = [{ id: 'g1', name: 'G One' }], __toasts = [], __reloads = 0, __failReload = false, __now = 1000000;
   Date.now = () => __now;
   function showToast(m, t) { __toasts.push((t || 'ok') + ': ' + m); }
   var reloadAes = async () => { __reloads++; if (__failReload) throw new Error('network down'); ALL_AES = [{ id: 'ae1', name: 'Ann', trello_handle: 'ann', email: 'NEW@x.test', market: 'Des Moines', group_id: 'g1' }]; }; var adminReloadAes = reloadAes;`,
].join('\n'));
(async () => {
  const doc = win.document;
  // adminEditAe reloads through adminReloadAes; the test supplies a stand-in with the same shape
  await win.adminEditAe('ae1');
  check('first open after the page loaded: the list is reloaded and the form shows the NEWER email (not the old one)', [doc.getElementById('admin-ae-email').value, win.eval('__reloads')], ['NEW@x.test', 1]);
  win.eval('ALL_AES[0].email = "NEWER@x.test"'); await win.adminEditAe('ae1');
  check('opened again within 20 seconds: no needless reload', win.eval('__reloads'), 1);
  win.eval('__now += 21000'); win.eval('ALL_AES = [{ id: "ae1", name: "Ann", trello_handle: "ann", email: "LATEST@x.test", market: "Des Moines", group_id: "g1" }]'); win.eval('reloadAes = async () => { __reloads++; ALL_AES = [{ id: "ae1", name: "Ann", trello_handle: "ann", email: "LATEST@x.test", market: "Des Moines", group_id: "g1" }]; }; adminReloadAes = reloadAes;');
  await win.adminEditAe('ae1');
  check('after 20 seconds it reloads again', [win.eval('__reloads'), doc.getElementById('admin-ae-email').value], [2, 'LATEST@x.test']);
  // failure: the editor must NOT open or change anything
  win.eval('__now += 21000; __failReload = true; reloadAes = async () => { __reloads++; throw new Error("network down"); }; adminReloadAes = reloadAes;');
  doc.getElementById('admin-ae-form').style.display = 'none'; doc.getElementById('admin-ae-email').value = 'untouched';
  await win.adminEditAe('ae1');
  check('reload FAILS: the editor does not open, nothing is filled in, and the AM is told why', [doc.getElementById('admin-ae-form').style.display, doc.getElementById('admin-ae-email').value, /Could not load the latest version/.test(win.eval('__toasts[__toasts.length-1]'))], ['none', 'untouched', true]);
  // the Client and Group editors freshen BEFORE they look the record up
  const order = name => { const body = fn(admin, name); return body.indexOf('adminFreshenList') >= 0 && body.indexOf('adminFreshenList') < body.search(/\.find\(/); };
  check('the Client, Group and AE editors reload the list BEFORE they look up the record', [order('adminEditClient'), order('adminEditGroup'), order('adminEditAe')], [true, true, true]);
  check('the three list loaders record when they last loaded (so a just-loaded list is not fetched twice)', [/ADMIN_LIST_LOADED_AT\.groups = Date\.now\(\)/.test(admin), /ADMIN_LIST_LOADED_AT\.clients = Date\.now\(\)/.test(admin), /ADMIN_LIST_LOADED_AT\.aes = Date\.now\(\)/.test(admin)], [true, true, true]);
  // Batch 3b part 2: the Users, Strategist, Section, Intake Form and Service editors do the same (supers-only editors; whole-record saves)
  const orderNew = name => { const body = fn(admin, name); const i = body.indexOf('adminFreshenList'); return i >= 0 && i < body.search(/\.find\(/); };
  check('the Users, Strategist, Section, Intake Form and Service editors reload the list BEFORE they look up the record', ['adminEditUser', 'adminEditStrategist', 'adminEditSection', 'adminEditIntakeForm', 'adminEditService'].map(orderNew), [true, true, true, true, true]);
  check('the Section/Intake/Strategist/Users/Service loaders record when they last loaded', ['sections', 'intake', 'strategists', 'users', 'services'].map(k => new RegExp('ADMIN_LIST_LOADED_AT\\.' + k + ' = Date\\.now\\(\\)').test(admin)), [true, true, true, true, true]);
  check('the five reloaders read the same tables as the loaders', [/adminReloadUsers = async \(\) => \{ ALL_ADMIN_USERS = await sb\('rpc\/admin_get_staff'/.test(admin), /adminReloadStrategists = async \(\) => \{ ALL_STRATEGISTS = await sb\('rpc\/admin_get_strategists'/.test(admin), /adminReloadSections = async \(\) => \{ SECTIONS = await sb\('sections\?order=sort_order/.test(admin), /adminReloadIntakeForms = async \(\) => \{ ALL_INTAKE_FORMS = await sb\('intake_forms\?order=title/.test(admin), /adminReloadServices = async \(\) => \{ allServicesMap = await sb\('services\?order=section,sort_order/.test(admin)], [true, true, true, true, true]);
  check('hosting settings reload on EVERY open (not only the first), since Save writes every row shown', [/if \(opening\) await loadHostingSettings\(\);/.test(admin), /opening && !HOSTING_SETTINGS_ROWS\.length/.test(admin)], [true, false]);
  // behaviour, one real editor: the Section editor shows the NEWER label and refuses to open when the reload fails
  const w2 = new JSDOM(admin, { runScripts: 'outside-only' }).window; w2.Element.prototype.scrollIntoView = () => {};
  w2.eval([grab(admin, /const ADMIN_FRESH_MS = \d+;/).replace('const ', 'var '), grab(admin, /const ADMIN_LIST_LOADED_AT = \{\};/).replace('const ', 'var '), fn(admin, 'adminFreshenList'), fn(admin, 'adminEditSection'),
    `var SECTIONS = [{ id: 's1', label: 'OLD label', sort_order: 1 }], __fail = false, __toasts = []; function canSee() { return true; } function showToast(m, t) { __toasts.push(m); }
     var adminReloadSections = async () => { if (__fail) throw new Error('down'); SECTIONS = [{ id: 's1', label: 'NEW label', sort_order: 1 }]; };`].join('\n'));
  await w2.adminEditSection('s1');
  check('Section editor opens on the NEWER label, not the one loaded with the page', w2.document.getElementById('admin-sec-label').value, 'NEW label');
  w2.eval("__fail = true; ADMIN_LIST_LOADED_AT.sections = 0"); w2.document.getElementById('admin-sec-label').value = 'untouched'; await w2.adminEditSection('s1');
  check('if the reload fails the Section editor does not open or fill anything', [w2.document.getElementById('admin-sec-label').value, /Could not load the latest version/.test(w2.eval('__toasts.join(" ")'))], ['untouched', true]);
  done();
})();
