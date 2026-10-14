// (1) Admin's "today" is the AM's own calendar day, not the UTC day (which is tomorrow after ~7pm Central).
// (2) A flat one-time line reads "$450.00 one-time", not "$450.00 × 1 = $450.00 one-time"; per-unit lines and any qty > 1 keep the breakdown.
process.env.TZ = 'America/Chicago';
const { read, fn, check, done } = require('./lib');
const admin = read('admin/index.html'), shared = read('shared.js');
const RealDate = Date;
const at = iso => { global.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [iso])); } static now() { return new RealDate(iso).getTime(); } }; };
const today = new Function(fn(admin, 'adminLocalToday') + '; return adminLocalToday;')();
at('2026-10-14T02:30:00Z');   // 9:30pm on Oct 13 in Chicago
check('9:30pm Central on Oct 13 is Oct 13 (the UTC date would say Oct 14)', today(), '2026-10-13');
at('2026-10-14T15:00:00Z'); check('mid-day is the same date both ways', today(), '2026-10-14');
at('2027-01-01T05:30:00Z'); check('New Year\'s Eve evening stays in the old year', today(), '2026-12-31');
global.Date = RealDate;
check('no Admin place still builds "today" from the UTC date (file-name stamps excepted)', admin.split('\n').filter(l => /new Date\(\)\.toISOString\(\)\.slice\(0, ?10\)/.test(l) && !/Intake-|Revised-IO-/.test(l)).length, 0);
const CATALOG_ROWS = { flat: { pricing_mode: 'flat', billing_type: 'one_time' }, unit: { pricing_mode: 'per_unit', billing_type: 'one_time' } };
const sh = new Function('CATALOG_ROWS', fn(shared, 'lineSpendVaries') + fn(shared, 'lineShowsQtyBreakdown') + fn(shared, 'describeLineItemAmount') + '; return describeLineItemAmount;')(CATALOG_ROWS);
const t = li => sh(li).text;
check('flat one-time line with stored qty 1 reads plain', t({ service_id: 'flat', fee: 450, qty: 1, unit_fee: 450 }), '$450.00 one-time');
check('per-unit line at qty 1 keeps "unit × count"', t({ service_id: 'unit', fee: 175, qty: 1, unit_fee: 175 }), '$175.00 × 1 = $175.00 one-time');
check('per-unit line at qty 3 keeps the breakdown', t({ service_id: 'unit', fee: 525, qty: 3, unit_fee: 175 }), '$175.00 × 3 = $525.00 one-time');
check('any line above qty 1 keeps the breakdown', t({ service_id: 'flat', fee: 900, qty: 2, unit_fee: 450 }), '$450.00 × 2 = $900.00 one-time');
check('order with no stored qty reads plain', t({ service_id: 'flat', fee: 450 }), '$450.00 one-time');
check('Admin Order Detail uses the same rule', /lineShowsQtyBreakdown\(item, liQty\)/.test(admin), true);
done();
