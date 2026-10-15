// The SEM setup fee (auto-added under the catalog threshold) must NOT be added for a multi-agent client (MS Farm Bureau Agents),
// and must still be added for everyone else. Real form code in Chromium: Review, printed IO and the saved order line.
const { check, done, ROOT } = require('./lib');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.log('SKIPPED (playwright is not installed)'); process.exit(0); }
const SB = 'https://emydtkhnespbxraiijkx.supabase.co';
const G = 'a0000000-0000-4000-8000-000000000001', CL = 'c0000000-0000-4000-8000-000000000002', ORD = 'd0000000-0000-4000-8000-000000000003';
const SERVICES = [{ id: 'sem-bp', label: 'SEM Business Pro', section: 'sem', active: true, sort_order: 1, billing_type: 'monthly', pricing_mode: 'spend', auto_add_setup_fee: true, setup_fee: 200, setup_fee_threshold: 1000 }];
(async () => {
  let browser; try { browser = await chromium.launch(); } catch (e) { try { browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); } catch (e2) { console.log('SKIPPED (no browser)'); process.exit(0); } }
  try {
    const pg = await browser.newPage({ viewport: { width: 1200, height: 900 } }); const errs = [], orders = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.route('**/*', async r => { const u = r.request().url(), m = r.request().method(); if (u.startsWith('file:')) return r.continue(); if (!u.startsWith(SB)) return r.abort();
      let body = '[]';
      if (u.includes('/rest/v1/services')) body = JSON.stringify(SERVICES);
      else if (u.includes('/rest/v1/sections')) body = JSON.stringify([{ id: 'sem', label: 'SEM', sort_order: 1, active: true }]);
      else if (u.includes('/rpc/get_group_for_embed_key')) body = JSON.stringify([{ id: G, name: 'STMM Digital', active: true, io_slug: 'stmm', am_name: 'Carol', am_email: 'c@x.com', trello_board_id: null }]);
      else if (u.includes('/rest/v1/hosting_proration_settings')) body = JSON.stringify([{ page_type: '1p', days: 3, label: '1 page' }]);
      else if (u.includes('/rest/v1/intake_forms')) body = JSON.stringify([{ id: 'x', title: 'X', definition: {} }]);
      else if (u.includes('/rpc/find_or_create_client')) body = JSON.stringify({ id: CL, trello_list_id: null });
      else if (u.includes('/rpc/')) body = '{}';
      else if (u.includes('/rest/v1/orders') && m === 'POST') { orders.push(JSON.parse(r.request().postData() || '{}')); body = JSON.stringify([{ id: ORD }]); }
      await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body }); });
    await pg.goto('file://' + ROOT + '/index.html?preview=1&t=abc123'); await pg.waitForSelector('tr[data-id="sem-bp"]', { state: 'attached', timeout: 15000 });
    const view = multi => pg.evaluate(multi => {
      Object.keys(selected).forEach(k => delete selected[k]);
      setAgentSplitCardVisible(!!multi);
      selected['sem-bp'] = { ...SERVICE_DATA['sem-bp'], section: 'sem', label: 'SEM Business Pro', spend: 500, start_date: '2027-01-01', end_date: '2027-03-31', budgetMode: 'monthly' };
      // the spend is typed into the row's box, as an AE would (the form re-reads that box when it builds the review and the IO)
      document.querySelector('tr[data-id="sem-bp"] input[type=number]:not(.qty-field):not(.quoted-price-field)').value = '500';
      buildReview(); window.getSignatureData = () => 'typed:Pat';
      return { info: getSetupFeeInfo('sem-bp', 500), review: document.getElementById('summary-body').innerText.replace(/\s+/g, ' '), printed: buildIoDocumentHtml().html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ') }; }, multi);
    const a = await view(false), b = await view(true);
    check('normal client: SEM under $1,000/mo still gets the $200 setup fee on Review and the printed IO', [a.info && a.info.amount, /Setup Fee/i.test(a.review), /Setup Fee/i.test(a.printed)], [200, true, true]);
    check('multi-agent client (Farm Bureau): NO setup fee anywhere', [b.info, /Setup Fee/i.test(b.review), /Setup Fee/i.test(b.printed)], [null, false, false]);
    check('normal client at or above the threshold has no setup fee either way (unchanged)', await pg.evaluate(() => { setAgentSplitCardVisible(false); return getSetupFeeInfo('sem-bp', 1000); }), null);
    // the saved order line: the submit payload uses the same function; check it with a real submit for a normal client
    await pg.evaluate(() => setAgentSplitCardVisible(false));
    await pg.evaluate(async () => {
      window.generateIoPdfBlob = async () => ({ base64: 'AAAA', fileName: 'io.pdf' });
      const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
      set('biz-name', 'Smoke Test Co'); set('contact-name', 'Pat'); set('contact-phone', '555-1212'); set('contact-email', 'pat@x.test'); set('website-url', 'https://x.test'); set('city', 'Des Moines'); set('biz-type', 'Retail');
      set('ae-name', 'Ann AE'); set('ae-email', 'ann@x.test'); set('io-date', '2026-10-15'); set('campaign-start', '2027-01-01'); set('auth-name', 'Pat Client'); set('auth-title', 'Owner');
      ['agree-terms', 'agree-ip', 'agree-pricing'].forEach(id => { const el = document.getElementById(id); if (el) el.checked = true; });
      window.hasSignature = () => true; window.getSignatureData = () => 'data:image/png;base64,AAAA';
      Object.keys(selected).forEach(k => delete selected[k]);
      const cb = document.querySelector('tr[data-id="sem-bp"] input[type=checkbox]'); cb.checked = true; toggle(cb, 'sem-bp'); selected['sem-bp'].start_date = '2027-01-01'; selected['sem-bp'].end_date = '2027-03-31';
      document.querySelector('tr[data-id="sem-bp"] input[type=number]:not(.qty-field):not(.quoted-price-field)').value = '500';
      await submitIO(); });
    const li = (orders[0] && orders[0].line_items || [])[0] || {};
    check('normal client submit: the saved order line carries setup_fee_amt 200 (unchanged)', [orders.length, li.setup_fee_amt], [1, 200]);
    check('no page errors', errs, []);
  } finally { await browser.close(); }
  done();
})().catch(e => { console.log('FAIL browser test crashed: ' + e.message); process.exitCode = 1; });
