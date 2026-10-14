// One-time line + "+ Add month" (Daviess County YMCA case): a plain one-time fee shows in months someone added WITH an amount, nowhere else.
process.env.TZ = 'America/Chicago';
const { read, grab, check, done } = require('./lib');
global.CATALOG_ROWS = global.CATALOG_ROWS || {};
const A = read('accounting/index.html');
eval([grab(A, /function accountingMonthKey\([^\n]*\n/), grab(A, /const ACCOUNTING_ONE_TIME_BILLING_TYPES = [^\n]*\n/), grab(A, /function accountingCancelledNeverLaunched[\s\S]*?\n\}\n/),
  grab(A, /let ACCOUNTING_EXPLICIT_MONTHS_SRC[\s\S]*?\n\}\n(?=\/\/ "\+ Add month")/), grab(A, /async function accountingAddNextMonth[\s\S]*?\n\}\n/), grab(A, /function accountingIsYearlyLine[\s\S]*?\n\}\n/), grab(A, /function accountingYearlyBillsInMonth[\s\S]*?\n\}\n/), grab(A, /function accountingFlightDatesInvalid[\s\S]*?\n\}\n/), grab(A, /function accountingLineActiveInMonth[\s\S]*?\n\}\n/)].join('\n') + ';global.act=accountingLineActiveInMonth;global.add=accountingAddNextMonth;');
global.ALL_ACCOUNTING_MONTHS = []; const saved = [], toasts = [];
global.accountingSaveMonth = async (id, m, d) => { saved.push([m, d.gross_budget]); ALL_ACCOUNTING_MONTHS = [...ALL_ACCOUNTING_MONTHS, { campaign_line_id: id, month: m, gross_budget: d.gross_budget }]; };
global.showToast = (t, k) => toasts.push((k || 'ok') + ': ' + t);
const M = (y, m) => new Date(y, m - 1, 1);
const line = { id: 'L', billing_type: 'one_time', flight_start: '2026-10-01', flight_end: null, status: 'active' };
const fee = { id: 'F', billing_type: 'setup_fee', flight_start: '2026-10-01', status: 'active' };
const rec = { id: 'R', billing_type: 'recurring', flight_start: '2026-10-01', flight_end: '2026-12-31', status: 'active' };
(async () => {
  ALL_ACCOUNTING_MONTHS = [{ campaign_line_id: 'L', month: '2026-10-01', gross_budget: 599 }, { campaign_line_id: 'F', month: '2026-10-01', gross_budget: 200 }];
  check('before: Oct shows, Nov and Dec do not', [act(line, M(2026, 10)), act(line, M(2026, 11)), act(line, M(2026, 12))], [true, false, false]);
  await add('L'); await add('L'); await add('L');
  check('three adds save Nov, Dec, Jan at 599', saved, [['2026-11-01', 599], ['2026-12-01', 599], ['2027-01-01', 599]]);
  check('Oct..Jan show, Feb (not added) and Sep (before start) do not', [10, 11, 12].map(m => act(line, M(2026, m))).concat([act(line, M(2027, 1)), act(line, M(2027, 2)), act(line, M(2026, 9))]), [true, true, true, true, false, false]);
  ALL_ACCOUNTING_MONTHS.push({ campaign_line_id: 'L', month: '2027-03-01', gross_budget: null });
  check('a month row with no amount does not switch a month on', act(line, M(2027, 3)), false);
  ALL_ACCOUNTING_MONTHS.push({ campaign_line_id: 'F', month: '2026-11-01', gross_budget: 200 });
  check('setup fee stays start-month only even with a later row', [act(fee, M(2026, 10)), act(fee, M(2026, 11))], [true, false]);
  check('recurring line unchanged', [act(rec, M(2026, 10)), act(rec, M(2026, 12)), act(rec, M(2027, 1))], [true, true, false]);
  check('cancelled 11/15 (accounting-only): Nov shows, Dec hidden', [act({ ...line, accounting_only: true, status: 'cancelled', cancel_effective_date: '2026-11-15' }, M(2026, 11)), act({ ...line, accounting_only: true, status: 'cancelled', cancel_effective_date: '2026-11-15' }, M(2026, 12))], [true, false]);
  ALL_ACCOUNTING_MONTHS = []; toasts.length = 0; await add('NOPE');
  check('no amount yet -> an error message, nothing saved', toasts[0].startsWith('error:'), true);
  done();
})();
