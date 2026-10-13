// Offline Visits (+$2 CPM): Accounting Expected Spend and Strategist In-Platform Budget use the COMBINED CPM and agree with each other.
// Uses the real catalog + Accounting Map numbers Claire pasted on 2026-10-13 (Splash Car Wash / Geofencing / Streaming TV / OTT).
const { read, grab, fn, check, done } = require('./lib');
const A = read('accounting/index.html'), S = read('strategist/index.html');
const R = (id, section, label, retail, o = {}) => ({ id, section, label, retail_cpm: retail, pricing_mode: 'spend', is_cpm_adjustment: false, modifier_amount: null, ...o });
const mod = (id, section) => R(id, section, 'Offline Visits Tracking', null, { pricing_mode: 'modifier', is_cpm_adjustment: true, modifier_amount: 2 });
global.CATALOG_ROWS = { 'lt-geo': R('lt-geo', 'lt', 'Geofencing', 15), 'lt-crm': R('lt-crm', 'lt', 'CRM', 20), 'lt-event': R('lt-event', 'lt', 'Event', 20), 'lt-offline': mod('lt-offline', 'lt'),
  'ottctv-bp': R('ottctv-bp', 'ottctv', 'Business Pro', 62), 'ottctv-offline': mod('ottctv-offline', 'ottctv'),
  'stv-aud': R('stv-aud', 'stv', 'Audience', 46.5), 'stv-loc': R('stv-loc', 'stv', 'Location', 40), 'stv-sports': R('stv-sports', 'stv', 'Sports', 60), 'stv-offline': mod('stv-offline', 'stv'),
  'yt-out': R('yt-out', 'yt', 'Outstream', 25) };
const base = { 'lt-geo': 3, 'lt-crm': 5, 'lt-event': 5, 'ottctv-bp': 22.5, 'stv-aud': 22.5, 'stv-loc': 10, 'stv-sports': 30, 'yt-out': 3 };
const pairing = { 'lt-geo': 3.25, 'lt-crm': 3, 'lt-event': 5, 'stv-aud': 22.5, 'stv-loc': 10, 'stv-sports': 30 };
global.ACCOUNTING_PLATFORM_CPM_RATES = { base: { ...base }, group: {}, pairing: { ...pairing } }; global.PLATFORM_CPM_RATES = { base: { ...base }, group: {}, pairing: { ...pairing } };
global.ALL_ACCOUNTING_CLIENTS = []; global.ALL_STRATEGIST_CLIENTS = [];
global.accountingEffectiveInPlatformPct = () => null; global.accountingEffectiveBudgetedSpendPct = () => null; global.effectiveInPlatformPct = () => null;
eval(['accountingEffectivePlatformCpm', 'accountingEffectiveRetailCpm', 'accountingOfflineVisitsModifier', 'accountingComputeExpectedSpend'].map(n => fn(A, n)).join('\n') + ';global.AC=accountingComputeExpectedSpend;');
eval(['effectivePlatformCpm', 'strategistEffectiveRetailCpm', 'strategistOfflineVisitsModifier', 'budgetedImpressions', 'computeInPlatformBudget', 'effectiveInPlatformBudget'].map(n => fn(S, n)).join('\n') + ';global.SPE=effectiveInPlatformBudget;global.SP=computeInPlatformBudget;');
const r2 = n => n == null ? null : Math.round(n * 100) / 100;
const both = (label, svc, visits, want, lineCpm = null, addlOnly = false) => {
  const a = r2(AC(1500, svc, null, 'g', null, visits || addlOnly, lineCpm, 45, visits)), s = r2(SP(1500, svc, null, 'g', visits || addlOnly, lineCpm, visits));
  check(label + ' [Accounting]', a, want); check(label + ' [Strategist]', s, want);
};
both('Splash Streaming TV Location, no Visits', 'stv-loc', false, 375);
both('Splash Streaming TV Location WITH Visits (1500/42 x 10)', 'stv-loc', true, 357.14);
both('Geofencing WITH Visits (1500/17 x 3.25; the sheet says 286.79)', 'lt-geo', true, 286.76);
both('Audience WITH Visits', 'stv-aud', true, 695.88);
both('Sports WITH Visits', 'stv-sports', true, 725.81);
both('OTT/CTV single tactic WITH Visits (62+2)', 'ottctv-bp', true, 527.34);
both('CRM WITH Visits', 'lt-crm', true, 204.55);
both('Event WITH Visits', 'lt-event', true, 340.91);
both('section with no Visits service: unchanged', 'yt-out', true, 180);
both('a CPM typed on the campaign is never adjusted (42)', 'stv-loc', true, 357.14, 42);
both('a CPM typed on the campaign (40) stays 40', 'stv-loc', true, 375, 40);
both('Addl. Targeting only (not Visits): unchanged', 'stv-loc', false, 375, null, true);
global.ALL_ACCOUNTING_CLIENTS = [{ id: 'c1', group_id: 'g', io_pricing: { 'stv-loc': 38 } }]; global.ALL_STRATEGIST_CLIENTS = [{ id: 'c1', group_id: 'g', io_pricing: { 'stv-loc': 38 } }];
check('client custom CPM 38 + Visits -> 40 [Accounting]', r2(AC(1500, 'stv-loc', 'c1', 'g', null, true, null, 45, true)), 375);
check('client custom CPM 38 + Visits -> 40 [Strategist]', r2(SP(1500, 'stv-loc', 'c1', 'g', true, null, true)), 375);
global.ALL_ACCOUNTING_CLIENTS = []; global.ALL_STRATEGIST_CLIENTS = [];
check('a manual in-platform override still wins [Accounting]', r2(AC(1500, 'stv-loc', null, 'g', 123.45, true, null, 45, true)), 123.45);
check('a manual in-platform override still wins [Strategist]', r2(SPE({ gross_budget: 1500, in_platform_override: 123.45 }, 'stv-loc', null, 'g', true, null, true)), 123.45);
done();
