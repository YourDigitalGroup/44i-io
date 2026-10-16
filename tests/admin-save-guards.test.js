// Admin Save buttons must not wipe data the screen never loaded, and a Super Admin keeps their calendar link.
// (2026-10-14 logic audit.) Runs the real Admin code against the real Admin HTML (jsdom).
const { read, fn, grab, check, done } = require('./lib');
let JSDOM; try { ({ JSDOM } = require('jsdom')); } catch (e) { console.log('SKIPPED (jsdom is not installed: run "npm install jsdom" in the tests folder)'); process.exit(0); }
const admin = read('admin/index.html');
const win = new JSDOM(admin, { runScripts: 'outside-only' }).window;
win.eval([
  grab(admin, /const LEGAL_FIELDS = \[[\s\S]*?\];/).replace('const ', 'var '), grab(admin, /let LEGAL_LOADED = false;/).replace('let ', 'var '), grab(admin, /let NOTIF_LOADED = false;[^\n]*/).replace('let ', 'var '),
  ...['loadAdminLegalContent', 'adminSaveLegalContent', 'loadAdminNotificationSettings', 'adminSaveNotificationSettings', 'adminUserRoleChanged', 'adminSaveUser'].map(n => fn(admin, n)),
  `var currentAdminUser = { name: 'a', pw: 'p', role: 'super' }, ALL_STAFF = [], ALL_AES = [], __calls = [], __toasts = [], __rows = null, __fail = false;
   function canSee() { return true; } function showToast(m, t) { __toasts.push((t || 'ok') + ': ' + m); } function loadAdminUsers() {} function adminCancelUserEdit() {}
   async function sb(path, opts) { if (path === 'rpc/admin_get_notification_settings') { if (__fail) throw new Error('boom'); return __rows; } if (path.startsWith('rpc/')) { __calls.push([path, JSON.parse(opts.body).p_data]); return {}; } if (__fail) throw new Error('boom'); return __rows; }`,
].join('\n'));
const doc = win.document, LF = win.eval('LEGAL_FIELDS');
const fill = () => LF.forEach(f => { doc.getElementById('legal-' + f).value = 'clause ' + f; });
const blank = () => LF.forEach(f => { doc.getElementById('legal-' + f).value = ''; });
(async () => {
  // ---- Legal text ----
  win.eval('__fail = true'); blank(); await win.loadAdminLegalContent();
  win.eval('__calls.length = 0; __toasts.length = 0'); doc.getElementById('legal-' + LF[0]).value = 'one-line edit'; await win.adminSaveLegalContent();
  check('legal text: load FAILED -> Save is refused and nothing is sent', [win.eval('__calls.length'), /did not load/.test(win.eval('__toasts[0]'))], [0, true]);
  win.eval('__fail = false; __rows = [Object.fromEntries(LEGAL_FIELDS.map(f => [f, "stored " + f]))]'); await win.loadAdminLegalContent();
  win.eval('__calls.length = 0'); await win.adminSaveLegalContent();
  check('legal text: load OK -> Save sends all 11 boxes as loaded', [win.eval('__calls.length'), Object.keys(win.eval('__calls[0][1]')).length, win.eval('__calls[0][1]')[LF[0]]], [1, 11, 'stored ' + LF[0]]);
  win.eval('__rows = []'); await win.loadAdminLegalContent(); win.eval('__calls.length = 0'); await win.adminSaveLegalContent();
  check('legal text: load OK but no row yet -> Save is allowed (nothing to erase)', win.eval('__calls.length'), 1);
  // ---- Notification BCC ----
  win.eval('__fail = true'); await win.loadAdminNotificationSettings(); win.eval('__calls.length = 0; __toasts.length = 0'); await win.adminSaveNotificationSettings();
  check('BCC list: load FAILED -> Save is refused', [win.eval('__calls.length'), /did not load/.test(win.eval('__toasts[0]'))], [0, true]);
  win.eval('__fail = false; __rows = [{ always_bcc_recipients: "a@x.com" }]'); await win.loadAdminNotificationSettings(); win.eval('__calls.length = 0'); await win.adminSaveNotificationSettings();
  check('BCC list: load OK -> Save sends the loaded list', win.eval('__calls[0][1].always_bcc_recipients'), 'a@x.com');
  // ---- Users: calendar link ----
  const saveUser = async role => { doc.getElementById('admin-user-original-name').value = 'Jon'; doc.getElementById('admin-user-name').value = 'Jon'; doc.getElementById('admin-user-role').value = role;
    doc.getElementById('admin-user-email').value = 'j@x.test'; doc.getElementById('admin-user-trello').value = 'jon'; doc.getElementById('admin-user-calendar').value = 'https://cal.test/jon';
    doc.getElementById('admin-user-password').value = ''; win.eval('__calls.length = 0'); await win.adminSaveUser(); return win.eval('__calls[0][1].am_calendar_url'); };
  check('Users: a Super Admin keeps their calendar link on Save', await saveUser('super'), 'https://cal.test/jon');
  check('Users: an Account Manager keeps their calendar link', await saveUser('am'), 'https://cal.test/jon');
  check('Users: a Strategist (not an AM) still has the link cleared', await saveUser('strategist'), null);
  doc.getElementById('admin-user-role').value = 'super'; win.adminUserRoleChanged();
  check('Users: the calendar box is SHOWN for a Super Admin (so it is not an invisible field)', doc.getElementById('admin-user-calendar-wrap').style.display, 'block');
  doc.getElementById('admin-user-role').value = 'strategist'; win.adminUserRoleChanged();
  check('Users: the calendar box stays hidden for a Strategist', doc.getElementById('admin-user-calendar-wrap').style.display, 'none');
  done();
})();
