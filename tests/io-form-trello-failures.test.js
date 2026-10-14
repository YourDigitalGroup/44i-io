// Audit batch 2a: when Trello / the PDF / the email fail AFTER the order is saved, the AE is told plainly and nothing is faked or duplicated.
// Runs the real submitIO() in a headless browser against a fake Supabase AND a fake Trello/email proxy (nothing real is contacted).
const { check, done, ROOT } = require('./lib');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.log('SKIPPED (playwright is not installed: run "npm install playwright" or use a machine that has it)'); process.exit(0); }
const SB = 'https://emydtkhnespbxraiijkx.supabase.co';
const G = 'a0000000-0000-4000-8000-000000000001', CL = 'c0000000-0000-4000-8000-000000000002', ORD = 'd0000000-0000-4000-8000-000000000003';
const svc = o => ({ active: true, sort_order: 1, billing_type: 'monthly', pricing_mode: 'flat', ...o });
const SERVICES = [svc({ id: 'w-flat', label: 'Website Flat Thing', section: 'web-ot', billing_type: 'one_time', default_price: 175, sort_order: 1 })];
(async () => {
  let browser; try { browser = await chromium.launch(); } catch (e) { try { browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); } catch (e2) { console.log('SKIPPED (no browser available for playwright)'); process.exit(0); } }
  try {
    // mode: which part of the fake world misbehaves
    const run = async (mode) => {
      const pg = await browser.newPage({ viewport: { width: 1200, height: 900 } }); const seen = { orders: [], patches: [], proxy: [], emails: [], errs: [] }; pg.on('pageerror', e => seen.errs.push(e.message));
      await pg.route('**/*', async r => { const u = r.request().url(), m = r.request().method();
        if (!u.startsWith(SB)) { if (u.startsWith('file:')) return r.continue(); return r.abort(); }
        let body = '[]', status = 200;
        if (u.includes('/rest/v1/services')) body = JSON.stringify(SERVICES);
        else if (u.includes('/rest/v1/sections')) body = JSON.stringify([{ id: 'web-ot', label: 'Website — One-Time', sort_order: 1, active: true }]);
        else if (u.includes('/rpc/get_group_for_embed_key')) body = JSON.stringify([{ id: G, name: 'Test Group', active: true, io_slug: 'test', am_name: 'Carol', am_email: 'c@x.com', trello_board_id: 'BOARD1', io_recipient: 'group@x.test' }]);
        else if (u.includes('/rest/v1/hosting_proration_settings')) body = JSON.stringify([{ page_type: '1p', days: 3, label: '1 page' }]);
        else if (u.includes('/rest/v1/intake_forms')) body = JSON.stringify([{ id: 'x', title: 'X', definition: {} }]);
        else if (u.includes('/rpc/find_or_create_client')) body = JSON.stringify({ id: CL, trello_list_id: null });
        else if (u.includes('/rpc/find_or_create_ae')) body = '{}';
        else if (u.includes('/rpc/get_notification_settings_for_embed_key')) body = '[{"always_bcc_recipients":""}]';
        else if (u.includes('/rpc/')) body = '{}';
        else if (u.includes('/rest/v1/orders') && m === 'POST') { seen.orders.push(JSON.parse(r.request().postData() || '{}')); body = JSON.stringify([{ id: ORD }]); }
        else if (u.includes('/rest/v1/orders') && m === 'PATCH') { seen.patches.push(JSON.parse(r.request().postData() || '{}')); body = '[]'; }
        else if (u.includes('/functions/v1/claude-proxy')) {
          const req = JSON.parse(r.request().postData() || '{}'); const t = req.target; seen.proxy.push(t);
          if (t === 'ping') body = '{"ok":true}';
          else if (t === 'trello_get_lists') body = '[]';
          else if (t === 'trello_create_list') body = JSON.stringify({ id: 'LIST1', name: 'Smoke Test Co - Ann AE' });
          else if (t === 'trello_get_list_cards') body = mode === 'unreadable-cards' ? JSON.stringify({ message: 'rate limited' }) : '[]';
          else if (t === 'trello_create_card') body = mode === 'card-create-fails' ? '{}' : JSON.stringify({ id: 'CARD' + seen.proxy.length, name: req.name });
          else if (t === 'trello_get_card') body = JSON.stringify({ id: 'TPL1', name: 'Marker' });
          else if (t === 'trello_copy_card') body = JSON.stringify({ id: 'COPY1' });
          else if (t === 'trello_get_board_members' || t === 'trello_get_labels') body = '[]';
          else if (t === 'send_email') { seen.emails.push(req); if (mode === 'email-fails') { status = 500; body = '{"error":"mail down"}'; } else body = '{"ok":true}'; }
          else body = '{}';
        }
        await r.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body }); });
      await pg.goto('file://' + ROOT + '/index.html?preview=1&t=abc123'); await pg.waitForSelector('tr[data-id="w-flat"]', { state: 'attached', timeout: 15000 }); pg.setDefaultTimeout(10000);
      const r = await pg.evaluate(async (mode) => {
        // the test browser has no internet, so the PDF libraries never load: give it a working PDF builder, except in the PDF-failure case
        window.generateIoPdfBlob = mode === 'pdf-fails' ? async () => { throw new Error('PDF library missing'); } : async () => ({ base64: 'AAAA', fileName: 'io.pdf' });
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
        set('biz-name', 'Smoke Test Co'); set('contact-name', 'Pat'); set('contact-phone', '555-1212'); set('contact-email', 'pat@x.test'); set('website-url', 'https://x.test'); set('city', 'Des Moines'); set('biz-type', 'Retail');
        set('ae-name', 'Ann AE'); set('ae-email', 'ann@x.test'); set('io-date', '2026-10-14'); set('campaign-start', '2027-01-01'); set('auth-name', 'Pat Client'); set('auth-title', 'Owner');
        ['agree-terms', 'agree-ip', 'agree-pricing'].forEach(id => { const el = document.getElementById(id); if (el) el.checked = true; });
        window.hasSignature = () => true; window.getSignatureData = () => 'data:image/png;base64,AAAA';
        const cb = document.querySelector('tr[data-id="w-flat"] input[type=checkbox]'); cb.checked = true; toggle(cb, 'w-flat'); selected['w-flat'].start_date = '2027-01-01'; selected['w-flat'].end_date = '2027-01-31';
        const toasts = []; const real = showToast; window.showToast = (m, t) => { toasts.push((t || 'ok') + ': ' + m); real(m, t); };
        await submitIO();
        const box = document.getElementById('success-notices');
        return { success: document.getElementById('page-success').style.display === 'block', notice: box ? box.innerText.replace(/\s+/g, ' ') : '', message: (document.getElementById('success-message') || {}).textContent, toasts }; }, mode);
      await pg.close(); return { ...seen, ...r };
    };

    // A. everything works
    let a = await run('ok');
    check('all fine: success screen, NO warning box, normal "Trello list ready" message, order marked synced', [a.success, a.notice, a.toasts.some(t => /Trello list ready/.test(t)), a.patches.some(p => p.trello_synced === true)], [true, '', true, true]);
    check('all fine: the notification email goes out WITH the PDF attached', [a.emails.length, a.emails[0] && a.emails[0].base64], [1, 'AAAA']);
    // B. Trello's card list is unreadable
    let b = await run('unreadable-cards');
    const tacticCreates = b.proxy.filter(t => t === 'trello_create_card').length;
    check('unreadable Trello card list: the order IS saved and the success screen explains that Trello did not finish', [b.orders.length, b.success, /did not return the cards already on this client/.test(b.notice)], [1, true, true]);
    check('unreadable Trello card list: NO cards are created (no duplicates) and the order is NOT marked synced', [tacticCreates, b.patches.some(p => p.trello_synced === true)], [0, false]);
    check('unreadable Trello card list: the toast does NOT claim "Trello list ready"', b.toasts.some(t => /Trello list ready/.test(t)), false);
    // C. a card cannot be created
    let c = await run('card-create-fails');
    check('card creation fails: the AE is told, the card is not counted, and the order is NOT marked synced', [/could not be created/.test(c.notice), c.toasts.some(t => /Trello list ready — [1-9]/.test(t)), c.patches.some(p => p.trello_synced === true)], [true, false, false]);
    // D. the email fails
    let d = await run('email-fails');
    check('email fails: the AE is told the notification email was not sent', [d.success, /notification email could not be sent/.test(d.notice)], [true, true]);
    // E. the PDF cannot be built -> the email is still sent, without it, and the AE is told
    let e = await run('pdf-fails');
    check('PDF cannot be built: the email is STILL sent (without the PDF) and the AE is told both the email and the Trello attachment are affected', [e.emails.length, e.emails[0] && 'base64' in e.emails[0], /sent WITHOUT the PDF attached/.test(e.notice), /could not be attached to the IO card/.test(e.notice)], [1, false, true, true]);
    check('PDF cannot be built: the email text says the PDF is on the Trello card instead', /could not be attached to this email/.test(e.emails[0] ? e.emails[0].html : ''), true);
    check('no page errors in any run', [a.errs, b.errs, c.errs, d.errs, e.errs], [[], [], [], [], []]);
  } finally { await browser.close(); }
  done();
})().catch(e => { console.log('FAIL browser test crashed: ' + e.message); process.exitCode = 1; });
