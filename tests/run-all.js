// Runs every tests/*.test.js and prints one line per file. Exit code 1 if anything failed.
//   node tests/run-all.js            (from the repo root)
// Tests that need extras (a headless browser, an in-memory Postgres) say SKIPPED if those are not installed.
const { spawnSync } = require('child_process'), fs = require('fs'), path = require('path');
const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.test.js')).sort();
let bad = 0, skipped = 0, passedChecks = 0, failedChecks = 0;
for (const f of files) {
  const r = spawnSync(process.execPath, [path.join(__dirname, f)], { encoding: 'utf8', timeout: 150000, env: { ...process.env, NODE_PATH: [process.env.NODE_PATH, '/opt/node22/lib/node_modules', path.join(__dirname, 'node_modules')].filter(Boolean).join(path.delimiter) } });
  const out = (r.stdout || '') + (r.stderr || '');
  if (/^SKIPPED/m.test(out)) { skipped++; console.log('SKIP  ' + f + '   ' + (out.match(/^SKIPPED.*$/m) || [''])[0]); continue; }
  const m = out.match(/(\d+)\/(\d+) passed/);
  if (m) { passedChecks += +m[1]; failedChecks += (+m[2]) - (+m[1]); }
  if (r.error && r.error.code === 'ETIMEDOUT') { bad++; console.log('FAIL  ' + f + '   (timed out after 150 s)'); continue; }
  if (r.status !== 0) { bad++; console.log('FAIL  ' + f + (m ? '   (' + m[1] + '/' + m[2] + ' passed)' : '')); console.log(out.split('\n').filter(l => /^FAIL|Error|MISSING/.test(l)).slice(0, 8).map(l => '      ' + l).join('\n')); }
  else console.log('ok    ' + f + (m ? '   (' + m[1] + ' checks)' : ''));
}
console.log('\n' + files.length + ' test files: ' + (files.length - bad - skipped) + ' ok, ' + bad + ' failed, ' + skipped + ' skipped.  Checks passed: ' + passedChecks + (failedChecks ? ', FAILED: ' + failedChecks : ''));
process.exitCode = bad ? 1 : 0;
