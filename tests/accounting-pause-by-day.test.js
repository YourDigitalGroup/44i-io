// Accounting: month-aware status and pauses counted BY THE DAY (2026-10-14, Claire: "by day that is paused is the correct way to look at it").
// Before: Accounting read only a line's CURRENT status for every month, so a finished campaign dropped out of the months it ran (and on Nov 1 every
// campaign ending Oct 31 would have dropped out of OCTOBER the moment it auto-completed).
process.env.TZ = 'America/Chicago';
const { read, grab, check, done } = require('./lib');
const A = read('accounting/index.html'), S = read('strategist/index.html');
const block = A.slice(A.indexOf('let ALL_ACCOUNTING_STATUS_HISTORY'), A.indexOf('async function loadAccountingDashboard'));
if (!block.includes('function accountingComputeTileTotals')) throw new Error('MISSING in the page source: the month-aware status block');
global.CATALOG_ROWS = {};
eval([block, grab(A, /function accountingRowNeedsConfirmation[\s\S]*?\n\}\n/), grab(A, /function accountingAwaitingParts[\s\S]*?\n\}\n/), grab(A, /function accountingSplitInvoiceable[\s\S]*?\n\}\n/), grab(A, /function accountingRowIsPending[\s\S]*?\n\}\n/)].join('\n') +
  ';global.setHist=(h,l)=>{ALL_ACCOUNTING_STATUS_HISTORY=h;ACCOUNTING_HISTORY_LOADED=l;accountingIndexStatusHistory();};global.act=accountingMonthActivity;global.onDay=accountingStatusOnDay;global.tiles=accountingComputeTileTotals;');
const M = (y, m) => new Date(y, m - 1, 1);
const at = (y, m, d, h = 12) => new Date(y, m - 1, d, h, 0, 0).toISOString();
const chg = (line, when, from, to) => ({ campaign_line_id: line, changed_at: when, old_status: from, new_status: to });
const near = (a, b) => Math.abs(a - b) < 1e-9;

// 1. a campaign that ends Oct 31 and is auto-completed Nov 1 still counts for ALL of October (the Nov 1 deadline problem)
let L = { id: 'A', status: 'complete', flight_start: '2026-06-01', flight_end: '2026-10-31' };
setHist([chg('A', at(2026, 11, 1), 'active', 'complete')], true);
let r = act(L, M(2026, 10), null);
check('ends Oct 31, auto-completed Nov 1: October counts in FULL (not paused, not "complete")', [r.fraction, r.paused, r.isComplete, r.activeDays, r.eligibleDays], [1, false, false, 31, 31]);
check('the same line before history existed would have been dropped from October (old rule)', (setHist([], true), act(L, M(2026, 10), null).fraction), 0);

// 2. marked Complete EARLY (client left) on Sep 15, flight to Dec 31
L = { id: 'B', status: 'complete', flight_start: '2026-06-01', flight_end: '2026-12-31' };
setHist([chg('B', at(2026, 9, 15), 'active', 'complete')], true);
check('Complete on Sep 15: August full, September 14 of 30 days, October and later none (and shown as Complete)',
  [act(L, M(2026, 8), null).fraction, near(act(L, M(2026, 9), null).fraction, 14 / 30), act(L, M(2026, 10), null).fraction, act(L, M(2026, 10), null).isComplete, act(L, M(2026, 12), null).paused], [1, true, 0, true, true]);

// 3. paused Mar 10, resumed Mar 20 (a status Pause: the history holds the click time)
L = { id: 'C', status: 'active', flight_start: '2026-01-01', flight_end: '2026-12-31' };
setHist([chg('C', at(2026, 3, 10), 'active', 'paused'), chg('C', at(2026, 3, 20), 'paused', 'active')], true);
r = act(L, M(2026, 3), null);
check('paused Mar 10, resumed Mar 20: March counts 21 of 31 days (10 paused days); Feb and Apr are full', [r.activeDays, r.eligibleDays, near(r.fraction, 21 / 31), act(L, M(2026, 2), null).fraction, act(L, M(2026, 4), null).fraction], [21, 31, true, 1, 1]);
// 4. two pauses in one month, and a pause that spans a month boundary
setHist([chg('C', at(2026, 3, 5), 'active', 'paused'), chg('C', at(2026, 3, 8), 'paused', 'active'), chg('C', at(2026, 3, 25), 'active', 'paused'), chg('C', at(2026, 4, 5), 'paused', 'active')], true);
check('two pauses in March (3 days + 7 days): 21 of 31 days; April lost its first 4 days (26 of 30)', [act(L, M(2026, 3), null).activeDays, act(L, M(2026, 4), null).activeDays], [21, 26]);
// 5. a change late in the evening counts for that local day, the LAST change of a day wins
setHist([chg('C', new Date(2026, 2, 10, 23, 30).toISOString(), 'active', 'paused'), chg('C', new Date(2026, 2, 12, 9, 0).toISOString(), 'paused', 'active'), chg('C', new Date(2026, 2, 12, 17, 0).toISOString(), 'active', 'paused'), chg('C', at(2026, 3, 14), 'paused', 'active')], true);
check('status is the one at the END of the day: Mar 10 (paused 11:30pm) counts paused, Mar 12 (active then paused again) counts paused', [onDay(L, '2026-03-09'), onDay(L, '2026-03-10'), onDay(L, '2026-03-12'), onDay(L, '2026-03-14')], ['active', 'paused', 'paused', 'active']);

// 6. flights: only days inside the flight count, so a mid-month start/end still bills the month as it always did
L = { id: 'D', status: 'active', flight_start: '2026-03-15', flight_end: '2026-05-10' };
setHist([chg('D', at(2026, 1, 1), 'pending', 'active')], true);
check('mid-month start/end is NOT prorated (only pauses are): March, April and May all count full', [3, 4, 5].map(m => act(L, M(2026, m), null).fraction), [1, 1, 1]);
setHist([chg('D', at(2026, 4, 10), 'active', 'paused'), chg('D', at(2026, 4, 20), 'paused', 'active')], true);
check('a pause is counted against the days the line was eligible (Apr 1-30: 10 paused days -> 20 of 30)', [act(L, M(2026, 4), null).activeDays, act(L, M(2026, 4), null).eligibleDays], [20, 30]);

// 7. old behaviour kept when there is nothing to go on
L = { id: 'E', status: 'paused', flight_start: '2026-01-01', flight_end: '2026-12-31' };
setHist([], true);
check('a line with NO history keeps the old rule: its current status applies to every month', [act(L, M(2026, 3), null).paused, act({ ...L, status: 'active' }, M(2026, 3), null).paused], [true, false]);
setHist([chg('E', at(2026, 3, 10), 'active', 'paused')], false);
check('history that did NOT load: old rule everywhere (never guesses)', [act(L, M(2026, 1), null).paused, act({ ...L, status: 'active' }, M(2026, 1), null).paused], [true, false]);
// 8. a month's own "paused" checkbox always means the whole month is off
L = { id: 'F', status: 'active', flight_start: '2026-01-01', flight_end: '2026-12-31' };
setHist([chg('F', at(2025, 12, 1), 'pending', 'active')], true);
check('a month marked paused on its own is off for the whole month, with or without history', [act(L, M(2026, 3), { paused: true }).fraction, act({ ...L, id: 'NOHIST' }, M(2026, 3), { paused: true }).fraction], [0, 0]);
// 9. cancelled / pending are not touched by this rule
setHist([chg('F', at(2026, 3, 10), 'active', 'cancelled')], true);
check('a cancelled line is NOT reduced by this rule (cancel billing is Kim\'s open question; Accounting\'s cancel-date rule still applies)', act(L, M(2026, 3), null).fraction, 1);

// 10. parity with Strategist: the status at month end is the same answer in both portals
global.ALL_STATUS_HISTORY = [];
const stratFn = new Function('ALL_STATUS_HISTORY', grab(S, /function strategistHistoricalStatus[\s\S]*?\n\}\n/) + '; return strategistHistoricalStatus;');
const lines = [{ id: 'P1', status: 'complete' }, { id: 'P2', status: 'active' }, { id: 'P3', status: 'paused' }, { id: 'P4', status: 'active' }];
const hist = [chg('P1', at(2026, 9, 15), 'active', 'complete'), chg('P2', at(2026, 3, 10), 'active', 'paused'), chg('P2', at(2026, 3, 20), 'paused', 'active'),
  chg('P3', at(2026, 6, 30, 23), 'active', 'paused'), chg('P3', at(2026, 7, 1, 0), 'paused', 'active'), chg('P3', at(2026, 7, 31, 12), 'active', 'paused'), chg('P4', at(2026, 5, 31, 23), 'pending', 'active')];
setHist(hist, true);
const strat = stratFn(hist); let mismatches = [];
lines.forEach(line => { for (let m = 1; m <= 12; m++) { const monthEndIso = new Date(2026, m, 0); const a = onDay(line, accountingLocalDayIso(monthEndIso)), b = strat(line, M(2026, m)); if (a !== b) mismatches.push(line.id + ' month ' + m + ': accounting ' + a + ' vs strategist ' + b); } });
check('Accounting and Strategist give the SAME status at the end of every month (4 lines x 12 months)', mismatches, []);

// 11. the tiles: per child line, scaled by the days it ran; actual spend is never scaled
const child = (o) => ({ gross: 1000, expectedSpend: 800, actualSpend: null, confirmed: true, paused: false, fraction: 1, split: { fortyfouri: 750 }, line: { billed_externally: false, status: 'active' }, ...o });
const rows = [
  child({}),                                                                       // running all month
  child({ fraction: 21 / 31, activeDays: 21, eligibleDays: 31, actualSpend: 500 }), // ran 21 of 31 days
  child({ paused: true, fraction: 0 }),                                             // not running
  { isRollup: true, children: [child({}), child({ paused: true, fraction: 0 }), child({ fraction: 0.5, confirmed: false })], line: { status: 'active' } }, // rollup: one running, one off, one half
  { ...child({}), line: { status: 'pending', billed_externally: false } },          // pending: excluded
  child({ line: { billed_externally: true, status: 'active' } })                    // billed externally: counted in gross, 44i part goes to SSH
];
const T = tiles(rows);
const f1 = 21 / 31;
check('tiles: gross = full + part-month + running rollup children (the paused child adds nothing, the half child half), pending excluded',
  near(T.gross, 1000 + 1000 * f1 + 0 + (1000 + 0 + 500) + 0 + 1000), true);
check('tiles: 44i revenue scales the same way; the billed-externally line goes to SSH instead', [near(T.fortyfouri, 750 + 750 * f1 + (750 + 375)), near(T.billedExternally, 750)], [true, true]);
check('tiles: actual spend is the real number entered, NOT scaled', T.actualSpend, 500);
check('tiles: only the unconfirmed half-month child is "awaiting confirmation"', [near(T.awaitingGross, 500), near(T.awaitingFortyfouri, 375)], [true, true]);
check('tiles with nothing paused look exactly like before (every fraction 1)', (() => { const t = tiles([child({}), child({ gross: 200, expectedSpend: 100, split: { fortyfouri: 50 } })]); return [t.gross, t.expectedSpend, t.fortyfouri]; })(), [1200, 900, 800]);
done();
