// A "Whole Campaign Total" that splits evenly ($3,000 over two equal months) must read "$3,000.00 total" and stay OUT of
// Monthly Recurring on Review, the printed/signed IO and the order totals -- like Admin does. And Trello/email prices keep cents.
const { read, fn, check, done, ROOT } = require('./lib');
const idx = read('index.html');
const u = new Function(fn(idx, 'monthPlanVariesAndTotal') + fn(idx, 'selectedBudgetMode') + fn(idx, 'moneyText') + '; return { monthPlanVariesAndTotal, selectedBudgetMode, moneyText };')();
const even = [{ month: '2027-01', amount: 1500 }, { month: '2027-02', amount: 1500 }], uneven = [{ month: '2027-01', amount: 1000 }, { month: '2027-02', amount: 2000 }];
check('even split in total mode is a campaign total', u.monthPlanVariesAndTotal(even, 'total'), { varies: true, total: 3000 });
check('even split with no mode (old orders) stays a flat monthly rate', u.monthPlanVariesAndTotal(even, undefined).varies, false);
check('even split in monthly mode stays flat', u.monthPlanVariesAndTotal(even, 'monthly').varies, false);
check('uneven amounts still vary in any mode', [u.monthPlanVariesAndTotal(uneven, 'monthly').varies, u.monthPlanVariesAndTotal(uneven).varies], [true, true]);
check('no month plan is never a total', u.monthPlanVariesAndTotal(null, 'total').varies, false);
check('in-memory mode names', [u.selectedBudgetMode({ budgetMode: 'total' }), u.selectedBudgetMode({ customizingMonths: true, budgetMode: 'total' }), u.selectedBudgetMode({})], ['total', 'custom', 'monthly']);
check('Trello/email cents', [u.moneyText(7.5), u.moneyText(7), u.moneyText(1234.5), u.moneyText(0.1 + 0.2), u.moneyText(null)], ['$7.50', '$7', '$1,234.50', '$0.30', '$0']);
check('no bare toLocaleString price left in the Trello/email text', (idx.match(/\$\$\{[^}]*\.toLocaleString\(\)\}/g) || []).filter(x => !/min|Min|SPEND_MINIMUMS/.test(x)).length, 0);

let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.log('SKIPPED (playwright is not installed)'); process.exit(0); }
const SB = 'https://emydtkhnespbxraiijkx.supabase.co';
const SERVICES = [{ id: 'sem', label: 'Search Ads', section: 'ads', active: true, sort_order: 1, billing_type: 'monthly', pricing_mode: 'spend' }];
(async () => {
  let browser; try { browser = await chromium.launch(); } catch (e) { try { browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); } catch (e2) { console.log('SKIPPED (no browser)'); process.exit(0); } }
  try {
    const pg = await browser.newPage({ viewport: { width: 1200, height: 900 } }); const errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.route(SB + '/**', async r => { const url = r.request().url(); let body = '[]';
      if (url.includes('/rest/v1/services')) body = JSON.stringify(SERVICES);
      else if (url.includes('/rest/v1/sections')) body = JSON.stringify([{ id: 'ads', label: 'Ads', sort_order: 1, active: true }]);
      else if (url.includes('/rpc/get_group_for_embed_key')) body = JSON.stringify([{ id: 'g1', name: 'STMM Digital', active: true, io_slug: 'stmm', am_name: 'Carol', am_email: 'c@x.com' }]);
      else if (url.includes('/rest/v1/hosting_proration_settings')) body = JSON.stringify([{ page_type: '1p', days: 3, label: '1 page' }]);
      else if (url.includes('/rest/v1/intake_forms')) body = JSON.stringify([{ id: 'x', title: 'X', definition: {} }]);
      await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body }); });
    await pg.goto('file://' + ROOT + '/index.html?preview=1&t=abc123'); await pg.waitForSelector('tr[data-id="sem"]', { state: 'attached', timeout: 15000 });
    const run = (mode, plan) => pg.evaluate(([mode, plan]) => {
      Object.keys(selected).forEach(k => delete selected[k]);
      selected.sem = { ...SERVICE_DATA.sem, section: 'ads', label: 'Search Ads', spend: 1500, start_date: '2027-01-01', end_date: '2027-02-28', monthPlan: plan, budgetMode: mode, spendTotal: 3000 };
      buildReview();
      return { review: document.getElementById('summary-body').innerText.replace(/\s+/g, ' '), monthlyTile: document.getElementById('total-monthly').textContent,
        printed: buildIoDocumentHtml().html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ') };
    }, [mode, plan]);
    const even = [{ month: '2027-01', amount: 1500, days: 31 }, { month: '2027-02', amount: 1500, days: 28 }];
    const t = await run('total', even);
    check('Review: even Whole Campaign Total reads "$3,000 total", not "/mo"', [/\$3,000 total/.test(t.review), /\$1,500\/mo/.test(t.review)], [true, false]);
    check('Review: it is NOT counted as Monthly Recurring', t.monthlyTile, '—/mo');
    check('Printed IO: "$3,000 total", no "$1,500/mo", no Monthly Recurring row', [/\$3,000 total/.test(t.printed), /\$1,500\/mo/.test(t.printed), /Monthly Recurring\s*\$/.test(t.printed)], [true, false, false]);
    const m = await run('monthly', even);
    check('A normal monthly spend is unchanged: "$1,500/mo" and counted as monthly', [/\$1,500\/mo/.test(m.review), m.monthlyTile, /\$1,500 total/.test(m.review)], [true, '$1,500/mo', false]);
    check('no page errors', errs, []);
  } finally { await browser.close(); }
  done();
})().catch(e => { console.log('FAIL browser test crashed: ' + e.message); process.exitCode = 1; });
