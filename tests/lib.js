// Tiny helpers shared by every test in this folder. No dependencies.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
// Pulls a piece of code out of one of the pages by pattern. If someone renames or deletes it, the test fails loudly (MISSING) instead of silently passing.
const grab = (src, re) => { const m = src.match(re); if (!m) throw new Error('MISSING in the page source: ' + re); return m[0]; };
// A top-level function (its closing brace at the start of a line).
const fn = (src, name) => grab(src, new RegExp('(?:async )?function ' + name + '\\([^)]*\\)[\\s\\S]*?\\n\\}\\n'));
let fails = 0, total = 0;
const check = (label, got, want) => {
  total++; const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fails++;
  console.log((ok ? 'PASS ' : 'FAIL ') + label + (ok ? '' : '   got ' + JSON.stringify(got) + '  want ' + JSON.stringify(want)));
};
const done = () => { console.log('\n' + (total - fails) + '/' + total + ' passed'); if (fails) process.exitCode = 1; };
module.exports = { ROOT, read, grab, fn, check, done };
