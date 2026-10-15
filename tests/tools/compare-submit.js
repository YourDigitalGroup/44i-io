// DEV TOOL (not part of the suite, not deployed): submits the SAME orders through two copies of the order form (e.g. the live code and a branch) against a fake
// Supabase + Trello + email service, records EVERY request each one makes, and compares them. Only things the change is allowed to alter (the PDF's contents) are not compared,
// because the sandbox cannot build a real PDF. Usage: node tests/tools/compare-submit.js <folderA> <folderB>
// e.g.  git worktree add /tmp/liveA HEAD ; node tests/tools/compare-submit.js /tmp/liveA /home/user/44i-io
const { chromium } = require('playwright');
const [A, B] = process.argv.slice(2); if (!A || !B) { console.log('usage: node compare-submit.js <folderA> <folderB>'); process.exit(2); }
const SB = 'https://emydtkhnespbxraiijkx.supabase.co';
const G = 'a0000000-0000-4000-8000-000000000001', CL = 'c0000000-0000-4000-8000-000000000002', ORD = 'd0000000-0000-4000-8000-000000000003';
const svc = o => ({ active: true, sort_order: 1, billing_type: 'monthly', pricing_mode: 'flat', ...o });
const SERVICES = [svc({ id: 'sp-a', label: 'Spend Service A', section: 'ads', pricing_mode: 'spend', sort_order: 1 }), svc({ id: 'sp-b', label: 'Spend Service B', section: 'ads', pricing_mode: 'spend', sort_order: 2 }),
  svc({ id: 'sem-fee', label: 'Flat SEM With Fee', section: 'ads', pricing_mode: 'spend', sort_order: 3, auto_add_setup_fee: true, setup_fee: 200, setup_fee_threshold: 1000 }),
  svc({ id: 'w-flat', label: 'Website Flat Thing', section: 'ads', billing_type: 'one_time', default_price: 175, sort_order: 4, workflow: 'Website', trello_template_ref: 'abcd1234', trello_template_type: 'card' })];
const norm = s => String(s).replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, '<uuid>').replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z/g, '<ts>').replace(/\d{8}-[A-Z0-9]+-[A-Z0-9]{3}/g, '<io#>');
const SCENARIOS = {
  'mixed: flat one-time + monthly spend + auto setup fee': async () => { const sel = ['w-flat', 'sem-fee']; return { sel, spend: { 'sem-fee': 500 }, plans: {} }; },
  'varying months with a paused month + a second service': async () => ({ sel: ['sp-a', 'sp-b'], spend: {}, plans: { 'sp-a': 'varying', 'sp-b': 'total' } }),
};
async function run(root, name, sc) {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const pg = await browser.newPage({ viewport: { width: 1200, height: 900 } }); const log = [], errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.route('**/*', async r => { const u = r.request().url(), m = r.request().method(); if (u.startsWith('file:')) return r.continue(); if (!u.startsWith(SB)) return r.abort();
    const post = r.request().postData() || ''; let body = '[]', status = 200;
    if (u.includes('/rest/v1/services')) body = JSON.stringify(SERVICES); else if (u.includes('/rest/v1/sections')) body = JSON.stringify([{ id: 'ads', label: 'Ads', sort_order: 1, active: true }]);
    else if (u.includes('/rpc/get_group_for_embed_key')) body = JSON.stringify([{ id: G, name: 'Compare Group', active: true, io_slug: 'cmp', am_name: 'Carol', am_email: 'c@x.com', trello_board_id: 'BOARD1', io_recipient: 'group@x.test' }]);
    else if (u.includes('hosting_proration_settings')) body = JSON.stringify([{ page_type: '1p', days: 3, label: '1 page' }]); else if (u.includes('/rest/v1/intake_forms')) body = JSON.stringify([{ id: 'x', title: 'X', definition: {} }]);
    else if (u.includes('/rpc/find_or_create_client')) body = JSON.stringify({ id: CL, trello_list_id: null }); else if (u.includes('/rpc/find_or_create_ae')) body = '{}';
    else if (u.includes('/rpc/get_notification_settings_for_embed_key')) body = '[{"always_bcc_recipients":"bcc@x.test"}]'; else if (u.includes('/rpc/')) body = '{}';
    else if (u.includes('/rest/v1/orders') && m === 'POST') body = JSON.stringify([{ id: ORD }]);
    else if (u.includes('/functions/v1/claude-proxy')) { const rq = JSON.parse(post || '{}'); const t = rq.target;
      body = t === 'trello_get_lists' ? '[]' : t === 'trello_create_list' ? JSON.stringify({ id: 'LIST1', name: 'x' }) : t === 'trello_get_list_cards' ? '[]' : t === 'trello_get_card' ? JSON.stringify({ id: 'TPL1', name: 'Website' })
        : t === 'trello_create_card' ? JSON.stringify({ id: 'CARD' + log.length, name: rq.name }) : t === 'trello_copy_card' ? JSON.stringify({ id: 'COPY' + log.length }) : t === 'ping' ? '{"ok":true}' : '{}'; }
    log.push(m + ' ' + u.replace(SB, '') + ' ' + norm(post.replace(/"base64":"[^"]*"/g, '"base64":"<pdf>"')));
    await r.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body }); });
  await pg.goto('file://' + root + '/index.html?preview=1&t=abc123'); await pg.waitForSelector('tr[data-id="w-flat"]', { state: 'attached', timeout: 15000 });
  const plan = await sc();
  const res = await pg.evaluate(async (plan) => {
    window.generateIoPdfBlob = async () => ({ base64: 'AAAA', fileName: 'io.pdf' });
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    set('biz-name', 'Compare Co'); set('contact-name', 'Pat'); set('contact-phone', '555-1212'); set('contact-email', 'pat@x.test'); set('website-url', 'https://x.test'); set('city', 'Des Moines'); set('biz-type', 'Retail');
    set('ae-name', 'Ann AE'); set('ae-email', 'ann@x.test'); set('io-date', '2026-10-15'); set('campaign-start', '2027-01-01'); set('auth-name', 'Pat Client'); set('auth-title', 'Owner');
    ['agree-terms', 'agree-ip', 'agree-pricing'].forEach(id => { const el = document.getElementById(id); if (el) el.checked = true; });
    window.hasSignature = () => true; window.getSignatureData = () => 'data:image/png;base64,AAAA';
    plan.sel.forEach(id => { const cb = document.querySelector('tr[data-id="' + id + '"] input[type=checkbox]'); cb.checked = true; toggle(cb, id); selected[id].start_date = '2027-01-01'; selected[id].end_date = '2027-03-31'; });
    for (const [id, kind] of Object.entries(plan.plans)) { const d = selected[id];
      if (kind === 'varying') { d.customizingMonths = true; d.budgetMode = 'monthly'; d.spend = 1250; d.monthPlan = [{ month: '2027-01', amount: 1000, days: 31 }, { month: '2027-02', amount: 1250, days: 28, paused: true }, { month: '2027-03', amount: 1500, days: 31 }]; }
      else { d.budgetMode = 'total'; d.spend = 1000; d.spendTotal = 3000; d.monthPlan = [{ month: '2027-01', amount: 1000, days: 31 }, { month: '2027-02', amount: 1000, days: 28 }, { month: '2027-03', amount: 1000, days: 31 }]; } }
    Object.entries(plan.spend).forEach(([id, v]) => { const el = document.querySelector(`tr[data-id="${id}"] input[type=number]:not(.qty-field):not(.quoted-price-field)`); if (el) el.value = v; });
    await submitIO();
    return { success: document.getElementById('page-success').style.display === 'block' }; }, plan);
  await new Promise(r => setTimeout(r, 1500));
  await browser.close();
  // the client-roster refresh the page makes on its own (get_group_clients) lands at a different moment each run and is not part of submitting an order
  return { log: log.filter(l => !/rpc\/get_group_clients/.test(l)), errs, success: res.success };
}
(async () => {
  let bad = 0;
  for (const [name, sc] of Object.entries(SCENARIOS)) {
    const a = await run(A, 'A', sc), b = await run(B, 'B', sc);
    const same = JSON.stringify(a.log) === JSON.stringify(b.log);
    console.log((same && a.success && b.success && !a.errs.length && !b.errs.length ? 'SAME ' : 'DIFF ') + name + `  (A: ${a.log.length} requests, B: ${b.log.length}; success ${a.success}/${b.success}; page errors ${a.errs.length}/${b.errs.length})`);
    if (!same) { bad++; const n = Math.max(a.log.length, b.log.length); for (let i = 0; i < n; i++) if (a.log[i] !== b.log[i]) { console.log('  first difference at request', i); console.log('   A:', String(a.log[i]).slice(0, 400)); console.log('   B:', String(b.log[i]).slice(0, 400)); break; } }
  }
  process.exit(bad ? 1 : 0);
})();
