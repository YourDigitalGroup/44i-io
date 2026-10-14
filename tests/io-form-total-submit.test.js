// WHOLE SUBMIT with an evenly split Whole Campaign Total + a $7.50 line: the saved order, the Trello card text and the email must say
// "$3,000 total" / "$7.50", keep it out of Monthly Recurring, and the success screen must appear. Fake Supabase + fake Trello/email proxy.
const { check, done, ROOT } = require('./lib');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.log('SKIPPED (playwright is not installed: run "npm install playwright" or use a machine that has it)'); process.exit(0); }
const SB = 'https://emydtkhnespbxraiijkx.supabase.co';
const G = 'a0000000-0000-4000-8000-000000000001', CL = 'c0000000-0000-4000-8000-000000000002', ORD = 'd0000000-0000-4000-8000-000000000003';
const svc = o => ({ active: true, sort_order: 1, billing_type: 'monthly', pricing_mode: 'flat', ...o });
const SERVICES = [svc({ id: 'w-flat', label: 'Website Flat Thing', section: 'web-ot', billing_type: 'one_time', default_price: 7.5, sort_order: 1 }),
  svc({ id: 'sem', label: 'Search Ads', section: 'web-ot', billing_type: 'monthly', pricing_mode: 'spend', sort_order: 2 })];
(async () => {
  let browser; try { browser = await chromium.launch(); } catch (e) { try { browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); } catch (e2) { console.log('SKIPPED (no browser available for playwright)'); process.exit(0); } }
  try {
    const run = async (mode) => {
      const pg = await browser.newPage({ viewport: { width: 1200, height: 900 } }); const seen = { orders: [], patches: [], proxy: [], emails: [], cards: [], errs: [] }; pg.on('pageerror', e => seen.errs.push(e.message));
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
          const req = JSON.parse(r.request().postData() || '{}'); const t = req.target; seen.proxy.push(t); if (t === 'trello_create_card') seen.cards.push(req);
          if (t === 'ping') body = '{"ok":true}';
          else if (t === 'trello_get_lists') body = '[]';
          else if (t === 'trello_create_list') body = JSON.stringify({ id: 'LIST1', name: 'Smoke Test Co - Ann AE' });
          else if (t === 'trello_get_list_cards') body = false ? JSON.stringify({ message: 'rate limited' }) : '[]';
          else if (t === 'trello_create_card') body = false ? '{}' : JSON.stringify({ id: 'CARD' + seen.proxy.length, name: req.name });
          else if (t === 'trello_get_card') body = JSON.stringify({ id: 'TPL1', name: 'Marker' });
          else if (t === 'trello_copy_card') body = JSON.stringify({ id: 'COPY1' });
          else if (t === 'trello_get_board_members' || t === 'trello_get_labels') body = '[]';
          else if (t === 'send_email') { seen.emails.push(req); if (false) { status = 500; body = '{"error":"mail down"}'; } else body = '{"ok":true}'; }
          else body = '{}';
        }
        await r.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body }); });
      await pg.goto('file://' + ROOT + '/index.html?preview=1&t=abc123'); await pg.waitForSelector('tr[data-id="w-flat"]', { state: 'attached', timeout: 15000 }); pg.setDefaultTimeout(10000);
      const r = await pg.evaluate(async (mode) => {
        window.generateIoPdfBlob = async () => ({ base64: 'AAAA', fileName: 'io.pdf' });
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
        set('biz-name', 'Smoke Test Co'); set('contact-name', 'Pat'); set('contact-phone', '555-1212'); set('contact-email', 'pat@x.test'); set('website-url', 'https://x.test'); set('city', 'Des Moines'); set('biz-type', 'Retail');
        set('ae-name', 'Ann AE'); set('ae-email', 'ann@x.test'); set('io-date', '2026-10-14'); set('campaign-start', '2027-01-01'); set('auth-name', 'Pat Client'); set('auth-title', 'Owner');
        ['agree-terms', 'agree-ip', 'agree-pricing'].forEach(id => { const el = document.getElementById(id); if (el) el.checked = true; });
        window.hasSignature = () => true; window.getSignatureData = () => 'data:image/png;base64,AAAA';
        ['w-flat', 'sem'].forEach(id => { const cb = document.querySelector('tr[data-id="' + id + '"] input[type=checkbox]'); cb.checked = true; toggle(cb, id); selected[id].start_date = '2027-01-01'; selected[id].end_date = '2027-02-28'; });
        Object.assign(selected.sem, { spend: 1500, budgetMode: mode === 'total' ? 'total' : 'monthly', spendTotal: 3000, monthPlan: mode === 'total' ? [{ month: '2027-01', amount: 1500, days: 31 }, { month: '2027-02', amount: 1500, days: 28 }] : null });
        // type the amount into the real box, as an AE would (submit re-reads it): the box holds the TOTAL in total mode, the monthly rate otherwise
        document.querySelector('tr[data-id="sem"] input[type=number]:not(.qty-field):not(.quoted-price-field)').value = mode === 'total' ? '3000' : '1500';
        await submitIO();
        return { success: document.getElementById('page-success').style.display === 'block' }; }, mode);
      await pg.close(); return { ...seen, ...r };
    };
    const strip = h => String(h || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const all = x => x.cards.map(c => (c.name || '') + ' ' + (c.desc || c.description || '')).join(' | ') + ' || ' + x.emails.map(e => strip(e.html)).join(' | ');
    const t = await run('total'), o = t.orders[0] || {}, text = all(t);
    check('even Whole Campaign Total: the order saves and the success screen shows', [t.orders.length, t.success], [1, true]);
    check('saved order: monthly $0 (campaign total kept out of monthly), one-time 7.5; spend line saved as total mode with 2 months',
      [o.total_monthly, o.total_onetime, (o.line_items || []).find(l => l.service_id === 'sem').budget_mode, (o.line_items || []).find(l => l.service_id === 'sem').month_budgets.length], [0, 7.5, 'total', 2]);
    console.log('   (Trello cards created: ' + t.cards.length + ', emails: ' + t.emails.length + ')');
    check('Trello card text / email say "$3,000" as a total, never "$1,500/mo"', [/\$3,000(\.00)? total/.test(text), /\$1,500\/mo/.test(text)], [true, false]);
    check('Trello card text / email show "$7.50", never "$7.5 "', [/\$7\.50/.test(text), /\$7\.5(?![0-9])\b(?!0)/.test(text.replace(/\$7\.50/g, ''))], [true, false]);
    check('order summary: Monthly Recurring is $0/mo', /Monthly Recurring:?\**:?\s*\$0\/mo/.test(text) || /Monthly Recurring[^$]{0,12}\$0\/mo/.test(text), true);
    const m = await run('monthly'), mo = m.orders[0] || {}, mtext = all(m);
    check('plain monthly spend is unchanged: saved monthly 1500 and text says "$1,500/mo"', [mo.total_monthly, /\$1,500\/mo/.test(mtext), m.success], [1500, true, true]);
    check('no page errors', [t.errs, m.errs], [[], []]);
  } finally { await browser.close(); }
  done();
})().catch(e => { console.log('FAIL browser test crashed: ' + e.message); process.exitCode = 1; });
