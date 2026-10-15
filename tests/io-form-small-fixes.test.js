// Three small order-form fixes, each through the REAL submit (fake Supabase + fake Trello/email):
//  1. a Website Modules row ticked with NOTHING picked is refused ("pick at least one"), not saved as one paid module;
//  2. a quote-upon-request service with no quoted price is refused, not saved as a $0 line;
//  3. a very long order's Trello IO-card description keeps its TOTALS (only the services list is shortened).
const { check, done, ROOT } = require('./lib');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.log('SKIPPED (playwright is not installed)'); process.exit(0); }
const SB = 'https://emydtkhnespbxraiijkx.supabase.co';
const G = 'a0000000-0000-4000-8000-000000000001', CL = 'c0000000-0000-4000-8000-000000000002', ORD = 'd0000000-0000-4000-8000-000000000003';
const svc = o => ({ active: true, sort_order: 1, billing_type: 'one_time', pricing_mode: 'flat', ...o });
const SERVICES = [svc({ id: 'w-flat', label: 'Website Flat Thing', section: 'web', default_price: 175, sort_order: 1 }),
  svc({ id: 'w-module', label: 'Modules', section: 'web', pricing_mode: 'per_unit', unit_label: 'each', default_price: 50, qty_option_labels: ['Newsletter', 'Calendar'], sort_order: 2 }),
  svc({ id: 'w-custom', label: 'Custom Build', section: 'web', default_price: null, sort_order: 3 }),
  svc({ id: 'sem-m', label: 'Monthly Search', section: 'web', billing_type: 'monthly', default_price: 99, sort_order: 4 })];
(async () => {
  let browser; try { browser = await chromium.launch(); } catch (e) { try { browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); } catch (e2) { console.log('SKIPPED (no browser)'); process.exit(0); } }
  try {
    const open = async () => {
      const pg = await browser.newPage({ viewport: { width: 1200, height: 900 } }); const seen = { orders: [], cards: [], errs: [] }; pg.on('pageerror', e => seen.errs.push(e.message));
      await pg.route('**/*', async r => { const u = r.request().url(), m = r.request().method(); if (u.startsWith('file:')) return r.continue(); if (!u.startsWith(SB)) return r.abort(); let body = '[]';
        if (u.includes('/rest/v1/services')) body = JSON.stringify(SERVICES); else if (u.includes('/rest/v1/sections')) body = JSON.stringify([{ id: 'web', label: 'Website', sort_order: 1, active: true }]);
        else if (u.includes('/rpc/get_group_for_embed_key')) body = JSON.stringify([{ id: G, name: 'Test Group', active: true, io_slug: 't', am_name: 'Carol', am_email: 'c@x.com', trello_board_id: 'BOARD1', io_recipient: 'g@x.test' }]);
        else if (u.includes('hosting_proration_settings')) body = JSON.stringify([{ page_type: '1p', days: 3, label: '1 page' }]); else if (u.includes('/rest/v1/intake_forms')) body = JSON.stringify([{ id: 'x', title: 'X', definition: {} }]);
        else if (u.includes('/rpc/find_or_create_client')) body = JSON.stringify({ id: CL, trello_list_id: null }); else if (u.includes('/rpc/find_or_create_ae')) body = '{}';
        else if (u.includes('/rpc/get_notification_settings_for_embed_key')) body = '[{"always_bcc_recipients":""}]'; else if (u.includes('/rpc/')) body = '{}';
        else if (u.includes('/rest/v1/orders') && m === 'POST') { seen.orders.push(JSON.parse(r.request().postData() || '{}')); body = JSON.stringify([{ id: ORD }]); }
        else if (u.includes('/functions/v1/claude-proxy')) { const rq = JSON.parse(r.request().postData() || '{}'), t = rq.target;
          if (t === 'trello_create_card') seen.cards.push(rq);
          body = t === 'trello_get_lists' ? '[]' : t === 'trello_create_list' ? JSON.stringify({ id: 'LIST1', name: 'x' }) : t === 'trello_get_list_cards' ? '[]' : t === 'trello_create_card' ? JSON.stringify({ id: 'CARD' + seen.cards.length, name: rq.name }) : t === 'trello_get_card' ? JSON.stringify({ id: 'T', name: 'Tpl' }) : t === 'ping' ? '{"ok":true}' : '{}'; }
        await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body }); });
      await pg.goto('file://' + ROOT + '/index.html?preview=1&t=abc123'); await pg.waitForSelector('tr[data-id="w-flat"]', { state: 'attached', timeout: 15000 }); pg.setDefaultTimeout(10000);
      return { pg, seen };
    };
    const submit = (pg, ids, prep) => pg.evaluate(async ({ ids, prep }) => {
      window.generateIoPdfBlob = async () => ({ base64: 'AAAA', fileName: 'io.pdf' });
      const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
      set('biz-name', 'Smoke Test Co'); set('contact-name', 'Pat'); set('contact-phone', '555-1212'); set('contact-email', 'pat@x.test'); set('website-url', 'https://x.test'); set('city', 'Des Moines'); set('biz-type', 'Retail');
      set('ae-name', 'Ann AE'); set('ae-email', 'ann@x.test'); set('io-date', '2026-10-15'); set('campaign-start', '2027-01-01'); set('auth-name', 'Pat Client'); set('auth-title', 'Owner');
      ['agree-terms', 'agree-ip', 'agree-pricing'].forEach(id => { const el = document.getElementById(id); if (el) el.checked = true; });
      window.hasSignature = () => true; window.getSignatureData = () => 'data:image/png;base64,AAAA';
      ids.forEach(id => { const cb = document.querySelector('tr[data-id="' + id + '"] input[type=checkbox]'); cb.checked = true; toggle(cb, id); selected[id].start_date = '2027-01-01'; selected[id].end_date = '2027-01-31'; });
      if (prep) eval(prep);
      const toasts = []; const real = showToast; window.showToast = (m, t) => { toasts.push((t || 'ok') + ': ' + m); real(m, t); };
      await submitIO();
      return { success: document.getElementById('page-success').style.display === 'block', toasts }; }, { ids, prep });

    // 1. Website Modules, nothing picked
    let { pg, seen } = await open(); let r = await submit(pg, ['w-module']);
    check('modules ticked with NOTHING picked: refused with "pick at least one", nothing saved, no success screen', [seen.orders.length, r.success, r.toasts.some(t => /pick at least one option for Modules/.test(t))], [0, false, true]);
    r = await pg.evaluate(async () => { onModuleCheckboxChange('w-module', 'Newsletter', true); const toasts = []; const real = showToast; window.showToast = (m, t) => { toasts.push(m); real(m, t); }; await submitIO(); return { success: document.getElementById('page-success').style.display === 'block' }; });
    const li1 = (seen.orders[0] && seen.orders[0].line_items || [])[0] || {};
    check('after picking one module the same submit saves: quantity 1, fee $50, success screen', [seen.orders.length, li1.qty, li1.fee, r.success], [1, 1, 50, true]);
    await pg.close();
    ({ pg, seen } = await open()); r = await submit(pg, ['w-module'], "onModuleCheckboxChange('w-module', 'Newsletter', true); onModuleCheckboxChange('w-module', 'Calendar', true);");
    const li2 = (seen.orders[0] && seen.orders[0].line_items || [])[0] || {};
    check('two modules picked: quantity 2, fee $100 (picking still works exactly as before)', [li2.qty, li2.fee], [2, 100]); await pg.close();

    // 2. quote-upon-request with no price
    ({ pg, seen } = await open()); r = await submit(pg, ['w-custom']);
    check('quote-upon-request with NO price typed: refused with "enter the quoted price", nothing saved', [seen.orders.length, r.success, r.toasts.some(t => /enter the quoted price for Custom Build/.test(t))], [0, false, true]);
    r = await pg.evaluate(async () => { document.querySelector('tr[data-id="w-custom"] .quoted-price-field').value = '300'; await submitIO(); return { success: document.getElementById('page-success').style.display === 'block' }; });
    const li3 = (seen.orders[0] && seen.orders[0].line_items || [])[0] || {};
    check('with the quoted price typed ($300) the same submit saves it with that fee', [seen.orders.length, li3.fee, r.success], [1, 300, true]); await pg.close();
    ({ pg, seen } = await open()); r = await submit(pg, ['w-flat']);
    check('an ordinary service is not affected by either check', [seen.orders.length, r.success], [1, true]); await pg.close();

    // 3. a very long order: the totals survive on the Trello IO card
    ({ pg, seen } = await open());
    r = await submit(pg, ['w-flat', 'sem-m'], "document.querySelector('tr[data-id=\"w-flat\"] .notes-field').value = 'Long note about this service. '.repeat(700);");
    const io = seen.cards.find(c => /^IO — /.test(c.name || '')) || {}; const d = io.desc || '';
    check('long order: the IO card description is within Trello\'s limit but still ends with the totals, special instructions and AM/AE lines', [d.length > 0 && d.length <= 16000, /One-Time Total/.test(d), /Monthly Recurring/.test(d), /Special Instructions/.test(d)], [true, true, true, true]);
    check('long order: only the services list was shortened, and the card says so', [/list shortened here/.test(d), r.success], [true, true]);
    await pg.close();
    ({ pg, seen } = await open()); await submit(pg, ['w-flat', 'sem-m']);
    const d2 = (seen.cards.find(c => /^IO — /.test(c.name || '')) || {}).desc || '';
    check('a normal order\'s description is unchanged (no shortening note)', [/list shortened here/.test(d2), /One-Time Total/.test(d2)], [false, true]); await pg.close();
    // 4. the warnings come EARLIER, when Next is pressed from the services step (before the review/signature step), not only at the final Submit
    const next = (pg, ids, prep) => pg.evaluate(({ ids, prep }) => {
      const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
      set('biz-name', 'Smoke Test Co'); set('contact-name', 'Pat'); set('contact-phone', '555-1212'); set('contact-email', 'pat@x.test'); set('website-url', 'https://x.test'); set('city', 'Des Moines'); set('biz-type', 'Retail');
      set('ae-name', 'Ann AE'); set('ae-email', 'ann@x.test'); set('io-date', '2026-10-15'); set('campaign-start', '2027-01-01');
      ids.forEach(id => { const cb = document.querySelector('tr[data-id="' + id + '"] input[type=checkbox]'); cb.checked = true; toggle(cb, id); selected[id].start_date = '2027-01-01'; selected[id].end_date = '2027-01-31'; });
      if (prep) eval(prep);
      const toasts = []; const real = showToast; window.showToast = (m, t) => { toasts.push(m); real(m, t); };
      goStep(3);
      return { step: currentStep, toasts, moduleChecklistOpen: !!document.getElementById('module-detail-w-module'), quoteFlagged: !!document.querySelector('tr[data-id="w-custom"] .quoted-price-field.spend-missing') }; }, { ids, prep });
    ({ pg, seen } = await open()); let n = await next(pg, ['w-module']);
    check('modules with nothing picked: pressing Next does NOT reach step 3, says what to do, and opens the module checklist', [n.step === 3, n.toasts.some(m => /pick at least one option for: Modules before continuing/.test(m)), n.moduleChecklistOpen], [false, true, true]);
    n = await pg.evaluate(() => { onModuleCheckboxChange('w-module', 'Newsletter', true); goStep(3); return { step: currentStep }; });
    check('after picking a module, Next goes through to step 3', n.step, 3); await pg.close();
    ({ pg, seen } = await open()); n = await next(pg, ['w-custom']);
    check('quote-upon-request with no price: pressing Next does NOT reach step 3, says what to do, and highlights the price box', [n.step === 3, n.toasts.some(m => /enter the quoted price for: Custom Build before continuing/.test(m)), n.quoteFlagged], [false, true, true]);
    n = await pg.evaluate(() => { document.querySelector('tr[data-id="w-custom"] .quoted-price-field').value = '300'; goStep(3); return { step: currentStep, stillFlagged: !!document.querySelector('.quoted-price-field.spend-missing') }; });
    check('after the price is typed, Next goes through and the highlight is gone', [n.step, n.stillFlagged], [3, false]); await pg.close();
    ({ pg, seen } = await open()); n = await next(pg, ['w-flat']);
    check('an ordinary service goes straight through to step 3 (unchanged)', n.step, 3); await pg.close();
    check('no page errors', seen.errs, []);
  } finally { await browser.close(); }
  done();
})().catch(e => { console.log('FAIL browser test crashed: ' + e.message); process.exitCode = 1; });
