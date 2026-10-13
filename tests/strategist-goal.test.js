// Strategist Goal (impressions) with Offline Visits: budget / (retail + $2) x 1000; typed goals and other cases unchanged.
const { read, fn, check, done } = require('./lib');
const S = read('strategist/index.html');
global.ALL_STRATEGIST_CLIENTS = []; global.parseGoalOverride = () => null; global.effectiveCpcRange = () => null; global.effectiveInPlatformPct = () => null; global.effectivePlatformCpm = (s, c, g, m) => m ? 40.5 : 38.5;
const R = (id, section, label, retail, o = {}) => ({ id, section, label, active: true, pricing_mode: 'spend', is_cpm_adjustment: false, retail_cpm: retail, modifier_amount: null, ...o });
global.CATALOG_ROWS = { 'stv-loc': R('stv-loc', 'stv', 'Location', 40), 'stv-aud': R('stv-aud', 'stv', 'Audience', 45), 'stv-offline': R('stv-offline', 'stv', 'Offline Visits Tracking', null, { pricing_mode: 'modifier', is_cpm_adjustment: true, modifier_amount: 2 }),
  'ott-one': R('ott-one', 'ott', 'OTT One', 30), 'ott-offline': R('ott-offline', 'ott', 'Offline Visits Tracking', null, { pricing_mode: 'modifier', is_cpm_adjustment: true, modifier_amount: 2, retail_cpm: 33.5 }),
  'sda-one': R('sda-one', 'sda', 'Social Display', 20), 'sda-offline': R('sda-offline', 'sda', 'Offline Visits Tracking', null, { pricing_mode: 'modifier', is_cpm_adjustment: true, modifier_amount: 3 }),
  'web-x': R('web-x', 'web', 'Web X', 25), 'yt-bp': R('yt-bp', 'yt', 'YouTube TV', 50), 'yttv-addl': R('yttv-addl', 'yt', 'Addl. Targeting', null, { pricing_mode: 'modifier', modifier_amount: 15 }), 'sem-bp': R('sem-bp', 'sem', 'SEM', null) };
eval([fn(S, 'strategistEffectiveRetailCpm'), fn(S, 'strategistOfflineVisitsModifier'), fn(S, 'budgetedImpressions'), fn(S, 'computeGoal'), fn(S, 'computeGoalTotal'), fn(S, 'computeInPlatformBudget')].join('\n') + ';global.G=computeGoal;global.GT=computeGoalTotal;global.IP=computeInPlatformBudget;');
const L = o => ({ service_id: 'stv-loc', client_id: null, group_id: 'g1', has_offline_visits: false, retail_cpm_override: null, ...o }); const f = n => n == null ? null : Math.round(n);
check('Splash $1,500 WITH Visits -> 35,714', f(G(L({ has_offline_visits: true }), { gross_budget: 1500 }).value), 35714);
check('Splash $1,500 without Visits -> 37,500', f(G(L(), { gross_budget: 1500 }).value), 37500);
check('Audience 45 + 2', f(G(L({ service_id: 'stv-aud', has_offline_visits: true }), { gross_budget: 1410 }).value), 30000);
check('single-tactic section, modifier has its own retail (33.5)', f(G(L({ service_id: 'ott-one', has_offline_visits: true }), { gross_budget: 3350 }).value), 100000);
check('single-tactic section, 20 + 3', f(G(L({ service_id: 'sda-one', has_offline_visits: true }), { gross_budget: 2300 }).value), 100000);
check('no Visits service in the section -> plain CPM', f(G(L({ service_id: 'web-x', has_offline_visits: true }), { gross_budget: 2500 }).value), 100000);
check('billed Addl. Targeting is never picked', f(G(L({ service_id: 'yt-bp', has_offline_visits: true }), { gross_budget: 5000 }).value), 100000);
check('a CPM typed on the campaign (42) is not adjusted', f(G(L({ has_offline_visits: true, retail_cpm_override: 42 }), { gross_budget: 1500 }).value), 35714);
check('whole-campaign total, 3 x $1,500 WITH Visits', GT(L({ has_offline_visits: true }), [{ gross_budget: 1500 }, { gross_budget: 1500 }, { gross_budget: 1500 }]).display, '107,143');
check('whole-campaign total without Visits', GT(L(), [{ gross_budget: 1500 }, { gross_budget: 1500 }, { gross_budget: 1500 }]).display, '112,500');
check('SEM (clicks based) has no impressions goal', G({ service_id: 'sem-bp', group_id: 'g1' }, { gross_budget: 1000 }).value, null);
done();
