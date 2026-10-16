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
exp(); let rows = parse(blobText); const head = rows[0], body = rows.slice(1); const by = (client, tactic) => body.find(r => r[1] === client && r[2].startsWith(tactic)); const NM = 5; const months = r => r.slice(17);
check('months run Aug..Dec 2026 (no extra Counted/Awaiting columns)', head.slice(17), ['2026-08', '2026-09', '2026-10', '2026-11', '2026-12']);
body.pop(); body.pop(); body.pop();
check('7 lines exported (LLO left out), then three total rows', [body.length, rows.length - 1 - body.length], [7, 3]);
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
check('group filter narrows the lines and the months', [rows.length - 4, rows[0].slice(17, 20)], [2, ['2026-08', '2026-09', '2026-10']]);
global.accountingGroupFilter = 'Nobody'; toasts.length = 0; blobText = null; exp();
check('empty group -> message, no file', [toasts[0].startsWith('error:'), blobText], [true, null]);
// ── bottom rows: confirmed / awaiting / total, from the screen's own builder; must equal the screen's tiles ──
const r2 = n => Math.round(n * 100) / 100;
const screen = d => { setMonth(d); const t = tiles(buildRows()); return { full: t.fortyfouri, awaiting: t.awaitingFortyfouri, tile: t.fortyfouri - t.awaitingFortyfouri }; };
const tail3 = () => { global.accountingGroupFilter = ''; setHist([], true); exp(); const rr = parse(blobText); const n = rr.length; const mo = rr[0].slice(17).map(h => { const [y, m] = h.split('-').map(Number); return new Date(y, m - 1, 1); });
  return { rr, labels: [rr[n - 3][0], rr[n - 2][0], rr[n - 1][0]], conf: rr[n - 3].slice(17).map(Number), aw: rr[n - 2].slice(17).map(Number), tot: rr[n - 1].slice(17).map(Number), mo }; };
const vsScreen = (t) => [t.conf, t.aw].map(x => x.join()).join('|') === [t.mo.map(d => r2(screen(d).tile)), t.mo.map(d => r2(screen(d).awaiting))].map(x => x.join()).join('|') && t.tot.every((v, i) => Math.abs(v - screen(t.mo[i]).full) < 0.011) && t.tot.every((v, i) => r2(t.conf[i] + t.aw[i]) === v);
let T = tail3();
check('three labelled rows at the bottom, same width as the rest, nothing else added', [T.labels.every(l => /^Counted on the screen/.test(l)), T.rr[T.rr.length - 1].length === T.rr[0].length], [true, true]);
check('the three rows equal the screen\'s 44i Revenue tile / awaiting / total for every month (real row builder + real tile function)', vsScreen(T), true);
const totalOct = () => tail3().tot[2];
let before = totalOct();
global.ALL_ACCOUNTING_LINES.push(L({ id: 'ext', client_id: 'cx', group_name: 'Grp A', client_name: 'Ext Co', tactic_label: 'SEM', service_id: 'sem', flight_start: '2026-08-01', flight_end: '2026-12-31', billed_externally: true }));
['2026-09', '2026-10'].forEach(m => global.ALL_ACCOUNTING_MONTHS.push(M('ext', m, 500)));
check('an externally billed line shows in the month column but adds nothing to the totals', [totalOct() - before, months(parse(blobText).slice(1).find(r => r[1] === 'Ext Co'))[2]], [0, '250']);
before = totalOct();
global.ALL_ACCOUNTING_LINES.push(L({ id: 'pend', client_id: 'cp', group_name: 'Grp A', client_name: 'Pend Co', tactic_label: 'SEM', service_id: 'sem', flight_start: '2026-08-01', flight_end: '2026-12-31', status: 'pending' }));
['2026-09', '2026-10'].forEach(m => global.ALL_ACCOUNTING_MONTHS.push(M('pend', m, 500)));
check('a Pending line shows in the month column but adds nothing to the totals', [totalOct() - before, months(parse(blobText).slice(1).find(r => r[1] === 'Pend Co'))[2]], [0, '250']);
global.ALL_ACCOUNTING_LINES.push(L({ id: 'part', client_id: 'cq', group_name: 'Grp A', client_name: 'Part Co', tactic_label: 'SEM', service_id: 'sem', flight_start: '2026-08-01', flight_end: '2026-12-31' }));
['2026-09', '2026-10'].forEach(m => global.ALL_ACCOUNTING_MONTHS.push(M('part', m, 500)));
const sepTotal = () => { const t = tail3(); return t.tot[1]; };
const sepBefore = (() => { global.ALL_ACCOUNTING_LINES.pop(); const v = sepTotal(); global.ALL_ACCOUNTING_LINES.push(L({ id: 'part', client_id: 'cq', group_name: 'Grp A', client_name: 'Part Co', tactic_label: 'SEM', service_id: 'sem', flight_start: '2026-08-01', flight_end: '2026-12-31' })); return v; })();
const hist1 = [{ campaign_line_id: 'part', changed_at: new Date(2026, 8, 10, 12).toISOString(), old_status: 'active', new_status: 'paused' }, { campaign_line_id: 'part', changed_at: new Date(2026, 8, 20, 12).toISOString(), old_status: 'paused', new_status: 'active' }];
global.accountingGroupFilter = ''; setHist(hist1, true); exp(); const rp = parse(blobText); const sepAfter = Number(rp[rp.length - 1][17 + 1]);
check('paused Sep 10-20 (10 of 30 days): only 20/30 of that line\'s $250 is added to September', r2(sepAfter - sepBefore), r2(250 * 20 / 30));
setHist([], true);
check('the three rows still equal the screen with those lines in', vsScreen(tail3()), true);
const awBefore = tail3().aw[2], totBefore = tail3().tot[2];
// a mixed rollup: one confirmed child, one unconfirmed child, one PENDING child (the screen counts a pending child inside a rollup that is not all pending)
global.ALL_ACCOUNTING_LINES.push(L({ id: 'r1', client_id: 'roll', group_name: 'Grp A', client_name: 'Roll Co', tactic_label: 'SEM', service_id: 'sem', agent_name: 'A', county: 'X', flight_start: '2026-08-01', flight_end: '2026-12-31' }), L({ id: 'r2', client_id: 'roll', group_name: 'Grp A', client_name: 'Roll Co', tactic_label: 'SEM', service_id: 'sem', agent_name: 'B', county: 'Y', flight_start: '2026-08-01', flight_end: '2026-12-31' }), L({ id: 'r3', client_id: 'roll', group_name: 'Grp A', client_name: 'Roll Co', tactic_label: 'SEM', service_id: 'sem', agent_name: 'C', county: 'Z', flight_start: '2026-08-01', flight_end: '2026-12-31', status: 'pending' }));
['r1', 'r2', 'r3'].forEach(id => global.ALL_ACCOUNTING_MONTHS.push(M(id, '2026-10', 400, id === 'r1' ? { actual_spend: 380 } : {})));
T = tail3();
check('...and with a mixed rollup (confirmed + unconfirmed + pending child) in', vsScreen(T), true);
check('...the unconfirmed and pending children add $200 each to awaiting in October, and the confirmed child $200 more to the total ($600 in all)', [r2(T.aw[2] - awBefore), r2(T.tot[2] - totBefore)], [400, 600]);
// ── optional month range (From / To boxes) ──
const boxes = { 'accounting-export-from': { value: '' }, 'accounting-export-to': { value: '' } }; global.document.getElementById = id => boxes[id] || null;
const setRange = (f, t) => { boxes['accounting-export-from'].value = f; boxes['accounting-export-to'].value = t; };
const run = (f, t) => { setRange(f, t); toasts.length = 0; blobText = null; dl = null; global.accountingGroupFilter = ''; setHist([], true); exp(); return blobText ? parse(blobText) : null; };
let R = run('', '');
check('both boxes blank: every month, as before', R[0].slice(17), ['2026-08', '2026-09', '2026-10', '2026-11', '2026-12']);
const allLines = R.length - 4;
R = run('2026-10', '2026-11');
check('From 2026-10 To 2026-11: only those two month columns', R[0].slice(17), ['2026-10', '2026-11']);
const screenMonth = k => { const [y, m] = k.split('-').map(Number); setMonth(new Date(y, m - 1, 1)); const t = tiles(buildRows()); return [r2(t.fortyfouri - t.awaitingFortyfouri), r2(t.awaitingFortyfouri)]; };
const n = R.length;
check('the bottom rows for the chosen months equal the screen for those months', [R[n - 3].slice(17).map(Number), R[n - 2].slice(17).map(Number)], [[screenMonth('2026-10')[0], screenMonth('2026-11')[0]], [screenMonth('2026-10')[1], screenMonth('2026-11')[1]]]);
check('the file name carries the range', /2026-10-to-2026-11/.test(dl), true);
R = run('2026-12', '2026-12'); check('only lines that run in a chosen month are listed (one-time and ended lines drop out of a December-only file)', [R.length - 4 < allLines, R.slice(1, -3).some(r => r[1] === 'Beta "B"'), R.slice(1, -3).some(r => r[1] === 'Acme, Inc.')], [true, false, true]);
R = run('2026-11', '');
check('only a From month: from then on', R[0].slice(17), ['2026-11', '2026-12']);
R = run('', '2026-09');
check('only a To month: up to then', R[0].slice(17), ['2026-08', '2026-09']);
R = run('2026-10', '2026-10'); check('one month alone works', R[0].slice(17), ['2026-10']);
R = run('2026-12', '2026-10'); check('From after To: a message, no file', [R, /From month is after/.test(toasts[0] || '')], [null, true]);
R = run('Oct 2026', ''); check('text that is not year-month: a message, no file', [R, /year-month/.test(toasts[0] || '')], [null, true]);
R = run('2030-01', '2030-03'); check('a range with no data: a message, no file', [R, /No months with data/.test(toasts[0] || '')], [null, true]);
setRange('', '');
// the exact case Claire hit: three amounts whose unrounded parts each end in .xx5-ish must still add up on paper to the cent
global.ALL_ACCOUNTING_LINES.length = 0; global.ALL_ACCOUNTING_MONTHS.length = 0;
global.ALL_ACCOUNTING_LINES.push(L({ id: 'q1', client_id: 'k1', group_name: 'G', client_name: 'K1', tactic_label: 'SEM', service_id: 'sem', flight_start: '2026-10-01', flight_end: '2026-10-31' }), L({ id: 'q2', client_id: 'k2', group_name: 'G', client_name: 'K2', tactic_label: 'SEM', service_id: 'sem', flight_start: '2026-10-01', flight_end: '2026-10-31' }));
global.ALL_ACCOUNTING_MONTHS.push(M('q1', '2026-10', 333.33, { actual_spend: 300 }), M('q2', '2026-10', 333.33));
const T9 = tail3(); check('confirmed + awaiting = total to the cent even when the pieces have fractions of a cent', [r2(T9.conf[0] + T9.aw[0]) === T9.tot[0], T9.conf[0] > 0, T9.aw[0] > 0], [true, true, true]);
// ── total row above separate campaigns (Claire 2026-10-16: 13 Location Targeting: Event campaigns for one client) ──
global.ALL_ACCOUNTING_LINES.length = 0; global.ALL_ACCOUNTING_MONTHS.length = 0; setHist([], true);
const camp = (id, label, extra = {}) => L({ id, client_id: 'gg', group_name: 'BR Digital', client_name: 'Grain Guardian LLC', tactic_label: 'Location Targeting: Event', service_id: 'lt-event', split_label: label, flight_start: '2026-10-01', flight_end: '2026-12-31', ...extra });
global.ALL_ACCOUNTING_LINES.push(camp('e1', 'Iowa Fire Chiefs'), camp('e2', 'Grain Bin Rescue'), camp('e3', 'Instructor 1', { flight_start: '2026-11-01' }),
  L({ id: 'solo', client_id: 'gg', group_name: 'BR Digital', client_name: 'Grain Guardian LLC', tactic_label: 'SEM', service_id: 'sem', split_label: 'Only one', flight_start: '2026-10-01', flight_end: '2026-12-31' }),
  L({ id: 'plain1', client_id: 'pp', group_name: 'BR Digital', client_name: 'Plain Co', tactic_label: 'SEM', service_id: 'sem', flight_start: '2026-10-01', flight_end: '2026-12-31' }),
  L({ id: 'plain2', client_id: 'pp', group_name: 'BR Digital', client_name: 'Plain Co', tactic_label: 'SEM', service_id: 'sem', flight_start: '2026-11-01', flight_end: '2026-12-31' }),
  camp('o1', 'Other client A', { client_id: 'g2', client_name: 'Other Client' }), camp('o2', 'Other client B', { client_id: 'g2', client_name: 'Other Client' }));
[['e1', 333.33], ['e2', 333.33], ['e3', 333.33], ['solo', 500], ['plain1', 500], ['plain2', 500], ['o1', 200], ['o2', 300]].forEach(([id, g]) => ['2026-10', '2026-11', '2026-12'].forEach(m => { if (id === 'e3' && m === '2026-10') return; global.ALL_ACCOUNTING_MONTHS.push(M(id, m, g)); }));
global.accountingGroupFilter = ''; exp(); let Q = parse(blobText); const qb = Q.slice(1, -3);
const isTot = r => /^TOTAL \(/.test(r[3]);
const totals = qb.filter(isTot);
check('a total row for each client+service with 2+ lines and a campaign name (Grain Guardian, Other Client); none for a single campaign or for unnamed lines', totals.map(r => r[1] + '|' + r[3]), ['Grain Guardian LLC|TOTAL (3 campaigns)', 'Other Client|TOTAL (2 campaigns)']);
const gi = qb.findIndex(isTot && (r => r[1] === 'Grain Guardian LLC' && isTot(r)));
check('the total row sits directly above its three campaigns', qb.slice(gi + 1, gi + 4).map(r => r[3]).sort(), ['Grain Bin Rescue', 'Instructor 1', 'Iowa Fire Chiefs']);
const gt = qb[gi], kids = qb.slice(gi + 1, gi + 4);
const sumCol = (col) => r2(kids.reduce((t, r) => t + (r[col] === '' ? 0 : Number(r[col])), 0));
check('each month on the total row is the sum of the rows below, to the cent (Oct has only two lines running)', [17, 18, 19].map(c => Number(gt[c])), [17, 18, 19].map(sumCol));
check('Total Revenue on the total row is the sum of the rows below; Line ID and Status are blank', [Number(gt[14]), r2(kids.reduce((t, r) => t + Number(r[14]), 0)), gt[16], gt[6]], [r2(kids.reduce((t, r) => t + Number(r[14]), 0)), r2(kids.reduce((t, r) => t + Number(r[14]), 0)), '', '']);
check('total rows are the only rows added: every line still appears once', qb.filter(r => !isTot(r)).length, 8);
check('the three bottom rows are unchanged by the total rows and still equal the screen', vsScreen(tail3()), true);
const noTot = Q.slice(1).filter(r => !isTot(r)); check('a total row never carries a Line ID, so filtering on Line ID removes it', qb.filter(isTot).every(r => r[16] === ''), true);
done();
