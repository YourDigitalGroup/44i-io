// 2026-10-14 logic audit, batch 1A: Accounting (and Companion) logic that disagreed with common sense.
process.env.TZ = 'America/Chicago';
const { read, grab, check, done } = require('./lib');
const A = read('accounting/index.html');
global.CATALOG_ROWS = { 'w-hosting': { billing_type: 'yearly' }, 'w-setup': { billing_type: 'one_time' }, 'w-mon': { billing_type: 'monthly' } };
global.esc = s => String(s);
eval([grab(A, /function accountingMonthKey\([^\n]*\n/), grab(A, /function accountingTodayIso[^\n]*\n/), grab(A, /const ACCOUNTING_ONE_TIME_BILLING_TYPES = [^\n]*\n/),
  grab(A, /function accountingIsYearlyLine[\s\S]*?\n\}\n/), grab(A, /function accountingYearlyBillsInMonth[\s\S]*?\n\}\n/),
  grab(A, /function accountingFlightDatesInvalid[\s\S]*?\n\}\n/), grab(A, /function accountingFlightDatesProblemText[\s\S]*?\n\}\n/), grab(A, /function accountingCheckDatesTag[\s\S]*?\n\}\n/),
  grab(A, /function accountingCancelledNeverLaunched[\s\S]*?\n\}\n/), grab(A, /let ACCOUNTING_EXPLICIT_MONTHS_SRC[\s\S]*?\n\}\n(?=\/\/ "\+ Add month")/), grab(A, /function accountingLineActiveInMonth[\s\S]*?\n\}\n/),
  grab(A, /function accountingRowNeedsConfirmation[\s\S]*?\n\}\n/), grab(A, /function accountingAwaitingParts[\s\S]*?\n\}\n/),
  grab(A, /function accountingDerivedBillingType[\s\S]*?\n\}\n/), grab(A, /function accountingImportBillingType[\s\S]*?\n\}\n/)].join('\n') +
  ';global.act=accountingLineActiveInMonth;global.awaiting=accountingAwaitingParts;global.today=accountingTodayIso;global.tag=accountingCheckDatesTag;global.imp=accountingImportBillingType;global.bad=accountingFlightDatesInvalid;');
global.ALL_ACCOUNTING_MONTHS = [];
const M = (y, m) => new Date(y, m - 1, 1);
// --- 1. end before start (mistyped year) ---
const L = { id: 'L', service_id: 'w-mon', billing_type: 'recurring', flight_start: '2026-10-01', flight_end: '2026-03-31', status: 'active' };
ALL_ACCOUNTING_MONTHS = [{ campaign_line_id: 'L', month: '2026-10-01', gross_budget: 1000 }, { campaign_line_id: 'L', month: '2026-12-01', gross_budget: 1000 }];
check('end before start: the line is detected', [bad(L.flight_start, L.flight_end), bad('2026-10-01', '2026-12-31'), bad('2026-10-01', null), bad('2026-10-01', '0202-12-31')], [true, false, false, false]);
check('end before start: shows in its start month and in a month with its own amount, NOT every month (no invented billing)', [10, 11, 12].map(m => act(L, M(2026, m))).concat([act(L, M(2027, 1)), act(L, M(2026, 9))]), [true, false, true, false, false]);
check('end before start: a "CHECK DATES" badge appears; a normal line has none', [/CHECK DATES/.test(tag(L)), tag({ flight_start: '2026-10-01', flight_end: '2026-12-31' })], [true, '']);
// --- 2. last evening of the month ---
const RealDate = Date; const fakeNow = new RealDate(2026, 9, 31, 20, 0, 0); // Oct 31 2026, 8pm Central (= Nov 1 01:00 UTC)
global.Date = class extends RealDate { constructor(...a) { if (a.length === 0) super(fakeNow.getTime()); else super(...a); } static now() { return fakeNow.getTime(); } };
const startMonth = eval(grab(A, /\(\(\) => \{ const n = new Date\(\); return new Date\(n\.getFullYear\(\), n\.getMonth\(\), 1\); \}\)\(\)/));
check('Oct 31, 8pm Central: Accounting opens on OCTOBER (not November)', [accountingMonthKey(startMonth), today()], ['2026-10', '2026-10-31']);
global.Date = RealDate;
// --- 3. a rollup with one unconfirmed child ---
const child = (gross, exp, ff, confirmed, ext = false) => ({ gross, expectedSpend: exp, split: { fortyfouri: ff }, confirmed, line: { billed_externally: ext } });
const roll = { isRollup: true, children: [child(100, 80, 75, true), child(100, 80, 75, true), child(100, 80, 75, false)] };
check('rollup with 2 confirmed + 1 unconfirmed: only the unconfirmed child is "awaiting"', awaiting(roll), { gross: 100, expectedSpend: 80, fortyfouri: 75 });
check('rollup, all confirmed: nothing awaiting', awaiting({ isRollup: true, children: [child(100, 80, 75, true), child(100, 80, 75, true)] }), { gross: 0, expectedSpend: 0, fortyfouri: 0 });
check('rollup, none confirmed: everything awaiting (as before)', awaiting({ isRollup: true, children: [child(100, 80, 75, false), child(200, 160, 150, false)] }), { gross: 300, expectedSpend: 240, fortyfouri: 225 });
check('rollup: an unconfirmed child billed externally is not awaiting', awaiting({ isRollup: true, children: [child(100, 80, 75, false, true), child(100, 80, 75, true)] }), { gross: 0, expectedSpend: 0, fortyfouri: 0 });
check('a plain unconfirmed row is all awaiting; a confirmed one is not', [awaiting({ isRollup: false, gross: 500, expectedSpend: 400, split: { fortyfouri: 375 }, confirmed: false, line: {} }), awaiting({ isRollup: false, gross: 500, confirmed: true, line: {}, split: {} })],
  [{ gross: 500, expectedSpend: 400, fortyfouri: 375 }, { gross: 0, expectedSpend: 0, fortyfouri: 0 }]);
// --- 4. bulk import billing type ---
check('import: "One Time" / "one-time" / "ONE_TIME" are one-time', ['One Time', 'one-time', 'ONE_TIME', ' one time '].map(t => imp(t, 'w-mon')), ['one_time', 'one_time', 'one_time', 'one_time']);
check('import: a missing column follows the CATALOG (one-time service -> one-time, monthly -> recurring)', [imp(null, 'w-setup'), imp('', 'w-mon'), imp('monthly', 'w-mon')], ['one_time', 'recurring', 'recurring']);
// --- 5. Companion reads billing_type and says /yr ---
const C = read('companion/index.html');
check('Companion: asks the catalog for billing_type and prints "/yr" for a yearly fee', [/select=id,billing_type,/.test(C), /svc\._isYearly \? '\/yr' : '\/mo'/.test(C)], [true, true]);
// --- 6. Accounting add-service refuses end before start ---
check('Accounting add-service refuses an end date before the start date', /accountingFlightDatesInvalid\(flightStart, flightEndTyped\)\) \{ showToast/.test(A), true);
done();
