// Admin > Accounting Map: opening a row and pressing Save WITHOUT changing anything must send back what was stored,
// and "Set Up" with nothing typed must not create an empty row. Real editor code + real editor HTML (jsdom).
const { read, fn, check, done } = require('./lib');
let JSDOM; try { ({ JSDOM } = require('jsdom')); } catch (e) { console.log('SKIPPED (jsdom is not installed)'); process.exit(0); }
const admin = read('admin/index.html'), shared = read('shared.js');
const win = new JSDOM(admin, { runScripts: 'outside-only' }).window;
win.Element.prototype.scrollIntoView = () => {};
win.eval([fn(shared, 'esc'), ...['updateAccountingYdaPreview', 'updateAccountingSetupFeePreview', 'adminEditAccounting', 'adminRenderAccountingTierRows', 'adminAddAccountingTierRow', 'adminSaveAccountingMap'].map(n => fn(admin, n)),
  `let ACCOUNTING_CURRENT_SETUP_FEE_AMT = null, ACCOUNTING_STORED_SETUP_FEE_CUT = null, ACCOUNTING_EDITING_NEW_ROW = false;
  var allServicesMap = [], ALL_ACCOUNTING_MAP = [], currentAdminUser = { name: 't', pw: 'p', role: 'super' }, calls = [], toasts = [];
  function fmtPct(n) { return String(n); } function adminLoadRateHistory() {} function showToast(m) { toasts.push(m); } async function loadAdminAccountingMap() {}
  async function sb(path, opts) { calls.push(JSON.parse(opts.body)); }`].join('\n'));
const svc = (id, extra) => ({ id, label: id, default_price: 100, retail_cpm: 5, auto_add_setup_fee: false, setup_fee: null, setup_fee_threshold: null, ...extra });
const row = (service_id, extra, pair) => ({ service_id, pair_with_service_id: pair || null, fortyfouri_cut_pct: null, budgeted_spend_pct: null, platform_cpm: null, setup_fee_cut_pct: null, in_platform_pct: null, cpc_low: null, cpc_high: null, spend_tiers: null, in_platform_tiers: null, ...extra });
const world = { services: [svc('sem'), svc('sem-setup', { auto_add_setup_fee: true, setup_fee: 200, setup_fee_threshold: 1000 }), svc('td'), svc('offline')],
  map: [row('sem', { fortyfouri_cut_pct: 25, budgeted_spend_pct: 70, platform_cpm: 2.5, in_platform_pct: 10, cpc_low: 4, cpc_high: 12 }),
        row('sem-setup', { fortyfouri_cut_pct: 30, setup_fee_cut_pct: 60 }),
        row('td', { fortyfouri_cut_pct: 20, setup_fee_cut_pct: 55 }),                       // setup fee currently switched OFF for this service, split still stored
        row('td', { fortyfouri_cut_pct: 15 }, 'offline'),                                    // pairing override
        row('sem-tiers', { spend_tiers: [{ max: 1000, cut_pct: 30 }, { max: null, cut_pct: 20 }], in_platform_tiers: [{ max: 1000, in_platform_pct: 5 }, { max: 5000, in_platform_pct: 8 }] }),
        row('sem-zero', { fortyfouri_cut_pct: 0, budgeted_spend_pct: 0 })] };
world.services.push(svc('sem-tiers'), svc('sem-zero'));
const run = (id, pair) => { win.allServicesMap = world.services; win.ALL_ACCOUNTING_MAP = world.map; win.eval('calls.length = 0; toasts.length = 0;'); win.adminEditAccounting(id, pair); win.adminSaveAccountingMap(); return { sent: win.eval('calls[0] && calls[0].p_data'), toasts: win.eval('toasts.slice()'), calls: win.eval('calls.length') }; };
setTimeout(() => {
  const same = (name, id, pair) => { const stored = world.map.find(r => r.service_id === id && (r.pair_with_service_id || '') === (pair || '')); const { sent } = run(id, pair); const bad = [];
    for (const k of Object.keys(sent || {})) { if (JSON.stringify(sent[k] ?? null) !== JSON.stringify(stored[k] ?? null)) bad.push(`${k}: stored ${JSON.stringify(stored[k] ?? null)} -> saved ${JSON.stringify(sent[k])}`); }
    check('untouched save keeps everything: ' + name + (bad.length ? '   <- ' + bad.join(' | ') : ''), bad, []); };
  same('plain row, every field filled', 'sem');
  same('setup-fee service with a split', 'sem-setup');
  same('service whose setup fee is switched off but split is stored', 'td');
  same('pairing override', 'td', 'offline');
  same('separate spend / in-platform tiers with different breakpoints', 'sem-tiers');
  same('zero percentages stay zero (not blank)', 'sem-zero');
  const empty = run('sem'); // reopen with a row that has nothing stored -> simulate "Set Up"
  world.map = world.map.filter(r => r.service_id !== 'td' || r.pair_with_service_id); // td plain row does not exist
  const setUp = run('td');
  check('"Set Up" with nothing typed saves NOTHING and says so', [setUp.calls, /Nothing was entered/.test(setUp.toasts.join(' '))], [0, true]);
  const pairNew = run('td', 'td-other-pair'); // a first-time pairing override, nothing typed
  check('a new pairing override with nothing typed saves NOTHING', pairNew.calls, 0);
  win.eval("document.getElementById('admin-accounting-cut-pct').value = '40'"); win.eval('calls.length = 0'); win.adminSaveAccountingMap();
  check('a new row with one value typed DOES save', win.eval('calls.length'), 1);
  done();
}, 20);
