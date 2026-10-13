// MS Farm Bureau agent lines: a flat client/group 44i Cut % beats the SEM spend tiers (2026-10-13). Everything else keeps the old order.
const { read, grab, check, done } = require('./lib');
const A = read('accounting/index.html');
global.ACCOUNTING_CUT_TIERS = { 'sem-bp': [{ max: 999.99, cut_pct: 75 }, { max: 4999.99, cut_pct: 80 }, { max: null, cut_pct: 85 }] };
global.ACCOUNTING_SPEND_TIER_TOP_OVERRIDE = { group: {} };
global.ACCOUNTING_CUT_RATES = { base: { 'sem-bp': 70, web: 50 }, group: {}, pairing: { 'stv-loc': 51 } };
global.ALL_ACCOUNTING_CLIENTS = [];
eval(grab(A, /function accountingEffectiveCutPctTier[\s\S]*?\n\}\n/) + grab(A, /function accountingEffectiveCutPct\(serviceId[\s\S]*?\n\}\n/) + ';global.C=accountingEffectiveCutPct;');
// C(service, client, group, hasModifier, gross, lineOverride, isAgentLine)
check('agent SEM $100, no flat rate set -> tier (75)', C('sem-bp', 'c', 'g', false, 100, null, true), 75);
ACCOUNTING_CUT_RATES.group['g|sem-bp'] = 85;
check('agent SEM $100, group flat 85 -> 85', C('sem-bp', 'c', 'g', false, 100, null, true), 85);
check('agent SEM $20,000, group flat 85 -> 85', C('sem-bp', 'c', 'g', false, 20000, null, true), 85);
check('NON-agent SEM $100 with the same group rate -> still tiered (75)', C('sem-bp', 'c', 'g', false, 100, null, false), 75);
check('old callers (flag missing) -> still tiered (75)', C('sem-bp', 'c', 'g', false, 100, null), 75);
ALL_ACCOUNTING_CLIENTS = [{ id: 'c', accounting_overrides: { 'sem-bp': { fortyfouri_cut_pct: 82 } } }];
check('client flat rate beats group flat rate', C('sem-bp', 'c', 'g', false, 100, null, true), 82);
check('a rate typed on the line beats everything', C('sem-bp', 'c', 'g', false, 100, 90, true), 90);
ALL_ACCOUNTING_CLIENTS = [];
check('other service on an agent line uses base rate', C('web', 'c', 'g', false, 100, null, true), 50);
check('Offline Visits pairing rate still wins', C('stv-loc', 'c', 'g', true, 100, null, true), 51);
check('group without a flat rate -> tier (80 at $2,000)', C('sem-bp', 'c', 'other', false, 2000, null, true), 80);
done();
