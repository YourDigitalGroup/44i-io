// Builds the AM Admin guide PDF from am-admin-guide.html:  node tests/guides/am-admin-guide/build.js [output.pdf]
// Needs playwright (npm install playwright) and Chromium. After building, CHECK THE PAGE COUNT (the guide must stay at 3 pages).
const { chromium } = require('playwright');
const path = require('path');
const out = process.argv[2] || path.join(__dirname, 'Admin-Guide-for-AMs.pdf');
(async () => {
  let b; try { b = await chromium.launch(); } catch (e) { b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); }
  const pg = await b.newPage();
  await pg.goto('file://' + path.join(__dirname, 'am-admin-guide.html'));
  await pg.pdf({ path: out, format: 'Letter', printBackground: true, preferCSSPageSize: true });
  await b.close(); console.log('wrote', out);
})();
