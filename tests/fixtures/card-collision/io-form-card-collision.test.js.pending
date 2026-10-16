// Card-name collision (order form, Trello step): two services in ONE workflow that each carry their own single-card Trello template used to get the SAME card name when one of them has a
// "Which one is it?" variant (the variant name was applied workflow-wide), so the second template's card was silently skipped. Real submitIO() in a browser with a fake Supabase and a fake Trello.
const { check, done, ROOT } = require('./lib');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.log('SKIPPED (playwright is not installed)'); process.exit(0); }
const SB = 'https://emydtkhnespbxraiijkx.supabase.co';
const G = 'a0000000-0000-4000-8000-000000000001', CL = 'c0000000-0000-4000-8000-000000000002', ORD = 'd0000000-0000-4000-8000-000000000003';
const svc = o => ({ active: true, sort_order: 1, billing_type: 'one_time', pricing_mode: 'flat', section: 'dig-ot', ...o });
const VAR = 'Targeted Display: AdRT';
const mkServices = (variantOn, tplB = 'TPLB') => [
  svc({ id: 'wa', label: 'Display Ads', workflow: 'Digital Advertising', default_price: 100, sort_order: 1, trello_template_ref: 'TPLA', trello_template_type: 'card', tactic_variants: variantOn === 'wa' ? [VAR, 'Targeted Display: Contextual'] : null }),
  svc({ id: 'wb', label: 'Social Ads', workflow: 'Digital Advertising', default_price: 200, sort_order: 2, trello_template_ref: tplB, trello_template_type: 'card', tactic_variants: variantOn === 'wb' ? [VAR, 'Targeted Display: Contextual'] : null })];
(async () => {
  let browser; try { browser = await chromium.launch(); } catch (e) { try { browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); } catch (e2) { console.log('SKIPPED (no browser available for playwright)'); process.exit(0); } }
  try {
    const run = async (services, variantOn, tplNames) => {
      const pg = await browser.newPage({ viewport: { width: 1200, height: 900 } }); const seen = { copies: [], creates: [], errs: [], patches: [] }; pg.on('pageerror', e => seen.errs.push(e.message));
      await pg.route('**/*', async r => { const u = r.request().url(), m = r.request().method();
        if (!u.startsWith(SB)) { if (u.startsWith('file:')) return r.continue(); return r.abort(); }
        let body = '[]';
        if (u.includes('/rest/v1/services')) body = JSON.stringify(services);
        else if (u.includes('/rest/v1/sections')) body = JSON.stringify([{ id: 'dig-ot', label: 'Digital', sort_order: 1, active: true }]);
        else if (u.includes('/rpc/get_group_for_embed_key')) body = JSON.stringify([{ id: G, name: 'Test Group', active: true, io_slug: 'test', am_name: 'Carol', am_email: 'am@x.test', trello_board_id: 'BOARD1', io_recipient: 'group@x.test' }]);
        else if (u.includes('/rest/v1/hosting_proration_settings')) body = JSON.stringify([{ page_type: '1p', days: 3, label: '1 page' }]);
        else if (u.includes('/rest/v1/intake_forms')) body = JSON.stringify([{ id: 'x', title: 'X', definition: {} }]);
        else if (u.includes('/rpc/find_or_create_client')) body = JSON.stringify({ id: CL, trello_list_id: null });
        else if (u.includes('/rpc/find_or_create_ae')) body = '{}';
        else if (u.includes('/rpc/get_notification_settings_for_embed_key')) body = '[{"always_bcc_recipients":""}]';
        else if (u.includes('/rpc/')) body = '{}';
        else if (u.includes('/rest/v1/orders') && m === 'POST') body = JSON.stringify([{ id: ORD }]);
        else if (u.includes('/rest/v1/orders') && m === 'PATCH') { seen.patches.push(JSON.parse(r.request().postData() || '{}')); body = '[]'; }
        else if (u.includes('/functions/v1/claude-proxy')) {
          const req = JSON.parse(r.request().postData() || '{}'); const t = req.target;
          if (t === 'ping') body = '{"ok":true}';
          else if (t === 'trello_get_lists') body = '[]';
          else if (t === 'trello_create_list') body = JSON.stringify({ id: 'LIST1', name: 'Smoke Test Co - Ann AE' });
          else if (t === 'trello_get_list_cards') body = '[]';
          else if (t === 'trello_get_card') body = JSON.stringify({ id: 'ID_' + req.card_id, name: tplNames[req.card_id] || 'Marker' });
          else if (t === 'trello_copy_card') { seen.copies.push(req.name); body = JSON.stringify({ id: 'COPY' + seen.copies.length }); }
          else if (t === 'trello_create_card') { seen.creates.push(req.name); body = JSON.stringify({ id: 'NEW' + seen.creates.length, name: req.name }); }
          else if (t === 'trello_get_board_members' || t === 'trello_get_labels') body = '[]';
          else if (t === 'send_email') body = '{"ok":true}';
          else body = '{}';
        }
        await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body }); });
      await pg.goto('file://' + ROOT + '/index.html?preview=1&t=abc123'); await pg.waitForSelector('tr[data-id="wa"]', { state: 'attached', timeout: 15000 }); pg.setDefaultTimeout(10000);
      const r = await pg.evaluate(async (variantOn) => {
        window.generateIoPdfBlob = async () => ({ base64: 'AAAA', fileName: 'io.pdf' });
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
        set('biz-name', 'Smoke Test Co'); set('contact-name', 'Pat'); set('contact-phone', '555-1212'); set('contact-email', 'pat@x.test'); set('website-url', 'https://x.test'); set('city', 'Des Moines'); set('biz-type', 'Retail');
        set('ae-name', 'Ann AE'); set('ae-email', 'ann@x.test'); set('io-date', '2026-10-14'); set('campaign-start', '2027-01-01'); set('auth-name', 'Pat Client'); set('auth-title', 'Owner');
        ['agree-terms', 'agree-ip', 'agree-pricing'].forEach(id => { const el = document.getElementById(id); if (el) el.checked = true; });
        window.hasSignature = () => true; window.getSignatureData = () => 'data:image/png;base64,AAAA';
        for (const id of ['wa', 'wb']) { const cb = document.querySelector('tr[data-id="' + id + '"] input[type=checkbox]'); cb.checked = true; toggle(cb, id); selected[id].start_date = '2027-01-01'; selected[id].end_date = '2027-01-31'; if (variantOn === id) { const sel = document.querySelector('tr[data-id="' + id + '"] .tactic-variant-field'); sel.value = 'Targeted Display: AdRT'; sel.dispatchEvent(new Event('change', { bubbles: true })); } }
        const toasts = []; const real = showToast; window.showToast = (m, t) => { toasts.push((t || 'ok') + ': ' + m); real(m, t); };
        await submitIO();
        const box = document.getElementById('success-notices');
        return { success: document.getElementById('page-success').style.display === 'block', notice: box ? box.innerText.replace(/\s+/g, ' ') : '', toasts }; }, variantOn);
      await pg.close(); return { ...seen, ...r };
    };
    const names = x => [...x.copies, ...x.creates].filter(n => / — Smoke Test Co/.test(n) && !/^IO/.test(n)).sort();   // the tactic cards only (not the IO card or the marker cards)
    // A. variant on the FIRST service: both cards must be made, each under its own name
    let a = await run(mkServices('wa'), 'wa', { TPLA: 'Display', TPLB: 'Social' });
    check('A variant on the first template\'s service: BOTH cards are created, the variant name goes on its own card and the other keeps its template name', [names(a).length, names(a).some(n => /^Targeted Display: AdRT — Smoke Test Co/.test(n)), names(a).some(n => /^Social — Smoke Test Co/.test(n))], [2, true, true]);
    // B. variant on the SECOND service
    let b = await run(mkServices('wb'), 'wb', { TPLA: 'Display', TPLB: 'Social' });
    check('B variant on the second template\'s service: both cards created; the variant name is on the second\'s card, the first keeps "Display"', [names(b).length, names(b).some(n => /^Display — Smoke Test Co/.test(n)), names(b).some(n => /^Targeted Display: AdRT — Smoke Test Co/.test(n))], [2, true, true]);
    // C. no variant anywhere: unchanged
    let c = await run(mkServices(null), null, { TPLA: 'Display', TPLB: 'Social' });
    check('C no variant: two cards named after their templates (unchanged behaviour)', [names(c).length, names(c).some(n => /^Display — /.test(n)), names(c).some(n => /^Social — /.test(n))], [2, true, true]);
    // D. two different templates whose cards carry the SAME name: one card, and the AE/AM are told (no more silent skip)
    let d = await run(mkServices(null), null, { TPLA: 'Display', TPLB: 'Display' });
    check('D two different templates that would produce the same card name: only one card is made and the problem is REPORTED (never silently skipped)', [names(d).length, /same name/.test(d.notice)], [1, true]);
    // E. single-template workflow with a variant on a service WITHOUT a template: exactly as before (the variant still names the card)
    const only = [svc({ id: 'wa', label: 'Display Ads', workflow: 'Digital Advertising', default_price: 100, sort_order: 1, trello_template_ref: 'TPLA', trello_template_type: 'card' }), svc({ id: 'wb', label: 'Social Ads', workflow: 'Digital Advertising', default_price: 200, sort_order: 2, tactic_variants: [VAR, 'Targeted Display: Contextual'] })];
    let e = await run(only, 'wb', { TPLA: 'Display' });
    check('E a workflow with ONE template and the variant on a service with no template: the card is still named by the variant, as before', [names(e).length, names(e).some(n => /^Targeted Display: AdRT — Smoke Test Co/.test(n))], [1, true]);
    check('no page errors in any run', [a.errs, b.errs, c.errs, d.errs, e.errs], [[], [], [], [], []]);
  } finally { await browser.close(); }
  done();
})().catch(e => { console.log('FAIL browser test crashed: ' + e.message); process.exitCode = 1; });
