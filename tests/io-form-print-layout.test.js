// Printed / PDF IO layout: every service is ONE block with its own month breakdown (a page break can never separate them), months are a compact strip, the section
// header travels with the first block and the subtotal with the last, the notes box stays whole, and the WORDING/NUMBERS are unchanged. Real form code in Chromium;
// the page-split check uses a real PDF (page.pdf) read back with pypdfium2 when that is installed.
const { check, done, ROOT, read } = require('./lib'); const path = require('path'), fs = require('fs'), os = require('os'), { spawnSync } = require('child_process');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.log('SKIPPED (playwright is not installed)'); process.exit(0); }
const SB = 'https://emydtkhnespbxraiijkx.supabase.co';
const svc = o => ({ active: true, sort_order: 1, billing_type: 'monthly', pricing_mode: 'spend', ...o });
const SERVICES = [...'abcd'].map((k, i) => svc({ id: 'sp-' + k, label: 'Spend Service ' + k.toUpperCase(), section: 'ads', sort_order: i + 1 })),
  SERVICES2 = [svc({ id: 'sp-e', label: 'Even Total Service', section: 'ads', sort_order: 5 }), svc({ id: 'sem-fee', label: 'Flat SEM With Fee', section: 'ads', sort_order: 6, auto_add_setup_fee: true, setup_fee: 200, setup_fee_threshold: 1000 }),
    svc({ id: 'w-flat', label: 'Website Flat Thing', section: 'ads', sort_order: 7, billing_type: 'one_time', pricing_mode: 'flat', default_price: 175 })];
(async () => {
  let browser; try { browser = await chromium.launch(); } catch (e) { try { browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); } catch (e2) { console.log('SKIPPED (no browser)'); process.exit(0); } }
  try {
    const pg = await browser.newPage({ viewport: { width: 900, height: 1200 } }); const errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.route('**/*', async r => { const u = r.request().url(); if (u.startsWith('file:')) return r.continue(); if (!u.startsWith(SB)) return r.abort(); let body = '[]';
      if (u.includes('/rest/v1/services')) body = JSON.stringify([...SERVICES, ...SERVICES2]); else if (u.includes('/rest/v1/sections')) body = JSON.stringify([{ id: 'ads', label: 'Ads', sort_order: 1, active: true }]);
      else if (u.includes('/rpc/get_group_for_embed_key')) body = JSON.stringify([{ id: 'g1', name: 'STMM Digital', active: true, io_slug: 'stmm', am_name: 'Carol', am_email: 'c@x.com' }]);
      else if (u.includes('hosting_proration_settings')) body = JSON.stringify([{ page_type: '1p', days: 3, label: '1 page' }]); else if (u.includes('/rest/v1/intake_forms')) body = JSON.stringify([{ id: 'x', title: 'X', definition: {} }]);
      await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body }); });
    await pg.goto('file://' + ROOT + '/index.html?preview=1&t=abc123'); await pg.waitForSelector('tr[data-id="sp-a"]', { state: 'attached', timeout: 15000 });
    const built = await pg.evaluate(() => {
      Object.keys(selected).forEach(k => delete selected[k]);
      const months = n => Array.from({ length: n }, (_, i) => ({ month: new Date(2027, i, 1).getFullYear() + '-' + String(new Date(2027, i, 1).getMonth() + 1).padStart(2, '0'), amount: 1000 + (i % 4) * 250, paused: i === 5, days: 30 }));
      ['a', 'b', 'c', 'd'].forEach(k => { const id = 'sp-' + k; selected[id] = { ...SERVICE_DATA[id], section: 'ads', label: 'Spend Service ' + k.toUpperCase(), spend: 1250, start_date: '2027-01-01', end_date: '2027-12-31', monthPlan: months(12), customizingMonths: true, budgetMode: 'monthly' }; });
      selected['sp-e'] = { ...SERVICE_DATA['sp-e'], section: 'ads', label: 'Even Total Service', spend: 1500, spendTotal: 3000, start_date: '2027-12-01', end_date: '2028-01-31', monthPlan: [{ month: '2027-12', amount: 1500, days: 31 }, { month: '2028-01', amount: 1500, days: 31 }], budgetMode: 'total' };
      selected['sem-fee'] = { ...SERVICE_DATA['sem-fee'], section: 'ads', label: 'Flat SEM With Fee', spend: 500, start_date: '2027-01-01', end_date: '2027-03-31', budgetMode: 'monthly' };
      selected['w-flat'] = { ...SERVICE_DATA['w-flat'], section: 'ads', label: 'Website Flat Thing', start_date: '2027-01-01', end_date: '2027-01-31' };
      document.getElementById('biz-name').value = 'Print Test Co'; document.getElementById('special-instructions').value = 'Keep these notes together on one page. '.repeat(6); window.getSignatureData = () => 'typed:Pat Client';
      // type the spend into the row boxes as an AE would (the form re-reads them)
      [['sem-fee', '500']].forEach(([id, v]) => { const el = document.querySelector(`tr[data-id="${id}"] input[type=number]:not(.qty-field):not(.quoted-price-field)`); if (el) el.value = v; });
      buildReview(); const doc = buildIoDocumentHtml().html;
      return { html: doc, review: document.getElementById('summary-body').innerText.replace(/\s+/g, ' ') }; });
    const struct = await pg.evaluate(html => { const d = new DOMParser().parseFromString(html, 'text/html'); const blocks = [...d.querySelectorAll('tbody.svc-block')];
      return { n: blocks.length, names: blocks.map(b => (b.querySelector('.svc-name') || {}).textContent), firstHasSection: !!blocks[0].querySelector('.section-row'), lastHasSubtotal: !!blocks[blocks.length - 1].querySelector('.subtotal-row'),
        sectionRowsOutside: [...d.querySelectorAll('.section-row')].filter(r => !r.closest('tbody.svc-block')).length, subtotalOutside: [...d.querySelectorAll('.subtotal-row')].filter(r => !r.closest('tbody.svc-block')).length,
        stripsPerBlock: blocks.map(b => b.querySelectorAll('table').length), text: d.body.innerText.replace(/\s+/g, ' '),
        setupInSameBlockAsFlatSem: blocks.some(b => /Flat SEM With Fee/.test(b.textContent) && /Setup Fee/.test(b.textContent)), notesNoBreak: !!d.querySelector('.special-box.no-break'),
        daysInFlightHeader: /days in flight/i.test(d.body.innerText), pausedCells: [...d.querySelectorAll('td')].filter(t => t.textContent.trim() === 'Paused').length }; }, built.html);
    check('one block per service (7 services -> 7 blocks), in order, each starting with that service\'s own line', [struct.n, struct.names.length], [7, 7]);
    check('the section header travels with the FIRST block and the subtotal with the LAST (none left outside a block)', [struct.firstHasSection, struct.lastHasSubtotal, struct.sectionRowsOutside, struct.subtotalOutside], [true, true, 0, 0]);
    check('a 12-month plan is 2 strips (6 months across each), a 2-month plan 1 strip, a flat service none', [struct.stripsPerBlock.slice(0, 4), struct.stripsPerBlock[4], struct.stripsPerBlock[6]], [[2, 2, 2, 2], 1, 0]);
    check('a paused month says "Paused" (4 services x 1) and the old "Days in flight" column is gone from the printed IO', [struct.pausedCells, struct.daysInFlightHeader], [4, false]);
    check('the setup fee row stays in the SAME block as its service', struct.setupInSameBlockAsFlatSem, true);
    check('the Additional Notes box is kept whole', struct.notesNoBreak, true);
    check('wording and numbers unchanged: an evenly split Whole Campaign Total still reads "$3,000 total"; the printed IO shows the setup fee and the subtotal', [/\$3,000(\.00)? total/.test(struct.text), /Setup Fee/.test(struct.text), /Subtotal/.test(struct.text)], [true, true, true]);
    check('the on-screen Step 3 review is NOT changed (it still shows the month table with its days column)', /days/i.test(built.review), true);
    check('the PDF page-cutter knows about the blocks (its protected-zone list includes tbody.svc-block)', /selector = 'tr, tbody\.svc-block,/.test(read('index.html')), true);
    // 13 months, a paused month, and amounts whose cents add up with floating-point noise (the real case from Claire's test order)
    const grid = await pg.evaluate(() => {
      Object.keys(selected).forEach(k => delete selected[k]);
      const amts = [234.85, 234.85, 212.12, 234.85, 227.27, 234.85, 227.27, 234.85, 234.85, 227.27, 234.85, 227.27, 234.85];
      const plan = amts.map((a, i) => ({ month: new Date(2026, 11 + i, 1).getFullYear() + '-' + String(new Date(2026, 11 + i, 1).getMonth() + 1).padStart(2, '0'), amount: a, paused: i === 6, days: 30 }));
      plan[6].amount = 0;   // the paused month has no amount
      const noisy = amts.map((a, i) => ({ month: plan[i].month, amount: a, paused: false, days: 30 }));
      selected['sp-a'] = { ...SERVICE_DATA['sp-a'], section: 'ads', label: 'Spend Service A', spend: 230, start_date: '2026-12-01', end_date: '2027-12-31', monthPlan: noisy, customizingMonths: true, budgetMode: 'total', spendTotal: 3000 };
      selected['sp-b'] = { ...SERVICE_DATA['sp-b'], section: 'ads', label: 'Spend Service B', spend: 200, start_date: '2026-12-01', end_date: '2027-12-31', monthPlan: plan, customizingMonths: true, budgetMode: 'monthly' };
      window.getSignatureData = () => 'typed:Pat Client'; buildReview();
      const d = new DOMParser().parseFromString(buildIoDocumentHtml().html, 'text/html');
      const blocks = [...d.querySelectorAll('tbody.svc-block')];
      const strips = b => [...b.querySelectorAll('table.month-strip')];
      const info = b => strips(b).map(t => ({ monthCells: [...t.querySelectorAll('thead th')].filter(th => th.textContent.trim() && th.textContent.trim() !== 'Total').length, cols: t.querySelectorAll('thead th').length, fixed: /table-layout:fixed/.test(t.getAttribute('style')), colgroup: t.querySelectorAll('col').length }));
      return { a: info(blocks[0]), b: info(blocks[1]), text: d.body.innerText.replace(/\s+/g, ' ') , html: buildIoDocumentHtml().html }; });
    check('13 months print as 3 balanced rows of 5 + 5 + 3 months (not 6 + 6 + 1)', [grid.a.map(r => r.monthCells), grid.b.map(r => r.monthCells)], [[5, 5, 3], [5, 5, 3]]);
    check('every row is on the same fixed grid (same number of columns, table-layout fixed, a column list), so a "Paused" cell cannot shift the others', [grid.a.every(r => r.fixed && r.cols === 6 && r.colgroup === 6), grid.b.every(r => r.fixed && r.cols === 6 && r.colgroup === 6)], [true, true]);
    check('totals are rounded to the cent: months that add up to 2999.9999999999995 print "$3,000 total", not "$3,000.00 total"', [/\$3,000 total/.test(grid.text), /\$3,000\.00 total/.test(grid.text)], [true, false]);
    // real geometry (a second page holds the document): column N sits at the SAME place in every row of a block, whether or not a month is paused
    const doc2 = await browser.newPage({ viewport: { width: 900, height: 1200 } }); await doc2.setContent(grid.html, { waitUntil: 'load' });
    const edges = await doc2.evaluate(() => [...document.querySelectorAll('tbody.svc-block')].slice(0, 2).map(b => [...b.querySelectorAll('table.month-strip')].map(t => [...t.querySelectorAll('thead th')].map(th => Math.round(th.getBoundingClientRect().right)))));
    check('real geometry: in both services (service B has a paused month in the middle row) every row\'s columns end at exactly the same x position', [edges[0].every(r => JSON.stringify(r) === JSON.stringify(edges[0][0])), edges[1].every(r => JSON.stringify(r) === JSON.stringify(edges[1][0]))], [true, true]);
    await doc2.close();
    // real PDF: a service name and its month strip never land on different pages
    const py = spawnSync('python3', ['-c', 'import pypdfium2'], { encoding: 'utf8' });
    if (py.status !== 0) console.log('NOTE: PDF page-split check skipped (pypdfium2 is not installed)');
    else {
      await pg.setContent(built.html, { waitUntil: 'load' }); const pdfPath = path.join(os.tmpdir(), 'io-layout-test.pdf');
      await pg.pdf({ path: pdfPath, format: 'Letter', printBackground: true, margin: { top: '0.4in', bottom: '0.4in', left: '0.4in', right: '0.4in' } });
      const out = spawnSync('python3', ['-c', `import pypdfium2 as p, json, sys\nd = p.PdfDocument(sys.argv[1]); print(json.dumps([d[i].get_textpage().get_text_range() for i in range(len(d))]))`, pdfPath], { encoding: 'utf8' });
      const pages = JSON.parse(out.stdout); const withStrip = ['Spend Service A', 'Spend Service B', 'Spend Service C', 'Spend Service D', 'Even Total Service'];
      const perPage = pages.map(raw => { const t = raw.replace(/\s+/g, ' '); return { names: withStrip.filter(n => t.includes(n)).length, totals: (t.match(/'\d{2} TOTAL/g) || []).length }; });
      check('real PDF: on every page the number of services equals the number of month strips (a service is never separated from its breakdown)', [perPage.every(p => p.names === p.totals), perPage.reduce((s, p) => s + p.names, 0)], [true, 5]);
      check('real PDF: the long order fits in 3 pages or fewer (the old layout took 6 for a smaller one)', pages.length <= 3, true);
    }
    check('no page errors', errs, []);
  } finally { await browser.close(); }
  done();
})().catch(e => { console.log('FAIL browser test crashed: ' + e.message); process.exitCode = 1; });
