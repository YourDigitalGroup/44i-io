// The REAL IO form in a headless browser with a fake catalog (nothing is submitted). Audit batch 1B (2026-10-14), order-form logic:
//  - swapping a Website package no longer leaves the dropped package's hosting in the total
//  - a returning client's custom price reaches services that were already ticked (typed values are kept)
//  - a restored draft is brought up to today's catalog, with a plain-English notice (and dropped services are named)
//  - a "whole campaign total" with no end date is detected (blocked at Step 2->3 and at Submit)
//  - a failed client lookup STOPS the submission (and a client whose details did not load blocks it)
const { read, check, done, ROOT } = require('./lib');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.log('SKIPPED (playwright is not installed: run "npm install playwright" or use a machine that has it)'); process.exit(0); }
const SB = 'https://emydtkhnespbxraiijkx.supabase.co';
const svc = o => ({ active: true, sort_order: 1, billing_type: 'monthly', pricing_mode: 'flat', ...o });
const SERVICES = [
  svc({ id: 'w-bs', label: 'Business Starter*', section: 'web-ot', billing_type: 'one_time', default_price: 1000, exclusivity_group: 'web-tier', sort_order: 1 }),
  svc({ id: 'w-bb', label: 'Business Builder*', section: 'web-ot', billing_type: 'one_time', default_price: 2000, exclusivity_group: 'web-tier', sort_order: 2 }),
  svc({ id: 'w-flat', label: 'Website Flat Thing', section: 'web-ot', billing_type: 'one_time', default_price: 175, sort_order: 3 }),
  svc({ id: 'w-qur', label: 'Custom Site', section: 'web-ot', billing_type: 'one_time', default_price: null, sort_order: 4 }),
  svc({ id: 'w-email', label: 'Addl. Email Addresses', section: 'web-ot', pricing_mode: 'per_unit', default_price: 7, unit_label: 'each', sort_order: 5 })];
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
    await pg.goto('file://' + ROOT + '/index.html?preview=1&t=abc123'); await pg.waitForSelector('tr[data-id="w-bs"]', { state: 'attached', timeout: 15000 });
    pg.setDefaultTimeout(10000);
    const tick = id => pg.evaluate(id => { const cb = document.querySelector('tr[data-id="' + id + '"] input[type=checkbox]'); cb.checked = true; const g = Object.keys(RADIO_GROUPS).find(k => RADIO_GROUPS[k].includes(id)); if (g) toggleSingle(cb, id, g); else toggle(cb, id); }, id);

    // ---- 1. package swap ----
    await tick('w-bs');
    await pg.evaluate(() => { hostingChoices['w-bs'] = { choice: 'us', package: '1p', proratedAmt: 100 }; });
    check('before the swap: the Starter package\'s prorated hosting counts ($100)', await pg.evaluate(() => proratedHostingTotal()), 100);
    await tick('w-bb');
    const sw = await pg.evaluate(() => ({ starter: !!selected['w-bs'], builder: !!selected['w-bb'], choice: !!hostingChoices['w-bs'], total: proratedHostingTotal() }));
    check('after swapping Starter -> Builder: Starter is gone, its hosting choice is gone, and its hosting no longer counts', sw, { starter: false, builder: true, choice: false, total: 0 });
    check('a stale hosting choice for a service that is NOT on the order never counts', await pg.evaluate(() => { hostingChoices['w-bs'] = { choice: 'us', proratedAmt: 100 }; const t = proratedHostingTotal(); delete hostingChoices['w-bs']; return t; }), 0);

    // ---- 2. returning client's custom price reaches ticked services ----
    await pg.evaluate(() => { Object.keys(selected).forEach(k => delete selected[k]); });
    await tick('w-flat'); await tick('w-email'); await tick('w-qur');
    // type into the real input boxes, like an AE does
    await pg.evaluate(() => { const type = (sel, v) => { const el = document.querySelector(sel); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
      type('tr[data-id="w-email"] .qty-field', '7'); type('tr[data-id="w-email"] .notes-field', 'typed note'); type('tr[data-id="w-qur"] .quoted-price-field', '300'); syncRowInputs(); });
    const r2 = await pg.evaluate(() => { selectedClientId = 'c1'; selectedClientDetails = { io_pricing: { 'w-flat': 200, 'w-email': 7.5 } };
      const notes = reapplyPricingOverrides(); return { notes, flat: selected['w-flat'].fee, emailPrice: selected['w-email'].recurring, qty: selected['w-email'].qty, note: selected['w-email'].notes, qur: selected['w-qur'].fee }; });
    check('custom client price is applied to services ticked BEFORE the client was picked', [r2.flat, r2.emailPrice], [200, 7.5]);
    check('what the AE typed is kept: quantity, notes, a typed Quote-Upon-Request price', [r2.qty, r2.note, r2.qur], [7, 'typed note', 300]);
    check('the AE is told what changed', [r2.notes.length, /Website Flat Thing: price is now \$200 one-time \(was \$175 one-time\)/.test(r2.notes.join('|')), /Addl\. Email Addresses: price is now \$7\.50\/mo \(was \$7\/mo\)/.test(r2.notes.join('|'))], [2, true, true]);
    await pg.evaluate(() => { selectedClientId = null; selectedClientDetails = null; reapplyPricingOverrides(); }); // back to catalog prices

    // ---- 3. restored draft ----
    await pg.evaluate(() => { Object.keys(selected).forEach(k => { const cb = document.querySelector('tr[data-id="' + k + '"] input[type=checkbox]'); if (cb) { cb.checked = false; toggle(cb, k); } }); });
    await tick('w-flat');
    const draft = await pg.evaluate(() => { const d = JSON.parse(JSON.stringify(buildDraft())); d.selected['w-gone'] = { label: 'Old Retired Service', fee: 50, recurring: 0 }; d.hostingChoices = { 'w-gone': { choice: 'us', proratedAmt: 60 } }; return d; });
    await pg.evaluate(() => { Object.keys(selected).forEach(k => { const cb = document.querySelector('tr[data-id="' + k + '"] input[type=checkbox]'); if (cb) { cb.checked = false; toggle(cb, k); } });
      CATALOG_ROWS['w-flat'].default_price = 300; SERVICE_DATA['w-flat'] = rowToServiceData(CATALOG_ROWS['w-flat']); });
    const r3 = await pg.evaluate(d => { applyDraftFields(d); const n = document.getElementById('draft-changes-notice');
      return { price: selected['w-flat'] && selected['w-flat'].fee, gone: !!selected['w-gone'], hosting: Object.keys(hostingChoices), notice: n ? n.innerText.replace(/\s+/g, ' ') : null }; }, draft);
    check('restored draft: the old $175 price is replaced by today\'s $300', r3.price, 300);
    check('restored draft: a service that no longer exists is dropped, with its hosting choice', [r3.gone, r3.hosting], [false, []]);
    check('restored draft: a plain-English notice names the price change and the removed service', [/price is now \$300 one-time \(was \$175 one-time\)/.test(r3.notice || ''), /Old Retired Service is no longer available/.test(r3.notice || '')], [true, true]);
    const quiet = await pg.evaluate(() => { document.getElementById('draft-changes-notice')?.remove(); const d = JSON.parse(JSON.stringify(buildDraft())); Object.keys(selected).forEach(k => { const cb = document.querySelector('tr[data-id="' + k + '"] input[type=checkbox]'); if (cb) { cb.checked = false; toggle(cb, k); } }); applyDraftFields(d); return !!document.getElementById('draft-changes-notice'); });
    check('restored draft with nothing changed: no notice', quiet, false);

    // ---- 4. whole campaign total needs an end date ----
    check('whole campaign total with no end date is detected; with an end date or in monthly mode it is not', await pg.evaluate(() => {
      Object.keys(selected).forEach(k => delete selected[k]);
      selected['a'] = { budgetMode: 'total', start_date: '2026-11-01' }; selected['b'] = { budgetMode: 'total', start_date: '2026-11-01', end_date: '2027-01-31' }; selected['c'] = { budgetMode: 'monthly', start_date: '2026-11-01' };
      return totalModeMissingEndDate(); }), ['a']);

    // ---- 5. client lookup ----
    const lk = await pg.evaluate(async () => { const real = sb; const out = {};
      window.sb = async () => { throw new Error('boom'); }; try { await findOrCreateClientOrThrow({}); out.failed = 'no error'; } catch (e) { out.failed = e.message; }
      window.sb = async () => null; try { await findOrCreateClientOrThrow({}); out.empty = 'no error'; } catch (e) { out.empty = e.message; }
      window.sb = async () => ({ id: 'cl-1', trello_list_id: 'L1', covering_strategist_trello: 'bronson' }); const ok = await findOrCreateClientOrThrow({});
      out.ok = [ok.id, ok.trello_list_id, ok.coveringStrategistTrello]; window.sb = real; return out; });
    check('client lookup that ERRORS stops the submission with a clear "NOT submitted, nothing was saved" message', /was NOT submitted and nothing was saved/.test(lk.failed), true);
    check('client lookup that returns nothing also stops it', /was NOT submitted/.test(lk.empty), true);
    check('client lookup that works still returns the client (id, Trello list, covering strategist)', lk.ok, ['cl-1', 'L1', 'bronson']);
    const cd = await pg.evaluate(async () => { CLIENT_ROSTER = [{ id: 'c1', name: 'Acme' }]; const real = sb; window.sb = async () => { throw new Error('boom'); };
      await applyClientPick('c1'); const failed = clientDetailsFailed; window.sb = async () => [{ id: 'c1', contact_name: 'Pat' }]; await applyClientPick('c1'); window.sb = real; return { failed, after: clientDetailsFailed }; });
    check('a client whose saved details did not load is flagged (and the flag clears once they load)', cd, { failed: true, after: false });
    check('no page errors', errs, []);

    // ---- source: the three guards are really wired in ----
    const src = read('index.html');
    check('Step 2->3 and Submit both use the end-date rule; Submit refuses an unloaded client; the old "save without a client" path is gone',
      [/const noEnd = totalModeMissingEndDate\(\)/.test(src), /if \(totalModeMissingEndDate\(\)\.length\) throw new Error/.test(src), /selectedClientId && clientDetailsFailed\) throw new Error/.test(src), /const client = await findOrCreateClientOrThrow\(clientPayload\)/.test(src), /order will save without a linked client record/.test(src)],
      [true, true, true, true, false]);
  } finally { await browser.close(); }
  done();
})().catch(e => { console.log('FAIL browser test crashed: ' + e.message); process.exitCode = 1; });
