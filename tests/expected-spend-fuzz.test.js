// 120,000 random combinations (catalog, rates, tiers, forced rates, overrides, Offline Visits): Accounting Expected Spend must equal Strategist In-Platform Budget.
const { read, fn, check, done } = require('./lib');
const A = read('accounting/index.html'), S = read('strategist/index.html');
const clone = o => JSON.parse(JSON.stringify(o));
function world(seedStart) {
  let seed = seedStart; const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }; const pick = a => a[Math.floor(rnd() * a.length)]; const maybe = (p, v) => rnd() < p ? v : null;
  const catalog = {}; ['lt', 'stv', 'ottctv', 'sda', 'yt'].forEach(sec => {
    const n = 1 + Math.floor(rnd() * 3); for (let k = 0; k < n; k++) { const id = sec + '-t' + k; catalog[id] = { id, section: sec, label: 'T' + id, pricing_mode: 'spend', is_cpm_adjustment: false, retail_cpm: maybe(0.9, 10 + Math.floor(rnd() * 60)), modifier_amount: null }; }
    if (rnd() < 0.8) catalog[sec + '-offline'] = { id: sec + '-offline', section: sec, label: 'Offline Visits Tracking', pricing_mode: 'modifier', is_cpm_adjustment: true, retail_cpm: maybe(0.3, 15 + Math.floor(rnd() * 40)), modifier_amount: 2 }; });
  const tactics = Object.values(catalog).filter(r => r.pricing_mode === 'spend').map(r => r.id);
  const cpmBase = {}, cpmGroup = {}, cpmPair = {}, pctBase = {}, pctGroup = {}, pctForce = {}, tiers = {};
  tactics.forEach(id => { if (rnd() < .85) cpmBase[id] = 2 + Math.floor(rnd() * 30); if (rnd() < .5) cpmPair[id] = 2 + Math.floor(rnd() * 30); if (rnd() < .3) cpmGroup['g1|' + id] = 2 + Math.floor(rnd() * 30);
    if (rnd() < .3) pctBase[id] = 30 + Math.floor(rnd() * 50); if (rnd() < .2) pctGroup['g1|' + id] = 30 + Math.floor(rnd() * 50); if (rnd() < .1) pctForce['g1|' + id] = true; if (rnd() < .2) tiers[id] = [{ max: 1000, in_platform_pct: 50 }, { max: null, in_platform_pct: 70 }]; });
  const clients = [{ id: 'c1', group_id: 'g1', io_pricing: null, group_io_pricing: null, accounting_overrides: null }];
  tactics.forEach(id => { if (rnd() < .1) { clients[0].io_pricing = clients[0].io_pricing || {}; clients[0].io_pricing[id] = 20 + Math.floor(rnd() * 40); } if (rnd() < .1) { clients[0].group_io_pricing = clients[0].group_io_pricing || {}; clients[0].group_io_pricing[id] = 20 + Math.floor(rnd() * 40); }
    if (rnd() < .15) { clients[0].accounting_overrides = clients[0].accounting_overrides || {}; clients[0].accounting_overrides[id] = { platform_cpm: maybe(.6, 2 + Math.floor(rnd() * 30)), in_platform_pct: maybe(.6, 30 + Math.floor(rnd() * 50)), in_platform_pct_force: rnd() < .3 }; } });
  return { rnd, pick, maybe, catalog, tactics, cpmBase, cpmGroup, cpmPair, pctBase, pctGroup, pctForce, tiers, clients };
}
function setup(w) {
  global.CATALOG_ROWS = clone(w.catalog);
  global.ACCOUNTING_PLATFORM_CPM_RATES = { base: clone(w.cpmBase), group: clone(w.cpmGroup), pairing: clone(w.cpmPair) }; global.ACCOUNTING_IN_PLATFORM_PCT_RATES = { base: clone(w.pctBase), group: clone(w.pctGroup) }; global.ACCOUNTING_IN_PLATFORM_PCT_FORCE = { group: clone(w.pctForce) }; global.ACCOUNTING_IN_PLATFORM_TIERS = clone(w.tiers); global.ALL_ACCOUNTING_CLIENTS = clone(w.clients); global.accountingEffectiveBudgetedSpendPct = () => null;
  eval(['accountingEffectivePlatformCpm', 'accountingEffectiveRetailCpm', 'accountingOfflineVisitsModifier', 'accountingEffectiveInPlatformPct', 'accountingEffectiveInPlatformPctTier', 'accountingComputeExpectedSpend'].map(n => fn(A, n)).join('\n') + ';global.AC=accountingComputeExpectedSpend;');
  global.PLATFORM_CPM_RATES = { base: clone(w.cpmBase), group: clone(w.cpmGroup), pairing: clone(w.cpmPair) }; global.IN_PLATFORM_PCT_RATES = { base: clone(w.pctBase), group: clone(w.pctGroup) }; global.IN_PLATFORM_PCT_FORCE = { group: clone(w.pctForce) }; global.IN_PLATFORM_TIERS = clone(w.tiers); global.ALL_STRATEGIST_CLIENTS = clone(w.clients);
  eval(['effectivePlatformCpm', 'strategistEffectiveRetailCpm', 'strategistOfflineVisitsModifier', 'budgetedImpressions', 'effectiveInPlatformPct', 'effectiveInPlatformPctTier', 'computeInPlatformBudget', 'effectiveInPlatformBudget'].map(n => fn(S, n)).join('\n') + ';global.SPE=effectiveInPlatformBudget;');
}
const rc = x => x == null ? null : Math.round(x * 100) / 100;
for (const seedStart of [12345, 777, 9001, 424242]) {
  const w = world(seedStart); setup(w); let bad = 0, example = null;
  for (let i = 0; i < 30000; i++) {
    const svc = w.pick(w.tactics), client = w.pick(['c1', null]), group = w.pick(['g1', 'g2']), gross = w.pick([null, 0, 100, 750, 1500, 4999, 5000, 20000]);
    const off = w.rnd() < .4, addl = w.rnd() < .2, lineCpm = w.maybe(.15, 20 + Math.floor(w.rnd() * 40)), ipo = w.maybe(.05, 123.45);
    const a = AC(gross, svc, client, group, ipo, off || addl, lineCpm, 45, off), s = SPE({ gross_budget: gross, in_platform_override: ipo }, svc, client, group, off || addl, lineCpm, off);
    if (rc(a) !== rc(s)) { bad++; example = example || { svc, client, group, gross, off, addl, lineCpm, acc: rc(a), str: rc(s) }; }
  }
  check('world ' + seedStart + ': 30,000 random cases, Accounting vs Strategist differences' + (example ? ' e.g. ' + JSON.stringify(example) : ''), bad, 0);
}
done();
