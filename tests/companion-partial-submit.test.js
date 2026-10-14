// Companion: when item 2 of 3 fails, item 1 (already saved) must be LOCKED so the AE's retry cannot send it twice,
// and the retry must reuse the same batch id. Runs the real submitRequests() with a fake database call (jsdom).
const { read, fn, check, done } = require('./lib');
let JSDOM; try { ({ JSDOM } = require('jsdom')); } catch (e) { console.log('SKIPPED (jsdom is not installed)'); process.exit(0); }
const src = read('companion/index.html');
const rows = [0, 1, 2].map(i => `<div class="svc-row"><div class="svc-head"><input type="checkbox" id="svc-chk-${i}" checked/><div class="svc-meta">meta</div></div><div class="svc-detail open" id="svc-detail-${i}"></div></div>`).join('');
const win = new JSDOM(`<body><input id="ae-name" value="Ann AE"/><input type="checkbox" id="attest-confirm" checked/><input id="attest-name" value="Ann AE"/><button id="submit-btn">Submit Request(s)</button><div id="main-content"></div><div id="success-screen" class="hidden"></div>${rows}</body>`, { runScripts: 'outside-only' }).window;
win.eval([fn(src, 'markServiceSubmitted'), fn(src, 'submitRequests'),
  `var PARTIAL_BATCH = null, selectedClientId = 'c1', selectedGroup = { id: 'g1' }, AE_ROSTER = [{ name: 'Ann AE', email: 'a@x.test' }], ACTIVE_SERVICES = [0,1,2].map(i => ({ service_id: 's' + i, order_id: 'o' + i, label: 'S' + i }));
   var calls = [], toasts = [], notified = [], failOn = 's1';
   function groupScope() { return {}; } function showToast(m, t) { toasts.push(m); }
   function collectServicePayload(i) { return { service_id: 's' + i, action: 'cancel', requested_changes: {} }; }
   async function notifyAm(a, e, items) { notified.push(items.map(x => x.service_id)); } async function postSubmitTrelloComments() {}
   async function sb(path, o) { const b = JSON.parse(o.body); calls.push({ service: b.p_service_id, batch: b.p_submission_batch_id }); if (b.p_service_id === failOn) throw new Error('database blip'); return {}; }`].join('\n'));
(async () => {
  const doc = win.document, chk = i => doc.getElementById('svc-chk-' + i);
  await win.eval('submitRequests()');
  const firstBatch = win.eval('calls[0].batch');
  check('first attempt sent s0 then failed on s1 (s2 never sent)', win.eval('calls.map(c => c.service)'), ['s0', 's1']);
  check('s0 is locked: unticked, disabled, tagged "Submitted", panel closed', [chk(0).checked, chk(0).disabled, /Submitted/.test(doc.querySelectorAll('.svc-meta')[0].textContent), doc.getElementById('svc-detail-0').classList.contains('open')], [false, true, true, false]);
  check('s1 (failed) and s2 (not tried) stay ticked and usable', [chk(1).checked, chk(1).disabled, chk(2).checked, chk(2).disabled], [true, false, true, false]);
  check('the AE is told those were locked; the AM was notified about s0 only', [/cannot be sent twice/.test(win.eval('toasts[toasts.length-1]')), win.eval('notified')], [true, [['s0']]]);
  win.eval("failOn = null; calls = [];");
  await win.eval('submitRequests()');
  check('retry sends ONLY s1 and s2 -- s0 is NOT sent a second time', win.eval('calls.map(c => c.service)'), ['s1', 's2']);
  check('retry reuses the first attempt\'s batch id so Admin keeps it as one submission', [win.eval('calls.map(c => c.batch)'), win.eval("PARTIAL_BATCH")], [[firstBatch, firstBatch], null]);
  check('success screen shows after the retry', doc.getElementById('success-screen').classList.contains('hidden'), false);
  done();
})();
