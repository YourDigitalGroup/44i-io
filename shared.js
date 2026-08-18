// ════════════════════════════════════════════════════════════════
// shared.js — code genuinely used by BOTH the public IO form
// (index.html) and the standalone admin portal (admin.html).
//
// Extracted 2026-07-08 as part of splitting the admin portal into its
// own file (see io_project_tracking.md for the session write-up).
// index.html was NOT modified in this pass — it still has its own
// inline copies of everything below. This file is only wired up to
// admin.html for now. A later, separately-approved step will remove
// the inline copies from index.html and have it load this file
// instead, once admin.html is confirmed working on its own subdomain.
//
// Scope discipline: only put something here if BOTH pages call it.
// Do not add public-form-only helpers (e.g. applyGroupBranding,
// draft save/restore, signature canvas, step navigation) — those stay
// index.html's exclusive territory even after the later cleanup pass.
// ════════════════════════════════════════════════════════════════

// ── SUPABASE CONFIG ─────────────────────────────────────────────
const SUPABASE_URL = "https://emydtkhnespbxraiijkx.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVteWR0a2huZXNwYnhyYWlpamt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MTA3NjUsImV4cCI6MjA5MzQ4Njc2NX0.vh_5f19z2cb4_NU0sEKAcPiiNXhQZp-61bBN7lqEKbI";
const PROXY = SUPABASE_URL + "/functions/v1/claude-proxy";

// ── HTML escape helper — use anywhere user data gets injected into innerHTML
// Prevents XSS from typed-in business names, intake answers, notes, etc.
function esc(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ── SUPABASE REST HELPER ─────────────────────────────────────────
async function sb(path, opts={}) {
  const method = opts.method || 'GET';
  const body = opts.body || undefined;
  const prefer = opts.prefer || 'return=representation';
  const res = await fetch(SUPABASE_URL + '/rest/v1/' + path, {
    method,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      Prefer: prefer,
    },
    body
  });
  const t = await res.text();
  if (!res.ok) throw new Error('Supabase error ' + res.status + ': ' + t.slice(0,200));
  return t ? JSON.parse(t) : null;
}

// Real bug found live 2026-08-12 (Claire): a bulk import into `campaign_months`
// saved correctly (confirmed in the DB) but never showed up in the Strategist
// portal, even after a hard refresh -- root cause was Supabase's project-level
// API "Max Rows" cap silently truncating the plain sb() call's response once
// that table passed the cap (it had grown to 2968 rows). No error, no warning
// -- the newest rows just never arrived client-side. Use this instead of sb()
// for any RPC whose result set can grow past that cap (campaign facts, audit
// logs, etc.) -- the RPC itself must accept p_limit/p_offset and apply them as
// real SQL `order by ... limit ... offset ...` (see e.g.
// paginated-rpc-functions-2026-08-12.sql); this helper just drives that loop.
//
// Two earlier versions of this (still 2026-08-12) tried to paginate via the
// Range HTTP header instead, on the (wrong) assumption PostgREST would apply
// it as a LIMIT/OFFSET the same way it does for plain table/view GETs. It
// doesn't for POST-based RPC calls -- which every RPC in this project uses --
// so the Range header was silently ignored server-side: every request
// returned the exact SAME first page regardless of offset, "empty page"
// could never be reached, and the loop ran ~2000 requests against production
// before Claire caught it and closed the tab. Real SQL-level LIMIT/OFFSET
// params sidestep that entirely -- no dependency on REST/HTTP pagination
// semantics we can't fully control from here. A hard iteration cap is kept
// anyway as a backstop: if a future RPC is wired up wrong and never returns
// an empty page, this now fails loudly after a bounded number of requests
// instead of hammering the database forever.
const SBALL_MAX_PAGES = 200; // 200k rows at the default pageSize -- far past any real table here
async function sbAll(path, opts={}, pageSize=1000) {
  const method = opts.method || 'GET';
  const bodyObj = opts.body ? JSON.parse(opts.body) : {};
  const prefer = opts.prefer || 'return=representation';
  let all = [], offset = 0, pages = 0;
  while (true) {
    if (++pages > SBALL_MAX_PAGES) throw new Error(`sbAll(${path}): stopped after ${SBALL_MAX_PAGES} pages without an empty result -- the RPC likely isn't honoring p_limit/p_offset.`);
    const res = await fetch(SUPABASE_URL + '/rest/v1/' + path, {
      method,
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json',
        Prefer: prefer,
      },
      body: JSON.stringify({ ...bodyObj, p_limit: pageSize, p_offset: offset })
    });
    const t = await res.text();
    if (!res.ok) throw new Error('Supabase error ' + res.status + ': ' + t.slice(0,200));
    const page = t ? JSON.parse(t) : [];
    if (page.length === 0) break; // the only real end-of-data signal
    all = all.concat(page);
    offset += page.length;
  }
  return all;
}

// ── CATALOG STATE ────────────────────────────────────────────────
// Populated once at startup by loadCatalog() below, from the `services` and
// `intake_forms` Supabase tables. Both the public form (its own catalog-row
// rendering) and the admin portal (Suggested Map / Services editor, and the
// order-detail intake display) read these same objects live — this is the
// "genuinely shared" case called out in the extraction task: don't split it,
// both sides need the exact same data loaded the exact same way.
let SERVICE_DATA = {};    // id -> { label, section, fee, recurring, ... } (public form only reads this)
let PRODUCT_CONFIG = {};  // id -> { koc, intake, label } (public form only reads this)
let INTAKE_FORMS = {};    // formKey -> form definition (both sides read this)
let CATALOG_ROWS = {};    // raw service rows from the table — keeps billing_type/unit_label/etc. for price+frequency rendering (both sides read this)
let RADIO_GROUPS = {};    // exclusivity_group -> [ids] (public form only reads this)
let SPEND_MINIMUMS = {};  // id -> minimum spend (public form only reads this)

// One services-table row → a SERVICE_DATA entry. Reverses the migration
// translations (default_price+billing_type → fee/recurring; modifier/cpm
// shape preserved so existing reader code behaves identically).
function rowToServiceData(r) {
  const out = { label: r.label, section: r.section };
  if (r.billing_type === 'one_time') {
    out.fee = r.default_price != null ? Number(r.default_price) : 0;
    out.recurring = null;
  } else {
    out.fee = 0;
    out.recurring = r.default_price != null ? Number(r.default_price) : 0;
  }
  // QUR flag (2026-07-07): default_price:null becomes a plain 0 above, needed since
  // fee/recurring get summed into running totals elsewhere — but that loses the
  // distinction between "genuinely free" and "quote required, not yet priced". This
  // survives alongside the (necessarily numeric) fee/recurring so Review/Print can show
  // a clear "Quote Upon Request" note instead of a bare, confusing $0/blank for w-custom,
  // em-bp-30kp, tlp-custom. Doesn't touch the totals math at all — a QUR item still
  // correctly contributes $0 to the running total until it's actually priced.
  // FIXED (2026-07-10, found live by Claire): only flat/per_unit services actually use
  // default_price as their real price field — spend items (rate lives in retail_cpm) and
  // modifier items (rate lives in modifier_amount) ALWAYS have a null default_price BY
  // DESIGN, so an unconditional check here flags every spend/modifier service as QUR,
  // replacing its real computed dollar amount with "Quote Upon Request" on the Review
  // page and — more seriously — on the printed IO itself.
  const priceableMode = (r.pricing_mode || 'flat') === 'flat' || (r.pricing_mode || 'flat') === 'per_unit';
  out.is_qur = priceableMode && r.default_price == null;
  if (r.workflow) out.workflow = r.workflow;
  // Modifier items (offline tracking, etc.) are a straight MONTHLY add-on to the total —
  // not a CPM-rate adjustment, and not something requiring its own separate spend entry.
  if (r.pricing_mode === 'modifier' && r.modifier_amount != null) {
    // is_cpm_adjustment modifiers (Offline Visits Tracking, confirmed by Claire/
    // leadership 2026-07-30) deliberately get NO fee/recurring assignment — out.fee and
    // out.recurring stay at their 0 initialization above. The client's spend input is
    // unaffected; the $ amount only changes the CPM basis used for internal
    // accounting/margin tracking (see the Accounting Map), not what the client is
    // actually billed.
    if (r.is_cpm_adjustment) {
      // Flagged separately from fee/recurring (which stay 0) so buildReview()/
      // buildIoDocumentHtml() can show an explicit "No Charge" note instead of falling
      // through to their generic empty-price cases ("—"/"TBD") — "TBD" specifically
      // would read like an unfinished price on the actual printed/signed IO, not an
      // intentionally-free item.
      out.is_cpm_adjustment = true;
      out.cpm_adjustment_amt = Number(r.modifier_amount);
    } else {
      // All current billed modifier items are monthly, riding alongside an ongoing ad
      // campaign — but respect billing_type rather than hardcode that assumption, so
      // this stays correct if a one-time modifier is ever created later.
      if (r.billing_type === 'one_time') { out.fee = Number(r.modifier_amount); out.recurring = null; }
      else { out.recurring = Number(r.modifier_amount); }
    }
  } else if (r.retail_cpm != null) {
    out.cpm = Number(r.retail_cpm);
  } else if (r.id === 'sem-bp') {
    out.cpc = '$4-$12';
  }
  return out;
}

// One services-table row → a PRODUCT_CONFIG entry, or null if the service
// has neither a KOC requirement nor an intake form (old object omitted those).
function rowToProductConfig(r) {
  const koc = r.koc_requirement || 'none';
  const intake = r.intake_form_id || null;
  if (koc === 'none' && !intake) return null;
  return { koc, intake, label: r.label };
}

// ── PRICE + FREQUENCY DISPLAY (table-driven) ──────────────────────
// Computes the Fee text and the Frequency word for a service row from the
// structured catalog fields. Used by the public form's own catalog-row
// rendering AND the admin portal's Suggested Map screen — deliberately the
// SAME function in both places so the two views can never say two different
// things about the same catalog row (this was a real inconsistency Claire
// caught live before the admin screen was switched to reuse this).
function priceAndFrequency(r) {
  if (!r) return { fee: '—', freq: '' };
  if (r.pricing_mode === 'spend') {
    if (r.id === 'sem-bp') return { fee: '$4–$12 CPC', freq: 'Monthly' };
    return { fee: r.retail_cpm != null ? `$${r.retail_cpm} CPM` : '—', freq: 'Monthly' };
  }
  if (r.pricing_mode === 'modifier') {
    // is_cpm_adjustment (Offline Visits Tracking, confirmed by Claire/leadership
    // 2026-07-30): NOT billed to the client at all — the $ amount only raises the CPM
    // basis used for internal accounting/margin tracking. Displayed to look like the
    // "$X CPM" wording spend items use above, rather than the billed "+$X" add-on
    // wording below, so it's clear at a glance this isn't adding to the client's total.
    if (r.is_cpm_adjustment) {
      return { fee: r.modifier_amount != null ? `+$${r.modifier_amount} CPM` : '—', freq: 'No Charge' };
    }
    const modFee = r.modifier_amount != null ? `+$${r.modifier_amount}` : '—';
    let modFreq = 'Add-on';
    if (r.billing_type === 'monthly')      modFreq = 'Add-on, Monthly';
    else if (r.billing_type === 'yearly')  modFreq = 'Add-on, Yearly';
    else if (r.billing_type === 'annual')  modFreq = 'Add-on, Annual';
    else if (r.billing_type === 'one_time') modFreq = 'Add-on, One Time';
    return { fee: modFee, freq: modFreq };
  }
  if (r.default_price == null) return { fee: 'QUR', freq: '—' };

  const n = Number(r.default_price).toLocaleString('en-US', { maximumFractionDigits: 0 });
  const fee = `$${n}`;

  // Per-unit and billing cadence can BOTH apply (e.g. "$7 each, monthly"),
  // so compose the words rather than picking one.
  const parts = [];
  const unit = r.unit_label;
  if (unit === 'hour')      parts.push('Per Hour');
  else if (unit === 'each') parts.push('Per Unit');
  else if (unit)            parts.push('Per ' + unit.charAt(0).toUpperCase() + unit.slice(1));

  if (r.billing_type === 'monthly')      parts.push('Monthly');
  else if (r.billing_type === 'yearly')  parts.push('Yearly');
  else if (r.billing_type === 'annual')  parts.push('Annual');
  else if (r.billing_type === 'one_time') parts.push('One Time');

  return { fee, freq: parts.join(', ') || 'One Time' };
}

// ── CATALOG LOADER ───────────────────────────────────────────────
// Populates SERVICE_DATA / PRODUCT_CONFIG / INTAKE_FORMS / CATALOG_ROWS /
// RADIO_GROUPS / SPEND_MINIMUMS from Supabase. The single source of truth
// for the service catalog on BOTH pages. No hardcoded fallback by design —
// if this fails, the caller should show an error rather than run on
// stale/empty data (see each page's own DOMContentLoaded handler).
async function loadCatalog() {
  const services = await sb('services?active=eq.true&order=section,sort_order&select=*');
  const forms    = await sb('intake_forms?active=eq.true&select=*');
  if (!Array.isArray(services) || !services.length) throw new Error('No active services returned from catalog');
  if (!Array.isArray(forms) || !forms.length) throw new Error('No active intake forms returned from catalog');

  const sd = {}, pc = {}, iff = {};
  services.forEach(r => {
    sd[r.id] = rowToServiceData(r);
    const cfg = rowToProductConfig(r);
    if (cfg) pc[r.id] = cfg;
  });
  forms.forEach(f => {
    const def = (typeof f.definition === 'string') ? JSON.parse(f.definition) : f.definition;
    iff[f.id] = Object.assign({ title: f.title }, def);
  });
  SERVICE_DATA = sd;
  PRODUCT_CONFIG = pc;
  INTAKE_FORMS = iff;
  CATALOG_ROWS = {};
  services.forEach(r => { CATALOG_ROWS[r.id] = r; });

  const rg = {}, sm = {};
  services.forEach(r => {
    if (r.exclusivity_group) {
      if (!rg[r.exclusivity_group]) rg[r.exclusivity_group] = [];
      rg[r.exclusivity_group].push(r.id);
    }
    if (r.spend_minimum != null) sm[r.id] = Number(r.spend_minimum);
  });
  RADIO_GROUPS = rg;
  SPEND_MINIMUMS = sm;

  console.log(`[Catalog] Loaded ${Object.keys(SERVICE_DATA).length} services, ${Object.keys(INTAKE_FORMS).length} intake forms from Supabase.`);
}

// ── TOAST ────────────────────────────────────────────────────────
// Requires a `<div id="toast" class="toast"></div>` in the page (both pages
// have one) and the `.toast` CSS rules (in shared.css).
function showToast(msg, type='success') {
  const t = document.getElementById('toast');
  if (!t) { console.warn('[showToast] no #toast element on this page:', msg); return; }
  t.textContent = msg;
  t.className = 'toast show ' + type;
  setTimeout(() => t.className = 'toast', 8000);
}

// ── Read-only order-detail modal, shared by Strategist and Accounting
// (2026-08-13, per Claire: "order view can be open to anyone with access to
// the strategist and accounting portals" -- a lightweight alternative to
// Admin's own Order Detail view, which is gated to roles that can log into
// /admin at all, e.g. a real accounting-role login can't). Each portal
// fetches the order via its OWN RPC (strategist_get_order_detail /
// accounting_get_order_detail) and just calls this to render it -- pure
// display, no portal-specific business logic, so it lives here instead of
// being duplicated per portal. Deliberately a smaller field set than
// Admin's full Order Detail (no Trello sync status, AM-help flags, intake
// responses, hosting-choice detail, or the signature block) -- just what a
// strategist/accounting person actually needs: client/group/AE, IO/campaign
// dates, every line item, and any special instructions.
// Requires `<div id="shared-order-modal">...<div id="shared-order-modal-body">`
// in the page (both portals have one).
let sharedOrderModalLastFocus = null; // set on open, restored on close -- see closeOrderDetailModal()
// `sections` (2026-08-18, per Claire -- "do the same for the view order in Strategist
// and Accounting" after Admin's own Order Detail got section-grouping + per-service
// dates): optional array of {id, label, sort_order} from each portal's own sections
// fetch (own-copy convention, same as Accounting's ACCOUNTING_SECTIONS/Strategist's new
// STRATEGIST_SECTIONS) -- omit it and this renders exactly as before (flat list, no
// dates), so no caller breaks if it's ever left out.
function renderOrderDetailModal(order, sections) {
  const modal = document.getElementById('shared-order-modal');
  const body = document.getElementById('shared-order-modal-body');
  if (!modal || !body) return;
  sections = Array.isArray(sections) ? sections : [];
  const fmtDate = s => {
    if (!s) return '—';
    const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s + 'T12:00:00') : new Date(s);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  const fmtMoney = n => n != null ? '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
  const items = Array.isArray(order.line_items) ? order.line_items : [];

  const sectionOrderIndex = {};
  sections.forEach((s, i) => { sectionOrderIndex[s.id] = s.sort_order ?? i; });
  const sectionLabel = id => sections.find(s => s.id === id)?.label || id || 'Other';
  const bySection = {};
  items.forEach(item => { (bySection[item.section || ''] = bySection[item.section || ''] || []).push(item); });
  const orderedSectionIds = Object.keys(bySection).sort((a, b) =>
    (sectionOrderIndex[a] ?? Infinity) - (sectionOrderIndex[b] ?? Infinity));

  const rows = orderedSectionIds.map(sec => {
    const header = `<tr><td colspan="5" style="background:#EEF5FB;padding:6px 10px;font-size:10px;font-weight:700;color:var(--accent-dark);text-transform:uppercase;letter-spacing:.06em">${esc(sectionLabel(sec))}</td></tr>`;
    const itemRows = bySection[sec].map(item => {
      const amtParts = [];
      if (item.fee > 0) amtParts.push(fmtMoney(item.fee) + ' one-time');
      if (item.recurring > 0) amtParts.push(fmtMoney(item.recurring) + '/mo');
      if (item.spend > 0) amtParts.push(fmtMoney(item.spend) + '/mo spend');
      const label = item.accounting_label || item.label || item.service_id || '—';
      return `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid var(--border)">${esc(label)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid var(--border);font-size:11.5px;color:var(--muted)">${fmtDate(item.start_date || order.campaign_start)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid var(--border);font-size:11.5px;color:var(--muted)">${fmtDate(item.end_date || order.campaign_end)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid var(--border);font-size:11.5px;color:var(--muted)">${esc(amtParts.join(' + ') || '—')}</td>
        <td style="padding:6px 10px;border-bottom:1px solid var(--border);font-size:11px;color:var(--muted)">${esc(item.notes || '—')}</td>
      </tr>`;
    }).join('');
    return header + itemRows;
  }).join('') || '<tr><td colspan="5" style="padding:14px;text-align:center;color:var(--muted)">No line items on record.</td></tr>';

  body.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px;font-size:12.5px">
      <div><strong>Client:</strong> ${esc(order.client_name || '—')}</div>
      <div><strong>Group:</strong> ${esc(order.group_name || '—')}</div>
      <div><strong>AE:</strong> ${esc(order.ae_name || '—')}</div>
      <div><strong>IO Date:</strong> ${fmtDate(order.io_date)}</div>
      <div><strong>Campaign Start:</strong> ${fmtDate(order.campaign_start)}</div>
      <div><strong>Campaign End:</strong> ${fmtDate(order.campaign_end)}</div>
      <div><strong>One-Time Total:</strong> ${fmtMoney(order.total_onetime)}</div>
      <div><strong>Monthly Total:</strong> ${fmtMoney(order.total_monthly)}/mo</div>
    </div>
    ${order.campaign_notes ? `<p style="font-size:11px;color:var(--muted);margin-bottom:12px"><strong>Campaign Notes:</strong> ${esc(order.campaign_notes)}</p>` : ''}
    <p style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Services Ordered</p>
    <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px">
      <thead><tr style="background:var(--light)"><th style="padding:6px 10px;text-align:left">Service</th><th style="padding:6px 10px;text-align:left">Start</th><th style="padding:6px 10px;text-align:left">End</th><th style="padding:6px 10px;text-align:left">Amount</th><th style="padding:6px 10px;text-align:left">Notes</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${order.special_instructions ? `<div style="padding:10px 12px;background:#FFF7ED;border-left:3px solid #F59E0B;border-radius:5px"><div style="font-size:10px;font-weight:700;color:#92400E;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Special Instructions</div><div style="font-size:12px;color:#78350F">${esc(order.special_instructions)}</div></div>` : ''}
  `;
  modal.style.display = 'flex';
  // Focus management (2026-08-18, accessibility audit) -- this modal had no
  // role="dialog"/focus handling at all, so a keyboard user tabbing from the page
  // behind it could walk straight through the still-visible table underneath.
  // Remembers what had focus so closing returns it there, and moves focus into the
  // modal's own Close button (Escape handling lives on the modal's own onkeydown,
  // added alongside this in the markup, since both portals share this same block).
  sharedOrderModalLastFocus = document.activeElement;
  document.getElementById('shared-order-modal-close')?.focus();
}
function closeOrderDetailModal() {
  const modal = document.getElementById('shared-order-modal');
  if (modal) modal.style.display = 'none';
  if (sharedOrderModalLastFocus && document.body.contains(sharedOrderModalLastFocus)) sharedOrderModalLastFocus.focus();
  sharedOrderModalLastFocus = null;
}
