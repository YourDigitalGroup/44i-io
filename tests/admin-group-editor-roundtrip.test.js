// Opening a group in Admin and pressing Save WITHOUT changing anything must send back exactly what was stored.
// Runs the real editor code against the real editor HTML (jsdom), once per realistic saved group.
// Needs: npm install jsdom   (in the tests folder or anywhere on NODE_PATH)
const { read, fn, check, done } = require('./lib');
let JSDOM; try { ({ JSDOM } = require('jsdom')); } catch (e) { console.log('SKIPPED (jsdom is not installed: run "npm install jsdom" in the tests folder)'); process.exit(0); }
const admin = read('admin/index.html'), shared = read('shared.js');
const win = new JSDOM(admin, { runScripts: 'outside-only' }).window;
win.Element.prototype.scrollIntoView = () => {};
win.eval([
  fn(shared, 'esc'),
  ...['populateAmPickerDropdown', 'populateAdditionalCardMemberDropdown', 'applyAmPick', 'populateDigitalStrategistDropdown', 'populateStrategistDropdown', 'setGroupLogoPreview', 'adminEditGroup', 'adminSaveGroup'].map(n => fn(admin, n)),
  `var allGroups = [], ALL_STAFF = [], ALL_AES = [], ALL_STRATEGISTS = [], currentPricingOverrides = {}, currentAccountingOverrides = {}, ADMIN_EMBED_ONE_TIME = null, currentAdminUser = { name: 't', pw: 'p', role: 'super' };
  var adminReloadGroups = async () => {}; async function adminFreshenList() { return true; } /* the list is already loaded in this test; the real helper has its own test (admin-edit-fresh-data) */ function canSee() { return true; } function showToast() {} function adminTab() {} function checkGroupSlugCollision() {} function loadAdminGroups() {}
  async function ensureAeRosterLoaded() {} async function ensureStaffRosterLoaded() {} async function ensureStrategistsLoaded() {}
  async function sb(path, opts) { window.__sent = JSON.parse(opts.body).p_data; }`,
].join('\n'));

const staff = [{ name: 'Sammy', role: 'strategist', active: true, email: 's@x.test' }, { name: 'Bronson', role: 'strategist', active: true }, { name: 'Jon', role: 'super', active: true, email: 'j@x.test', am_calendar_url: 'https://cal.test/jon', am_trello_handle: 'jon' },
  { name: 'Shania', role: 'am', active: true, email: 'sh@x.test', am_calendar_url: 'https://cal.test/sh', am_trello_handle: 'shania' }, { name: 'Pat (left)', role: 'am', active: false, email: 'p@x.test', am_calendar_url: 'https://old/cal', am_trello_handle: 'pat' }];
const strategists = [{ id: 'soc-1', discipline: 'social', name: 'Social One', active: true }, { id: 'soc-old', discipline: 'social', name: 'Social Old', active: false }, { id: 'web-1', discipline: 'web', name: 'Web One', active: true }, { id: 'web-old', discipline: 'web', name: 'Web Old', active: false }];
const aes = [{ id: 'ae1', group_id: 'g1', name: 'Ann AE', trello_handle: 'annae', active: true }];
const base = { id: 'g1', name: 'Test Group', io_slug: 'test-group', am_name: 'Shania', am_email: 'sh@x.test', am_calendar_url: 'https://cal.test/sh', am_trello_handle: 'shania', additional_card_trello_handle: null, additional_card_member_role: null,
  digital_strategist_name: 'Sammy', covering_strategist_name: 'Bronson', social_strategist_id: 'soc-1', web_strategist_id: 'web-1', brand_color: '#112233', brand_color2: '#445566', logo_url: 'https://x.test/l.png', logo_dark_bg: false,
  trello_board_id: 'abc123', io_recipient: 'a@b.test', has_koc: true, hide_from_strategist: false, io_pricing: { 'w-hosting': 500 }, accounting_overrides: { 'sem-bp': { cut: 0.75 } }, active: true };
const R = {
  'fully filled': { ...base },
  'everything blank': { ...base, am_name: null, am_email: null, am_calendar_url: null, am_trello_handle: null, digital_strategist_name: null, covering_strategist_name: null, social_strategist_id: null, web_strategist_id: null,
    brand_color: '#1C9BD7', brand_color2: null, logo_url: '', trello_board_id: '', io_recipient: null, has_koc: false, io_pricing: null, accounting_overrides: null },
  'hidden from Strategist, no KOC': { ...base, hide_from_strategist: true, has_koc: false },
  'brand colour never set (null)': { ...base, brand_color: null },
  'pricing stored as a JSON string': { ...base, io_pricing: JSON.stringify({ 'w-hosting': 500 }), accounting_overrides: JSON.stringify({ 'sem-bp': { cut: 0.75 } }) },
  'social strategist who is now inactive': { ...base, social_strategist_id: 'soc-old' },
  'web strategist who is now inactive': { ...base, web_strategist_id: 'web-old' },
  // An AM's saved contact details are refreshed from their Users profile on every open/save (2026-09-28 decision), so this row's profile carries the same details.
  'AM who is now inactive': { ...base, am_name: 'Pat (left)', am_email: 'p@x.test', am_calendar_url: 'https://old/cal', am_trello_handle: 'pat' },
  'digital strategist not in Users': { ...base, digital_strategist_name: 'Someone Else' },
  'additional card member on the AE roster': { ...base, additional_card_trello_handle: 'annae', additional_card_member_role: 'Designer' },
  'additional card member NOT on the AE roster': { ...base, additional_card_trello_handle: 'outsider', additional_card_member_role: 'DCM' },
  'AM saved in different capitals': { ...base, am_name: 'shania' },
};
const diffs = {};
(async () => {
for (const [name, row] of Object.entries(R)) {
  win.allGroups = [row]; win.ALL_STAFF = staff; win.ALL_STRATEGISTS = strategists; win.ALL_AES = aes;
  win.__sent = null;
  // adminEditGroup has awaits (stubbed), so it must finish before saving; run both on the next ticks.
  diffs[name] = (async () => { await win.adminEditGroup('g1'); const p = win.adminSaveGroup(); await p; const got = win.__sent; const bad = [];
    for (const k of Object.keys(got || {})) {
      let want = row[k] === undefined ? null : row[k];
      if (k === 'brand_color') want = (want || '#1C9BD7').toLowerCase(); // the colour box lower-cases, and a never-set colour shows the default blue: same colour on screen
      if (k === 'am_name' && typeof want === 'string') want = (staff.find(x => x.name.toLowerCase() === want.trim().toLowerCase()) || { name: want }).name; // AM saved in other capitals is tidied to the profile's spelling
      if ((k === 'io_pricing' || k === 'accounting_overrides') && typeof want === 'string') want = JSON.parse(want);
      const g = got[k], same = JSON.stringify(g ?? null) === JSON.stringify(want ?? null) || (want === '' && g === null) || (want === null && g === '');
      if (!same) bad.push(`${k}: stored ${JSON.stringify(want)} -> saved ${JSON.stringify(g)}`);
    }
    return bad; })();
  await diffs[name];
}
  for (const [name, p] of Object.entries(diffs)) { const bad = await p; check('unchanged save keeps everything: ' + name + (bad.length ? '   <- ' + bad.join(' | ') : ''), bad, []); }
  done();
})();
