// The 44i logo (an SVG) came out partly drawn in the emailed/Trello PDFs. Before the PDF is captured, an SVG image is now redrawn by the browser as a
// fixed-size PNG. Real Chromium: the real helper from index.html AND the copy in admin/index.html, with a fake fetch serving the logo.
const { read, fn, check, done, ROOT } = require('./lib');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.log('SKIPPED (playwright is not installed)'); process.exit(0); }
const idx = read('index.html'), admin = read('admin/index.html');
const SB = 'https://emydtkhnespbxraiijkx.supabase.co';
// a 2:1 logo with NO width/height of its own; red square top-left corner, green square bottom-right corner
const SVG_NO_SIZE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100"><rect x="0" y="0" width="20" height="20" fill="#ff0000"/><rect x="180" y="80" width="20" height="20" fill="#00ff00"/><rect x="60" y="30" width="80" height="40" fill="#1c9bd7"/></svg>';
const SVG_UNUSABLE = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>';   // no viewBox, no size: cannot be sized
const SVG_BROKEN = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect';
const PNG_1PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
(async () => {
  let browser; try { browser = await chromium.launch(); } catch (e) { try { browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); } catch (e2) { console.log('SKIPPED (no browser)'); process.exit(0); } }
  try {
    const pg = await browser.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.route('**/*', async r => { const u = r.request().url();
      if (u.startsWith('file:')) return r.continue();
      if (u.startsWith('https://logos.test/')) { const name = u.split('/').pop();
        if (name === 'logo.svg') return r.fulfill({ status: 200, contentType: 'image/svg+xml', headers: { 'access-control-allow-origin': '*' }, body: SVG_NO_SIZE });
        if (name === 'logo-nosniff') return r.fulfill({ status: 200, contentType: 'application/octet-stream', headers: { 'access-control-allow-origin': '*' }, body: SVG_NO_SIZE });
        if (name === 'unusable.svg') return r.fulfill({ status: 200, contentType: 'image/svg+xml', headers: { 'access-control-allow-origin': '*' }, body: SVG_UNUSABLE });
        if (name === 'broken.svg') return r.fulfill({ status: 200, contentType: 'image/svg+xml', headers: { 'access-control-allow-origin': '*' }, body: SVG_BROKEN });
        if (name === 'logo.png') return r.fulfill({ status: 200, contentType: 'image/png', headers: { 'access-control-allow-origin': '*' }, body: PNG_1PX });
        return r.fulfill({ status: 404, body: '' }); }
      if (u.startsWith(SB)) return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '[]' });
      return r.abort(); });
    await pg.goto('file://' + ROOT + '/index.html?preview=1&t=abc123'); await pg.waitForFunction(() => typeof inlineImagesAsDataUris === 'function');
    // also load admin's copy of the two helpers under other names
    const adminSrc = (fn(admin, 'svgBlobToPngDataUri') + fn(admin, 'inlineImagesAsDataUris')).replace(/svgBlobToPngDataUri/g, 'adminSvgToPng').replace(/inlineImagesAsDataUris/g, 'adminInline');
    await pg.evaluate(src => { (0, eval)(src.replace(/^/, '')); window.adminInline = adminInline; }, adminSrc + '\nwindow.adminInline = adminInline;');
    const run = (which, names) => pg.evaluate(async ([which, names]) => {
      const doc = document.implementation.createHTMLDocument('x'); names.forEach(n => { const i = doc.createElement('img'); i.setAttribute('src', 'https://logos.test/' + n); i.id = n; doc.body.appendChild(i); });
      await (which === 'admin' ? window.adminInline(doc) : inlineImagesAsDataUris(doc));
      const out = {};
      for (const n of names) { const img = doc.getElementById(n); const src = img.getAttribute('src'); out[n] = { kind: src.slice(0, src.indexOf(',')), src: src.startsWith('data:image/png') ? src : null }; }
      return out; }, [which, names]);
    const pixels = (dataUri) => pg.evaluate(async d => { const im = new Image(); await new Promise(r => { im.onload = r; im.src = d; }); const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
      const px = (a, b) => [...x.getImageData(a, b, 1, 1).data]; return { w: im.naturalWidth, h: im.naturalHeight, topLeft: px(3, 3), bottomRight: px(im.naturalWidth - 4, im.naturalHeight - 4), center: px(im.naturalWidth / 2, im.naturalHeight / 2) }; }, dataUri);
    for (const which of ['order form', 'admin']) {
      const out = await run(which === 'admin' ? 'admin' : 'form', ['logo.svg', 'logo-nosniff.svg', 'unusable.svg', 'broken.svg', 'logo.png']);
      const p = await pixels(out['logo.svg'].src);
      check(`${which}: an SVG with no size of its own becomes a PNG at its viewBox ratio (2:1, 352x176)`, [out['logo.svg'].kind, p.w, p.h], ['data:image/png;base64', 352, 176]);
      check(`${which}: the PNG shows the WHOLE logo -- red top-left corner, green bottom-right corner, blue middle (nothing cropped)`, [p.topLeft.slice(0, 3), p.bottomRight.slice(0, 3), p.center.slice(0, 3)], [[255, 0, 0], [0, 255, 0], [28, 155, 215]]);
      check(`${which}: an SVG that cannot be sized, or is not valid, still goes through as before (a plain SVG data: URI, no crash)`, [out['unusable.svg'].kind, out['broken.svg'].kind], ['data:image/svg+xml;base64', 'data:image/svg+xml;base64']);
      check(`${which}: a PNG logo is left alone (still a PNG data: URI)`, out['logo.png'].kind, 'data:image/png;base64');
    }
    check('no page errors', errs, []);
  } finally { await browser.close(); }
  done();
})().catch(e => { console.log('FAIL browser test crashed: ' + e.message); process.exitCode = 1; });
