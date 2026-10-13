// The REAL IO form in a headless browser with a fake catalog (no network, nothing is submitted).
// Guards the STMM "add 7 emails" bugs: a group's custom price used to DELETE the quantity box of per-unit rows, cents were shown as whole dollars.
const { check, done, ROOT } = require('./lib');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.log('SKIPPED (playwright is not installed: run "npm install playwright" or use a machine that has it)'); process.exit(0); }
const SB = 'https://emydtkhnespbxraiijkx.supabase.co';
const svc = o => ({ active: true, sort_order: 1, billing_type: 'monthly', pricing_mode: 'flat', ...o });
const SERVICES = [
  svc({ id: 'w-email', label: 'Addl. Email Addresses', section: 'web-ot', pricing_mode: 'per_unit', default_price: 7, unit_label: 'each', sort_order: 1 }),
  svc({ id: 'w-content', label: 'Optional Content Support', section: 'web-ot', pricing_mode: 'per_unit', billing_type: 'one_time', default_price: 43.75, unit_label: 'hour', qty_preset_options: [0.25, 0.5, 1, 2], sort_order: 2 }),
  svc({ id: 'w-flat', label: 'Website Flat Thing', section: 'web-ot', default_price: 175, sort_order: 3 }),
  svc({ id: 'w-module', label: 'Website Modules', section: 'web-ot', pricing_mode: 'per_unit', billing_type: 'one_time', default_price: 750, unit_label: 'each', qty_option_labels: ['Gallery', 'Blog'], sort_order: 4 })];
(async () => {
  let browser; try { browser = await chromium.launch(); } catch (e) { try { browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); } catch (e2) { console.log('SKIPPED (no browser available for playwright)'); process.exit(0); } }
  try {
  const pg = await browser.newPage({ viewport: { width: 1200, height: 900 } }); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.route(SB + '/**', async r => { const u = r.request().url(); let body = '[]';
    if (u.includes('/rest/v1/services')) body = JSON.stringify(SERVICES);
    else if (u.includes('/rest/v1/sections')) body = JSON.stringify([{ id: 'web-ot', label: 'Website — One-Time', sort_order: 1, active: true }]);
    else if (u.includes('/rpc/get_group_for_embed_key')) body = JSON.stringify([{ id: 'g1', name: 'STMM Digital', active: true, io_slug: 'stmm', io_pricing: { 'w-email': 7.5 }, am_name: 'Carol', am_email: 'c@x.com' }]);
    else if (u.includes('/rest/v1/hosting_proration_settings')) body = JSON.stringify([{ page_type: '1p', days: 3, label: '1 page' }]);
    else if (u.includes('/rest/v1/intake_forms')) body = JSON.stringify([{ id: 'x', title: 'X', definition: {} }]);
    await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body }); });
  await pg.goto('file://' + ROOT + '/index.html?preview=1&t=abc123'); await pg.waitForSelector('tr[data-id="w-email"]', { state: 'attached', timeout: 15000 });
  pg.setDefaultTimeout(10000);
  const row = id => pg.evaluate(id => { const tr = document.querySelector('tr[data-id="' + id + '"]'); const fee = tr.querySelector('td.svc-fee') || tr.querySelector('td.right'); return { text: fee.innerText.replace(/\s+/g, ' ').trim(), hasQtyBox: !!tr.querySelector('.qty-field'), hasLabel: /How many\?/.test(fee.innerText) }; }, id);
  const email = await row('w-email'), content = await row('w-content'), flat = await row('w-flat'), mod = await row('w-module');
  check('custom-priced per-unit row (STMM $7.50) shows $7.50, not $8', /^\$7\.50/.test(email.text), true);
  check('custom-priced per-unit row KEEPS its quantity box and "How many?" label', [email.hasQtyBox, email.hasLabel], [true, true]);
  check('per-unit hours row (preset dropdown) has the box, the label and cents', [content.hasQtyBox, content.hasLabel, /^\$43\.75/.test(content.text)], [true, true, true]);
  check('flat row: no quantity box, price unchanged', [flat.hasQtyBox, flat.text], [false, '$175']);
  check('module row: read-only count, no "How many?" label', mod.hasLabel, false);
  await pg.evaluate(() => { const i = document.querySelector('tr[data-id="w-email"] .qty-field'); i.value = '7'; i.dispatchEvent(new Event('change')); });
  const state = await pg.evaluate(() => { buildReview(); return { sel: selected['w-email'] && { qty: selected['w-email'].qty, recurring: selected['w-email'].recurring }, total: document.getElementById('total-monthly').textContent, review: document.getElementById('summary-body').textContent.replace(/\s+/g, ' '), draft: buildDraft().selected['w-email'], fmt: [fmt(7.5), fmt(52.5), fmt(43.75), fmt(1500), fmt(8), fmt(0)] }; });
  check('typing 7 selects the service with quantity 7 at $7.50 each', state.sel, { qty: 7, recurring: 7.5 });
  check('Review shows "$7.50 × 7 = $52.50/mo" and a $52.50/mo total', [/\$7\.50 × 7 = \$52\.50\/mo/.test(state.review), state.total], [true, '$52.50/mo']);
  check('a saved draft carries the quantity', state.draft.qty, 7);
  check('the form\'s price format shows cents only when needed', state.fmt, ['$7.50', '$52.50', '$43.75', '$1,500', '$8', '—']);
  check('no page errors', errs, []);
  } finally { await browser.close(); }
  done();
})().catch(e => { console.log('FAIL browser test crashed: ' + e.message); process.exitCode = 1; });
