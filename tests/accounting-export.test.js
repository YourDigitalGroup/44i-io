// Export CSV: one row per line, 44i revenue per month computed the way the screen does it.
process.env.TZ = 'America/Chicago';
const { read, grab, check, done } = require('./lib');
global.CATALOG_ROWS = global.CATALOG_ROWS || {};
const A = read('accounting/index.html');
eval([grab(A, /function accountingMonthKey\([^\n]*\n/), grab(A, /const ACCOUNTING_ONE_TIME_BILLING_TYPES = [^\n]*\n/), grab(A, /function accountingCancelledNeverLaunched[\s\S]*?\n\}\n/),
  grab(A, /let ACCOUNTING_EXPLICIT_MONTHS_SRC[\s\S]*?\n\}\n(?=\/\/ "\+ Add month")/), grab(A, /function accountingIsYearlyLine[\s\S]*?\n\}\n/), grab(A, /function accountingYearlyBillsInMonth[\s\S]*?\n\}\n/), grab(A, /function accountingLineActiveInMonth[\s\S]*?\n\}\n/),
  grab(A, /function accountingMonthRowFor[\s\S]*?\n\}\nfunction accountingMostRecentPriorMonth[\s\S]*?\n\}\n/), grab(A, /function accountingSplitRevenue[\s\S]*?\n\}\n/),
  grab(A, /const ACCOUNTING_EXCLUDED_TACTIC_LABELS = [^\n]*\n/), grab(A, /function accountingExportCsv\(\) \{[\s\S]*?\n\}\n(?=\nfunction accountingStatusPill)/)].join('\n') + ';global.exp=accountingExportCsv;');
let blobText = null, dl = null, toasts = [];
global.URL = { createObjectURL: b => { blobText = b.__t; return 'blob:x'; } }; global.Blob = class { constructor(p) { this.__t = p.join(''); } };
global.document = { createElement: () => ({ click() { dl = this.download; }, remove() {} }), body: { appendChild() {} } }; global.showToast = (t, k) => toasts.push((k || 'ok') + ': ' + t);
global.accountingGroupFilter = ''; global.accountingEffectiveCutPct = (svc, cl, g, mod, gross, ov) => ov != null ? ov : (svc === 'nocut' ? null : (gross != null && gross >= 1000 ? 40 : 50)); global.accountingEffectiveSetupFeeCutPct = () => 50;
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
exp(); let rows = parse(blobText); const head = rows[0], body = rows.slice(1); const by = (client, tactic) => body.find(r => r[1] === client && r[2].startsWith(tactic)); const months = r => r.slice(17);
check('months run Aug..Dec 2026', head.slice(17), ['2026-08', '2026-09', '2026-10', '2026-11', '2026-12']);
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
check('group filter narrows the lines and the months', [rows.length - 1, rows[0].slice(17)], [2, ['2026-08', '2026-09', '2026-10']]);
global.accountingGroupFilter = 'Nobody'; toasts.length = 0; blobText = null; exp();
check('empty group -> message, no file', [toasts[0].startsWith('error:'), blobText], [true, null]);
done();
