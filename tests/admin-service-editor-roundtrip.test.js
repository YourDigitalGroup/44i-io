// Opening a service in Admin and pressing Save WITHOUT changing anything must send back exactly what was stored.
// Runs the real editor code against the real editor HTML (jsdom), once per realistic saved row.
// Needs: npm install jsdom   (in the tests folder or anywhere on NODE_PATH)
const { read, fn, check, done } = require('./lib');
let JSDOM; try { ({ JSDOM } = require('jsdom')); } catch (e) { console.log('SKIPPED (jsdom is not installed: run "npm install jsdom" in the tests folder)'); process.exit(0); }
const admin = read('admin/index.html'), shared = read('shared.js');
const win = new JSDOM(admin, { runScripts: 'outside-only' }).window;
win.Element.prototype.scrollIntoView = () => {};
let sent = null;
win.confirm = () => true;
win.eval([
  fn(shared, 'esc'), fn(admin, 'sectionLabel'),
  ...['populateServiceSectionDropdown', 'populateServiceIntakeDropdown', 'onServiceIntakeChange', 'populateServiceExclusivityDropdown', 'populateServiceWorkflowDropdown',
      'populateServiceSubsectionDropdown', 'populateServicePricingGroupDropdown', 'onCancelPenaltyTypeChange', 'onMultiStrategistToggle', 'updateCpmWrapVisibility', 'onPricingModeChange',
      'adminEditService', 'adminSaveService'].map(n => fn(admin, n)),
  `const PRICING_MODE_FIELDS = [
  { wrap: 'admin-svc-unit-wrap', input: 'admin-svc-unit', mode: 'per_unit' },
  { wrap: 'admin-svc-modifier-wrap', input: 'admin-svc-modifier', mode: 'modifier' },
  { wrap: 'admin-svc-spendmin-wrap', input: 'admin-svc-spend-min', mode: 'spend' }];
  var allServicesMap = [], SECTIONS = [], INTAKE_FORMS = {}, currentAdminUser = { name: 't', pw: 'p', role: 'super' };
  function canSee() { return true; } function showToast() {} function adminLoadRateHistory() {} function adminCancelServiceEdit() {} function loadSuggestedMap() {}
  async function loadCatalog() {} function rebuildPriceableServices() {} function promptNewServiceAccountingSetup() {}
  async function sb(path, opts) { window.__sent = JSON.parse(opts.body).p_data; }`,
].join('\n'));

const setWorld = (rows, intake) => { win.allServicesMap = rows; win.eval('SECTIONS = ' + JSON.stringify([{ id: 'web-ot', label: 'Website One-Time', active: true }, { id: 'lt', label: 'Location Targeting', active: true }, { id: 'alc', label: 'A la carte', active: true }, { id: 'old', label: 'Retired', active: false }])); win.eval('INTAKE_FORMS = ' + JSON.stringify(intake || { seo: { title: 'SEO' }, tlp: { title: 'TLP' } })); };
const optionValues = id => [...win.document.getElementById(id).options].map(o => o.value);
const unitOpt = optionValues('admin-svc-unit').find(Boolean), tierOpt = optionValues('admin-svc-tier').find(Boolean), hostOpt = optionValues('admin-svc-hosting-prompt').find(Boolean), kocOpt = optionValues('admin-svc-koc').find(v => v && v !== 'none');

// Every column the editor shows, filled in. A row = one realistic saved service.
const base = { id: 'x-1', label: 'Test Service', accounting_label: null, tactic_variants: null, section: 'web-ot', pricing_mode: 'flat', default_price: 450, billing_type: 'one_time', unit_label: null,
  modifier_amount: null, is_cpm_adjustment: false, retail_cpm: null, koc_requirement: 'none', koc_notify_name: null, koc_notify_trello_handle: null, koc_notify_calendar_url: null, trello_suffix_text: null,
  strategist_disciplines: [], intake_form_id: null, tlp_page_cap: null, workflow: null, trello_template_ref: null, trello_template_type: null, sort_order: 10, auto_add_setup_fee: false,
  setup_fee: null, setup_fee_threshold: null, fee_note: null, cancel_notice_days: null, cancel_penalty_type: 'none', cancel_penalty_amount: null, exclusivity_group: null, spend_minimum: null,
  subsection_label: null, hosting_prompt_type: null, standalone_hosting_service_id: null, auto_select_service_id: null, tier: null, pricing_group: null, active: true };
const R = {
  'flat, everything blank': { ...base },
  'flat with a card template': { ...base, workflow: 'Website', trello_template_ref: 'E6agaiiu', trello_template_type: 'card' },
  'flat with a list template': { ...base, trello_template_ref: '69a0ca52ccb9a9c454e3384e', trello_template_type: 'list' },
  'per-unit with unit label': { ...base, pricing_mode: 'per_unit', unit_label: unitOpt, billing_type: 'monthly', default_price: 7.5 },
  'spend with CPM and minimum': { ...base, pricing_mode: 'spend', retail_cpm: 12.5, spend_minimum: 500, billing_type: 'monthly', default_price: null },
  'modifier CPM adjustment': { ...base, pricing_mode: 'modifier', modifier_amount: 0.25, is_cpm_adjustment: true, retail_cpm: 3.25, default_price: null },
  'all optional fields filled': { ...base, accounting_label: 'Acct Label', koc_requirement: kocOpt, koc_notify_name: 'Pat', koc_notify_trello_handle: 'pat', koc_notify_calendar_url: 'https://x.test/c', trello_suffix_text: 'Offline Visits',
    hosting_prompt_type: hostOpt, tier: tierOpt, auto_add_setup_fee: true, setup_fee: 150, setup_fee_threshold: 1000, fee_note: 'a note', cancel_notice_days: 30, cancel_penalty_type: 'flat', cancel_penalty_amount: 99,
    standalone_hosting_service_id: 'w-hosting', auto_select_service_id: 'w-vid-setup', sort_order: 0 },
  'zero values': { ...base, default_price: 0, sort_order: 0, setup_fee: 0, setup_fee_threshold: 0, cancel_notice_days: 0 },
  'tactic variants (plain)': { ...base, tactic_variants: ['Geofencing', 'CRM'] },
  'tactic variant containing a comma': { ...base, tactic_variants: ['Display, Retargeting', 'CRM'] },
  'two-discipline strategist': { ...base, strategist_disciplines: ['digital', 'web'] },
  'one-discipline strategist': { ...base, strategist_disciplines: ['social'] },
  'intake form that is in the list': { ...base, intake_form_id: 'seo' },
  'intake form that is NOT in the list': { ...base, intake_form_id: 'retired-form' },
  'blank template type WITH a list ID': { ...base, trello_template_ref: '69a0ca52ccb9a9c454e3384e', trello_template_type: null },
  'TLP intake with page cap': { ...base, intake_form_id: 'tlp', tlp_page_cap: 15 },
  'section that is no longer active': { ...base, section: 'old' },
  'shares exclusivity/workflow/pricing group/subsection': { ...base, exclusivity_group: 'web-tier', workflow: 'Website', pricing_group: 'Hosting Fees', subsection_label: 'Sub A' },
};
// Other rows that make the pick-lists (workflow, exclusivity...) contain the values above.
const lister = { ...base, id: 'x-2', exclusivity_group: 'web-tier', workflow: 'Website', pricing_group: 'Hosting Fees', subsection_label: 'Sub A' };
const NOTE = {}; // reason a difference is by design, per field + case
const diffs = {};
for (const [name, row] of Object.entries(R)) {
  setWorld([row, lister]);
  win.__sent = null;
  win.adminEditService(row.id);
  await_(win.adminSaveService());
  const got = win.__sent;
  const bad = [];
  for (const k of Object.keys(got || {})) {
    let want = row[k] === undefined ? null : row[k];
    if (k === 'trello_template_type' && want === null) want = 'list'; // a blank type has always been treated as "list" by the form; saving just writes that down
    const same = JSON.stringify(got[k] ?? null) === JSON.stringify(want ?? null) || (Array.isArray(want) && !want.length && Array.isArray(got[k]) && !got[k].length) || (want === null && Array.isArray(got[k]) && !got[k].length);
    if (!same) bad.push(`${k}: stored ${JSON.stringify(want)} -> saved ${JSON.stringify(got[k])}`);
  }
  diffs[name] = bad;
}
function await_(p) { /* adminSaveService only awaits stubbed no-ops, so it has finished by the time the stub ran */ }
setTimeout(() => {
  // Editing the variants box still saves what was typed (the "keep the stored list" rule only applies to an untouched box).
  setWorld([R['tactic variant containing a comma'], lister]); win.adminEditService('x-1'); win.document.getElementById('admin-svc-tactic-variants').value = 'Display, CRM'; win.adminSaveService();
  check('an edited variants box saves the edit', win.__sent.tactic_variants, ['Display', 'CRM']);
  // A Trello CARD code (8 characters) saved as List: Admin offers to switch it to Card.
  const shortRow = { ...base, trello_template_ref: 'abc12345', trello_template_type: 'list' }; setWorld([shortRow, lister]);
  win.confirm = () => true; win.adminEditService('x-1'); win.adminSaveService();
  check('8-character code + List: OK switches it to Card', win.__sent.trello_template_type, 'card');
  win.confirm = () => false; win.adminEditService('x-1'); win.adminSaveService();
  check('8-character code + List: Cancel keeps List', win.__sent.trello_template_type, 'list');
  win.confirm = () => true;
  const longRow = { ...base, trello_template_ref: '69a0ca52ccb9a9c454e3384e', trello_template_type: 'list' }; setWorld([longRow, lister]); let asked = false; win.confirm = () => { asked = true; return true; };
  win.adminEditService('x-1'); win.adminSaveService();
  check('a real 24-character list ID is never questioned', [asked, win.__sent.trello_template_type], [false, 'list']); win.confirm = () => true;
  for (const [name, bad] of Object.entries(diffs)) check('unchanged save keeps everything: ' + name + (bad.length ? '   <- ' + bad.join(' | ') : ''), bad, []);
  done();
}, 50);
