// SUBMISSION-PATH SMOKE TEST: runs the real submitIO() in a headless browser with a faked network (a group with NO Trello board, so only the
// database calls happen). Guards: a normal order still saves with the right totals, a failed client lookup now STOPS the order before anything
// is saved, and a swapped Website package no longer leaves the dropped package's hosting in the saved total. Nothing real is contacted.
const { check, done, ROOT } = require('./lib');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.log('SKIPPED (playwright is not installed: run "npm install playwright" or use a machine that has it)'); process.exit(0); }
const SB = 'https://emydtkhnespbxraiijkx.supabase.co';
const G = 'a0000000-0000-4000-8000-000000000001', CL = 'c0000000-0000-4000-8000-000000000002', ORD = 'd0000000-0000-4000-8000-000000000003';
const svc = o => ({ active: true, sort_order: 1, billing_type: 'monthly', pricing_mode: 'flat', ...o });
const SERVICES = [
  svc({ id: 'w-bs', label: 'Business Starter*', section: 'web-ot', billing_type: 'one_time', default_price: 1000, exclusivity_group: 'web-tier', sort_order: 1 }),
  svc({ id: 'w-bb', label: 'Business Builder*', section: 'web-ot', billing_type: 'one_time', default_price: 2000, exclusivity_group: 'web-tier', sort_order: 2 }),
  svc({ id: 'w-flat', label: 'Website Flat Thing', section: 'web-ot', billing_type: 'one_time', default_price: 175, sort_order: 3 }),
  svc({ id: 'w-host', label: 'Hosting Fee*', section: 'web-ot', billing_type: 'yearly', default_price: 450, sort_order: 4 }),
  svc({ id: 'w-mon', label: 'Monthly Thing', section: 'web-ot', billing_type: 'monthly', default_price: 69, sort_order: 5 })];
(async () => {
  let browser; try { browser = await chromium.launch(); } catch (e) { try { browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); } catch (e2) { console.log('SKIPPED (no browser available for playwright)'); process.exit(0); } }
  try {
    const open = async (clientOk) => {
      const pg = await browser.newPage({ viewport: { width: 1200, height: 900 } }); const seen = { rpc: [], orders: [], errs: [] }; pg.on('pageerror', e => seen.errs.push(e.message));
      await pg.route('**/*', async r => { const u = r.request().url(); const m = r.request().method();
        if (!u.startsWith(SB)) { if (u.startsWith('file:')) return r.continue(); return r.abort(); }   // nothing outside the fake Supabase is reachable
        let body = '[]', status = 200;
        if (u.includes('/rest/v1/services')) body = JSON.stringify(SERVICES);
        else if (u.includes('/rest/v1/sections')) body = JSON.stringify([{ id: 'web-ot', label: 'Website — One-Time', sort_order: 1, active: true }]);
        else if (u.includes('/rpc/get_group_for_embed_key')) body = JSON.stringify([{ id: G, name: 'STMM Digital', active: true, io_slug: 'stmm', am_name: 'Carol', am_email: 'c@x.com', trello_board_id: null }]);
        else if (u.includes('/rest/v1/hosting_proration_settings')) body = JSON.stringify([{ page_type: '1p', days: 3, label: '1 page' }]);
        else if (u.includes('/rest/v1/intake_forms')) body = JSON.stringify([{ id: 'x', title: 'X', definition: {} }]);
        else if (u.includes('/rpc/find_or_create_client')) { seen.rpc.push('find_or_create_client'); if (clientOk) body = JSON.stringify({ id: CL, trello_list_id: null }); else { status = 500; body = JSON.stringify({ message: 'database is having a moment' }); } }
        else if (u.includes('/rpc/find_or_create_ae')) { seen.rpc.push('find_or_create_ae'); body = '{}'; }
        else if (u.includes('/rest/v1/orders') && m === 'POST') { seen.orders.push(JSON.parse(r.request().postData() || '{}')); body = JSON.stringify([{ id: ORD }]); }
        else if (u.includes('/rest/v1/orders')) body = '[]';
        else if (u.includes('/functions/v1/claude-proxy')) body = '{}';
        await r.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body }); });
      await pg.goto('file://' + ROOT + '/index.html?preview=1&t=abc123'); await pg.waitForSelector('tr[data-id="w-bs"]', { state: 'attached', timeout: 15000 }); pg.setDefaultTimeout(10000);
      return { pg, seen };
    };
    const fillAndSubmit = async (pg, ids, preSubmit) => pg.evaluate(async ({ ids, pre }) => {
      const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
      set('biz-name', 'Smoke Test Co'); set('contact-name', 'Pat'); set('contact-phone', '555-1212'); set('contact-email', 'pat@x.test'); set('website-url', 'https://x.test'); set('city', 'Des Moines'); set('biz-type', 'Retail');
      set('ae-name', 'Ann AE'); set('ae-email', 'ann@x.test'); set('io-date', '2026-10-14'); set('campaign-start', '2027-01-01'); set('auth-name', 'Pat Client'); set('auth-title', 'Owner');
      ['agree-terms', 'agree-ip', 'agree-pricing'].forEach(id => { const el = document.getElementById(id); if (el) el.checked = true; });
      window.hasSignature = () => true; window.getSignatureData = () => 'data:image/png;base64,AAAA';
      ids.forEach(id => { const cb = document.querySelector('tr[data-id="' + id + '"] input[type=checkbox]'); cb.checked = true; const g = Object.keys(RADIO_GROUPS).find(k => RADIO_GROUPS[k].includes(id)); if (g) toggleSingle(cb, id, g); else toggle(cb, id); });
      Object.keys(selected).forEach(id => { selected[id].start_date = '2027-01-01'; selected[id].end_date = '2027-01-31'; });
      if (pre === 'swap') { hostingChoices['w-bs'] = { choice: 'us', package: '1p', proratedAmt: 100 }; const cb = document.querySelector('tr[data-id="w-bb"] input[type=checkbox]'); cb.checked = true; toggleSingle(cb, 'w-bb', Object.keys(RADIO_GROUPS).find(k => RADIO_GROUPS[k].includes('w-bb'))); Object.keys(selected).forEach(id => { selected[id].start_date = '2027-01-01'; selected[id].end_date = '2027-01-31'; }); }
      const toasts = []; const realToast = showToast; window.showToast = (m, t) => { toasts.push((t || 'ok') + ': ' + m); realToast(m, t); };
      await submitIO();
      return { success: document.getElementById('page-success').style.display === 'block', btnDisabled: document.getElementById('submit-btn').disabled, toasts }; }, { ids, pre: preSubmit });

    // 1. a normal order still saves, with the right totals
    let { pg, seen } = await open(true);
    let r = await fillAndSubmit(pg, ['w-flat', 'w-host', 'w-mon']);
    const o = seen.orders[0] || {};
    check('normal order: the client is looked up once, the order is saved once, and the success screen shows', [seen.rpc.filter(x => x === 'find_or_create_client').length, seen.orders.length, r.success], [1, 1, true]);
    check('normal order: saved with the linked client, one-time $175, monthly $69 (the yearly $450 is NOT monthly), 3 line items',
      [o.client_id, o.total_onetime, o.total_monthly, (o.line_items || []).length], [CL, 175, 69, 3]);
    check('normal order: no page errors', seen.errs, []);
    await pg.close();

    // 2. a failed client lookup stops everything before the order is saved
    ({ pg, seen } = await open(false));
    r = await fillAndSubmit(pg, ['w-flat']);
    check('failed client lookup: NO order is saved, no success screen, the button is usable again', [seen.orders.length, r.success, r.btnDisabled], [0, false, false]);
    check('failed client lookup: the AE is told clearly that nothing was saved', r.toasts.some(t => /was NOT submitted and nothing was saved/.test(t)), true);
    await pg.close();

    // 3. package swap: the dropped package's hosting is not in the saved total
    ({ pg, seen } = await open(true));
    r = await fillAndSubmit(pg, ['w-bs'], 'swap');
    const o3 = seen.orders[0] || {};
    check('package swap: saved one-time total is just the Builder package ($2,000), not $2,000 + the dropped Starter\'s $100 hosting', [o3.total_onetime, Object.keys(o3.hosting_choices || {})], [2000, []]);
    await pg.close();
  } finally { await browser.close(); }
  done();
})().catch(e => { console.log('FAIL browser test crashed: ' + e.message); process.exitCode = 1; });
