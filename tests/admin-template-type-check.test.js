// The Trello template type checker: wrong type / not found / Trello busy / fine are told apart, and it never writes anything.
const { read, fn, check, done } = require('./lib');
let JSDOM; try { ({ JSDOM } = require('jsdom')); } catch (e) { console.log('SKIPPED (jsdom is not installed)'); process.exit(0); }
const admin = read('admin/index.html'), shared = read('shared.js');
const win = new JSDOM('<div id="admin-template-titles-results"></div>', { runScripts: 'outside-only' }).window;
const calls = [];
win.eval([fn(shared, 'esc'), fn(admin, 'adminProbeTemplate'), fn(admin, 'adminCheckTemplateTypes'),
  `var PROXY = 'p', sbAuthHeaders = () => ({}), CATALOG_ROWS = {};`].join('\n'));
// fake Trello: cards by short code, lists by 24-hex id; 'busy' answers 429
const CARD = 'E6agaiiu', LIST = '69a0ca52ccb9a9c454e3384e', BUSY = 'BUSY1234';
win.fetch = async (url, o) => { const b = JSON.parse(o.body); calls.push(b.target); const ref = b.card_id || b.list_id;
  const reply = (status, body) => ({ status, json: async () => { if (body === undefined) throw new Error('not json'); return body; } });
  if (ref === BUSY) return reply(429, { message: 'rate limit' });
  if (b.target === 'trello_get_card') return ref === CARD ? reply(200, { id: 'x', name: 'Card' }) : reply(400, undefined);
  if (b.target === 'trello_get_list_cards') return ref === LIST ? reply(200, [{ name: 'A' }]) : reply(400, { message: 'invalid id' });
  return reply(404, {}); };
const svc = (label, ref, type) => ({ label, trello_template_ref: ref, trello_template_type: type });
win.CATALOG_ROWS = { a: svc('Good card', CARD, 'card'), b: svc('Good list', LIST, 'list'), c: svc('Card saved as list', CARD, 'list'), d: svc('List saved as card', LIST, 'card'),
  e: svc('Dead code', 'ZZZZZZZZ', 'card'), f: svc('Busy one', BUSY, 'card'), g: svc('Blank type, list ID', LIST, null), h: svc('Shares card', CARD, 'card'), i: { label: 'No template' } };
(async () => {
  await win.adminCheckTemplateTypes();
  const html = win.document.getElementById('admin-template-titles-results').innerHTML, text = win.document.getElementById('admin-template-titles-results').textContent;
  const row = name => [...win.document.querySelectorAll('tr')].find(tr => tr.textContent.includes(name))?.textContent || '';
  check('a card saved as List is flagged with the fix "change Template Type to Card"', /Saved as list, but it is a card — change Template Type to Card/.test(row('Card saved as list')), true);
  check('a list saved as Card is flagged "to List"', /Saved as card, but it is a list — change Template Type to List/.test(row('List saved as card')), true);
  check('correct card, correct list, and a blank type holding a list ID all match', ['Good card', 'Good list', 'Blank type, list ID'].map(n => /✓ Matches/.test(row(n))), [true, true, true]);
  check('a code Trello cannot find either way is "cannot find"', /cannot find/.test(row('Dead code')), true);
  check('a rate-limited answer is "did not answer", NEVER reported as a wrong type', [/did not answer/.test(row('Busy one')), /change Template Type/.test(row('Busy one'))], [true, false]);
  check('services sharing one template are listed together, once', [/Good card/.test(row('Shares card')) && /Shares card/.test(row('Good card'))], [true]);
  check('summary counts: 6 distinct templates (8 services), 2 match, 2 wrong type, 1 not found, 1 not checked', /6<\/strong> distinct templates checked \(8 services\)/.test(html) && /2 match/.test(text) && /2 wrong type/.test(text) && /1 not found/.test(text) && /1 not checked/.test(text), true);
  check('read-only: only Trello READ targets were used', [...new Set(calls)].sort(), ['trello_get_card', 'trello_get_list_cards']);
  check('wrong-type rows are listed first', win.document.querySelectorAll('tbody tr')[0].textContent.includes('saved as') || /Saved as/.test(win.document.querySelectorAll('tbody tr')[0].textContent), true);
  done();
})();
