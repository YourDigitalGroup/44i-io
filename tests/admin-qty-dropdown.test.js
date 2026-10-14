// Order Detail > Edit: the Quantity dropdown must show the quantity the order really has, even when it is not one of the presets,
// and saving for another reason must not change it. Real editor HTML builder + real "what changed" collector (jsdom).
const { read, fn, check, done } = require('./lib');
let JSDOM; try { ({ JSDOM } = require('jsdom')); } catch (e) { console.log('SKIPPED (jsdom is not installed)'); process.exit(0); }
const admin = read('admin/index.html'), shared = read('shared.js');
const win = new JSDOM('<body></body>', { runScripts: 'outside-only' }).window;
win.eval([fn(shared, 'esc'), fn(admin, 'adminQtyOptionsHtml'), fn(admin, 'adminModuleOptions'), fn(admin, 'adminExtraEditFieldsHtml'), fn(admin, 'adminCollectExtraEditFields'),
  `var CATALOG_ROWS = { 'w-edit': { id: 'w-edit', pricing_mode: 'per_unit', label: 'Content Support', qty_preset_options: [1, 2, 4, 8] } }; function adminEffectiveWorkflow() { return null; } var CSS = { escape: s => String(s) };`].join('\n'));
const open = qty => { const doc = win.document; doc.body.innerHTML = win.adminExtraEditFieldsHtml('w-edit', { service_id: 'w-edit', qty }, false); return { sel: doc.getElementById('edit-extra-qty-w-edit'), item: { service_id: 'w-edit', qty } }; };
const collect = o => win.adminCollectExtraEditFields('w-edit', o.item);
let o = open(4);
check('a preset quantity (4) is selected and an untouched save changes nothing', [o.sel.value, collect(o)], ['4', {}]);
o = open(6);   // 6 is NOT a preset
check('a saved quantity outside the presets (6) is shown as selected, labelled current', [o.sel.value, /6 \(current\)/.test(o.sel.innerHTML)], ['6', true]);
check('...and an untouched save does NOT change it to the first preset', collect(o), {});
o.sel.value = '2';
check('a deliberate change to a preset still saves', collect(o), { qty: '2' });
o = open(6); o.sel.value = '8';
check('choosing a different preset from an off-list quantity still saves', collect(o), { qty: '8' });
check('the current quantity appears only once when it IS a preset', open(2).sel.querySelectorAll('option').length, 4);
done();
