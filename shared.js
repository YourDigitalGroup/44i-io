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
// API "Max Rows" cap (default 1000) silently truncating the plain sb() call's
// response once that table passed 1000 rows (it had grown to 2968). No error,
// no warning -- the newest rows just never arrived client-side. Use this instead
// of sb() for any RPC/table whose result set can grow past that cap (campaign
// facts, audit logs, etc.) -- pages through via the Range header until
// PostgREST's own Content-Range total (exact count, not a guessed page size)
// says there's nothing left, so it can't silently under-fetch again regardless
// of how large the table gets or what the project's cap is set to.
async function sbAll(path, opts={}, pageSize=1000) {
  const method = opts.method || 'GET';
  const body = opts.body || undefined;
  const prefer = (opts.prefer || 'return=representation') + ', count=exact';
  let all = [], offset = 0, total = null;
  while (true) {
    const res = await fetch(SUPABASE_URL + '/rest/v1/' + path, {
      method,
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json',
        Prefer: prefer,
        'Range-Unit': 'items',
        Range: `${offset}-${offset + pageSize - 1}`,
      },
      body
    });
    const t = await res.text();
    if (!res.ok) throw new Error('Supabase error ' + res.status + ': ' + t.slice(0,200));
    const page = t ? JSON.parse(t) : [];
    all = all.concat(page);
    const cr = res.headers.get('content-range'); // e.g. "0-999/2968"
    const crTotal = cr && cr.includes('/') ? cr.split('/')[1] : null;
    total = crTotal && crTotal !== '*' ? parseInt(crTotal, 10) : total;
    offset += page.length;
    if (page.length === 0) break; // nothing left, regardless of what total says
    if (total != null ? offset >= total : page.length < pageSize) break;
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
