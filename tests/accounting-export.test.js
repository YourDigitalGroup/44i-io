// Export CSV: one row per line, 44i revenue per month computed the way the screen does it.
process.env.TZ = 'America/Chicago';
const { read, grab, check, done } = require('./lib');
global.CATALOG_ROWS = global.CATALOG_ROWS || {};
const A = read('accounting/index.html');
const block = A.slice(A.indexOf('let ALL_ACCOUNTING_STATUS_HISTORY'), A.indexOf('async function loadAccountingDashboard'));
eval(['let accountingCurrentMonth = new Date(2026, 9, 1);', block, grab(A, /function accountingRowNeedsConfirmation[\s\S]*?\n\}\n/), grab(A, /function accountingAwaitingParts[\s\S]*?\n\}\n/), grab(A, /function accountingSplitInvoiceable[\s\S]*?\n\}\n/), grab(A, /function accountingRowIsPending[\s\S]*?\n\}\n/), grab(A, /function accountingBuildRows\(\) \{[\s\S]*?return rows\.sort[^\n]*\n\}\n/),grab(A, /function accountingMonthKey\([^\n]*\n/), grab(A, /const ACCOUNTING_ONE_TIME_BILLING_TYPES = [^\n]*\n/), grab(A, /function accountingCancelledNeverLaunched[\s\S]*?\n\}\n/),
  grab(A, /let ACCOUNTING_EXPLICIT_MONTHS_SRC[\s\S]*?\n\}\n(?=\/\/ "\+ Add month")/), grab(A, /function accountingIsYearlyLine[\s\S]*?\n\}\n/), grab(A, /function accountingYearlyBillsInMonth[\s\S]*?\n\}\n/), grab(A, /function accountingFlightDatesInvalid[\s\S]*?\n\}\n/), grab(A, /function accountingLineActiveInMonth[\s\S]*?\n\}\n/),
  grab(A, /function accountingMonthRowFor[\s\S]*?\n\}\nfunction accountingMostRecentPriorMonth[\s\S]*?\n\}\n/), grab(A, /function accountingSplitRevenue[\s\S]*?\n\}\n/),
  grab(A, /const ACCOUNTING_EXCLUDED_TACTIC_LABELS = [^\n]*\n/), grab(A, /function accountingExportCsv\(\) \{[\s\S]*?\n\}\n(?=\nfunction accountingStatusPill)/)].join('\n') + ';global.exp=accountingExportCsv;global.setHist=(h,l)=>{ALL_ACCOUNTING_STATUS_HISTORY=h;ACCOUNTING_HISTORY_LOADED=l;accountingIndexStatusHistory();};global.tiles=accountingComputeTileTotals;global.EXC=ACCOUNTING_EXCLUDED_TACTIC_LABELS;global.setMonth=d=>{accountingCurrentMonth=d;};global.buildRows=accountingBuildRows;');
let blobText = null, dl = null, toasts = [];
global.URL = { createObjectURL: b => { blobText = b.__t; return 'blob:x'; } }; global.Blob = class { constructor(p) { this.__t = p.join(''); } };
global.document = { createElement: () => ({ click() { dl = this.download; }, remove() {} }), body: { appendChild() {} } }; global.showToast = (t, k) => toasts.push((k || 'ok') + ': ' + t);
global.accountingComputeExpectedSpend = () => null; global.accountingClosedMonthInfo = () => null; global.accountingGroupFilter = ''; global.accountingEffectiveCutPct = (svc, cl, g, mod, gross, ov) => ov != null ? ov : (svc === 'nocut' ? null : (gross != null && gross >= 1000 ? 40 : 50)); global.accountingEffectiveSetupFeeCutPct = () => 50;
const L = o => ({ client_id: 'c', group_id: 'g', billing_type: 'spend', status: 'active', ...o });
global.ALL_ACCOUNTING_LINES = [
  L({ id: 'spend', group_name: 'Grp A', client_name: 'Acme, Inc.', tactic_label: 'SEM', service_id: 'sem', flight_start: '2026-08-01', flight_end: '2026-12-31' }),
  L({ id: 'flat', group_name: 'Grp A', client_name: 'Acme, Inc.', tactic_label: 'Hosting', service_id: 'host', billing_type: 'recurring', accounting_only: true, flight_start: '2026-08-01', flight_end: null }),
  L({ id: 'once', group_name: 'Grp A', client_name: 'Beta "B"', tactic_label: 'Website One-Time — Content', service_id: 'w-content', billing_type: 'one_time', accounting_only: true, flight_start: '2026-10-01' }),
  L({ id: 'setup', group_name: 'Grp A', client_name: 'Beta "B"', tactic_label: 'SEM — Setup Fee', service_id: 'sem', billing_type: 'setup_fee', accounting_only: true, flight_start: '2026-10-09' }),
  L({ id: 'agent', group_name: 'Grp B', client_name: 'MS Farm Bureau Agents', tactic_label: 'SEM', service_id: 'sem', agent_name: 'Ann Lee', county: 'Hinds', flight_start: '2026-08-01', flight_end: '2026-12-31', status: 'complete' }),
  L({ id: 'nocut', group_name: 'Grp B', client_name: '=cmd|calc', tactic_label: 'NoCut', service_id: 'nocut', flight_start: '2026-09-01', flight_end: '2026-10-31', billed_externally: true }),
  L({ id: 'llo', group_name: 'Grp A', client_name: 'Acme, Inc.', tactic_label: 'LLO (SEO)', service_id: 'seo-bp', flight_start: '2026-08-01' }),
  L({ id: 'canc', group_name: 'Grp A', client_name: 'Zed', tactic_label: 'SEM', service_id: 'sem', flight_start: '2026-08-01', flight_end: '2026-12-31', status: 'cancelled', cancel_effective_date: '2026-10-15', accounting_only: true })];
const M = (id, m, g, x = {}) => ({ campaign_line_id: id, month: m + '-01', gross_budget: g, ...x });
global.ALL_ACCOUNTING_MONTHS = [M('spend', '2026-08', 500), M('spend', '2026-09', 500), M('spend', '2026-10', 1200), M('spend', '2026-12', 500), M('flat', '2026-08', 100), M('once', '2026-10', 599), M('once', '2026-11', 599), M('setup', '2026-10', 200),
  M('agent', '2026-08', 100), M('agent', '2026-09', 100), M('nocut', '2026-09', 50), M('nocut', '2026-10', 50), M('llo', '2026-08', 999), M('canc', '2026-08', 300), M('canc', '2026-10', 300)];
const parse = t => t.replace(/^﻿/, '').split('\r\n').map(r => r.match(/("([^"]|"")*")/g).map(c => c.slice(1, -1).replace(/""/g, '"')));
exp(); let rows = parse(blobText); const head = rows[0], body = rows.slice(1); const by = (client, tactic) => body.find(r => r[1] === client && r[2].startsWith(tactic)); const NM = 5; const months = r => r.slice(17, 17 + NM); const counted = r => r.slice(17 + NM, 17 + 2 * NM); const awaiting = r => r.slice(17 + 2 * NM, 17 + 3 * NM);
check('months run Aug..Dec 2026, then the same months again as Counted', [head.slice(17, 22), head.slice(22, 27), head.slice(27)], [['2026-08', '2026-09', '2026-10', '2026-11', '2026-12'], ['Counted 2026-08', 'Counted 2026-09', 'Counted 2026-10', 'Counted 2026-11', 'Counted 2026-12'], ['Awaiting 2026-08', 'Awaiting 2026-09', 'Awaiting 2026-10', 'Awaiting 2026-11', 'Awaiting 2026-12']]);
body.pop(); body.pop();
check('7 lines exported (LLO left out)', body.length, 7);
check('spend line: carried-forward Nov uses Oct\'s amount at the 40% tier', months(by('Acme, Inc.', 'SEM')), ['250', '250', '480', '480', '250']);
check('recurring flat line carries forward', months(by('Acme, Inc.', 'Hosting')), ['50', '50', '50', '50', '50']);
check('one-time line: only its added months', months(by('Beta "B"', 'Website')), ['', '', '299.5', '299.5', '']);
check('setup fee: start month only', months(by('Beta "B"', 'SEM — Setup')), ['', '', '100', '', '']);
check('cancelled 10/15: hidden after its cancel month', months(by('Zed', 'SEM')), ['150', '150', '150', '', '']);
check('line with no cut % has blank cells', months(by("'=cmd|calc", 'NoCut')), ['', '', '', '', '']);
check('a text starting with = is guarded against spreadsheet formulas', !!by("'=cmd|calc", 'NoCut'), true);
check('commas and quotes in names survive', [!!by('Acme, Inc.', 'SEM'), !!by('Beta "B"', 'Website')], [true, true]);
check('agent line carries Agent and County columns', [by('MS Farm Bureau Agents', 'SEM')[4], by('MS Farm Bureau Agents', 'SEM')[5]], ['Ann Lee', 'Hinds']);
global.accountingGroupFilter = 'Grp B'; exp(); rows = parse(blobText);
check('group filter narrows the lines and the months', [rows.length - 3, rows[0].slice(17, 20)], [2, ['2026-08', '2026-09', '2026-10']]);
global.accountingGroupFilter = 'Nobody'; toasts.length = 0; blobText = null; exp();
check('empty group -> message, no file', [toasts[0].startsWith('error:'), blobText], [true, null]);
// ── COUNTED columns + TOTAL row: must reproduce the screen's 44i Revenue tile (accountingComputeTileTotals) ──
global.accountingGroupFilter = ''; setHist([], true); exp(); rows = parse(blobText);
const bodyAll = rows.slice(1, -2);
const cby = (client, tactic) => counted(bodyAll.find(r => r[1] === client && r[2].startsWith(tactic)));
check('an ordinary line: Counted equals its 44i revenue', cby('Acme, Inc.', 'SEM'), ['250', '250', '480', '480', '250']);
check('a line billed externally counts nothing (the screen leaves it out of the 44i tile)', cby("'=cmd|calc", 'NoCut'), ['', '', '', '', '']);
global.ALL_ACCOUNTING_LINES.push(L({ id: 'ext', client_id: 'cx', group_name: 'Grp A', client_name: 'Ext Co', tactic_label: 'SEM', service_id: 'sem', flight_start: '2026-08-01', flight_end: '2026-12-31', billed_externally: true }), L({ id: 'pend', client_id: 'cp', group_name: 'Grp A', client_name: 'Pend Co', tactic_label: 'SEM', service_id: 'sem', flight_start: '2026-08-01', flight_end: '2026-12-31', status: 'pending' }), L({ id: 'part', client_id: 'cq', group_name: 'Grp A', client_name: 'Part Co', tactic_label: 'SEM', service_id: 'sem', flight_start: '2026-08-01', flight_end: '2026-12-31', status: 'active' }));
['ext', 'pend', 'part'].forEach(id => ['2026-09', '2026-10'].forEach(m => global.ALL_ACCOUNTING_MONTHS.push(M(id, m, 500))));
setHist([{ campaign_line_id: 'part', changed_at: new Date(2026, 8, 10, 12).toISOString(), old_status: 'active', new_status: 'paused' }, { campaign_line_id: 'part', changed_at: new Date(2026, 8, 20, 12).toISOString(), old_status: 'paused', new_status: 'active' }], true);
exp(); rows = parse(blobText); const b2 = rows.slice(1, -2), t2 = rows[rows.length - 2], t3 = rows[rows.length - 1]; const c2 = (client) => counted(b2.find(r => r[1] === client));
check('externally billed line: the plain column still shows its 44i number, Counted shows nothing', [months(b2.find(r => r[1] === 'Ext Co'))[1], c2('Ext Co')[1]], ['250', '0']);
check('a Pending line is shown but counts nothing', [months(b2.find(r => r[1] === 'Pend Co'))[2], c2('Pend Co')[2]], ['250', '0']);
check('paused Sep 10 (resumed Sep 20, 10 paused days of 30): September counts 20/30 of 250; October full', [c2('Part Co')[1], c2('Part Co')[2]], [String(Math.round(250 * 20 / 30 * 100) / 100), '250']);
// the SCREEN'S OWN row builder + tile function, run for each month, must give the same numbers as the TOTAL rows
const head2 = rows[0]; const monthsD = head2.slice(17, 17 + NM).map(h => { const [y, m] = h.split('-').map(Number); return new Date(y, m - 1, 1); });
const screen = d => { setMonth(d); const t = tiles(buildRows()); return { full: t.fortyfouri, awaiting: t.awaitingFortyfouri, tile: t.fortyfouri - t.awaitingFortyfouri }; };
const r2 = n => Math.round(n * 100) / 100;
check('TOTAL row = the screen\'s 44i Revenue tile + awaiting, for every month (real row builder + real tile function)', t2.slice(17 + NM, 17 + 2 * NM).map(Number), monthsD.map(d => r2(screen(d).full)));
check('the awaiting part of the TOTAL row = the screen\'s "awaiting confirmation" line', t2.slice(17 + 2 * NM).map(Number), monthsD.map(d => r2(screen(d).awaiting)));
check('the next row = the screen\'s 44i Revenue tile itself (confirmed only)', t3.slice(17 + NM, 17 + 2 * NM).map(Number), monthsD.map(d => r2(screen(d).tile)));
check('both bottom rows are labelled and as wide as the other rows', [/^TOTAL/.test(t2[0]), /^TOTAL confirmed only/.test(t3[0]), t2.length === rows[0].length, t3.length === rows[0].length], [true, true, true, true]);
// a mixed rollup: one confirmed child, one unconfirmed child, one PENDING child (the screen counts a pending child inside a rollup that is not all pending)
global.ALL_ACCOUNTING_LINES.push(L({ id: 'r1', client_id: 'roll', group_name: 'Grp A', client_name: 'Roll Co', tactic_label: 'SEM', service_id: 'sem', agent_name: 'A', county: 'X', flight_start: '2026-08-01', flight_end: '2026-12-31' }), L({ id: 'r2', client_id: 'roll', group_name: 'Grp A', client_name: 'Roll Co', tactic_label: 'SEM', service_id: 'sem', agent_name: 'B', county: 'Y', flight_start: '2026-08-01', flight_end: '2026-12-31' }), L({ id: 'r3', client_id: 'roll', group_name: 'Grp A', client_name: 'Roll Co', tactic_label: 'SEM', service_id: 'sem', agent_name: 'C', county: 'Z', flight_start: '2026-08-01', flight_end: '2026-12-31', status: 'pending' }));
['r1', 'r2', 'r3'].forEach(id => global.ALL_ACCOUNTING_MONTHS.push(M(id, '2026-10', 400, id === 'r1' ? { actual_spend: 380 } : {})));
exp(); rows = parse(blobText); const b3 = rows.slice(1, -2), t4 = rows[rows.length - 2], t5 = rows[rows.length - 1];
const roll = id => { const r = b3.find(x => x[16] === id); return [counted(r)[2], awaiting(r)[2]]; };
check('rollup: confirmed child counts and is not awaiting; unconfirmed child counts and IS awaiting; a pending child inside a mixed rollup counts like the screen does', [roll('r1'), roll('r2'), roll('r3')], [['200', '0'], ['200', '200'], ['200', '200']]);
check('...and the totals still equal the screen with that rollup in', [Number(t4[17 + NM + 2]), Number(t4[17 + 2 * NM + 2]), Number(t5[17 + NM + 2])], [r2(screen(monthsD[2]).full), r2(screen(monthsD[2]).awaiting), r2(screen(monthsD[2]).tile)]);
done();
