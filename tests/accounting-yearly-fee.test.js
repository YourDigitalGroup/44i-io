// A YEARLY fee (Hosting Fee) bills once a year in Accounting: in its start month and every 12 months after, nowhere in between.
// (Before: it showed its full amount in EVERY month of a long flight, like a monthly fee.)
process.env.TZ = 'America/Chicago';
const { read, grab, check, done } = require('./lib');
const A = read('accounting/index.html');
eval([grab(A, /function accountingMonthKey\([^\n]*\n/), grab(A, /const ACCOUNTING_ONE_TIME_BILLING_TYPES = [^\n]*\n/), grab(A, /function accountingIsYearlyLine[\s\S]*?\n\}\n/), grab(A, /function accountingYearlyBillsInMonth[\s\S]*?\n\}\n/),
  grab(A, /function accountingMonthRowFor[\s\S]*?\n\}\n/), grab(A, /function accountingMostRecentPriorMonth[\s\S]*?\n\}\n/), grab(A, /function accountingCancelledNeverLaunched[\s\S]*?\n\}\n/),
  grab(A, /let ACCOUNTING_EXPLICIT_MONTHS_SRC[\s\S]*?\n\}\n(?=\/\/ "\+ Add month")/), grab(A, /function accountingLineActiveInMonth[\s\S]*?\n\}\n/)].join('\n') + ';global.act=accountingLineActiveInMonth;global.row=accountingMonthRowFor;');
global.CATALOG_ROWS = { 'w-hosting': { billing_type: 'yearly' }, 'wm-hosting': { billing_type: 'monthly' } };
const M = (y, m) => new Date(y, m - 1, 1);
const yearly = (o = {}) => ({ id: 'Y', service_id: 'w-hosting', billing_type: 'recurring', flight_start: '2027-01-01', flight_end: '2028-12-31', status: 'active', accounting_only: true, ...o });
global.ALL_ACCOUNTING_LINES = []; global.ALL_ACCOUNTING_MONTHS = [];
const setup = (line, months) => { ALL_ACCOUNTING_LINES = [line]; ALL_ACCOUNTING_MONTHS = months; };
const show = (line, months) => months.map(([y, m]) => act(line, M(y, m)));

let L = yearly(); setup(L, [{ campaign_line_id: 'Y', month: '2027-01-01', gross_budget: 450 }]);
check('2-year flight: bills Jan 2027 and Jan 2028 only', show(L, [[2026, 12], [2027, 1], [2027, 2], [2027, 6], [2027, 12], [2028, 1], [2028, 2], [2028, 12]]), [false, true, false, false, false, true, false, false]);
check('Jan 2028 carries the $450 forward; Feb 2028 has nothing', [row('Y', M(2028, 1)).gross_budget, row('Y', M(2028, 2))], [450, null]);
check('Jan 2027 is the real row', row('Y', M(2027, 1)).gross_budget, 450);
L = yearly({ flight_end: '2027-01-31' }); setup(L, [{ campaign_line_id: 'Y', month: '2027-01-01', gross_budget: 450 }]);
check('Rollins (one-month flight): Jan shows, Feb does not', show(L, [[2027, 1], [2027, 2]]), [true, false]);
L = yearly(); setup(L, [{ campaign_line_id: 'Y', month: '2027-01-01', gross_budget: 450 }, { campaign_line_id: 'Y', month: '2027-03-01', gross_budget: 450 }]);
check('a month someone gave an amount on purpose (Mar 2027) still shows', show(L, [[2027, 2], [2027, 3], [2027, 4]]), [false, true, false]);
L = yearly({ flight_start: null, flight_end: null }); setup(L, [{ campaign_line_id: 'Y', month: '2027-01-01', gross_budget: 450 }]);
check('no start date: behaves like any recurring line (unchanged)', show(L, [[2027, 1], [2027, 7]]), [true, true]);
L = yearly({ service_id: 'wm-hosting' }); setup(L, [{ campaign_line_id: 'Y', month: '2027-01-01', gross_budget: 69 }]);
check('MONTHLY hosting (wm-hosting) is unchanged: every month shows and carries $69', [show(L, [[2027, 1], [2027, 2], [2027, 11]]), row('Y', M(2027, 6)).gross_budget], [[true, true, true], 69]);
L = yearly({ flight_start: '2027-03-15', flight_end: '2028-12-31' }); setup(L, [{ campaign_line_id: 'Y', month: '2027-03-01', gross_budget: 450 }]);
check('starts mid-March: anniversary is March each year', show(L, [[2027, 3], [2027, 4], [2028, 3], [2028, 4]]), [true, false, true, false]);
L = yearly({ status: 'cancelled', cancel_effective_date: '2027-06-30' }); setup(L, [{ campaign_line_id: 'Y', month: '2027-01-01', gross_budget: 450 }]);
check('cancelled mid-2027: Jan 2027 still shows, Jan 2028 does not', show(L, [[2027, 1], [2028, 1]]), [true, false]);
done();
