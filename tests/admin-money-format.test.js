// Admin money display shows cents when a price has them ($7.50 was shown as $8) and whole dollars as before.
const { read, check, done } = require('./lib');
const s = read('admin/index.html');
const defs = [...s.matchAll(/const fmtMoney = n => n \? '\$' \+ Number\(n\)\.toLocaleString\('en-US', \{ minimumFractionDigits: Number\.isInteger[^\n]*?: '—';/g)].map(m => m[0]);
check('the three Admin screens (Orders list, Order Detail, Campaign Lines) all use the cents-aware format', [defs.length, new Set(defs).size], [3, 1]);
check('no whole-dollar-only money format is left in Admin', /maximumFractionDigits:\s*0\}\) : '—'/.test(s), false);
const f = eval('(' + defs[0].replace('const fmtMoney = ', '').replace(/;\s*$/, '') + ')');
[[7.5, '$7.50'], [8, '$8'], [43.75, '$43.75'], [1500, '$1,500'], [1234.5, '$1,234.50'], [52.5, '$52.50'], ['7.50', '$7.50'], [0, '—'], [null, '—'], [175, '$175'], [2499.99, '$2,499.99']].forEach(([v, w]) => check('fmtMoney(' + JSON.stringify(v) + ')', f(v), w));
done();
