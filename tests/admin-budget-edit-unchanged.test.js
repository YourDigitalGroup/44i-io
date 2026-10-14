// Order Detail > Edit budget: saving the SAME budget must not re-write months (which clears paused months in whole-campaign-total mode),
// re-spread a flat rate, or post a "changed from $X to $X" comment. A real change must still save.
const { read, fn, check, done } = require('./lib');
const admin = read('admin/index.html');
const u = new Function(fn(admin, 'adminBudgetUnchanged') + '; return adminBudgetUnchanged;')();
const months = (...a) => a.map(([month, amount, paused]) => ({ month, amount, paused: !!paused }));
const m3 = months(['2027-01', 1000], ['2027-02', 1000, true], ['2027-03', 1000]);
check('monthly: same rate = unchanged', u('monthly', 'monthly', { spend: 750 }, { rate: 750 }), true);
check('monthly: same rate typed with cents noise = unchanged', u('monthly', 'monthly', { spend: 750 }, { rate: 750.0 }), true);
check('monthly: a different rate IS a change', u('monthly', 'monthly', { spend: 750 }, { rate: 800 }), false);
check('total: same split (even with a PAUSED month stored) = unchanged, so the pause is not wiped', u('total', 'total', { month_budgets: m3 }, { split: months(['2027-01', 1000], ['2027-02', 1000], ['2027-03', 1000]) }), true);
check('total: a different total IS a change', u('total', 'total', { month_budgets: m3 }, { split: months(['2027-01', 1100], ['2027-02', 1100], ['2027-03', 1100]) }), false);
check('total: changed flight (different months) IS a change', u('total', 'total', { month_budgets: m3 }, { split: months(['2027-01', 1500], ['2027-02', 1500]) }), false);
check('custom: identical rows incl. pause flags = unchanged', u('custom', 'custom', { month_budgets: m3 }, { rows: months(['2027-01', 1000], ['2027-02', 1000, true], ['2027-03', 1000]) }), true);
check('custom: a month un-paused IS a change', u('custom', 'custom', { month_budgets: m3 }, { rows: months(['2027-01', 1000], ['2027-02', 1000], ['2027-03', 1000]) }), false);
check('custom: one amount edited IS a change', u('custom', 'custom', { month_budgets: m3 }, { rows: months(['2027-01', 1000], ['2027-02', 1200, true], ['2027-03', 1000]) }), false);
check('switching mode IS a change even if numbers match', u('total', 'monthly', { spend: 1000, month_budgets: [] }, { split: [] }), false);
check('cents compare exactly: 333.33 vs 333.34 differs', u('custom', 'custom', { month_budgets: months(['2027-01', 333.33]) }, { rows: months(['2027-01', 333.34]) }), false);
check('the Save path uses it: no-change toast, empty save list, and the "changed from" line only when something changed',
  [/Nothing was changed, so nothing was saved\./.test(admin), /if \(budgetUnchanged\) \{\s*saves\.length = 0;/.test(admin), /const descriptions = budgetUnchanged \? \[\] :/.test(admin)], [true, true, true]);
done();
