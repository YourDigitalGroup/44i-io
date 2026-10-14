// The REAL "we host" popup and the add / swap / remove flow on the IO form (headless browser, faked network, nothing submitted).
// Guards: choosing "we host" on a Website package adds its prorated hosting; swapping or unticking the package must NOT leave that hosting
// behind (it used to stay in the one-time total), and the standalone Hosting Fee must unlock again.
const { check, done, ROOT } = require('./lib');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.log('SKIPPED (playwright is not installed: run "npm install playwright" or use a machine that has it)'); process.exit(0); }
const SB = 'https://emydtkhnespbxraiijkx.supabase.co';
const svc = o => ({ active: true, sort_order: 1, billing_type: 'monthly', pricing_mode: 'flat', ...o });
const SERVICES = [
  svc({ id: 'w-bs', label: 'Business Starter*', section: 'web-ot', billing_type: 'one_time', default_price: 1000, exclusivity_group: 'web-tier', hosting_prompt_type: '1p', standalone_hosting_service_id: 'w-host', sort_order: 1 }),
  svc({ id: 'w-bb', label: 'Business Builder*', section: 'web-ot', billing_type: 'one_time', default_price: 2000, exclusivity_group: 'web-tier', hosting_prompt_type: '5p', standalone_hosting_service_id: 'w-host', sort_order: 2 }),
  svc({ id: 'w-host', label: 'Hosting Fee*', section: 'web-ot', billing_type: 'yearly', default_price: 450, sort_order: 3 })];
(async () => {
  let browser; try { browser = await chromium.launch(); } catch (e) { try { browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); } catch (e2) { console.log('SKIPPED (no browser available for playwright)'); process.exit(0); } }
  try {
    const pg = await browser.newPage({ viewport: { width: 1200, height: 900 } }); const errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.route(SB + '/**', async r => { const u = r.request().url(); let body = '[]';
      if (u.includes('/rest/v1/services')) body = JSON.stringify(SERVICES);
      else if (u.includes('/rest/v1/sections')) body = JSON.stringify([{ id: 'web-ot', label: 'Website — One-Time', sort_order: 1, active: true }]);
      else if (u.includes('/rpc/get_group_for_embed_key')) body = JSON.stringify([{ id: 'g1', name: 'Test Group', active: true, io_slug: 'test', am_name: 'Carol', am_email: 'c@x.com' }]);
      else if (u.includes('/rest/v1/hosting_proration_settings')) body = JSON.stringify([{ page_type: '1p', days: 3, label: '1 page' }, { page_type: '5p', days: 3, label: '5 pages' }]);
      else if (u.includes('/rest/v1/intake_forms')) body = JSON.stringify([{ id: 'x', title: 'X', definition: {} }]);
      await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body }); });
    await pg.goto('file://' + ROOT + '/index.html?preview=1&t=abc123'); await pg.waitForSelector('tr[data-id="w-bs"]', { state: 'attached', timeout: 15000 }); pg.setDefaultTimeout(10000);
    const click = sel => pg.evaluate(sel => document.querySelector(sel).click(), sel);
    const tick = id => click('tr[data-id="' + id + '"] input[type=checkbox]');
    const chooseHost = async (how, pkg) => { await click('input[name="hosting-choice"][value="' + how + '"]'); if (how === 'us') await click('input[name="hosting-pkg"][value="' + pkg + '"]'); await click('#hosting-modal .btn-primary'); };
    const state = () => pg.evaluate(() => ({ selected: Object.keys(selected).sort(), hosting: Object.fromEntries(Object.entries(hostingChoices).map(([k, v]) => [k, v.choice])), prorated: proratedHostingTotal(), hostLocked: document.querySelector('tr[data-id="w-host"] input[type=checkbox]').disabled, modalOpen: document.getElementById('hosting-modal').style.display !== 'none' }));

    // add a package and choose "we host"
    await tick('w-bs'); check('ticking a package opens the hosting popup', (await state()).modalOpen, true);
    await chooseHost('us', '1p'); let s = await state();
    check('"we host" on the Starter package: its prorated hosting counts and the standalone Hosting Fee is locked', [s.selected, s.hosting, s.prorated > 0, s.hostLocked], [['w-bs'], { 'w-bs': 'us' }, true, true]);

    // swap to another package and choose "client self-hosts"
    await tick('w-bb'); await chooseHost('self');
    s = await state();
    check('swapping Starter -> Builder (client self-hosts): Starter and its hosting are GONE, nothing prorated, Hosting Fee unlocked', [s.selected, s.hosting, s.prorated, s.hostLocked], [['w-bb'], { 'w-bb': 'self' }, 0, false]);

    // swap again, choosing "we host" on the new package, then REMOVE it by unticking
    await tick('w-bs'); await chooseHost('us', '1p'); s = await state();
    check('swap back with "we host": only the new package\'s hosting counts', [s.selected, Object.keys(s.hosting), s.prorated > 0], [['w-bs'], ['w-bs'], true]);
    await tick('w-bs'); s = await state();
    check('unticking the package removes it, its hosting, and unlocks the standalone Hosting Fee', [s.selected, s.hosting, s.prorated, s.hostLocked], [[], {}, 0, false]);

    // cancelling the popup undoes the tick
    await tick('w-bb'); await click('#hosting-modal .btn-secondary'); s = await state();
    check('cancelling the hosting popup leaves nothing ticked and nothing prorated', [s.selected, s.hosting, s.prorated, s.modalOpen], [[], {}, 0, false]);
    check('no page errors', errs, []);
  } finally { await browser.close(); }
  done();
})().catch(e => { console.log('FAIL browser test crashed: ' + e.message); process.exitCode = 1; });
