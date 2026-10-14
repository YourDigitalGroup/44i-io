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
  done();
})();
