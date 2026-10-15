// Retry Trello (Admin): creates ONLY what is missing, never duplicates, stops when Trello cannot show the list, never invents a bare card when a template is
// unreadable, leaves per-agent cards to hand, records the result only when everything is done. Real Admin functions + a fake Trello that REMEMBERS its cards (jsdom).
const { read, fn, check, done } = require('./lib');
let JSDOM; try { ({ JSDOM } = require('jsdom')); } catch (e) { console.log('SKIPPED (jsdom is not installed)'); process.exit(0); }
const admin = read('admin/index.html'), shared = read('shared.js');
const win = new JSDOM('<body><button id="retry-trello-btn">Retry Trello</button><div id="retry-trello-report"></div><div id="order-trello-line"></div></body>', { runScripts: 'outside-only' }).window;
win.eval([fn(shared, 'esc'), ...['adminNormCardName', 'adminStripDateRangeFromCardName', 'adminIsIoCardName', 'adminFindTrelloCardForLine', 'adminEffectiveWorkflow', 'adminCampaignDueFields', 'adminFormatDateRangeForTitle', 'auditVariantIsAlreadyComplete',
    'adminPgMessage', 'adminBuildCorrectionCards', 'adminOrderTooFreshForRetry', 'adminOrderHasTrelloBoard', 'adminOrderNeedsAttention', 'adminRetryIoDescription', 'adminFindOrCreateClientList', 'adminRetryTrello'].map(n => fn(admin, n)),
  `const ADMIN_ATTENTION_DEFAULT_DAYS = 90; const ADMIN_RETRY_MIN_AGE_MINUTES = 10; var ADMIN_CAMPAIGN_END_REMINDER_MINUTES = 540; var ADMIN_NUMERIC_TERM_RE = /\\d{1,2}\\/\\d{1,2}\\/\\d{2,4}(?:\\s*-\\s*\\d{1,2}\\/\\d{1,2}\\/\\d{2,4})?/; var ADMIN_ORDER_CANCEL = {}; var allGroups = [{ id: 'g1', trello_board_id: 'BOARD1' }, { id: 'g2', trello_board_id: '' }];
   var CATALOG_ROWS = {}, allOrders = [], currentAdminUser = { name: 'Carol', pw: 'x' }, PROXY = 'proxy', __toasts = [], __saved = [], __calls = [], __trello = null, __pdfOk = true;
   function sbAuthHeaders() { return {}; } function showToast(m, t) { __toasts.push((t || 'ok') + ': ' + m); } function sectionLabel(x) { return x; }
   async function adminCorrectionCardHandles() { return []; }
   var __ci = { found: true, listId: 'LIST1', name: 'Smoke Test Co', multiAgent: false }; var ALL_CLIENTS = [{ id: 'c1', trello_list_id: null }]; function adminClientTrelloInfo() { return Promise.resolve(__ci); }
   function describeLineItemAmount(li) { return { text: '$' + (li.fee || li.recurring || li.spend || 0) }; }
   async function generateAdminRevisedIoPdfBlob() { if (!__pdfOk) throw new Error('pdf'); return { base64: 'AAAA', fileName: 'io.pdf' }; }
   async function sb(path, o) { __saved.push({ path, body: JSON.parse(o.body) }); return {}; }
   function renderAdminOrders() {}
   window.fetch = async (url, o) => { const b = JSON.parse(o.body); __calls.push(b); return { ok: true, json: async () => __trello(b) }; };`].join('\n'));
win.document.body.insertAdjacentHTML('beforeend', '<div id="admin-orders-table"></div>');
// a fake Trello that remembers cards; options let a test make things fail
const mk = (opts = {}) => { const cards = (opts.cards || []).map((c, i) => ({ id: 'X' + i, name: c })); let n = 100;
  const h = b => {
    if (b.target === 'trello_get_list_cards') { if (opts.listFails) return { message: 'rate limited' }; return cards.map(c => ({ id: c.id, name: c.name })); }
    if (b.target === 'trello_get_card') return opts.templateUnreadable ? { message: 'not found' } : { id: b.card_id, name: opts.templateName || 'Website Tactic' };
    if (b.target === 'trello_create_card' || b.target === 'trello_copy_card') { if (opts.createFailsFor && b.name.includes(opts.createFailsFor)) return {}; const c = { id: 'N' + (n++), name: b.name }; cards.push(c); return c; }
    if (b.target === 'trello_get_lists') { if (opts.listsFail) return { message: 'nope' }; return (opts.lists || []).map(l => ({ ...l })); }
    if (b.target === 'trello_create_list') { if (opts.createListFails) return {}; return { id: 'NEWLIST', name: b.name }; }
    if (b.target === 'trello_update_list') return opts.reopenFails ? { message: 'no' } : { id: b.list_id };
    return { ok: true };
  }; return { cards, h }; };
const run = async (world, order, optsFn) => { win.eval(`CATALOG_ROWS = ${JSON.stringify(world.services)}; allOrders = [${JSON.stringify(order)}]; __calls.length = 0; __saved.length = 0; __toasts.length = 0; __pdfOk = ${optsFn?.pdfOk === false ? 'false' : 'true'};`);
  const t = world.trello; win.__trello = t.h; win.confirm = () => true;
  await win.adminRetryTrello(order.id);
  const o = win.eval('allOrders[0]'); return { o, saved: win.eval('__saved.slice()'), calls: win.eval('__calls.slice()'), toasts: win.eval('__toasts.slice()'), report: win.document.getElementById('retry-trello-report').textContent.replace(/\s+/g, ' ') }; };
const SVC = (id, label, extra) => ({ id, label, accounting_label: label, workflow: label, section: 'web', pricing_mode: 'flat', billing_type: 'one_time', ...extra });
const services = { 'w-flat': SVC('w-flat', 'Website Tactic', { trello_template_ref: 'abcd1234', trello_template_type: 'card' }), 'sem-bp': SVC('sem-bp', 'Search Ads', { section: 'sem', pricing_mode: 'spend', billing_type: 'monthly' }),
  'lt-off': SVC('lt-off', 'Offline Visits', { is_cpm_adjustment: true, pricing_mode: 'modifier' }) };
const order = (extra) => ({ id: 'o1', group_id: 'g1', client_id: 'c1', _client_name: 'Smoke Test Co', ae_name: 'Ann AE', trello_synced: false, trello_card_ids: {}, trello_client_list_id: 'LIST1', created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  line_items: [{ service_id: 'w-flat', fee: 175, start_date: '2027-01-01', end_date: '2027-01-31' }, { service_id: 'sem-bp', spend: 500, start_date: '2027-01-01', end_date: '2027-03-31' }, { service_id: 'lt-off', fee: 0 }], ...extra });
const creates = r => r.calls.filter(c => c.target === 'trello_create_card' || c.target === 'trello_copy_card');
(async () => {
  // A. nothing exists
  let t = mk(); let r = await run({ services, trello: t }, order());
  check('A nothing exists: creates the IO card + both service cards (the Offline Visits add-on gets no card of its own)', [creates(r).map(c => c.name).sort()], [['IO — Smoke Test Co', 'Search Ads — Smoke Test Co', 'Website Tactic — Smoke Test Co']]);
  check('A the IO PDF is attached, and the result is recorded: synced true, the card map and list saved, via the admin function', [r.calls.some(c => c.target === 'trello_attach_file'), r.saved.length, r.saved[0] && r.saved[0].path, r.saved[0] && r.saved[0].body.p_data.trello_synced, Object.keys(r.saved[0].body.p_data.trello_card_ids).sort()], [true, 1, 'rpc/admin_set_order_trello_state', true, ['Search Ads', 'Website Tactic', '__io_card__']]);
  // B. everything exists (names with different dash / spacing / case)
  t = mk({ cards: ['IO - Smoke Test Co', 'website  tactic — smoke test co', 'Search Ads - Smoke Test Co'] }); r = await run({ services, trello: t }, order());
  check('B everything already exists (dash / spacing / capital differences): creates NOTHING and still marks the order synced', [creates(r).length, r.saved.length && r.saved[0].body.p_data.trello_synced, r.report.includes('created 0')], [0, true, true]);
  // C. some exist
  t = mk({ cards: ['IO — Smoke Test Co', 'Website Tactic — Smoke Test Co'] }); r = await run({ services, trello: t }, order());
  check('C only the missing Search Ads card is created; the existing IO and Website cards are not touched (no new comments on them)', [creates(r).map(c => c.name), r.calls.filter(c => c.target === 'trello_add_comment').map(c => c.card_id).filter(id => id === 'X0' || id === 'X1').length], [['Search Ads — Smoke Test Co'], 0]);
  // D. list unreadable
  t = mk({ listFails: true }); r = await run({ services, trello: t }, order());
  check('D Trello will not show the list: NOTHING is created, nothing is recorded, the AM is told', [creates(r).length, r.saved.length, r.toasts.some(m => /nothing was created/.test(m))], [0, 0, true]);
  // E. one card cannot be created
  t = mk({ createFailsFor: 'Search Ads' }); r = await run({ services, trello: t }, order());
  check('E one card cannot be created: the others are made, the failure is reported, and the order stays NOT synced', [creates(r).map(c => c.name).includes('Website Tactic — Smoke Test Co'), /could not create 1|Search Ads/.test(r.report), r.saved[0].body.p_data.trello_synced], [true, true, false]);
  // F. press twice
  t = mk(); await run({ services, trello: t }, order()); const savedMap = JSON.parse(JSON.stringify(win.eval('allOrders[0].trello_card_ids')));
  r = await run({ services, trello: t }, order({ trello_card_ids: savedMap }));
  check('F pressing Retry a second time creates NOTHING', creates(r).length, 0);
  // G. template unreadable
  t = mk({ templateUnreadable: true }); r = await run({ services, trello: t }, order());
  check('G the Website template cannot be read: NO bare made-up card, the problem is reported, the order stays not synced', [creates(r).map(c => c.name).includes('Website Tactic — Smoke Test Co'), /template card could not be read/.test(r.report), r.saved[0].body.p_data.trello_synced], [false, true, false]);
  // H. agent splits
  t = mk(); r = await run({ services, trello: t }, order({ agent_splits: [{ service_id: 'sem-bp', agent_name: 'Ann', county: 'Hinds', amount: 100 }] }));
  check('H a service split across agents: its per-agent cards are NOT built (listed for the AM); the rest is', [creates(r).map(c => c.name).includes('Search Ads — Smoke Test Co'), /split across agents/.test(r.report)], [false, true]);
  // I. PDF failure
  t = mk(); r = await run({ services, trello: t }, order(), { pdfOk: false });
  check('I the IO PDF cannot be built: the IO card is still made and the AM is told to attach it by hand', [creates(r).map(c => c.name).includes('IO — Smoke Test Co'), /attach it by hand/i.test(r.report)], [true, true]);
  // J. attention rule
  const o0 = order(); const days = 90;
  check('J attention rule: not-synced + board + recent = yes; synced no; no board no; older than the window no; all services cancelled no',
    [win.adminOrderNeedsAttention(o0, days), win.adminOrderNeedsAttention({ ...o0, trello_synced: true }, days), win.adminOrderNeedsAttention({ ...o0, group_id: 'g2' }, days), win.adminOrderNeedsAttention({ ...o0, created_at: new Date(Date.now() - 100 * 86400000).toISOString() }, days), (win.eval('ADMIN_ORDER_CANCEL = { o1: { cancelled: 3, total: 3 } }'), win.adminOrderNeedsAttention(o0, days))], [true, false, false, false, false]);
  win.eval('ADMIN_ORDER_CANCEL = {}');
  // L. Correct Service (the builder WITHOUT strict) behaves exactly as before
  const direct = async (opts, ctx) => { const tt = mk(opts); win.__trello = tt.h; win.eval('__calls.length = 0'); win.eval(`CATALOG_ROWS = ${JSON.stringify(services)}`);
    const out = await win.adminBuildCorrectionCards(JSON.parse(JSON.stringify(order())), services['w-flat'], order().line_items[0], 'Old', 'reason', ctx); return { out, calls: win.eval('__calls.slice()') }; };
  let d = await direct({ templateUnreadable: true });
  check('L Correct Service (not strict): an unreadable template STILL becomes a plain card named after the workflow (unchanged behaviour)', [d.calls.filter(c => c.target === 'trello_create_card').map(c => c.name)], [['Website Tactic — Smoke Test Co']]);
  d = await direct({ cards: ['Website Tactic — Smoke Test Co'] });
  check('L Correct Service (not strict): an existing card is reused AND gets its comment (unchanged behaviour)', [d.out.cards[0] && d.out.cards[0].reused, d.calls.some(c => c.target === 'trello_add_comment')], [true, true]);
  d = await direct({ listFails: true });
  check('L Correct Service (not strict): an unreadable list still goes ahead and builds (unchanged behaviour)', [d.out.cards.length, d.out.stopped || false], [1, false]);
  d = await direct({ listFails: true }, { strict: true });
  check('M strict mode: an unreadable list builds nothing and says so', [d.out.cards.length, d.out.stopped], [0, true]);
  // N. an order the form may still be setting up is not "needs attention" and Retry refuses
  const fresh = order({ created_at: new Date(Date.now() - 3 * 60000).toISOString() });
  check('N an order placed 3 minutes ago is NOT on the attention list (the form may still be setting up Trello)', [win.adminOrderNeedsAttention(fresh, 90), win.adminOrderTooFreshForRetry(fresh), win.adminOrderTooFreshForRetry(order({ created_at: new Date(Date.now() - 30 * 60000).toISOString() }))], [false, true, false]);
  t = mk(); r = await run({ services, trello: t }, fresh);
  check('N pressing Retry on a 3-minute-old order does nothing: no Trello calls at all, the AM is told to wait', [r.calls.length, r.saved.length, r.toasts.some(m => /less than 10 minutes/.test(m))], [0, 0, true]);
  // O. the client has NO Trello list yet: Retry finds it by name / reopens it / creates it, links the client, then builds the cards in it
  const noList = (ci) => win.eval(`__ci = ${JSON.stringify({ found: true, listId: null, name: 'Smoke Test Co', multiAgent: false, ...ci })}; ALL_CLIENTS = [{ id: 'c1', trello_list_id: null }]`);
  const noListOrder = () => order({ trello_client_list_id: null });
  const listCalls = r => r.calls.filter(c => c.target === 'trello_create_list' || c.target === 'trello_update_list');
  noList(); t = mk({ lists: [{ id: 'L1', name: 'Other Client', pos: 1 }] }); r = await run({ services, trello: t }, noListOrder());
  check('O no list on the board for this client: ONE list is created, named "Client - AE", at the bottom (fewer than 5 lists); the cards are built in it', [listCalls(r).map(c => [c.target, c.name, c.pos]), creates(r).length > 0 && r.calls.filter(c => c.target === 'trello_create_card').every(c => c.list_id === 'NEWLIST')], [[['trello_create_list', 'Smoke Test Co - Ann AE', 'bottom']], true]);
  check('O ...the client is linked to the new list (permanent id saved), the order records the list, and the report says the list was created', [r.saved.some(x => x.path === 'rpc/set_client_trello_list_id' && x.body.p_client_id === 'c1' && x.body.p_trello_list_id === 'NEWLIST'), r.saved.find(x => x.path === 'rpc/admin_set_order_trello_state').body.p_data.trello_client_list_id, /Client list \(created\)|created 4/.test(r.report)], [true, 'NEWLIST', true]);
  noList(); t = mk({ lists: [{ id: 'L1', name: 'Smoke Test Co - Bob', pos: 1 }] }); r = await run({ services, trello: t }, noListOrder());
  check('O the client\'s list already exists on the board under "Client - another AE": it is USED, nothing is created or reopened', [listCalls(r).length, r.saved.find(x => x.path === 'rpc/set_client_trello_list_id').body.p_trello_list_id], [0, 'L1']);
  noList(); t = mk({ lists: [{ id: 'L9', name: 'Smoke Test Co', pos: 3, closed: true }, { id: 'A', name: 'a', pos: 1 }, { id: 'B', name: 'b', pos: 2 }, { id: 'C', name: 'c', pos: 4 }, { id: 'D', name: 'd', pos: 6 }, { id: 'E', name: 'e', pos: 8 }] }); r = await run({ services, trello: t }, noListOrder());
  check('O an ARCHIVED list for the client is reopened (at slot 5: halfway between the 4th and 5th open lists, here 6 and 8 = 7) and used; no new list is made', [listCalls(r).map(c => [c.target, c.list_id, c.closed, c.pos]), r.saved.find(x => x.path === 'rpc/set_client_trello_list_id').body.p_trello_list_id], [[['trello_update_list', 'L9', false, 7]], 'L9']);
  noList(); t = mk({ listsFail: true }); r = await run({ services, trello: t }, noListOrder());
  check('O Trello will not show the board\'s lists: NOTHING is created (could duplicate a list), nothing is recorded, the AM is told', [r.calls.filter(c => /create|copy/.test(c.target)).length, r.saved.length, /duplicate/.test(r.report)], [0, 0, true]);
  noList(); t = mk({ lists: [], createListFails: true }); r = await run({ services, trello: t }, noListOrder());
  check('O the list cannot be created: no cards, nothing recorded, reported', [r.calls.filter(c => c.target === 'trello_create_card').length, r.saved.length, /would not create/.test(r.report)], [0, 0, true]);
  noList({ multiAgent: true }); t = mk({ lists: [] }); r = await run({ services, trello: t }, noListOrder());
  check('O a MULTI-AGENT client (one list per AE) is never guessed: no list is looked up or created, the AM is told to pick the AE\'s list by hand', [r.calls.length, r.saved.length, /multi-agent/.test(r.report)], [0, 0, true]);
  noList(); t = mk({ lists: [] }); win.eval('__declineOnce = true'); win.confirm = () => true;
  const declined = await (async () => { win.eval(`CATALOG_ROWS = ${JSON.stringify(services)}; allOrders = [${JSON.stringify(noListOrder())}]; __calls.length = 0; __saved.length = 0; __pdfOk = true;`); win.__trello = t.h; let n = 0; win.confirm = () => (++n === 1); await win.adminRetryTrello('o1'); return { calls: win.eval('__calls.length'), saved: win.eval('__saved.length') }; })();
  check('O saying No to "create the list?" does nothing at all', [declined.calls, declined.saved], [0, 0]);
  win.confirm = () => true; win.eval(`__ci = { found: true, listId: 'LIST1', name: 'Smoke Test Co', multiAgent: false }`);
  // K. wiring in the page
  check('the Orders tab has the attention filter and Order Detail has the Retry button only for unsynced, not-brand-new orders of groups with a board', [/id="orders-filter-attention"/.test(admin), /adminOrderNeedsAttention\(o, attentionDays\)/.test(admin), /!o\.trello_synced && adminOrderHasTrelloBoard\(o\) && !adminOrderTooFreshForRetry\(o\)/.test(admin)], [true, true, true]);
  check('the Correct Service builder still behaves as before when strict is not passed (defaults unchanged)', [/ctx\.strict && !listReadable/.test(admin), /if \(ctx\.strict && reuse\)/.test(admin), /const plainUnlessStrict = \(\) => \{ if \(!ctx\.strict\) plain\(\); \}/.test(admin)], [true, true, true]);
  done();
})();
