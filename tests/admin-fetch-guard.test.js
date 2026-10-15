// Admin network safety: a call that gets no answer is stopped with a plain message; a failed Trello WRITE raises a red "by hand" toast (reads and other
// sites are left alone); calls to anything else pass through untouched. Real guard functions (jsdom) with a fake fetch.
const { read, fn, grab, check, done } = require('./lib');
let JSDOM; try { ({ JSDOM } = require('jsdom')); } catch (e) { console.log('SKIPPED (jsdom is not installed)'); process.exit(0); }
const admin = read('admin/index.html');
const win = new JSDOM('<body></body>', { runScripts: 'outside-only' }).window;
win.eval([`var PROXY = 'https://x.supabase.co/functions/v1/claude-proxy', SUPABASE_URL = 'https://x.supabase.co'; var __toasts = []; function showToast(m, t) { __toasts.push((t || 'ok') + ': ' + m); }`,
  grab(admin, /var ADMIN_FETCH_TIMEOUT_MS[^\n]*\n/), grab(admin, /var ADMIN_TRELLO_PROBLEMS[^\n]*\n/), grab(admin, /const ADMIN_TRELLO_WRITE_LABELS = \{[\s\S]*?\};\n/),
  fn(admin, 'adminTrelloWriteLabel'), fn(admin, 'adminNoteTrelloProblem'), fn(admin, 'adminFetchGuard'),
  `var __seen = null; var __mode = 'ok'; var __status = 200;
   function fakeFetch(url, init) { __seen = { url, init }; return new Promise((resolve, reject) => {
     if (__mode === 'hang') { if (init && init.signal) init.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))); return; }
     if (__mode === 'netfail') return reject(new Error('Failed to fetch'));
     resolve({ ok: __status < 400, status: __status, text: async () => '', json: async () => ({}) }); }); }
   window.guard = (url, init) => adminFetchGuard(fakeFetch, url, init);`].join('\n'));
const P = win.eval('PROXY'), SB = win.eval('SUPABASE_URL') + '/rest/v1/rpc/x';
const set = (mode, status) => { win.eval(`__mode = '${mode}'; __status = ${status || 200}; __toasts.length = 0; ADMIN_TRELLO_PROBLEMS = [];`); };
const toasts = () => win.eval('__toasts.slice()');
const post = (target) => ({ method: 'POST', body: JSON.stringify({ target }) });
(async () => {
  win.eval('ADMIN_FETCH_TIMEOUT_MS = 40');
  set('hang'); let err = null; const t0 = Date.now(); try { await win.guard(SB, post('x')); } catch (e) { err = e.message; }
  check('a database call with no answer is stopped after the limit, with a plain message that says a save may have gone through', [Date.now() - t0 < 1000, /took too long/.test(err || ''), /check whether it saved/.test(err || '')], [true, true, true]);
  set('hang'); err = null; try { await win.guard(P, post('trello_get_list_cards')); } catch (e) { err = e.message; }
  check('a proxy call with no answer is stopped too; a READ that times out raises no Trello toast', [/took too long/.test(err || ''), toasts().length], [true, 0]);
  set('hang'); err = null; try { await win.guard(P, post('trello_add_comment')); } catch (e) { err = e.message; }
  check('a Trello WRITE with no answer: stopped, and a red toast says to add it by hand', [/took too long/.test(err || ''), toasts().length, /^error: .*comment.*timed out.*by hand/.test(toasts()[0] || '')], [true, 1, true]);
  win.eval('ADMIN_FETCH_TIMEOUT_MS = 120000');
  set('ok', 500); await win.guard(P, post('trello_attach_file'));
  check('a Trello WRITE answered with an error (500): the red "by hand" toast names the file attachment; the caller still gets the answer', [toasts().length, /file attachment.*500.*by hand/.test(toasts()[0] || '')], [1, true]);
  set('ok', 500); await win.guard(P, post('trello_get_list_cards'));
  check('a Trello READ answered with an error raises no toast (the reader handles it)', toasts().length, 0);
  set('ok', 200); await win.guard(P, post('trello_add_comment'));
  check('a Trello write that works raises no toast', toasts().length, 0);
  set('netfail'); err = null; try { await win.guard(P, post('trello_update_card')); } catch (e) { err = e.message; }
  check('a Trello write that fails to connect: the original error still reaches the caller, plus the red toast', [err, /card name\/due-date update.*connection failed.*by hand/.test(toasts()[0] || '')], ['Failed to fetch', true]);
  set('ok', 500); await win.guard(P, post('trello_add_comment')); await win.guard(P, post('trello_update_card'));
  check('several failures close together are combined into ONE message that lists each', [toasts().length, /comment/.test(toasts()[1]) && /due-date/.test(toasts()[1])], [2, true]);
  check('the toast text matches the pattern the existing toast code merges with the green success toast that follows', /by hand|Trello|check the card/i.test(toasts()[1]), true);
  set('ok', 500); await win.guard('https://example.com/other', post('trello_add_comment'));
  check('a call to anything other than the database or the proxy passes through untouched (no signal added, no toast)', [win.eval('__seen.init.signal === undefined'), toasts().length], [true, 0]);
  const ctl = new win.AbortController(); await win.guard(P, { ...post('trello_add_comment'), signal: ctl.signal });
  check('a call that brings its own signal is left alone', [win.eval('__seen.init.signal') === ctl.signal, toasts().length], [true, 0]);
  set('ok', 200); win.eval('ADMIN_FETCH_TIMEOUT_MS = 30'); await win.guard(SB, post('x')); await new Promise(r => setTimeout(r, 80));
  check('a call that finishes in time is not aborted afterwards (timer cleared)', win.eval('__seen.init.signal.aborted'), false);
  check('the guard is installed once at page start and the "Retry"/approval code was not rewired', [/\(function installAdminFetchGuard\(\)/.test(admin), (admin.match(/installAdminFetchGuard/g) || []).length], [true, 1]);
  done();
})();
