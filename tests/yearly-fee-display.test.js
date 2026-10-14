// A YEARLY fee (Hosting Fee, $450) must read "/yr", stay out of Monthly Recurring and have its own Annual total:
// on the IO form's Review, on the printed/signed IO, in the order totals saved at submission, in the shared order
// modal and in Admin. (Rollins Construction, 2026-10-13: the signed IO said "$450/mo".)
const { read, fn, check, done, ROOT } = require('./lib');

// ---- shared.js + Admin (pure functions) -------------------------------------------------------------
const shared = read('shared.js'), admin = read('admin/index.html');
const CATALOG_ROWS = { 'w-hosting': { billing_type: 'yearly' }, 'wm-hosting': { billing_type: 'monthly' }, 'w-flat': { billing_type: 'one_time' } };
const sh = new Function('CATALOG_ROWS', fn(shared, 'lineSpendVaries') + fn(shared, 'describeLineItemAmount') + fn(shared, 'orderLiveTotals') + '; return { describeLineItemAmount, orderLiveTotals };')(CATALOG_ROWS);
const host = { service_id: 'w-hosting', recurring: 450, fee: 0 }, mon = { service_id: 'wm-hosting', recurring: 69, fee: 0 }, flat = { service_id: 'w-flat', fee: 175, recurring: 0 };
check('shared: yearly line reads $450.00/yr', sh.describeLineItemAmount(host).text, '$450.00/yr');
check('shared: monthly line still reads /mo', sh.describeLineItemAmount(mon).text, '$69.00/mo');
const t = sh.orderLiveTotals({ line_items: [host, mon, flat] });
check('shared: totals keep yearly out of monthly', [t.monthly, t.annual, t.oneTime], [69, 450, 175]);
check('shared: a yearly-only order has $0 monthly', [sh.orderLiveTotals({ line_items: [host] }).monthly, sh.orderLiveTotals({ line_items: [host] }).annual], [0, 450]);
const adminTotals = new Function('CATALOG_ROWS', 'adminLineSpendVaries', fn(admin, 'adminOrderLiveTotals') + '; return adminOrderLiveTotals;')(CATALOG_ROWS, () => false);
const at = adminTotals({ line_items: [host, mon, flat] });
check('Admin: live totals keep yearly out of monthly', [at.monthly, at.annual, at.oneTime], [69, 450, 175]);

// ---- the real IO form --------------------------------------------------------------------------------
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.log('SKIPPED (playwright is not installed: run "npm install playwright" or use a machine that has it)'); process.exit(0); }
const SB = 'https://emydtkhnespbxraiijkx.supabase.co';
const svc = o => ({ active: true, sort_order: 1, billing_type: 'monthly', pricing_mode: 'flat', ...o });
const SERVICES = [svc({ id: 'w-hosting', label: 'Hosting Fee*', section: 'web-ot', billing_type: 'yearly', default_price: 450, sort_order: 1 }),
  svc({ id: 'w-flat', label: 'Website Flat Thing', section: 'web-ot', billing_type: 'one_time', default_price: 175, sort_order: 2 }),
  svc({ id: 'w-mon', label: 'Monthly Thing', section: 'web-ot', billing_type: 'monthly', default_price: 69, sort_order: 3 })];
(async () => {
  let browser; try { browser = await chromium.launch(); } catch (e) { try { browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); } catch (e2) { console.log('SKIPPED (no browser available for playwright)'); process.exit(0); } }
  try {
    const pg = await browser.newPage({ viewport: { width: 1200, height: 900 } }); const errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.route(SB + '/**', async r => { const u = r.request().url(); let body = '[]';
      if (u.includes('/rest/v1/services')) body = JSON.stringify(SERVICES);
      else if (u.includes('/rest/v1/sections')) body = JSON.stringify([{ id: 'web-ot', label: 'Website — One-Time', sort_order: 1, active: true }]);
      else if (u.includes('/rpc/get_group_for_embed_key')) body = JSON.stringify([{ id: 'g1', name: 'STMM Digital', active: true, io_slug: 'stmm', am_name: 'Carol', am_email: 'c@x.com' }]);
      else if (u.includes('/rest/v1/hosting_proration_settings')) body = JSON.stringify([{ page_type: '1p', days: 3, label: '1 page' }]);
      else if (u.includes('/rest/v1/intake_forms')) body = JSON.stringify([{ id: 'x', title: 'X', definition: {} }]);
      await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body }); });
    await pg.goto('file://' + ROOT + '/index.html?preview=1&t=abc123'); await pg.waitForSelector('tr[data-id="w-hosting"]', { state: 'attached', timeout: 15000 });
    pg.setDefaultTimeout(10000);
    const run = (ids) => pg.evaluate(ids => {
      Object.keys(selected).forEach(k => delete selected[k]);
      ids.forEach(id => { selected[id] = { ...SERVICE_DATA[id], section: CATALOG_ROWS[id].section, label: CATALOG_ROWS[id].label, start_date: '2027-01-01', end_date: '2027-01-31' }; });
      buildReview();
      const annualWrap = document.getElementById('total-annual-wrap');
      const lineItems = ids.map(id => ({ service_id: id, recurring: selected[id].recurring || 0, fee: selected[id].fee || 0 }));
      let printed = ''; try { printed = buildIoDocumentHtml().html; } catch (e) { printed = 'ERR ' + e.message; }
      return { review: document.getElementById('summary-body').innerText.replace(/\s+/g, ' '), monthlyTile: document.getElementById('total-monthly').textContent,
        annualShown: annualWrap && annualWrap.style.display !== 'none', annualTile: document.getElementById('total-annual').textContent,
        split: splitRecurringTotals(lineItems), printed: printed.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ') };
    }, ids);
    const a = await run(['w-hosting']);
    check('Review: yearly fee reads "$450/yr", never "$450/mo"', [/\$450\/yr/.test(a.review), /\$450\/mo/.test(a.review)], [true, false]);
    check('Review: Monthly Recurring tile shows nothing ("—/mo", as for any order with no monthly fee) and the Annual tile shows $450/yr', [a.monthlyTile, a.annualShown, a.annualTile], ['—/mo', true, '$450/yr']);
    check('Saved order totals: monthly 0, annual 450', a.split, { monthly: 0, annual: 450 });
    check('Printed IO: "$450/yr" and an Annual row, no "$450/mo", no Monthly Recurring row', [/\$450\/yr/.test(a.printed), /Annual\s*\$450\/yr/.test(a.printed), /\$450\/mo/.test(a.printed), /Monthly Recurring/.test(a.printed)], [true, true, false, false]);
    const b = await run(['w-hosting', 'w-mon', 'w-flat']);
    check('Mixed order: monthly 69, annual 450 (each in its own line)', [b.monthlyTile, b.annualTile, b.split], ['$69/mo', '$450/yr', { monthly: 69, annual: 450 }]);
    check('Mixed order printed IO has both Monthly Recurring and Annual rows', [/Monthly Recurring\s*\$69\/mo/.test(b.printed), /Annual\s*\$450\/yr/.test(b.printed)], [true, true]);
    const c = await run(['w-mon']);
    check('A normal monthly-only order is unchanged: no Annual tile, no Annual row', [c.annualShown, /Annual\s*\$/.test(c.printed), c.monthlyTile], [false, false, '$69/mo']);
    check('no page errors', errs, []);
    check('Admin: Correct Service total and Campaign Lines amount say /yr for a yearly service', [/New amount: \$\{money\(price \* qty\)\}\$\{\['yearly', 'annual'\]\.includes\(r\.billing_type\)/.test(admin), /CATALOG_ROWS\[r\.service_id\]\?\.billing_type\) \? '\/yr'/.test(admin)], [true, true]);
    check('Accounting: add-service panel says Yearly fee and /yr for a yearly service', [/'Yearly fee'/.test(read('accounting/index.html')), /'\/yr' : '\/mo'\)\}` : 'Not set in the catalog/.test(read('accounting/index.html'))], [true, true]);
    // the Trello card text and the order-summary text come from submitIO(), so check the source uses the shared rule
    const idx = read('index.html');
    check('Trello card price text uses the /yr rule in both places', (idx.match(/recurringSuffix\(li\.service_id\)/g) || []).length, 2);
    check('order summary adds an Annual line and saves monthly without yearly fees', [/\*\*Annual:\*\* \$\$\{annual/.test(idx), /let monthly = recurringSplit\.monthly;/.test(idx)], [true, true]);
  } finally { await browser.close(); }
  done();
})().catch(e => { console.log('FAIL browser test crashed: ' + e.message); process.exitCode = 1; });
