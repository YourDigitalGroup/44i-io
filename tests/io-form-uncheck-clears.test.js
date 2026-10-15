// Unticking a service puts its row back to a fresh state: amounts, dates, notes, variant, quote and quantity are cleared, other rows are untouched,
// and ticking it again starts clean (nothing stale is picked back up). Real form code in Chromium.
const { check, done, ROOT } = require('./lib');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.log('SKIPPED (playwright is not installed)'); process.exit(0); }
const SB = 'https://emydtkhnespbxraiijkx.supabase.co';
const svc = o => ({ active: true, sort_order: 1, billing_type: 'monthly', pricing_mode: 'flat', section: 'web', ...o });
const SERVICES = [svc({ id: 'sp', label: 'Spend Service', pricing_mode: 'spend' }), svc({ id: 'fl', label: 'Flat Thing', billing_type: 'one_time', default_price: 175, sort_order: 2 }),
  svc({ id: 'un', label: 'Per Unit', pricing_mode: 'per_unit', unit_label: 'each', billing_type: 'one_time', default_price: 40, sort_order: 3 }), svc({ id: 'qu', label: 'Quote Me', billing_type: 'one_time', default_price: null, sort_order: 4 }),
  svc({ id: 'vr', label: 'Variant Spend', pricing_mode: 'spend', tactic_variants: ['One', 'Two'], sort_order: 5 })];
(async () => {
  let browser; try { browser = await chromium.launch(); } catch (e) { try { browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); } catch (e2) { console.log('SKIPPED (no browser)'); process.exit(0); } }
  try {
    const pg = await browser.newPage({ viewport: { width: 1300, height: 900 } }); const errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.route('**/*', async r => { const u = r.request().url(); if (u.startsWith('file:')) return r.continue(); if (!u.startsWith(SB)) return r.abort(); let body = '[]';
      if (u.includes('/rest/v1/services')) body = JSON.stringify(SERVICES); else if (u.includes('/rest/v1/sections')) body = JSON.stringify([{ id: 'web', label: 'Web', sort_order: 1, active: true }]);
      else if (u.includes('/rpc/get_group_for_embed_key')) body = JSON.stringify([{ id: 'g1', name: 'G', active: true, io_slug: 'g', am_name: 'C', am_email: 'c@x.com' }]);
      else if (u.includes('hosting_proration_settings')) body = JSON.stringify([{ page_type: '1p', days: 3, label: '1' }]); else if (u.includes('/rest/v1/intake_forms')) body = JSON.stringify([{ id: 'x', title: 'X', definition: {} }]);
      await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body }); });
    await pg.goto('file://' + ROOT + '/index.html?preview=1&t=abc'); await pg.waitForSelector('tr[data-id="sp"]', { state: 'attached', timeout: 15000 });
    const out = await pg.evaluate(() => {
      const res = {};
      const fill = row => { row.querySelectorAll('input[type=number]').forEach(e => { if (!e.classList.contains('qty-field')) e.value = '500'; }); row.querySelectorAll('textarea, input[type=text]').forEach(e => { e.value = 'a note typed'; });
        row.querySelectorAll('input[type=date]').forEach(e => { e.value = '2027-03-01'; }); row.querySelectorAll('select').forEach(e => { if (e.options.length > 1) e.selectedIndex = e.options.length - 1; }); };
      const leftovers = row => [...row.querySelectorAll('input, textarea, select')].filter(e => e.type !== 'checkbox').filter(e => e.value && !(e.classList.contains('qty-field') && e.value === '1')).map(e => (e.className || e.tagName).toString().split(' ')[0] + '=' + e.value);
      // an untouched neighbour row that must keep its values while another row is unticked
      const rowFl = document.querySelector('tr[data-id="fl"]'), cbFl = rowFl.querySelector('input[type=checkbox]'); cbFl.checked = true; toggle(cbFl, 'fl'); fill(rowFl);
      for (const id of ['sp', 'un', 'qu', 'vr']) {
        const row = document.querySelector(`tr[data-id="${id}"]`), cb = row.querySelector('input[type=checkbox]'); cb.checked = true; toggle(cb, id); fill(row);
        cb.checked = false; toggle(cb, id);
        res[id] = { left: leftovers(row), gone: !selected[id] };
        // tick it again: it starts clean, and the state the form reads has no stale dates or notes
        cb.checked = true; toggle(cb, id); syncRowInputs();
        res[id].retick = { start: selected[id].start_date || '', notes: selected[id].notes || '', variant: selected[id].tacticVariant || '', startBox: (document.getElementById('svc-start-' + id) || {}).value || '' };
        cb.checked = false; toggle(cb, id);
      }
      res.neighbour = { left: leftovers(rowFl), stillSelected: !!selected['fl'] };
      return res; });
    for (const id of ['sp', 'un', 'qu', 'vr']) {
      check(`unticking "${id}" clears its amount, dates, notes, variant and quote (nothing left in the row)`, [out[id].left, out[id].gone], [[], true]);
      check(`re-ticking "${id}" starts clean: no stale start date, notes or variant is picked back up`, out[id].retick, { start: '', notes: '', variant: '', startBox: '' });
    }
    check('another service\'s row is untouched while a different row is unticked (still ticked, still holds its values)', [out.neighbour.stillSelected, out.neighbour.left.length > 0], [true, true]);
    check('no page errors', errs, []);
  } finally { await browser.close(); }
  done();
})().catch(e => { console.log('FAIL browser test crashed: ' + e.message); process.exitCode = 1; });
