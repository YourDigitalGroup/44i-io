// Admin Start/End/Quantity edit (STMM email order, 2026-10-14): first edit must not crash, a monthly per-unit amount follows the quantity,
// and a failed field save is reported loudly instead of "Change saved".
const { read, grab, check, done } = require('./lib');
const src = read('admin/index.html');
const code = [grab(src, /function adminWithTimeout[\s\S]*?\n\}\n/), grab(src, /const ADMIN_EDIT_FIELD_NAMES[^\n]*\n/), grab(src, /function adminReportFailedFields[\s\S]*?\n\}\n/), grab(src, /async function adminSaveLineItemDateEdit[\s\S]*?\n\}\n/), grab(src, /async function adminSaveExtraEditFields[\s\S]*?\n\}\n/), grab(src, /function applyFieldChangeLocally[\s\S]*?\n\}\n/)].join('\n');
async function run(item, extras, failFields = []) {
  const calls = [], toasts = [], comments = [], dom = { 'edit-date-w-email': { value: '2026-10-14' }, 'edit-date-save-btn-w-email': { disabled: false, textContent: 'Save' } };
  const order = { id: 'o1', is_revised: false, line_items: [{ service_id: 'w-email', start_date: '2026-10-14', end_date: '2027-12-31', ...item }], edit_history: null, trello_card_ids: { __io_card__: 'card1' } };
  const g = { document: { getElementById: id => dom[id] || null }, allOrders: [order], CATALOG_ROWS: { 'w-email': { label: 'Addl. Email Addresses', pricing_mode: 'per_unit' } }, currentAdminUser: { name: 'Claire', pw: 'x' }, PROXY: 'p', sbAuthHeaders: () => ({}), adminAeConfirmed: () => true, adminEditedDatesProblem: () => '', pendingFmtDate: d => String(d),
    adminCollectExtraEditFields: () => extras, adminEffectiveWorkflow: () => 'web', adminSiblingTacticCardIds: async () => [], adminUpdateTacticCard: async () => {},
    sb: async (p, o) => { const b = JSON.parse(o.body); if (failFields.includes(b.p_field)) throw new Error('Supabase error 500'); calls.push(b.p_field + '=' + b.p_new_value); return null; },
    fetch: async (u, o) => { const b = JSON.parse(o.body); if (b.target === 'trello_add_comment') comments.push(b.text); return { ok: true }; }, generateAdminRevisedIoPdfBlob: async () => ({ base64: 'x', fileName: 'f.pdf' }),
    showToast: (t, k) => toasts.push((k === 'error' ? 'ERROR: ' : 'ok: ') + t), viewOrderDetail: () => toasts.push('(re-rendered)'), setTimeout, clearTimeout, console: { warn() {}, log() {} } };
  const f = new Function(...Object.keys(g), code + ';return adminSaveLineItemDateEdit;')(...Object.values(g));
  let error = null; try { await f('o1', 'w-email', true); } catch (e) { error = e.message; }
  return { error, calls, toasts, comments, history: order.edit_history ? order.edit_history.length : 0, revised: order.is_revised, button: dom['edit-date-save-btn-w-email'] };
}
(async () => {
  const monthly = { qty: 1, recurring: 7.5, fee: 0, unit_fee: 0 };
  let r = await run(monthly, { qty: '7' });
  check('first edit on an order with no history does not crash', r.error, null);
  check('monthly per-unit: quantity 1 -> 7 saves qty AND the monthly amount (7.50 x 7)', r.calls, ['qty=7', 'recurring=52.5']);
  check('the order history gets both changes', r.history, 2);
  check('success message shown, no error', [r.toasts.some(t => t.startsWith('ok: ')), r.toasts.some(t => t.startsWith('ERROR'))], [true, false]);
  check('Trello comment lists both changes with cents', /quantity changed from 1 to 7; recurring changed from \$7\.50 to \$52\.50/.test(r.comments[0] || ''), true);
  r = await run({ qty: 7, recurring: 52.5, fee: 0, unit_fee: 0 }, { qty: '3' });
  check('monthly per-unit: 7 -> 3 gives 22.50', r.calls, ['qty=3', 'recurring=22.5']);
  r = await run({ qty: 1, recurring: 0, fee: 175, unit_fee: 175 }, { qty: '3' });
  check('one-time per-unit: 1 -> 3 gives fee 525', r.calls, ['qty=3', 'fee=525']);
  r = await run(monthly, { tactic_variant: 'X' });
  check('a variant-only edit does not touch amounts', r.calls, ['tactic_variant=X']);
  r = await run(monthly, { qty: '7' }, ['recurring']);
  check('amount save fails -> red message naming the monthly amount, no green "Change saved"', [r.toasts.some(t => /^ERROR: NOT everything saved: the monthly amount/.test(t)), r.toasts.some(t => t === 'ok: ✅ Change saved')], [true, false]);
  check('amount save fails -> the comment lists only what saved', /quantity changed from 1 to 7 \(by/.test(r.comments[0] || '') && !/recurring/.test(r.comments[0] || ''), true);
  r = await run(monthly, { qty: '7' }, ['qty', 'recurring']);
  check('everything fails -> red message, nothing saved, no Trello comment, button back, flag restored', [r.toasts.some(t => t.startsWith('ERROR: NOT everything saved')), r.calls.length, r.comments.length, r.button.textContent, r.revised], [true, 0, 0, 'Save', false]);
  const w = new Function(grab(src, /function adminWithTimeout[\s\S]*?\n\}\n/) + ';return adminWithTimeout;')(); let msg = null;
  try { await w(new Promise(() => {}), 100, 'demo'); } catch (e) { msg = e.message; }
  check('a step that never answers times out instead of hanging', msg, 'demo timed out');
  check('a quick step still returns its value', await w(Promise.resolve(42), 1000, 'x'), 42);
  done();
})();
