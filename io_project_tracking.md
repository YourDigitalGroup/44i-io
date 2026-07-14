# IO Tool — Project Tracking

_Last updated: 2026-07-08 (MILESTONE: everything that doesn't need an AM decision is now
complete — Claire's explicit goal before having the AM start testing the form. This
follows the 2026-07-07 session's completion of ALL 17 sections as catalog-driven dynamic
rows [see prior entry below]. Since then: the `RADIO_GROUPS`/`SPEND_MINIMUMS` real bug
found in that session's cleanliness audit is now fixed [both derived live from the
catalog, verified against the actual bug scenario — a brand-new tier item is now
correctly recognized]; the standalone hosting double-charge fix (first AM-review item)
is confirmed working; a round of front-end polish is done [QUR items visibly flagged
instead of silently showing $0, header logo visibility/sizing fixed across all groups,
Review page totals bar and header shadow now follow group brand color, print-preview
overlap fixed after a first attempt that didn't work]; and the two remaining lower-
priority cleanliness items [`PRICEABLE_SERVICES` price drift, one duplicate CSS rule] are
resolved. Remaining work is explicitly gated on the AM review (Website business-logic
questions) or later phases (Trello integration, the admin-portal-URL decision). Latest
working file: `io_v2_45_backend_security.html`. Multiple SQL migrations
run in Supabase today — see
individual entries below for exact files/order.)_

This is the running record of where the Insertion Order tool stands: what's done,
what's flagged for review, what's waiting on the Account Manager (AM), and the
roadmap to AE launch and beyond. Kept as a single document so nothing lives only
in conversation.

---

## STATUS SUMMARY

**Track 1 — Catalog migration to Supabase: COMPLETE (structurally).**
Four tables built. Two populated + verified (`services`, `intake_forms`); `ae` is
built-but-empty awaiting data; `group_service_overrides` is built but DEAD/UNUSED —
see BUILT-BUT-EMPTY TABLES below, corrected 2026-07-10 — the live mechanism is
`groups.io_pricing`, not this table.

**Track 2 — Form switchover to table-driven catalog: COMPLETE & VERIFIED (2026-06-25).**
The form now loads `SERVICE_DATA` / `PRODUCT_CONFIG` / `INTAKE_FORMS` from Supabase
at startup. Hardcoded objects removed (~632 lines). Single source of truth. No
fallback by design — failed load shows an error, form refuses to run. Verified:
104 services + 23 intake forms load; selection, intake triggering, KOC triggering,
and one-time/monthly price totals all behave correctly.

**Track 3 — Form formatting + responsive: IN PROGRESS.**
Three changes built this session, layered on the Stage 2 file:
- **TLP structured intake grid — DONE & CONFIRMED by Claire.** Replaces the old free-text
  service/location section. All entry lines shown up front (5/10/15 by tier). Soft
  under-tier reminder fires at SAVE time as a native `confirm()` dialog (chosen for
  reliable mobile rendering) — only when meaningfully under the tier range, once per
  session, never blocks. The two redundant free-text fields (`pages_config`,
  `location_targets`) removed from the `tlp` intake form definition via SQL.
- **Mobile service tables → cards (≤600px) — built, awaiting Claire's device test.**
  Pure-CSS restyle; below 600px each service row becomes a stacked card with labeled
  values and full-width Notes/spend inputs (fixes the "can't scroll to Notes / spend"
  problem on iPhone). Desktop/tablet (>600px) unaffected. No JS changed. Each of the
  26 tables tagged with a shape class (money / monthly / fee / spend) so card labels
  are correct per table type (a CPM is never mislabeled "Fee").
- **Desktop column alignment — built, awaiting Claire's test.** Tables switched to
  `table-layout: fixed` with a `<colgroup>` per table, so columns line up section to
  section as you scroll. Long service names wrap within the Service column instead of
  stretching it. Notes fields are full, usable width. Caveat: 4-column tables (no
  Recurring column) have Notes one column to the left of 5-column tables — shared
  columns align; forcing Notes alignment across all shapes would need filler columns
  (not recommended). No JS changed.

> **Latest working file: `io_v2_43_columns.html`** (TLP grid + mobile cards + desktop
> alignment + column standardization).

- **Column standardization + table-driven price display (v43) — built, awaiting LIVE
  verification.** Every service table now uses one uniform shape: Service · Fee ·
  Frequency · (Monthly Spend, ad tables only) · Notes. Amount and frequency are split
  into separate columns (fixes "$199/mo" shown alongside a "Monthly" column — said
  twice). Suffixes standardized ("ea" → Per Unit, "/hr" → Per Hour). Prices are now
  GENERATED from the `services` table at startup (`renderPriceCells()`), which also
  closed the price-drift flag. Frequency words come from `billing_type` / `pricing_mode`
  / `unit_label`. **Must be verified against live Supabase** — see the price-drift flag
  below for exactly what to check before committing.

> **Recommended now:** once Claire confirms v42 on desktop + iPhone, commit it in GitHub
> as a known-good checkpoint. Three behavior changes are stacked in it; a commit makes
> them easy to isolate if anything later misbehaves. (The Stage 2 switchover should also
> be committed if it wasn't already.)

---

## PRE-AE-LAUNCH PATH (ordered)

These gate sending the form to AEs to start using.

- **A. Read-only catalog admin view.** A screen listing all services — ID, label,
  section, price, billing type, intake form, KOC requirement, active flag — sortable
  and scannable. Doubles as the verification tool for the audit (B). Low-risk (reads
  only). *Next up.*

- **B. Verify base catalog correctness.** Row-by-row audit of all prices, intake
  assignments, KOC requirements, using the view from A. We already found two real
  population issues with spot-checks (missing TLP/GBP section; offline-modifier
  inconsistency), so a full pass is warranted before launch.

- **C. Load the groups' custom pricing** — CORRECTED 2026-07-10: goes into
  `groups.io_pricing`, not `group_service_overrides` (that table is dead/unused —
  see BUILT-BUT-EMPTY TABLES). In progress via Claire's paper-IO uploads. Comes
  AFTER B — overrides are deltas from verified base prices, so the base must be
  correct first. Spreadsheet-sourced; CSV-friendly import.

- **D. Build the TLP structured intake. DONE & CONFIRMED (2026-06-25).** Replaced ONLY
  the free-text location/service section of the TLP form (Action Items / remaining
  Project Details fields stay as-is). Built in code (grid behavior isn't data); confirmed
  working by Claire. See Track 3 above and the spec below.

- **E. Mobile / tablet rendering — CONFIRMED LAUNCH REQUIREMENT (AM).** AEs fill the
  form out in client meetings on phones and tablets; some still do it by hand. So the
  form must render and be usable on a phone. Progress: the service tables now become
  cards on phones (Track 3) — the biggest mobile problem. Still to check on a real
  device: the Step 1 "Campaign Length" dropdown and Step 3 date field were clipped in
  Claire's screenshots (smaller fixes, not yet done); the intake modal on a phone; the
  signature canvas with a finger. Treat remaining items as a focused small-screen pass
  after v42 is confirmed.

---

## TLP STRUCTURED INTAKE — SPEC (BUILT & CONFIRMED 2026-06-25)

_Kept for the record. Built as specified; confirmed working by Claire. One open AM
question remains (Custom timing, below). Note on what shipped vs. spec: the grid shows
all entry lines up front (no add/remove buttons), and the soft reminder fires at SAVE
time as a native confirm dialog rather than inline — both refinements Claire chose
during the build._

Confirmed from the paper form + AM rule clarifications:

- **Mode is either/or** (never a matrix):
  - Single service → multiple locations, OR
  - Multiple services → single location
  - One side is locked to a single entry; the other expands.
- **Grid:** two columns — *Location to Target (City, State / County)* and *Service*.
- **Tier sets the cap on the "many" side (hard maximum):**
  - Business Starter = up to 5
  - Business Builder = up to 10
  - Business Pro = up to 15
  - Custom = 15+ → QUR (quote upon request, manual)
- **Each entry = one landing page** (entry count = page count).
- **Each row needs only:** location + service. Nothing else per row.
- **Minimum is a SOFT reminder, not a block:** if they're under the tier's range,
  gently note they may fit a smaller tier (so they only pay for what they need).
  Never prevents submission.
- **Mode switching:** default to clearing entries on switch (minor UX; no AM input
  needed unless she objects).

**Open AM question on TLP:** For Custom (15+), should the structured intake be
filled out NOW (at IO submission) or AFTER the quote comes back? The final scope
isn't known until the quote, so timing matters. _Awaiting AM._

---

## OPEN QUESTIONS FOR THE AM

- **TLP 15+ intake timing** — fill structured intake before or after the quote? (above)
- **Visitor-ID email-bundle intake** — `w-vid200e` / `w-vid350e` / `w-vid500e` had
  NO intake form in the old code, while the plain versions (`w-vid200/350/500`) route
  to the `visitorid` intake. The table now gives all six the intake form (assuming the
  omission was an oversight). Confirm that's correct, or whether the email versions
  should skip intake for a reason.
- **Archived/returning clients (Trello)** — how often does it happen, and how do they
  currently re-find the archived list? (Shapes the eventual fix; not blocking.)
- **Multi-select in Targeted Display / Social Media Ads — clarified into two SEPARATE
  questions (2026-07-10), since the old vague note conflated two different situations.**
  Pulled the real tier membership via SQL rather than guess:
  - **Targeted Display (`td-tier`):** Geotargeting & Audience ($10 CPM), Site Retargeting
    ($12), Dynamic Display ($15), Custom Site Targeting ($18) — these are 4 different
    TARGETING METHODS, currently forced to single-select (picking one unchecks the others).
    Question: should an AE be able to run MULTIPLE targeting methods for the same client at
    once (e.g. Geotargeting AND Site Retargeting together), or is one method per campaign
    intentional?
  - **Social Media Ads (`sma-tier`):** Facebook & Instagram ($15 CPM), TikTok ($27),
    Snapchat ($20), LinkedIn ($60) — these are 4 different PLATFORMS, also currently
    forced to single-select. Question: should an AE be able to run ads on multiple
    platforms for the same client at once (e.g. Facebook + TikTok together)?
  **Technical note for the AM conversation, not a constraint on the answer:** each item
  already has its own independent rate and its own spend field — nothing about how pricing
  is calculated would need to change to allow multiple selections in either section. The
  single-select restriction is a pure business-rule choice (`exclusivity_group`), not a
  technical limitation — whichever way the AM decides, it's a small, low-risk change either
  to leave as-is or to remove the exclusivity grouping for one or both sections.
  `td-offline` (Offline Visits Tracking, a flat modifier add-on) is NOT part of the
  `td-tier` group and is unaffected by this question either way.
- **Should reselling an already-sold product update its existing Trello tactic card? —
  raised 2026-07-14, found while testing the archived-client reopen flow.** Confirmed
  current code behavior (never explicitly decided with the AM before, just how it's
  quietly worked since the original build): when a product being sold already has a
  matching-named card in the client's Trello list, that card is skipped entirely — never
  touched, updated, or duplicated. Only genuinely new products get a new card added. The
  IO card itself is NOT affected by this question — it already gets its description
  updated and a new dated PDF attached on every submission regardless. Question: is
  "never touch an existing tactic card again after its first sale" the right behavior
  (safest against overwriting notes/checklist progress an AE or strategist has since
  added to that card), or should reselling a product somehow update its card (e.g.
  append a note about the new sale, or refresh its description) — and if so, append vs.
  replace? Not blocking; current behavior is a safe, defensible default either way.

---

## REVIEW / BUG / FORMATTING FLAGS

Things to fix or confirm. None block the switchover (done); most belong to the
form-edit pass or pre-launch audit.

**Data / catalog:**
- **À La Carte split — DONE, converted to dynamic catalog-driven rows, FULLY PROVEN LIVE
  (2026-07-07).** Superseded by the bigger architecture decision below: rather than just
  activating `alc-preroll`/`alc-social-ad-set` as static HTML rows, À La Carte was
  converted to be the FIRST section generated entirely from the catalog at runtime
  (`renderCatalogSection()`) — the prototype for the Step 2 "edit without touching code"
  goal. Verified with real extracted code run against synthetic data (jsdom simulation)
  AND confirmed live by Claire: (1) all 7 original items still work normally; (2) activating
  `alc-preroll` + `alc-social-ad-set` in Supabase made them appear on the form with ZERO
  code change — all 9 items now active and showing; (3) deactivating a product in Supabase
  cleanly removes its row from the form — no ghost/dead checkbox. Both the "add" and
  "remove" halves of the goal are now proven true, live, not just simulated.
- **STEP 2 ARCHITECTURE DECISION — Option A (full dynamic generation), staged section by
  section (decided 2026-07-XX, prototype proven 2026-07-07).** After weighing A (full
  dynamic) vs B (hybrid — keep static HTML, move only exclusivity/spend data to Supabase)
  vs C (stay manual, add a safety-net diff tool), Claire chose A: do the real fix now, while
  nothing depends on today's structure yet (pre-Trello-integration, pre-public-launch), built
  the same disciplined way as the rest of this project — one section at a time, each
  verified and committed before moving to the next. À La Carte was the prototype (see
  above). NEXT sections queued for conversion: `rep`, `llo`, `gbp` — confirmed by code
  inspection to be structurally simple like À La Carte (single item, no tier groups, no
  spend minimums) — mechanical reuse of the exact same `renderCatalogSection()` function.
  Remaining 13 sections (web-ot, web-mo, tlp, sm, em, seo, td, sem, sma, lt, vid, ctv, audio)
  all have tier-based single-select groups (`RADIO_GROUPS`) and/or ad-spend minimums
  (`SPEND_MINIMUMS`) that `renderCatalogSection()` doesn't handle yet — converting those
  needs the function extended first (exclusivity-group + spend-minimum fields added to the
  `services` table, tier-group rendering logic added). Do NOT attempt those sections with
  today's simple version of the function.
- **`renderCatalogSection()` EXTENDED to handle tier exclusivity + ad-spend inputs —
  BUILT + RIGOROUSLY VERIFIED (2026-07-07).** Prototype #2 (after À La Carte/Reputation/
  Local Listing/GBP proved the basic pattern): converted **SEO** (tier-only — the
  simplest tier case, 3 items, no spend) and **SEM** (spend-only — a single item, but
  with a real wrinkle: a hardcoded "$200 min setup fee..." note baked into its label
  text). Prerequisite schema added first: `exclusivity_group` and `spend_minimum`
  columns on `services`, populated via SQL cross-checked PROGRAMMATICALLY against the
  live `RADIO_GROUPS`/`SPEND_MINIMUMS` objects (zero mismatches, zero missing ids —
  verified by script, not eyeballing). Claire's idea for the SEM wrinkle: rather than
  fold the note into the plain label (losing its distinct styling) or skip the section,
  add a REUSABLE `fee_note` column any future service can use the same way — better
  than either of the two options first proposed. `renderCatalogSection()` now reads
  `exclusivity_group` (wires `toggleSingle()` with the right group, same mechanism the
  static tier sections already used) and `pricing_mode === 'spend'` (generates the same
  bare spend `<input>` a static ad-spend row has). `renderPriceCells()`'s label-refresh
  updated from `.textContent` to an escaped `.innerHTML` so it can append the fee_note
  span without a second, duplicate rendering path. VERIFIED via real-code simulation:
  SEO's tier exclusivity actually WORKS (selecting Builder correctly unchecks Starter,
  not just correct wiring); SEM's spend input is generated and correctly
  found/repositioned by the existing decoration logic; the fee_note renders correctly;
  and — critical since this touches the SHARED function — À La Carte (no tier, no
  spend) is confirmed completely UNAFFECTED by the extension.
  SCOPE BOUNDARY, stated honestly: does NOT yet handle a row that's BOTH spend-tracked
  AND a modifier (like the "-offline" add-ons, which carry a spend input despite being
  pricing_mode='modifier') — needed before Targeted Display/Location Targeting/Video/
  etc., not before today's SEO/SEM prototype. `SAFE_DYNAMIC_SECTIONS` (the admin
  write-side screen's create/deactivate gate) updated to include `seo`/`sem`.
  NEXT candidates once confirmed live: Social Media Management, Email Marketing, TLP
  (all tier-only, same pattern as SEO) before tackling the combined tier+spend sections.
- **Batch #3: Social Media Management, Email Marketing, TLP converted — BUILT + VERIFIED
  (2026-07-07).** All three checked against their real static HTML before converting
  (learned from SEM's hidden fee_note surprise — don't assume, verify). Found: each
  section MIXES 3-4 tiered items with 1-2 UNTIERED "extra" items in the same table
  (`sm-addl`, `em-addl`/`em-template`, `tlp-design`) — a genuinely new combination not
  covered by SEO (which was purely tiered, no extras). No code changes needed:
  `renderCatalogSection()` already checks `exclusivity_group` per ROW, not per section,
  so it correctly generates `toggleSingle()` wiring for tiered items and plain `toggle()`
  for untiered ones within the same table, by design — but verified this explicitly via
  simulation rather than assume it worked. VERIFIED: correct onchange wiring for all 6
  representative rows across the 3 sections; confirmed a tiered item and an untiered
  add-on can be selected SIMULTANEOUSLY (the tier only affects other members of its own
  group, never an unrelated item sharing the table) — the actual behavior that matters,
  not just correct-looking wiring. `SAFE_DYNAMIC_SECTIONS` updated to include `sm`/`em`/
  `tlp`. Now 9 of 17 sections converted. Remaining: the combined tier+spend sections
  (Targeted Display, Social Ads), the tier+spend+mixed-untiered sections (Location
  Targeting, Video, Streaming TV), Audio (multi-table structure, needs its own
  extension), and Website (most complex — two tier groups plus cross-section exclusivity).
- **Batch #4: Targeted Display, Social Media Ads converted — first COMBINED tier+spend
  sections — BUILT + VERIFIED, closed a real scope boundary (2026-07-07).** Checked both
  sections' real HTML before converting (same discipline that caught SEM's fee_note).
  Social Media Ads was clean (all 4 items tiered, all spend — the simple combined case).
  Targeted Display surfaced the EXACT gap flagged as an open scope boundary during Batch
  #2: `td-offline` is pricing_mode='modifier' (untiered) but still carries a spend input
  in its static markup — the row-generator's spend-cell check (`pricing_mode === 'spend'`)
  didn't cover it. FIXED: check now also includes `spend_minimum != null`. Required a
  data correction alongside it (`services_spend_minimum_correction.sql`): the 11
  "-offline"/modifier items had spend_minimum set to NULL earlier today (reasoning: the
  original $0 minimum behaved like "no minimum" for the warning check) — but NULL is now
  ambiguous with "no spend field at all," so changed to 0, which still behaves
  identically for the warning (falsy either way) while giving this new check an
  unambiguous signal. `SAFE_DYNAMIC_SECTIONS` updated to include `td`/`sma`. Now 11 of 17
  sections converted. VERIFIED via simulation: td-geo correctly gets BOTH tier wiring AND
  a spend cell; td-offline correctly gets a spend cell DESPITE being an untiered modifier
  (the actual fix); sma-fb confirmed clean; REGRESSION checks confirm sem-bp (pure
  spend) and seo-bs (pure tier) both remain completely unaffected by extending the
  shared check.
- **Offline-tracking modifier double-count/re-quirk — FINALLY FIXED (2026-07-07), closes
  a PRE-EXISTING issue logged before today's session.** Caught live testing Targeted
  Display: Claire correctly identified the spend input on "Offline Visits Tracking" made
  no sense, and corrected my initial wrong assumption (that it was a CPM-rate modifier) —
  it's "a straight monthly add-on that doesn't affect the CPM," exactly matching the
  ALREADY-LOGGED fix description from before today ("treat them as flat +$ added to the
  parent campaign total"). ROOT CAUSE (found in the actual code): `rowToServiceData()`
  had an intentional "re-quirk" — modifier_amount got stashed in a DISPLAY-ONLY `.cpm`
  field that the real total calculation never read, so "+$2, Add-on" showed correctly on
  screen while $0 actually got added anywhere — the EXACT same shape of gap as the SEM
  setup-fee note turned out to be. FIX (small, contained to ONE function): modifier_amount
  now flows directly into `.recurring` (or `.fee` if billing_type is ever one_time,
  handled for robustness though no current service uses that combination) — since
  buildReview()/submitIO()/printIO() ALL already sum `.recurring` generically for any
  selected item, ZERO changes were needed to any of those three functions. Also reverted
  the spend-cell check in `renderCatalogSection()` back to `pricing_mode === 'spend'` only
  (the Batch #4 fix that added modifier items to this check was itself based on the wrong
  CPM-modifier assumption — reversed same-day once corrected; the spend_minimum=0 data
  change from that reversed fix is harmless unused leftover, not worth another migration).
  VERIFIED via real-code end-to-end test: checking ONLY the offline modifier (no spend
  typed anywhere, since it has no spend field at all now) correctly produced a $2/mo
  Monthly Total — proving the calculation genuinely runs, not just displays correctly;
  confirmed no spend input renders on the modifier row; confirmed genuine spend items
  (td-geo) and tier-only items (seo-bs) remain completely unaffected.
- **Remaining 10 offline-modifier rows (still-static sections) — spend box removed as an
  URGENT follow-up, not deferred to their section conversions (2026-07-07).** Claire
  caught that `lt-offline`, `nv-offline`, `pv-offline`, `yttv-addl`, `stv-offline`,
  `ottctv-offline`, `pa-offline`, `nd-offline`, `sda-offline`, `mob-offline` all still had
  their old spend box, since only td-offline's SECTION (Targeted Display) had been
  converted so far. Recognized this was MORE urgent than "fix as we convert each
  section": the `rowToServiceData()` calculation fix applies GLOBALLY to every modifier
  item immediately (it runs for every catalog row regardless of which section's HTML has
  been converted), but the spend box removal is per-section HTML — meaning these 10 items
  now had `.recurring` CORRECTLY set to their real amount, while their STILL-VISIBLE
  spend box could ALSO have a value typed into it and added on top via `.spend` — a
  GENUINE NEW double-count risk that was arguably safer before today's fix (when
  `.recurring` was 0, a typed spend was simply wrong on its own, not doubled against a
  nonzero value). Fixed immediately, decoupled from the section-by-section conversion
  work: removed the spend `<td>` from all 10 rows directly in their still-static HTML.
  VERIFIED via real-code test: the now-3-cell static row (checkbox/label/notes) decorates
  correctly via the EXISTING renderPriceCells() logic with zero code changes needed (same
  handling as the alc/rep/llo/gbp simple-row shape); confirmed no spend input renders;
  checking the modifier alone (yttv-addl, $10) correctly produced exactly $10/mo with no
  way to type a competing value anymore.
- **Batch #5: Location Targeting converted; Video/Streaming TV/Audio identified as ONE
  shared structural problem, not three (2026-07-07).** Checked every remaining section's
  table count before assuming they'd convert the same way as Targeted Display. Location
  Targeting: single table, structurally identical to td (3 tiered spend items + 1
  already-fixed untiered modifier) — converted directly, no code changes needed, VERIFIED
  via simulation (tier+spend wiring correct, untiered modifier correctly has no spend
  cell). Video and Streaming TV, however, EACH have 4 SEPARATE sub-tables under one
  section (YouTube Video/Native Video/Programmatic Video/YouTube TV for Video; similar
  breakdown for Streaming TV) — the EXACT SAME structural shape Audio was already known
  to have. This means Video + Streaming TV + Audio are genuinely ONE shared extension to
  build (`renderCatalogSection()` only fills one tbody per section today), not three
  separate problems — worth building once and reusing for all three rather than solving
  it per-section. `SAFE_DYNAMIC_SECTIONS` updated to include `lt`. Now 12 of 17 sections
  converted. Remaining: Video, Streaming TV, Audio (the shared multi-table extension),
  and Website (most complex, saved for last as planned).
- **Batch #6: Video, Streaming TV, Audio converted — the multi-table extension, all 17
  non-Website sections now done — BUILT + VERIFIED, one real bug caught and fixed
  (2026-07-07).** Mapped every section's exact sub-table-to-id structure PROGRAMMATICALLY
  against the real HTML before writing any SQL (zero mismatches across all 26 ids, same
  rigor as the tier-group mapping earlier). New `subsection_label` column added — the
  "Min $X/mo" note next to each sub-header is deliberately COMPUTED from `spend_minimum`
  at render time rather than a separately-typed string, so there's one source of truth.
  Factored out `generateCatalogRowHtml()` — the actual checkbox/spend-cell logic used to
  live only inside `renderCatalogSection()`; now both it and the new
  `renderMultiTableSection()` call the same shared function, so the two generators can
  never drift into treating the same kind of row differently. New function targets a
  CONTAINER div (not a single tbody, since there are multiple separate `<table>`
  elements) and replicates the original static structure exactly — only the FIRST
  sub-table gets a visible `<thead>`, matching how the hand-typed markup always worked.
  REAL BUG CAUGHT DURING VERIFICATION: the first version of the Min-$-computation
  included EVERY row's spend_minimum, including modifier items riding alongside the real
  spend products (e.g. Native Video's offline-tracking modifier has spend_minimum=0 by
  design) — `Math.min()` was picking up that 0 and showing "Min $0/mo" instead of the
  correct $1,000. Fixed by filtering to `pricing_mode === 'spend'` before computing the
  minimum. VERIFIED via simulation across BOTH Video and Streaming TV's real data
  (including Streaming TV's single-item subsections, Hulu/Amazon): correct sub-table
  count, correct headers post-fix, correct thead-only-on-first-table, correct row wiring
  for every combination; REGRESSION confirmed the shared-helper refactor didn't change
  anything for the already-converted simple sections; and — the case I was most
  cautious about — confirmed a tier group in one sub-table genuinely does NOT interfere
  with an unrelated item in a DIFFERENT sub-table of the same section.
  **ALL 16 non-Website sections are now converted.** Only Website remains — the most
  complex piece, with two tier groups PLUS cross-section exclusivity with Visitor IDs,
  intentionally saved for last all along.
- **Write-side editor: Subsection field — SAME gap pattern found again, closed
  (2026-07-07).** Claire caught this immediately after Batch #6: `subsection_label` (the
  new column driving Video/Streaming TV/Audio's mini-table grouping) had no field in the
  write-side editor at all — identical gap shape to exclusivity_group/spend_minimum/
  setup-fee earlier. Built with the SAME pick-list-not-free-text pattern as Exclusivity
  Group, but SCOPED per-section (unlike Exclusivity Group, which is global — "YouTube
  Video" only makes sense inside "vid", so a service in a different section must never
  see it as an option). Section's own dropdown now also re-scopes the Subsection list
  live when changed (`onServiceSectionChange()` wraps the existing `autoServiceId()` call
  plus the new re-scoping). Updated `admin_save_service` RPC a fourth time today
  (`admin_save_service_FINAL_v2.sql` — supersedes every earlier version, only this one
  needs to be run). VERIFIED via simulation: editing a service correctly populates its
  actual subsection; a service in a DIFFERENT section correctly never sees another
  section's subsections as options; changing Section live re-scopes the list; saving
  with a picked subsection sends the exact right value.
- **Section-head spacing — first subsection looked glued to the card title —
  FIXED (2026-07-07).** Claire caught this live on the newly-converted Video/Streaming
  TV/Audio: each sub-header (e.g. "Streaming TV Advertising — Min $1,500/mo") sat flush
  against the card's own title bar directly above it, with zero breathing room — while a
  clear border separated it from the table headers below. Confirmed via screenshot: this
  read backwards, as if the label belonged with the card title above rather than the
  table it actually describes below. Confirmed the generated structure exactly matches
  what the original static HTML always had (not a regression from today's conversion) —
  simply hadn't been looked at closely until this section was freshly tested. FIXED with
  a small, low-risk CSS-only change: added `margin-top:10px` to `.section-head`, applied
  uniformly (not just the first one in each section) — creates consistent breathing room
  before every sub-header regardless of what's directly above it, which specifically
  resolves the "glued to the card title" case as one consequence of the general fix.
  FOLLOW-UP — WRONG MAIN DIAGNOSIS, CORRECTED (2026-07-07, same session): a fuller
  screenshot showing the whole Streaming TV section revealed the spacing fix, while
  real, wasn't the actual main problem. Only the FIRST sub-table in each section ever
  got column headers (Service/Fee/Frequency/Monthly Spend/Notes) — faithfully copied
  from the original static markup, which had the same limitation. That meant "Social
  OTT/CTV", "Hulu Ads", and "Amazon Prime Ads" showed rows with NO column labels
  anywhere nearby — someone would have to scroll back to a DIFFERENT table further up
  the page to know what "$75 CPM / Monthly" even meant. Claire considered an alternative
  (move just the first sub-header below the column headers) but correctly identified it
  wouldn't fix the other three tables at all — only giving EVERY sub-table its own
  headers actually makes each one self-contained. FIXED: removed the "only the first
  table gets a `<thead>`" condition entirely — every sub-table now always gets one.
  VERIFIED via simulation: all 3 sub-tables in a realistic Streaming TV dataset
  (Streaming TV Advertising / Hulu Ads / Amazon Prime Ads) each confirmed to have their
  own `<thead>`, not just the first.
- **"Monthly Spend" column header shortened to "Spend" — FIXED, small wording change
  (2026-07-07).** Claire's observation: every spend-type row's Frequency column already
  says "Monthly" unconditionally (hardcoded in `priceAndFrequency()`'s spend branch), so
  "Monthly Spend" as the column header repeats the same word right next to it — the same
  class of redundancy already fixed elsewhere today (the old "$199/mo" + "Monthly" double-
  up). Found and updated every occurrence: the 4 static single-table sections' headers
  (Targeted Display, SEM, Social Media Ads, Location Targeting), the JS-generated header
  in `renderMultiTableSection()` (Video/Streaming TV/Audio), the mobile view's `::before`
  label (shown when the table collapses to stacked cards on small screens), and one
  outdated code comment. Deliberately did NOT touch the legal disclaimer sentence
  ("...require a minimum monthly spend as noted") — that's ordinary prose, not a column
  header, and isn't redundant with anything next to it. VERIFIED: zero remaining
  occurrences of the old header text anywhere; the only surviving "monthly spend" text
  in the whole file is that one correctly-untouched disclaimer sentence.
- **Spend/Frequency column text looked misaligned — FIXED, confidence based on reasoning
  not rendering, needs live confirmation (2026-07-07).** Claire's observation: the
  "Spend" header and its "$ spend" input below it didn't line up, even though the CSS
  already had `text-align:right` on both. Traced to a real, well-documented browser
  quirk: a native `<input type="number">` reserves visible space at its right edge for
  the up/down spinner arrows, so even right-aligned TEXT sits to the left of that
  reserved space — while a plain header or a plain `<td>` (no input, no spinner, like the
  Fee column) sits flush at the TRUE right edge. Same CSS property, visibly different
  result, because one has a spinner competing for space and the other doesn't. FIXED by
  removing the native spinner arrows entirely (`-moz-appearance:textfield` +
  `::-webkit-outer/inner-spin-button{-webkit-appearance:none}`) — also a reasonable
  design choice on its own, since incrementing a dollar amount one unit at a time via
  tiny arrows was never a useful interaction for this field anyway. Same selector also
  covers the quantity field (harmless consistent side benefit — confirmed its own inline
  `text-align:center` still overrides safely, since inline styles always win regardless
  of what the external rule changes). HONEST CAVEAT: this is reasoned from known browser
  behavior, not verified by actually rendering the page — genuinely needs Claire's live
  confirmation, same as the earlier Notes-column padding fix.
- **FOLLOW-UP — the real messiness was a left/right zigzag across the row, not just Spend
  vs its header — FIXED (2026-07-07, same session).** After the spinner fix, Claire
  correctly identified the deeper issue: across a typical spend-table row, alignment
  alternated Service(left) → Fee(RIGHT) → Frequency(left) → Spend(RIGHT) → Notes(left) —
  Frequency sat left-aligned sandwiched between two right-aligned value columns, creating
  a visual zigzag rather than one clean, consistent block. FIXED: Frequency's header AND
  data cell both changed to right-aligned, matching Fee and Spend — now the rule is
  simple and uniform: value-ish columns (Fee/Frequency/Spend) are right-aligned, only the
  free-text columns (Service/Notes) are left-aligned. Updated all 15 occurrences of the
  Frequency header at once (a global find/replace, since every one — static AND the
  Video/Streaming TV/Audio JS-generated header — used the identical string). Also found
  and fixed something this WOULD have broken: the mobile stacked-card layout already had
  an explicit reset (`.svc-table td.right{text-align:left}`) undoing desktop's
  right-alignment for exactly this reason — a right-aligned value looks wrong in a
  full-width mobile block where the label sits above it, not beside it. Added the
  matching reset for the new `.svc-freq` rule so it doesn't leak into mobile the same way
  Fee already doesn't.
  PARKED (2026-07-07): Claire's call — this alignment work still isn't fully settled
  (her exact words: "I think we still have some work to do here"), but rather than keep
  iterating live, tabling it as a cosmetic item to revisit later so the session can get
  back to finishing the Website section conversion. Not urgent/functional — purely visual
  polish, safe to leave as-is in the meantime.
- **MAJOR MILESTONE: Website converted — ALL 17 sections now catalog-driven, the entire
  row-generator project is complete — BUILT + VERIFIED (2026-07-07).** Website was
  deliberately saved for last as the most complex section, and this confirmed why: what
  started as a simple "map out the exclusivity" request surfaced a genuine web of
  business-logic questions Claire caught by building her own spreadsheet, working through
  it collaboratively rather than guessing:
  - Cross-section exclusivity (One-time ↔ Monthly, whole section) — CONFIRMED already
    working in existing code (`WEB_OTO`/`WEB_MRR` arrays, `setWebSectionDisabled()`),
    verified line-by-line and mapped in a diagram before any spreadsheet work started.
  - Claire's spreadsheet then surfaced THREE genuine gaps NOT in the diagram: (1) the
    4 Monthly hosting/chatbot tiers have zero exclusivity wiring today — someone could
    select all 4; (2) standalone "Hosting Fee*"/"E-Commerce Hosting Fee***" checkboxes
    are completely independent from the hosting-setup MODAL triggered by the site tiers —
    real double-charge risk; (3) "if a bundle's title says AI Chatbot, buying it standalone
    too doesn't make sense" — Claire's own plain-language rule for a THIRD exclusion axis.
  - Traced that fixing all three needs services to belong to MULTIPLE exclusivity
    relationships at once (a monthly hosting tier vs. its 3 siblings, vs. standalone AI
    Chatbot, vs. one-time hosting) — architecturally impossible with today's single
    `exclusivity_group` text column. Confirmed this is a genuine data-model change, not
    a "build it now" answer.
  - Claire also caught that "disable the whole section" is currently too broad — Domain
    Transfer, DNS Transfer, and Convert Logo to Vector are independent services that
    shouldn't be blocked just because a site-tier was picked elsewhere, but Modules and
    Optional Content Support are genuinely ambiguous.
  - Claire's call: PARK all of the above for a dedicated AM review (business-logic
    decisions, not technical ones) and close out ONLY the tier logic that's unambiguous —
    the right call to make real progress without guessing at business rules.
  SCOPE ACTUALLY BUILT: `web-oto-tier`, `web-mrr-tier`, `vid-pkg`, `wm-vid-pkg` — all 4
  tier groups, using the exact same `exclusivity_group` mechanism proven all session.
  PLUS one genuinely new mechanism: `hosting_prompt_type` (nullable column) — the 4
  one-time site tiers don't just belong to a tier, checking them ALSO pops the existing
  hosting-setup modal (a third kind of special per-row behavior, after exclusivity_group
  and spend_minimum). Generator extended to conditionally append the
  `promptHosting(...)` call when this field is present — same "data, not hardcoded ids"
  principle as everything else today. Write-side editor field for this was built
  PROACTIVELY this time (a fixed 4-option dropdown, not a pick-list, since these values
  are hardcoded to matching hosting/proration logic elsewhere and nothing new could ever
  be created here) — a change from the pattern earlier today where these editor gaps were
  consistently found reactively (Exclusivity Group, Spend Minimum, Subsection all had to
  be caught by Claire after the fact). `admin_save_service` RPC updated a FIFTH time
  today (`admin_save_service_FINAL_v3.sql` — supersedes every earlier version).
  All 36 rows (19 web-ot + 17 web-mo) verified programmatically against the real static
  HTML with zero mismatches on ids, prices, exclusivity groups, and hosting-prompt types
  — same rigor as every batch today. koc_requirement/intake_form_id/workflow values
  pulled from the ORIGINAL pre-conversion `PRODUCT_CONFIG` object in the baseline file
  (`io_v2_34`), not guessed — notably preserving a real asymmetry: the plain Visitor ID
  bundles have `intake:'visitorid'` but their "+Monthly Email" siblings do NOT, exactly
  as the original catalog had it, not "corrected" without being asked to.
  VERIFIED end-to-end via simulation: generated onchange strings exactly correct for
  every row shape (tiered+hosting-prompt, tiered-only, plain); the onchange string
  ACTUALLY EXECUTED as the browser would produces both the tier exclusivity behavior
  AND the `promptHosting()` call; the pre-existing cross-section lockout correctly
  triggers from newly-generated (not hand-typed) checkboxes with zero changes to that
  code; the write-side editor correctly populates and saves the new field.
  ONE KNOWN, FLAGGED COSMETIC LOSS: `w-custom`'s original Notes placeholder ("50% Down /
  50% Launch") is lost — the generator only supports a generic "Notes..." placeholder
  per row. Flagged to Claire directly; not fixed since she hasn't confirmed it's needed.
  **All 17 sections are now converted. The entire row-generator project that began this
  session is complete**, aside from the explicitly parked Website business-logic
  decisions above (AM review) and the parked cosmetic alignment item.
- **First AM-review item resolved: standalone hosting fee double-charge — BUILT +
  VERIFIED, first of the parked items to come back off the list (2026-07-07, same
  session).** Claire had the exact fix in mind — narrower and simpler than the general
  multi-group architecture problem discussed earlier, since the 4 site tiers are already
  single-select, so this only needed a small, targeted pairing, not a data-model change:
  Business Starter/Builder/Pro → locks standalone "Hosting Fee\*"; Custom Site/E-Commerce
  → locks standalone "E-Commerce Hosting Fee\*\*\*". ADA hosting deliberately excluded
  (Claire's call — it's never offered by any of the 4 tiers' modals, so no overlap risk).
  Built the same way the existing One-time↔Monthly lockout already works: a small,
  specific function (`updateStandaloneHostingLocks()`), not a new generalized schema
  field — this is a one-off relationship between exactly 4 items, not a pattern expected
  to recur. Critically, the lock triggers on the ACTUAL hosting CHOICE ("we host" in the
  modal), not merely on the tier being checked — confirmed this distinction mattered
  before building, since choosing "self-host" leaves no double-charge risk at all. Traced
  and hooked all 5 places `hostingChoices` gets mutated: both branches of
  `saveHostingChoice()` (via the single `closeHostingModal()` choke point both funnel
  through), `toggle()`'s generic uncheck path (which also transitively covers
  `cancelHostingModal()`, since it calls `toggle()` internally), the whole-section bulk
  clear in `setWebSectionDisabled()`, and draft restore. Auto-unchecks a standalone fee
  if it was ALREADY selected when the lock newly applies — closes a double-charge already
  in progress, not just future selections. VERIFIED via simulation: locks correctly on
  "we host", stays unlocked on "self-host", releases cleanly when the tier is unchecked,
  and ADA hosting confirmed untouched throughout every scenario.
- **Code cleanliness audit — real bug found: `RADIO_GROUPS`/`SPEND_MINIMUMS` are stale,
  hardcoded snapshots — FIXED 2026-07-08, confirmed starting point for that session
  (2026-07-07).** Claire asked for a cleanliness pass after the Website conversion.
  Found: `RADIO_GROUPS` (drives which items `toggleSingle()` unchecks when a tier is
  selected) and `SPEND_MINIMUMS` (drives the minimum-spend warnings/validation) are both
  still hardcoded `const` objects frozen from before today's catalog-driven conversion —
  NOT derived from the live catalog, unlike `SERVICE_DATA`/`PRODUCT_CONFIG`, which already
  rebuild themselves from `CATALOG_ROWS` at load time. This is a real, live bug risk, not
  just untidy code: if a NEW item is ever added to an EXISTING exclusivity group (e.g. a
  4th SEO tier) via the admin editor built today, it would render correctly with the right
  `exclusivity_group` — but `toggleSingle()` wouldn't recognize it as part of the group,
  since the group's membership list is frozen at today's snapshot. Same risk for
  `SPEND_MINIMUMS` — a new spend-based service wouldn't get its minimum-spend warning.
  This directly undercuts the stated goal of the whole catalog-driven system: "add a new
  item without touching code" isn't actually true yet for these two behaviors.
  PROPOSED FIX (not yet built): convert both from hardcoded `const` to dynamically
  derived `let`, computed from `CATALOG_ROWS` at catalog-load time — same pattern already
  proven for `SERVICE_DATA`/`PRODUCT_CONFIG`.
  ALSO FOUND, LOWER PRIORITY: `PRICEABLE_SERVICES` (the Groups custom-pricing screen) has
  its own hardcoded "default price" placeholder hints per service, which could drift from
  the catalog's real prices over time (cosmetic risk, not functional). One duplicate CSS
  rule, `.svc-table td.right` (lines 77 and 95) — not a conflict, just could be merged;
  likely predates today's session.
  Claire's call: fix the high-priority item, note the other two for later. **Confirmed as
  the explicit starting point for the next session** ("I want to start with a clean code
  next session").
  **RESOLVED 2026-07-08.** Both converted from `const` to `let`, populated by
  `loadCatalog()` in the exact same place SERVICE_DATA/PRODUCT_CONFIG already get rebuilt
  — `RADIO_GROUPS` derived by grouping every service with a non-null `exclusivity_group`;
  `SPEND_MINIMUMS` derived from each service's own `spend_minimum` column. VERIFIED with
  the actual bug scenario, not just a structural check: simulated a brand-new 4th SEO tier
  item that would have been completely invisible to the old hardcoded object, and
  confirmed end-to-end — selecting it correctly unchecked its sibling tier, proving the
  exclusivity behavior now genuinely extends to items added after the code was written,
  not just in theory. Same confirmed for a brand-new spend-based item picking up its
  minimum correctly. `PRICEABLE_SERVICES` and the duplicate CSS rule were left open at
  the time, lower-priority items — see below, now resolved (2026-07-08, same session).
- **The two remaining lower-priority cleanliness items — both resolved
  (2026-07-08).** Claire's call: clear everything not needing an AM review before the AM
  starts testing the form. (1) `PRICEABLE_SERVICES` (the Groups custom-pricing screen):
  its admin-facing grouping ("Visitor IDs" bundles items that live in DIFFERENT catalog
  sections, web-ot AND web-mo) is a deliberate organizational choice that doesn't map
  cleanly to the catalog's own section field, so that structure stays hand-maintained —
  but each item's hardcoded `default` price, used as the input's placeholder hint, had no
  reason to stay static and would silently drift the moment anyone changed a real price
  through the write-side Services editor. FIXED: `renderPricingFields()` now looks up the
  LIVE price from `CATALOG_ROWS` at render time instead; the hardcoded value is kept only
  as a fallback for the rare case a service is removed from the catalog but not yet from
  this list. VERIFIED: a service with a catalog price that had changed since the
  hardcoded default was written correctly showed the NEW live price, not the stale one;
  a service deliberately missing from the catalog correctly fell back to the hardcoded
  safety net. (2) The duplicate `.svc-table td.right` CSS rule (lines 79 and 97) — merged
  into one declaration carrying both sets of properties; re-ran the full duplicate-
  selector scan across the entire stylesheet afterward and confirmed zero remain anywhere
  in the file, not just this one instance.
- **NEW GAP FOUND, same shape as above but NOT yet fixed: `PRICEABLE_SERVICES` doesn't
  auto-include new services in Custom Pricing at all (2026-07-10).** Claire asked
  directly: if a new service is added via the Suggested Map/Services admin screen, does
  it automatically become available to price-override per group in Custom Pricing? NO —
  checked the actual code (not assumed): `PRICEABLE_SERVICES` is its own separate
  hardcoded list (distinct from the price-drift fix above, which only fixed the
  PLACEHOLDER VALUES shown for services already on the list — it never made the LIST
  ITSELF dynamic). A brand-new service needs someone to manually add it to this array in
  the code before an AM/super-admin can set a custom price for it per group. Same
  underlying shape as the already-fixed `RADIO_GROUPS`/`SPEND_MINIMUMS` staleness bug, but
  NOT automatically covered by that fix since this is a completely separate list.
  GENUINE DESIGN QUESTION before this can be fixed the same way: `PRICEABLE_SERVICES`'
  whole reason for existing is a deliberately hand-curated admin-friendly grouping that
  doesn't match the catalog's own `section` field (e.g. "Visitor IDs" bundles items from
  BOTH `web-ot` and `web-mo`) — making it auto-populate from the catalog needs a decision
  on where a brand-new service lands by default (most likely its own catalog section) vs.
  preserving the ability to hand-place items into a cross-section bundle like Visitor IDs.
  Flagged to Claire directly; NOT fixed yet, awaiting her call on which of those two she
  wants before writing it. IMPORTANT: this does NOT affect what price a CLIENT sees — the
  base/standard price still renders correctly for any new service with zero admin action
  (confirmed separately, see the "service catalog vs. price overrides" answer given
  2026-07-10) — this gap is scoped ONLY to whether a group-specific override can be set
  for that new service without a code change.
  **FIXED 2026-07-10, ahead of Claire's Monday leadership meeting.** Scope decision made
  with Claire first (via direct question, not assumed): fix covers the same 10
  flat-fee/per-unit sections `PRICEABLE_SERVICES` already covered (Website, TLP, SEO,
  Social Media Management, Email, Reputation/Listings/GBP, À La Carte). Extending this to
  the ad-spend/CPM-rate sections (Targeted Display, SEM, Social Ads, Location Targeting,
  Video, Streaming TV, Audio) was explicitly asked about and deliberately DEFERRED — those
  services don't have a flat price to override, they have a RATE multiplied by AE-typed
  spend, and the actual override-application mechanism (`applyCustomPricing()`) has no
  concept of overriding a rate today. Extending there means new logic in the same
  functions that calculate every dollar total on the live form
  (`buildReview()`/`submitIO()`/`printIO()`) — correctly treated as a separate, carefully
  designed follow-up rather than rushed in under a deadline. Logged as a new, explicit
  open item below ("Custom Pricing for ad-spend/CPM services — deferred").
  ROOT DESIGN: new nullable `pricing_group` column on `services`. When set, it's the
  literal display-heading text Custom Pricing groups the service under (same
  "store-the-literal-label" precedent as `subsection_label`, not a slug needing a lookup
  table). When null (the default for a normal new service), the group falls back to that
  service's own catalog section label (`MAP_SECTION_LABELS`) — meaning **any new
  flat/per-unit service now auto-appears in Custom Pricing with zero admin action**, which
  was the entire point. The two genuinely cross-cutting cases — "Visitor IDs" (spans
  `web-ot` + `web-mo`) and "Hosting Fees" (a hand-picked subset of `web-ot`) — get
  `pricing_group` set explicitly via a one-time SQL migration
  (`add_pricing_group_column.sql`, given to Claire to run — no direct Supabase access from
  here), preserving today's exact grouping. Any FUTURE special bundle is now a data edit
  through the write-side Services editor, not a code change — same principle as
  `exclusivity_group`.
  BUILT: `PRICEABLE_SERVICES` changed from a hardcoded `const` (12 hand-typed sections,
  ~80 lines) to a `let`, rebuilt inside `loadCatalog()` alongside `RADIO_GROUPS`/
  `SPEND_MINIMUMS` — filtered to `pricing_mode` flat/per_unit with a non-null
  `default_price` (reproduces today's exact 10-section inclusion set; naturally excludes
  ad-spend, modifier add-ons, and QUR items with no code needed to encode those
  exclusions separately). `item.field` (only controls the "/mo" suffix shown next to the
  override box — confirmed NOT used to decide which field `applyCustomPricing()` actually
  overwrites, that's independent) is now derived from `billing_type`. Also removed the
  now-fully-obsolete `.default` fallback value and its explanatory comment (every entry is
  now always a live catalog row by construction — no more "removed from catalog but not
  from this list" case to guard against).
  **REAL BUG CAUGHT DURING TESTING, before this ever reached Claire:** my first version
  derived the "/mo" suffix as `billing_type === 'one_time' ? 'fee' : 'recurring'` — this
  is the SAME rule `rowToServiceData()` already uses for the real fee/recurring total
  calculation, so I assumed it was also right for the display suffix. It isn't: a
  YEARLY-billed item (the 3 Hosting Fees rows) is correctly stored in `.recurring` for
  totals purposes, but showing "/mo" next to an annual price would be actively misleading.
  Caught by simulating a yearly item and checking the output, not by inspection alone —
  fixed to `billing_type === 'monthly' ? 'recurring' : 'fee'`, which only affects the
  cosmetic suffix, matching every one of the original hardcoded entries exactly.
  Write-side editor: new "Pricing Group" field on the admin Service form, mirroring the
  `exclusivity_group` pick-list-plus-create-new pattern exactly (global across sections,
  same as Exclusivity Group, not section-scoped like Subsection) — a typo picking from a
  list can't silently create a duplicate near-identical heading. No auto-suggest (unlike
  Exclusivity Group's "{section}-tier" convention) since there's no equivalent naming
  convention for a display heading. Wired into `adminNewService()`/`adminEditService()`/
  `adminSaveService()`.
  **STILL NEEDED, blocking full completion:** the `admin_save_service` RPC itself needs a
  new version reading/writing `pricing_group` (case-when-present pattern, matching how
  `exclusivity_group` is handled server-side) — but its live SQL definition isn't checked
  into this repo (confirmed: none of the earlier `admin_save_service_*` versions ever
  were), so writing an exact, safe `CREATE OR REPLACE` needs Claire to pull the current
  definition from Supabase first. Until that RPC is updated, saving a service with a
  Pricing Group set will save everything else correctly but silently NOT persist the
  Pricing Group value server-side (the front-end sends it; the RPC just won't read it yet).
  VERIFIED via simulation (not live Supabase — flagged honestly): the corrected
  derivation logic against synthetic data covering a normal flat item, a per-unit item,
  Visitor-ID-tagged items from BOTH `web-ot` and `web-mo` (confirms cross-section
  bundling), a Hosting-Fees-tagged item (confirms subset carve-out), a plain `web-ot` item
  with no `pricing_group` (confirms it lands under its own section, not pulled into
  Hosting Fees), a QUR item / spend-mode item / modifier item (all confirmed still
  excluded), a yearly-billed item (confirms correct "no /mo suffix" fix), and — the actual
  bug scenario — a brand-new mock service with no `pricing_group` set, confirming it
  appears automatically with zero code change; separately simulated the write-side
  editor's dropdown dedup/current-value/orphaned-value handling and the save-validation
  logic (blocks on blank create-new, correctly saves null for "None"). `node --check`
  passes on the modified script block.
  ONE DATA ITEM TO VERIFY, flagged rather than guessed: `alc-media` ("Traditional Media
  Buying & Consultation") had `default:0` in the old hardcoded list — its real
  `default_price` in Supabase needs to actually be `0` (not `null`) for it to keep
  appearing here, since the new filter excludes null prices. Worth a quick check in the
  Suggested Map when Claire runs the migration.
  NEXT: Claire runs `add_pricing_group_column.sql`; shares the current `admin_save_service`
  definition so the RPC update can be written safely; then does one real save-with-a-
  Pricing-Group test in the admin UI.
  `admin_save_service` RPC UPDATE WRITTEN (2026-07-10), given to Claire as an exact
  `CREATE OR REPLACE` diffed against the live definition she pasted — confirmed via `diff`
  to change ONLY 3 lines (the INSERT column list/values and one new UPDATE case-when-
  present line for `pricing_group`), everything else byte-identical to the version
  actually running in Supabase. Not yet run by Claire as of this entry.
  **REAL MISTAKE FOUND AND FIXED, same session (2026-07-10): today's fix only landed in
  `index.html`, not the standalone `admin/index.html` Claire has actually been testing
  through.** Caught because Claire reported "I don't see Pricing Group" and "my test
  service from an earlier session isn't showing" — both symptoms of the SAME root cause.
  Root cause: when the admin portal was split into its own file, only the genuinely-
  shared logic (catalog loading, `CATALOG_ROWS`/`RADIO_GROUPS`/`SPEND_MINIMUMS`/
  `SERVICE_DATA`) was moved into `shared.js`. `PRICEABLE_SERVICES`, `MAP_SECTION_LABELS`,
  `renderPricingFields()`, and the entire Services-editor form (including
  `adminSaveService()` etc.) were left as `admin/index.html`'s OWN separate inline copy —
  a byte-for-byte snapshot taken BEFORE any of today's fix existed. All of today's edits
  were made to `index.html` (the file being actively read/grepped/edited this session)
  with no awareness that a second, independent copy of this exact code existed and would
  silently NOT receive the same fix. This is exactly the maintenance cost the staged
  admin-portal-split rollout knowingly accepted (duplicate code, not shared) — now
  visibly real, not just theoretical.
  FIXED: ported the identical set of changes into `admin/index.html` — the HTML field, the
  `populateServicePricingGroupDropdown()`/`onPricingGroupChange()` pair, the
  `adminNewService()`/`adminEditService()`/`adminSaveService()` wiring, and the
  `PRICEABLE_SERVICES` derivation. One structural difference from `index.html`'s version,
  by design: `index.html` builds `PRICEABLE_SERVICES` INSIDE its own inline `loadCatalog()`
  (its private copy of that function); `admin/index.html` uses `shared.js`'s `loadCatalog()`
  instead, which is genuinely shared and shouldn't be made to depend on
  `PRICEABLE_SERVICES`/`MAP_SECTION_LABELS` (admin-only globals a future page like
  `/strategist` wouldn't have). So `admin/index.html` got its own small
  `rebuildPriceableServices()` function, called once right after `await loadCatalog()`
  succeeds in this page's init sequence — keeps the derivation logic co-located with the
  globals it depends on, consistent with those globals already being deliberately NOT
  shared. VERIFIED: `node --check` passes on the modified inline script; zero dangling
  `getElementById`/`onclick`/`onchange` references (checked programmatically, same method
  used for the original extraction); re-ran the exact same simulation test suite used to
  verify `index.html`'s version (QUR/spend exclusion, Visitor IDs cross-section bundling,
  yearly-item suffix fix, brand-new mock service auto-appearing) against
  `admin/index.html`'s `rebuildPriceableServices()` — identical results.
  STANDING RISK, not resolved by this fix, flagged honestly: `index.html` and
  `admin/index.html` still carry two independent copies of this code. Any FUTURE change to
  Custom Pricing / the Services editor needs to be made in BOTH files again, and nothing
  technical stops that from being missed a second time. Worth accelerating the "remove
  admin code from `index.html`" cleanup (already planned, parked on Claire's timing with
  her developer) specifically to eliminate this duplication risk for good, rather than
  purely for the subdomain-vs-path reason it was originally framed around.
  **RESOLVED — see the "admin code fully removed from index.html" entry below (2026-07-10,
  same session).** This standing risk no longer exists; there's only one copy of this code
  now.
- **SECOND real bug found live, same session (2026-07-10): editing a service's
  pricing_group saved correctly to Supabase but didn't move it in the Custom Pricing list
  on screen without a full page reload.** Claire's exact words: removing the pricing_group
  from a Hosting Fee item "stuck" (confirmed in the database) but "didn't update to the
  pricing list within the group." ROOT CAUSE: `adminSaveService()` and
  `adminToggleServiceActive()` both end by calling `loadSuggestedMap()`, which refreshes
  `allServicesMap` (the Suggested Map table + editor dropdowns) — but NOT `CATALOG_ROWS`,
  which `loadCatalog()` only populates ONCE, at initial page load. Since
  `PRICEABLE_SERVICES` is derived from `CATALOG_ROWS`, it stayed frozen at whatever it was
  when the admin session started, regardless of how many services got edited afterward —
  a real, generically-applicable staleness gap (affects price/section/exclusion changes
  too, not just pricing_group), not something specific to today's new field.
  FIXED in BOTH `index.html` and `admin/index.html`: both functions now also call
  `await loadCatalog()` after a successful save/toggle (in `admin/index.html`, followed by
  `rebuildPriceableServices()`, since that derivation is its own separate step there — see
  the entry above for why). Confirmed safe to re-run mid-session: `loadCatalog()` only
  reassigns the underlying data objects (`CATALOG_ROWS`/`SERVICE_DATA`/etc.) — the actual
  HTML row generation (`renderCatalogSection()` and friends) happens as SEPARATE calls
  right after the initial `loadCatalog()` at page startup, not inside it, so re-running it
  later cannot duplicate or disturb already-rendered rows.
  VERIFIED via simulation: reproduced Claire's exact scenario (a service starts tagged
  `pricing_group:'Hosting Fees'`, appears there; its `pricing_group` is cleared and the
  refresh re-runs) — confirmed the group correctly disappears (was its only member) and
  the service correctly reappears under its own section's label instead, matching what
  should have happened live. `node --check` passes on both modified files.
- **Custom Pricing for ad-spend/CPM services — deferred, scoped as its own follow-up
  (2026-07-10).** Explicitly out of scope for the fix above (see that entry for why).
  Needs its own design pass on what "custom price" even means for a CPM/CPC rate (override
  the rate itself? a flat add-on instead?) and new logic in `buildReview()`/`submitIO()`/
  `printIO()`, the money-total calculators — deliberately not something to guess at or
  rush.
- **REAL BUG FOUND LIVE by Claire, FIXED (2026-07-10): "Next: Review & Submit" became
  permanently stuck — no error, no visible reaction, just silently unresponsive — the
  moment a specific leftover test service was selected.** Genuinely hard to track down:
  no console errors, no red field highlights, nothing visibly wrong to point at. Reported
  right after the sections-table rewrite landed, so initially investigated as a possible
  regression from that change — spent real effort ruling that out first (traced
  `goStep()`/`syncRowInputs()`/`buildReview()`/`updateKocCard()`/`updateIntakeStatusCard()`
  for any hardcoded-section-list-style gap, confirmed none; eventually reproduced the
  actual failure in a real, driven simulation of the live page — not by reading code
  alone — using `jsdom` with mocked Supabase responses, checking a service, filling
  fields, and calling `goStep(3)` exactly as a real click would).
  ROOT CAUSE, once Claire's own observation (removing her test service fixed it) pointed
  the way: `alc-testdelete` ("TEST — Delete Me") has `pricing_mode: 'flat'` but also a
  stray `spend_minimum: 1000` — an inconsistent combination left over from early testing
  (a spend minimum only means something for a `pricing_mode: 'spend'` service). Since
  `SPEND_MINIMUMS` is derived from ANY row with `spend_minimum` set, with no check on
  `pricing_mode`, `goStep()`'s "missing spend" block treated this flat item as requiring
  a spend value — but a flat item never gets a spend `<input>` rendered at all, so there
  was NO field to fill in and NO field to highlight, leaving the block permanent and
  invisible. Confirmed via jsdom simulation this reproduces EXACTLY as reported:
  `currentStep` never advances across repeated clicks, and zero elements ever get the
  `.spend-missing` highlight class (nothing visibly reacts).
  FIXED: `goStep()`'s missing-spend check now also requires
  `CATALOG_ROWS[id]?.pricing_mode === 'spend'` before treating a `spend_minimum` as
  blocking — a data inconsistency on one service can no longer trap navigation with
  nothing to fix. VERIFIED via the same jsdom-driven simulation: the exact trap scenario
  (only the flat test service selected) now advances to Step 3 on the first click;
  a REGRESSION check confirms a genuinely spend-based service with blank spend still
  correctly blocks and highlights (only the real field, not the flat test service); after
  filling the real spend, navigation succeeds even with the flat test service still
  selected. `node --check` passes.
  This service is very likely active again simply because Claire reactivated it earlier
  today to test the reactivate flow itself, then didn't toggle it back off — no longer
  harmful now that the validation gap is fixed, but worth deactivating again to keep it
  out of AEs' way (`UPDATE services SET active = false WHERE id = 'alc-testdelete';`).
- **REAL BUG FOUND LIVE by Claire, FIXED (2026-07-10): every ad-spend/CPM service showed
  "Quote Upon Request" instead of its real rate/amount — a pre-existing regression from
  the 2026-07-07 QUR-flagging feature, not introduced by anything built today.** Caught
  testing Location Targeting — Geofencing (a real, $15-CPM-priced service) on the Review
  page. ROOT CAUSE: `rowToServiceData()`'s `is_qur` flag was set unconditionally from
  `r.default_price == null` — but `default_price` is ONLY the real price field for
  flat/per_unit services; spend items (`td-geo`, `sma-fb`, `lt-geo`, every CPM-rate
  service) store their real rate in `retail_cpm`, and modifier items (`td-offline`,
  `yttv-addl`) store theirs in `modifier_amount` — both ALWAYS have a null
  `default_price` BY DESIGN, meaning literally every spend/modifier service in the
  catalog was being incorrectly flagged as QUR since the day that feature shipped.
  IMPACT, more serious than a cosmetic label: on `buildReview()` (Step 3), this only
  clobbered the separate "Fee" column (which should show "—" for a spend item anyway,
  since they have no one-time fee) — the actual dollar totals were unaffected, since
  `is_qur` never touched the totals math, only display text. But on `printIO()`, the Fee
  and Recurring/spend amount share ONE combined column — so the printed IO was replacing
  the real computed dollar amount with the text "Quote Upon Request" on the actual
  contract document, for every spend-based service, this whole time.
  FIXED: `is_qur` now also checks `pricing_mode` — only true when the service is
  `flat`/`per_unit` (the two modes where `default_price` is genuinely the expected price
  field) AND `default_price` is null. Restores the original 3 genuine QUR items
  (`w-custom`, `em-bp-30kp`, `tlp-custom`) exactly as before; spend/modifier items no
  longer trigger it at all.
  VERIFIED via simulation, 11 cases: the 3 genuine QUR items still correctly flagged;
  every spend-mode example (`lt-geo`, `td-geo`, `sma-fb`) and the modifier example
  (`td-offline`) confirmed NO LONGER flagged, with `lt-geo` confirmed to still carry its
  real `$15` CPM rate afterward; normal already-priced flat/per_unit items confirmed
  unaffected either way; a hypothetical FUTURE unpriced per_unit item confirmed still
  correctly flagged QUR (the fix narrows exactly to the right scope, not further).
  Traced the full downstream display path in both `buildReview()` and `printIO()` to
  confirm the fix actually restores the correct fallback text (`printIO()` now correctly
  falls through to its `data.spend > 0` branch, showing `"$X/mo campaign"`, matching every
  other spend item's existing, always-correct behavior). `node --check` passes.
  Given the severity (a real display bug affecting every spend/CPM service on the actual
  printed contract, present since 2026-07-07), this is exactly the kind of catch live
  testing exists for — good thing it surfaced now, before any real client submission.
- **Groups list "X overrides" badge counted stale overrides for deactivated services —
  FIXED, found live by Claire (2026-07-10).** Caught by her own thorough test-service
  cycle (reactivate → change price → deactivate again): after deactivating the test
  service, the Groups list still showed "1 override" for the group she'd set a custom
  price on — but that service no longer even appears on the Custom Pricing screen (a
  deactivated service is excluded from `PRICEABLE_SERVICES`), so there was no way to see
  or clear the phantom count through the UI. ROOT CAUSE: the badge (`admin/index.html`,
  `renderAdminGroups()`) counted every raw key in the group's stored `io_pricing` JSON,
  with no check for whether the underlying service is still active — deactivating a
  service never clears its override key out of that JSON. FIXED: count now filters to
  keys present in `CATALOG_ROWS` (populated from active-only services), so a stale
  override on a deactivated service no longer inflates the count. Deliberately does NOT
  touch the stored override value itself — if that same service is ever reactivated, its
  old price is still there and becomes visible/editable again on Custom Pricing, same as
  before; this only fixes what the count on the Groups list actually reflects.
  VERIFIED via simulation, 5 cases: the exact reported scenario (a stale override on a
  deactivated service) now correctly counts 0; a normal override on a still-active
  service still counts correctly; a mixed stale+real case counts only the real one; no
  overrides shows 0; string-encoded `io_pricing` (as it can come back from Supabase)
  still parses and counts correctly. `node --check` passes. Only needed fixing in
  `admin/index.html` — `index.html`'s copy of this code no longer exists after today's
  cleanup, so there's no second copy to keep in sync this time.
- **Full catalog reconciliation against the updated PDF (Version 7.9.26) — DONE
  (2026-07-10), ahead of Claire's leadership presentation.** Claire provided the current
  IO PDF plus a full `services` table export; checked every section line-by-line rather
  than spot-check. Confirmed MATCHING with no changes needed: Audio (Programmatic Audio/
  Native Display/Social Display Ads/Mobile Audience Targeting), CTV's Streaming TV/Social
  OTT/Hulu/Amazon, Email Marketing, GBP/Local Listing/Reputation, SEM, SEO, Social Media
  Management, Social Media Ads, Targeted Display, Targeted Landing Pages, all of Video.
  Real discrepancies found and fixed, each confirmed with Claire before writing SQL (not
  guessed):
  - `lt-event` (Location Targeting — Event/Lookback) had `spend_minimum` at the general
    $1,000 rate; PDF calls out a separate $1,500 minimum for this one item specifically.
    Fixed.
  - `w-hosting` was missed by the earlier `pricing_group` migration (2026-07-10, same
    day) — its siblings `w-ecomm-hosting`/`w-ada-hosting` were correctly tagged
    'Hosting Fees', this one wasn't. Fixed.
  - `w-hosting` and `w-ada-hosting` labels had internal working-notes baked directly into
    the CLIENT-FACING label field (e.g. "...(standalone — use hosting prompt on site
    purchase)", "...(due upfront, renews annually from IO date)") — labels show on the
    live form, Suggested Map, and printed IO, so these were visible to real clients, not
    just admins. Reverted to plain PDF wording.
  - `alc-testdelete` ("TEST — Delete Me") was sitting ACTIVE in the live catalog — a
    leftover test row that would have shown as a real, selectable checkbox on the public
    form. Deactivated.
  - **Website Monthly Hosting restructured** — the 4-tier Content/Chatbot/ADA bundling
    ladder (`wm-hosting` $49 / `wm-host-content` $69 / `wm-host-ai` $89 / `wm-host-all`
    $109) is replaced by 2 flat tiers per the updated PDF: `wm-hosting` ("Hosting Only")
    repriced 49→69; new service `wm-ecomm-hosting` ("E-commerceHosting") added at $99/mo;
    `wm-host-content`/`wm-host-ai`/`wm-host-all` deactivated (not deleted — any past order
    referencing them stays intact). Confirmed explicitly with Claire before deactivating,
    since this removes real, currently-sellable options, not just a price change.
    `wm-ai`(AI ChatBot)/`wm-email`(Addl. Email) deliberately left untouched — prices
    already matched, and their exact relationship to site tiers is part of the ALREADY-
    PARKED Website business-logic questions awaiting AM review, not something to resolve
    here.
  - **New service: Netflix Ads** (`netflix-bp`) added — same shape as Hulu/Amazon Prime,
    a subsection inside the existing `ctv` section (`subsection_label:'Netflix Ads'`),
    matching how Hulu/Amazon/Social OTT are each their own header block on the PDF while
    sharing one section/card on the live form. $90 CPM, $3,000/mo minimum, `pricing_mode:
    'spend'`. Confirmed this interpretation with Claire rather than assume a brand-new
    top-level section (which would have needed code changes, not just a data insert).
  Explicitly confirmed as staying SPLIT, not merged, per Claire (already discussed with
  the AM separately): the PDF prints "Radio to Video **or** YouTube Pre-Roll" and "Banner
  **or** Social Media Ad Set" as single combined lines, but the catalog's 4 separate
  active services (`alc-radio`/`alc-preroll`/`alc-banner`/`alc-social-ad-set`) are the
  correct, intended structure — the PDF's wording is what's behind, not the database.
  VERIFIED: Claire ran the full script and pasted back the result of the verify query —
  all 10 changed/added rows confirmed matching the intended values (prices, active flags,
  pricing_group tags all correct).
- **Dev picker reachable on the LIVE production domain by accident — FIXED, real safety
  gap closed (2026-07-08).** Came up while mapping the admin-portal/URL split (see below):
  Claire asked what happens if someone's group link loses its slug — could they land on
  the dev picker on the real site? Checked the actual code rather than assume: `loadGroup()`'s
  check was `if (!slug || !isProd)` — an either/or. Even correctly on the real production
  domain (`isProd` true), a MISSING slug alone was enough to trigger the dev picker,
  exposing internal test group names and (per the dev picker's own code) the admin gear
  to anyone landing on the bare live domain or a truncated/mistyped link — not
  hypothetical, this is also very likely how Claire has been reaching dev mode for testing
  so far, based on her earlier screenshots. FIXED: split into two separate checks. Not on
  production → dev picker unchanged (Claire and her developer's own local testing
  untouched). On production with NO slug → the SAME clean "Invalid Link" screen already
  shown for a wrong slug, extended to cover a missing one too. Added a DELIBERATE
  `?dev=1` override so dev mode stays reachable on the live domain on purpose — a
  conscious action, not an accident — since the fix would otherwise have taken away
  Claire's actual current testing method. Honest caveat stated directly to Claire: this
  is not a hard security lock (anyone who knew or was told the parameter could still see
  it), but it closes the ACCIDENTAL path, which was the actual risk being solved, and the
  dev picker exposes no real client data regardless. VERIFIED via simulation, all four
  paths: local testing unchanged; `?dev=1` on production correctly shows the picker;
  production with no slug and no override correctly shows the clean error (the actual bug,
  confirmed fixed); production with a valid slug falls through untouched to the normal
  Supabase lookup exactly as before.
- **FOLLOW-UP — the "Invalid Link" message wasn't actually the only thing on the page —
  FIXED (2026-07-08, same session).** Claire caught it immediately after the fix above:
  the error message showed, but the rest of the page — the default CF Digital-branded
  header, the step nav, every other card — was still fully visible underneath, since
  `showGroupError()` only ever toggled one small div inside the "Group & Account Info"
  card rather than replacing the page. Someone hitting an invalid link saw a confusing,
  seemingly-normal form (branded as a group that wasn't even theirs) with a small error
  buried partway down. FIXED: rewrote it to fully replace the page's content with just the
  message, reusing the SAME proven full-page-takeover pattern `showCatalogError()`
  (catalog-load-failure screen) already uses elsewhere — not a new pattern. VERIFIED via
  simulation: before the fix, the page had 4 separate elements (header, step nav, 2
  cards); after calling the fixed function, exactly 1 element remains — the header,
  including its branding, is completely gone, not just hidden behind something else.
- **QUR items now visibly flagged instead of silently showing $0/blank — BUILT + VERIFIED
  (2026-07-08, new session).** Claire's ask: cheap, high-visibility polish for AM/tester
  review, that doesn't require deciding the still-open "how should QUR ultimately work"
  question. Affects `w-custom`, `em-bp-30kp`, `tlp-custom` — all have `default_price:null`
  in the catalog, which `rowToServiceData()` necessarily converts to a plain `fee`/
  `recurring` of `0` (needed since those fields get summed into running totals elsewhere;
  can't sum a string). That conversion was losing the distinction between "genuinely
  free" and "not priced yet" — Review showed a bare "—" and Print showed the vaguer "TBD",
  neither explaining anything. FIXED: added a separate `is_qur` boolean that survives
  alongside the necessarily-numeric fee/recurring, checked FIRST in both Review's fee
  column and Print's amount column to show a clear "Quote Upon Request" note — doesn't
  touch the totals math at all, a QUR item still correctly contributes $0 until it's
  actually priced. Print checked ahead of its existing 'TBD' fallback, keeping the printed
  contract consistent with the internal review exactly (Claire's established principle for
  this function). VERIFIED via simulation: `is_qur` correctly true for a QUR row, false for
  a normally-priced one; both display strings produce the intended text.
  (Ties to two entries under "Backend / code-review findings" below — QUR items no longer
  submit silently/invisibly, though the underlying "block vs. force vs. flag" decision
  those entries describe is still open; this is the "visibly flag" option, not a full
  resolution of that item.)
- **Header logo visibility fixed — neutral background chip replaces the old luminance-
  based invert-to-white logic — BUILT + VERIFIED (2026-07-08).** Claire's ask: check how
  logos render across groups. Found: `applyGroupBranding()` decided whether to invert a
  logo to solid white based ONLY on the header's overall brightness — no awareness of
  what colors were actually inside the logo. Computed real luminance values for every
  group rather than guess: Brazos Digital (`#D83030`) and 44i (`#489BD4`) both crossed the
  0.4 threshold into "forced white," flattening any multi-color logo into a plain
  silhouette. But the threshold wasn't even the real problem — Claire caught two DIFFERENT
  failure modes checking the actual logos that no brightness threshold could ever fix:
  CF Digital's logo is a single color that happens to MATCH its header, so it vanishes
  regardless of the header being "light enough" to skip inversion entirely; STMM's
  multi-color logo loses specifically the one color that happens to match its header,
  while the rest stays visible. A binary invert-or-don't filter can't selectively correct
  just a clashing color — the failure is about color MATCHING, not brightness.
  FIXED: logo now sits inside a small, neutral near-white background chip instead of
  directly on the brand-colored header — sidesteps the whole problem, since the logo
  never competes with the header color at all, regardless of either color. Works
  correctly for any future group's logo automatically, not just today's two examples.
  Chip's visibility is now tied to `logo_url` presence (hides ENTIRELY if a group has no
  logo, rather than the old behavior of just hiding the image and leaving nothing to
  ever show a blank box in the first place). `hexLuminance()` removed as genuinely dead
  code — its one caller was the logic just replaced, and the chip approach needs no
  brightness calculation at all. VERIFIED via simulation: chip shows with zero filter
  applied for Brazos's previously-problematic dark red; chip correctly hides entirely for
  a group with no logo at all.
- **FOLLOW-UP — logo sizing made uniform, but one honest caveat flagged, not silently
  fixed (2026-07-08, same session).** Once the chip made every logo visible, Claire
  immediately caught a real follow-on issue: STMM and Brazos rendered noticeably smaller
  than CF Digital and 44i. Checked file formats before touching anything, since "small"
  and "blurry" could have genuinely different causes needing different fixes: CF Digital,
  STMM, and 44i are all SVG (vector — should stay crisp at any size); Brazos is a PNG
  (raster). Diagnosis: STMM's smallness is a PROPORTION issue — likely extra whitespace
  baked into that SVG's own file, made worse by the old height-only constraint (a logo
  with more internal padding shrinks relative to a tightly-cropped one at the same
  height). Brazos's blur is very likely a genuine LOW-RESOLUTION SOURCE FILE issue — no
  CSS change can add pixel detail that isn't in the original PNG.
  FIXED (the proportion side): `.header-logo` now uses a uniform bounding box — both a
  height (44px, up from 32px) AND a max-width (170px) with `object-fit:contain` — instead
  of height alone, so every logo scales consistently to fill the same space regardless of
  its own internal proportions. Also removed a leftover inline `height:32px` on the
  initial CF Digital `<img>` tag that would have silently overridden the CSS class for
  that one group only, making the fix inconsistent across groups without it.
  HONEST CAVEAT, not silently glossed over: this fixes STMM's proportional smallness, but
  Brazos's PNG may still look soft even after this change, since sharpness lost to a
  low-resolution source file isn't something CSS sizing can restore — that would need an
  actual higher-resolution or vector replacement logo file from Brazos.
- **Review page totals bar didn't change color with the group — FIXED, one-line CSS gap
  (2026-07-08).** Claire caught: `.totals-bar` (One-Time Total / Monthly Recurring /
  Services Selected) stayed the default blue regardless of group, while the header and
  buttons correctly followed brand color. Root cause: `applyGroupBranding()` already sets
  a global `--accent` CSS variable that 36+ other rules already reference — `.totals-bar`
  was simply hardcoded to the literal hex value instead of using that variable, a plain
  oversight from whenever it was built, not a design choice. FIXED: changed to
  `background:var(--accent)`. NOTED, not fixed (kept scope tight per Claire's efficiency
  ask): the totals bar's box-shadow is still a hardcoded blue tint, and the HEADER itself
  has this exact same pre-existing shadow gap too — flagged as a minor, optional item
  rather than silently expanding scope.
- **FOLLOW-UP — systematic audit for other hardcoded-should-be-dynamic branding, per
  Claire's ask — 2 real bugs fixed, 1 correctly identified as NOT a bug
  (2026-07-08, same session).** Searched every occurrence of the default brand hex
  (`#1C9BD7`) and its RGB equivalent throughout the file, rather than guess where else
  the totals-bar's exact mistake might be hiding. Found:
  (1) **`.header`'s own box-shadow** — genuinely the SAME gap as the totals bar: the
  header's BACKGROUND already correctly follows the group's color (`header.style.background`
  set directly in `applyGroupBranding()`), but its box-shadow was still hardcoded to the
  default blue tint, never updated alongside it. FIXED alongside the totals-bar's own
  shadow (same hardcoded value, same bug) — added a new `--accent-rgb` CSS variable (a raw
  "r,g,b" triplet, not a fixed-alpha rgba string like `--light` already is) since the two
  shadows use DIFFERENT alphas (header=0.3, totals-bar=0.25) and can't share one preset
  value. Both now read `rgba(var(--accent-rgb), <their own alpha>)`.
  (2) **Correctly identified as NOT a bug**: a hardcoded blue in the admin's internal
  Suggested Map table, coloring "One-Time" vs "Monthly" billing-type badges. This isn't
  representing ANY group's brand color at all — it's a semantic category color (green vs
  blue = billing type), and making it follow `--accent-dark` would actually be WRONG,
  since those badges would then randomly shift color depending on whichever group the
  admin happens to be viewing, unrelated to what they're meant to convey. Left alone
  deliberately, not missed.
  VERIFIED via simulation: `hexToRgbTriplet()` produces the correct raw triplet; the new
  `--accent-rgb` variable gets set correctly by `applyGroupBranding()` for a real
  non-default color (Brazos's red, `216,48,48`).
- **Print preview overlapping content at top/bottom — FIXED, reasoning-based, NEEDS LIVE
  CONFIRMATION (2026-07-08).** Claire: browser view looked fine, but the actual print
  preview added extra information at top/bottom that covered other content. Traced the
  mechanics: `@page{margin:0.5in}` reserves 0.5in on every side for the printable area,
  and the document's normal content (letterhead, etc.) starts flowing exactly at that
  boundary. The running header/footer (group name, client, page X of Y) use
  `position:fixed` — a well-documented, notoriously inconsistent area of print CSS across
  browsers — and the original 0.5in margin was never explicitly sized to ALSO fit their
  own rendered height (font+padding+border) on top of where content already starts,
  so depending on the browser, they could spill into the letterhead/signature content
  instead of sitting cleanly in the reserved margin space. FIXED: increased top/bottom
  page margin specifically to 0.9in (left/right unchanged at 0.5in, since only vertical
  space was ever the problem) — enough dedicated slack that even with cross-browser
  quirks in how `position:fixed` gets interpreted in print, there's guaranteed clearance.
  Also matched the on-screen preview's padding to the same values, so what's seen on
  screen doesn't drift from what actually prints. HONEST CAVEAT: this is a well-reasoned
  fix based on understanding a known print-CSS fragility, not something verifiable
  without actually rendering a print preview — genuinely needs Claire's live confirmation
  in an actual print dialog before considering this closed.
- **FOLLOW-UP — first fix didn't work, root cause corrected via Claire's screenshot
  (2026-07-08, same session).** Claire sent an actual print-preview screenshot showing
  the overlap was still there after the first fix — confirmed the diagnosis had been
  wrong, not just incomplete. REVISED understanding: Chrome's print engine appears to
  position `position:fixed` running elements relative to the CONTENT BOX itself (wherever
  `@page` margin already ends), not the true physical page edge — meaning the running
  header/footer and the normal document content were both anchored to the exact same
  starting point all along. Increasing `@page` margin (the first attempt) only pushed
  BOTH of them down together by the same amount, never actually separating them — exactly
  consistent with the screenshot still showing the same overlap, just shifted.
  REAL fix: dialed `@page` margin back to something reasonable (0.6in, a modest bump from
  the original 0.5in) and added DEDICATED `body` padding-top/padding-bottom (0.35in),
  applied only in print — that padding sits INSIDE the same content box the running
  elements render into, carving out actual reserved room for them so the document content
  starts further down/ends further up, clearing them instead of competing for the same
  space. Screen preview padding updated to match the new combined total (0.6in + 0.35in =
  0.95in), keeping on-screen and print consistent.
  CAUGHT BEFORE SHIPPING: the explanatory comment for this fix used backtick-wrapped code
  formatting (`` `position:fixed` ``) — but that comment lives inside a CSS block that is
  itself inside `printIO()`'s own JS template-literal string, where a stray backtick
  prematurely terminates the entire string and breaks the function. Caught by the routine
  `node --check` syntax verification (a real syntax error, not a maybe) before this ever
  reached Claire — fixed by removing the backticks from the comment text.
  HONEST CAVEAT UNCHANGED: still reasoning-based, not verified by rendering — needs
  Claire's live confirmation in an actual print dialog again before considering this
  closed, especially since the FIRST attempt already turned out not to work.
  **CONFIRMED WORKING by Claire in an actual print dialog — CLOSED (2026-07-08).**
- **Write-side editor: Exclusivity Group + Spend Minimum fields — BUILT + VERIFIED
  (2026-07-07).** Claire asked, correctly, how the admin screen would let someone set up
  a NEW tier — it couldn't; neither field existed in the form at all (same class of gap
  as the setup-fee fields earlier). Exclusivity Group deliberately built as a PICK-LIST of
  groups already in use (not a free-typed field) plus a "+ Create a new group..." option
  that reveals a text input — a typo in a free-typed group name would silently create a
  broken duplicate tier that just doesn't exclude anything, a hard-to-notice failure mode
  worth actively preventing rather than leaving to a text field. Spend Minimum is a plain
  number, no special handling needed. Wired into adminNewService()/adminEditService()/
  adminSaveService(); blocks saving if "Create a new group" is selected but left blank.
  Updated `admin_save_service` RPC AGAIN (third version today — `admin_save_service_
  FINAL.sql` supersedes both earlier files; only one needs to be run, not all three) to
  read/write both new columns, same case-when-present pattern as the other nullable
  fields. VERIFIED via simulation: editing a tiered service correctly shows its existing
  group (confirmed properly DEDUPLICATED even though multiple services share it — an
  early test miscounted due to how option tags naturally repeat their value as both the
  HTML attribute and visible text, re-verified precisely to confirm no actual duplicate);
  editing a non-tiered service shows "None"; picking an existing group saves that exact
  value; creating a new group with a blank name is blocked BEFORE reaching Supabase;
  creating a genuinely new group and setting a spend minimum both save correctly.
- **Suggested Map: added Tier Group column + orphaned-group warning — BUILT + VERIFIED
  (2026-07-07).** Claire's question ("how do I add/edit a GROUP?") surfaced that there's
  no separate group entity at all — a group is purely an implicit shared string value on
  each service's exclusivity_group field, and there was no way to see which services
  share a group without opening each one's Edit form individually. Added a "Tier Group"
  column to the read-only Suggested Map table, positioned between Frequency and Intake
  Form. Also added a proactive flag: a group with exactly 1 active member does nothing
  (nothing to be mutually exclusive WITH) — almost always either a typo when picking an
  existing group, or a leftover from a sibling service being deactivated/removed from the
  tier — so those rows show a red warning icon with an explanatory tooltip. Membership
  counts are computed against the FULL catalog (allServicesMap), not the currently
  filtered `rows`, specifically so toggling the section/search/show-inactive filters
  can't make a real, healthy 2+ member group look falsely "orphaned" just because its
  sibling happens to be filtered out of the current view. VERIFIED via simulation: a
  real 2-member group (seo-tier) correctly shows NO warning even when the section filter
  is narrowed to hide one of its members from view; a genuinely single-member group
  correctly shows the warning when all sections are visible; non-tiered services
  correctly show a plain "—".
- **New-group field auto-suggests the naming convention — BUILT + VERIFIED
  (2026-07-07).** Follow-up to the two questions above: Claire's actual concern wasn't
  fixing a mistake after the fact, but preventing confusion up front — someone creating a
  genuinely NEW tier (for a future section) might not know the established
  `{section}-tier` convention (seo-tier, sm-tier, em-tier, etc.) exists at all and invent
  something inconsistent. Fixed the same way the Service ID field already handles this:
  selecting "+ Create a new group..." now pre-fills the text box with the suggested name
  based on whichever section is currently selected (e.g. "sm-tier" for a Social Media
  Management service) — the path of least resistance becomes following convention, not
  guessing, while still fully editable if there's good reason to deviate. Added a visible
  example of the pattern next to the field too, so even an override has something to
  check against. VERIFIED via simulation: selecting a new group with section=sm correctly
  pre-fills "sm-tier"; re-triggering the same handler after something is already typed
  does NOT clobber it (only ever pre-fills an empty box).
- **Setup fee auto-add (SEM's $200/<$1,000 threshold) — BUILT + RIGOROUSLY VERIFIED
  (2026-07-07).** Surfaced by Claire noticing the "$200 min setup fee" note (moved during
  the SEM prototype work above) was PURELY informational text with no actual calculation
  behind it — she recalled discussing a real auto-calculate feature before and had
  forgotten it wasn't built. Confirmed via Supabase: `auto_add_setup_fee` / `setup_fee` /
  `setup_fee_threshold` columns already existed on `services`, unused by any code, with
  `auto_add_setup_fee = true` already set on `sem-bp`. Claire's call: build it now rather
  than risk forgetting a third time, using `auto_add_setup_fee` as the deliberate on/off
  switch (not just "the two numbers happen to be present") — someone may want to record
  the numbers for reference without enforcing them.
  BUILT: a single shared helper `getSetupFeeInfo(id, spend)` (spend must be > 0 AND
  strictly UNDER the threshold) used identically by `buildReview()`, `submitIO()`, and
  `printIO()` so the three views can never disagree — mirrors the EXACT existing
  hosting-proration pattern (indented green "↳ Setup Fee..." sub-line, added to the
  one-time total) rather than inventing a new visual language. Also built
  `getFeeNoteText()`, which GENERATES the reminder sentence from the real
  setup_fee/setup_fee_threshold numbers instead of typed text (Claire's request) — the
  wording can never drift from the actual calculation. `submitIO()`'s saved order gets a
  new `setup_fee_amt` field per line item (same transparency pattern as `unit_fee`/`qty`
  from the per-unit quantity feature) for audit purposes. SQL updated: sem-bp's `fee_note`
  set to NULL rather than the old hardcoded text, since the generated note now always
  takes priority when auto_add_setup_fee is true — avoids stale, silently-ignored data
  sitting in the table.
  VERIFIED with the highest rigor of the day given the stakes (a NEW automatic charge on
  real money totals, across 3 code paths): boundary condition confirmed correct (spend
  exactly AT the threshold does NOT trigger — must be strictly under); zero spend does
  NOT trigger; a DIFFERENT spend-based service with no auto_add_setup_fee configured
  confirmed NEVER triggers (proving this doesn't silently apply to every ad-spend
  product); generated note text matches the original hardcoded text exactly; and a full
  END-TO-END run of the real `buildReview()` function against a $500 SEM campaign (under
  the $1,000 threshold) correctly produced a $200 One-Time Total (from the setup fee
  alone, since SEM has no other one-time charge — proving the calculation genuinely ran)
  plus the correct sub-line in the exact visual style of the existing hosting-proration
  pattern.
  VISUAL FOLLOW-UP (found live, fixed 2026-07-07): the generated note was crowding the
  label on the same line, forcing an awkward wrap. Changed from an inline `<span>` to a
  block-level `<div>` — same CSS class, zero style changes needed since divs are
  block-level by default — so the note now always sits on its own line beneath the
  label, matching how the "⚠ Finish Intake" badge already displays below a label.
  EDITOR GAP FOUND + CLOSED (2026-07-07): Claire noticed the write-side Services form had
  no fields at all for auto_add_setup_fee/setup_fee/setup_fee_threshold/fee_note —
  meaning configuring this feature (for SEM or any future service) required going
  straight into Supabase, exactly the two-places problem the write-side screen was built
  to eliminate. Added a new field group (Auto-Add Setup Fee / Setup Fee Amount / Setup
  Fee Threshold / general-purpose Fee Note) to the form, wired into
  adminNewService()/adminEditService()/adminSaveService(), plus a soft warning matching
  the existing modifier/spend pattern (Auto-Add set to Yes with blank numbers would
  silently never apply). Also had to UPDATE the `admin_save_service` RPC itself (full
  replace file: `admin_save_service_UPDATED.sql`, supersedes the version Claire already
  ran) — the form fields were meaningless without the database function also knowing to
  read them. auto_add_setup_fee uses the same coalesce pattern as other always-sent
  fields; setup_fee/setup_fee_threshold/fee_note use the case-when-present pattern
  (matching default_price/modifier_amount) since an admin might legitimately clear one
  back to NULL. VERIFIED via simulation: editing sem-bp correctly populates all 4 new
  fields with its real values; a fresh New Service form correctly resets them; editing a
  value and saving produces the exact expected payload.
- **Label drift — closing planned alongside next conversion pass (2026-07-07).** Confirmed:
  editing a service's LABEL in Supabase only actually updates the visible form for sections
  ALREADY converted to dynamic rows (today: `alc`). For still-static sections, a label edit
  in Supabase shows nothing different on the form (the HTML text is never refreshed) — this
  becomes directly relevant now that an admin edit screen is planned. Small, low-risk fix:
  extend the row-decoration step to also refresh the label text on every row (not just
  price/frequency), closing this gap application-wide regardless of which sections have
  been converted yet.
- **Admin write-side (add/edit/deactivate services) — SCOPED, not yet built (2026-07-07).**
  Triggered directly by Claire losing Supabase access mid-session and realizing catalog
  management still fully depends on raw Supabase table access — the read-side fix (dynamic
  rows) doesn't help if you can't get INTO Supabase to make the edit in the first place.
  Decisions locked in:
  - **Access: super-admin only**, for everything (add/edit/deactivate). Can be split more
    granularly later (e.g. letting any admin edit but not create) if needed — start
    restrictive.
  - **"Remove" = deactivate only, never true delete.** Protects order history — a past
    order referencing a deleted service's id would break; deactivating leaves history intact
    while removing it from the active form.
  - **Supplements Supabase, does not replace it.** Supabase remains the source of truth;
    this is a convenience UI so catalog changes don't require direct table access or
    SQL/hash literacy. Should follow the same server-side RPC pattern as `admin_save_group`
    (permission-guarded, not a raw table write from the browser).
  - **Considered and decided NOT to wait for the admin-portal-location decision
    (portal-separation item, still parked).** The portal move is a CONTAINER change (which
    file/URL); this screen is CONTENT (what the panel can do) — it moves wholesale with the
    rest of the admin panel whenever that happens, same as Groups/Orders already will, AS
    LONG AS it's built self-contained or portable now (not reaching into anything specific to
    today's single-file structure). Portal separation is unscheduled; the need for this
    screen is immediate and already felt. Build now, built portably.
  - **IMPORTANT LIMITATION to respect when building:** create/deactivate through this screen
    is only fully safe for sections ALREADY converted to dynamic rows (today: `alc`, soon
    `rep`/`llo`/`gbp`). For still-static sections, creating a new service via the screen
    would save correctly to Supabase but NOT appear on the public form (no checkbox exists
    yet); deactivating one would recreate the ghost-checkbox risk. The screen should
    either restrict create/deactivate to converted sections only, or clearly warn otherwise,
    until all sections are converted.
  NEXT: build `rep`/`llo`/`gbp` conversion + label-drift fix first (makes 4 sections fully
  safe for the write-side screen to manage), THEN build the write-side screen itself.
- **`yttv-addl` (+$10 YouTube TV Addl Targeting)** — stored as flat modifier; NOT
  explicitly AM-confirmed as flat-to-total. Verify.
- **`alc-media` (Traditional Media Buying, 15%)** — display-only in code, calculates
  $0 today. Decide how % pricing should actually work.
- **QUR items** (`w-custom`, `em-bp-30kp`, `tlp-custom`) — null prices. Decide form
  behavior for quote-upon-request items.
- **SEM CPC ($4–$12)** — CONFIRMED intentional (2026-06-30). Not captured as a fixed
  rate because billing is spend-based; matches the paper IO format. No action needed.
- **`hulu-bp` / `amz-bp` (no intake form)** — DEFERRED to AM catalog review (below), not
  answered standalone.
- **SEO KOC quirk** — DEFERRED to AM catalog review (below). Claire's understanding of the
  originally-communicated KOC list: **Website, Social Media Management, Email Marketing,
  SEO Builder & Pro** require a kick-off call. Worth comparing directly against this list
  when the AM reviews the Suggested Map's KOC column — Claude cannot verify current live
  `koc_requirement` values from here (no direct Supabase access), so this comparison has to
  happen in that session, not before it.
- **`yttv-addl` flat modifier** — DEFERRED to AM catalog review. Claire's belief: should be
  a flat add-on to the total, not a modifier to the CPM rate. Confirm alongside KOC review.
- **AM catalog review session — NEW, consolidates several open items (2026-06-30; updated
  2026-07-07).** Rather than answering catalog questions one at a time, Claire will have
  the AM look through the **Suggested Map** admin view (Admin → Groups → Suggested Map —
  now also editable, see the Services write-side screen entries below — shows every
  service's price/frequency/intake/KOC in one table) in a single pass. This session should
  cover, at minimum: KOC requirements across ALL products (not just the 4 flagged)
  compared against Claire's Website/SMM/Email/SEO-Builder-Pro list; `hulu-bp`/`amz-bp`
  intake; and can reasonably absorb the other still-open catalog questions below
  (visitor-ID email-bundle intake, `alc-media` percentage pricing, QUR item behavior)
  since the AM will already be looking at the whole table. Recommend batching ALL
  remaining "confirm with AM" catalog items into this one session rather than trickling
  them out.
  TWO ITEMS ADDED 2026-07-07, already BUILT on Claire's stated understanding but pending
  the AM's actual sign-off:
  (1) **`yttv-addl` / offline-tracking modifiers now display "Add-on, Monthly"** — built
  on Claire's belief that these recur alongside their parent campaign (not a one-time
  addition). If the AM says any of these are actually one-time, the fix is a one-column
  data correction (the row's `billing_type` in Supabase), not a code change — the display
  logic already handles every billing type correctly.
  (2) **Section name duplicated in service label** (`rep-bp` → "Reputation Management —
  Business Pro", `llo-bp` → "Local Listing Optimization — Business Pro", `gbp-setup` →
  "Google Business Profile — Setup & Verification") — confirmed redundant everywhere it
  displays (the form's own section header, Suggested Map's section grouping, and the
  printed IO's section grouping all already show the section name). Parked as a Supabase
  label edit to make through the new write-side Services screen once confirmed, not urgent.
- **Full row-by-row catalog audit** before client-facing launch (this is item B).

**Behavior / form:**
- **CPM/CPC Frequency (Option A) — BUILT in v44, pending commit + device check.** Ad rows
  now show the rate in the Fee column ("$10 CPM", "$4–$12 CPC") and Frequency reads
  "Monthly"; offline modifier rows keep "Add-on". One-line change in `priceAndFrequency()`'s
  spend branch. Since the rate now lives in the cell, the fee-column HEADER was simplified
  from "Fee / CPM / CPC" to just "Fee" on all seven spend tables (and the mobile card label
  to match), so every section's fee header is now consistent. Verified statically (edits
  present, old freq strings + triple headers gone, CSS balanced, JS parses); confirm on
  screen once committed.
- **Mobile checkbox moved left of service name — BUILT in v44, pending device check.** The
  mobile card's checkbox cell changed from top-right absolute positioning to inline-left,
  matching desktop; name cell now inline beside it. Selection BEHAVIOR was already shared
  JS (not layout), so it already matched desktop — only position changed. Check on a real
  phone that checkbox + a long service name sit cleanly on one line.
- **Clipped fields on phone — FIXED + TESTED, multi-round (2026-06-27).** Step 1 Campaign
  Dates row (IO Date / Start Date / Length) and Step 3 signer row (Authorized By / Title /
  Date Signed) both clipped/overlapped on phone. Took three rounds to fully resolve — root
  causes worth remembering if this pattern recurs elsewhere in the form:
  1. Both rows were rigid 3-equal-column grids with no mobile override → switched to
     single-column on phone (full label/field width, no squeeze).
  2. A bare `1fr` grid column has an implicit min-width based on its content, so a wide
     native `<input type=date>` pushed the row past the screen edge (clipped by the page
     wrapper's `overflow:hidden`) → needed `minmax(0,1fr)`, not plain `1fr`.
  3. Even single-column, the date inputs STILL overflowed past their card — iOS Safari's
     native date-control chrome sizes itself somewhat independently of normal CSS, strong
     enough to ignore `max-width:100%!important`. Real fix: `-webkit-appearance:none` /
     `appearance:none` on date inputs (mobile-only), which removes Safari's competing native
     sizing so our own width rules become the only authority. Side effect: the date now
     renders as a plain box (matching the form's own border/bg, which was already applied)
     instead of Safari's native gray-pill chrome; picking still opens the date picker fine.
  4. With native appearance off, an EMPTY date input has near-zero content to size around
     and collapsed thin, visibly "resizing" once a date was picked → added `min-height:40px`
     (matching the standard 13px-font/9px-padding box height) so empty and filled look
     identical.
  Also fixed in the same pass: Authorized By/Title boxes didn't vertically line up — the
  longer "Authorized By (Full Legal Name)" label wrapped to 2 lines while "Title/Role"
  stayed on 1, and since label sits above input in normal flow, the taller label pushed its
  box down. Single-column (point 1) resolved this too — full width means no label needs to
  wrap. All fixes scoped to the `@media (max-width:600px)` block only; desktop untouched.
  Caught and self-corrected one mistake while building this: an edit briefly dropped the
  media query's closing brace, which would have un-scoped most of the stylesheet to
  mobile-only — caught and fixed before presenting, verified via brace-count checks both
  times after.
- ~~**Offline-tracking modifiers** (`*-offline`, `yttv-addl`) — currently "re-quirked"
  to reproduce OLD behavior (cpm=modifier_amount) so the switchover stayed neutral.
  The REAL fix — treat them as flat +$ added to the parent campaign total — belongs
  to the form-edit pass. Remove the re-quirk and implement proper modifier math then.~~
  **RESOLVED 2026-07-07** — see "Offline-tracking modifier double-count/re-quirk —
  FINALLY FIXED" entry above. Fixed sooner than planned once Batch #4's live testing
  surfaced it directly.
- **Per-unit / hourly quantity input — BUILT, rigorously verified, pending live test
  (2026-07-07).** Fixes: per-unit items (e.g. `alc-design` "Graphic Design (Hourly)"
  $175/hr) previously had no way to record HOW MANY hours/units, so a 1-hour job and a
  5-hour job both recorded the same $175. Now: checking a per-unit service (identified via
  `CATALOG_ROWS[id].pricing_mode === 'per_unit'`) defaults `selected[id].qty = 1`; a small
  quantity box appears next to the unit price ("$175 × [_]"), read at the same 3 points
  Notes already is (`syncRowInputs()` — Step 2→3, submit, print). Every total calculation
  (`buildReview()`, `submitIO()`, `printIO()` — printIO keeps its OWN independent totals
  calc, confirmed and fixed separately) now multiplies fee/recurring by `(data.qty || 1)`,
  a safe no-op for every non-per-unit item. `submitIO()`'s saved `lineItems` store the
  ALREADY-MULTIPLIED fee/recurring (plus `qty` and `unit_fee` for transparency/audit), so
  the Trello card description and admin order-detail viewer — which just read `li.fee`
  directly — inherit correct math with ZERO changes to either.
  ONE REAL BUG CAUGHT BEFORE SHIPPING: `syncRowInputs()`'s spend-input lookup
  (`row.querySelector('input[type=number]')`) would have silently mistaken the new
  quantity box for the ad-spend field, corrupting totals a different way. Fixed by giving
  quantity its own `.qty-field` class and excluding it from the spend lookup
  (`:not(.qty-field)`).
  VERIFIED via real extracted-code simulation (jsdom): checking a per-unit item defaults
  qty=1; checking a flat item has no qty at all; the qty box only renders on the per-unit
  row; simulated typing "3" and running the actual `syncRowInputs()` correctly captured
  qty=3 WITHOUT corrupting spend (proving the bug fix); Notes still captured correctly
  alongside; hand-verified totals math (175×3=525, combined with an $850 flat item =
  $1,375 grand total) came out exactly right.
  DESIGN FIXES after live testing (2026-07-07): Claire caught two real issues from
  screenshots. (1) The qty box was wrapping awkwardly onto its own line inside the fixed
  96px Fee column ("$175 ×" / "1" on separate lines by accident) — redesigned as a
  DELIBERATE 2-line stack (fee on top, compact "× [box]" beneath) so it reads as
  intentional rather than broken. (2) MORE IMPORTANT: the Step 3 summary table has
  separate "Fee" and "Recurring" columns (confirmed via header inspection), and the qty
  math was landing in the "Recurring" column for a ONE-TIME item — genuinely misleading,
  implying a monthly charge that doesn't exist. Fixed by moving the multiplication into
  the Fee column (where it belongs) and restoring the Recurring column to show ONLY
  genuinely recurring/spend content (enhanced to also show "× qty" IF a per-unit item is
  ever also monthly — none exist today, but the logic supports it correctly). Confirmed
  printIO()'s own "Amount" column has no such ambiguity (single combined column, not split
  Fee/Recurring) — no change needed there. Re-verified via real buildReview() extraction +
  DOM simulation against the exact reported scenario: Fee column now shows
  "$175 × 3 = $525", Recurring column correctly shows "—", totals still $1,375 one-time.
- **Auto-check on typed spend/quantity — BUILT + VERIFIED (2026-07-07).** Real gap found
  live: typing a value into an UNCHECKED row's spend or quantity box was silently lost
  (`selected[id]` doesn't exist until the checkbox is checked, so the assignment was a
  no-op — no error, no warning). This was already a known, logged issue for spend alone;
  building quantity tonight introduced the identical gap for the new field, and Claire
  caught it live via screenshot (Stock Photography showed qty=2 typed with its checkbox
  unchecked). Fixed both together with one shared `autoCheckIfNeeded(id)` helper — typing
  into either box now auto-checks the row and runs the SAME logic as a real click (reuses
  `toggle()` itself rather than duplicating its initialization, so mutual exclusivity,
  intake-modal triggering, etc. all stay consistent regardless of how the row got
  selected). Quantity's input gained a live `onchange` (`updateQty()`) it didn't need
  before, specifically so auto-check can fire immediately — `syncRowInputs()` remains a
  safety net at the Step 2→3 transition either way. VERIFIED: typing "3" into an unchecked
  Stock Photography row correctly auto-checked it AND captured qty=3 (not lost).
- **Quantity always visible on Review — BUILT + VERIFIED (2026-07-07).** Claire's
  observation: leaving a per-unit item's quantity at 1 (never touched) made it look
  IDENTICAL to a flat-fee item on the Step 3 review — no way to notice "did I mean to
  order more?" before submitting. Fixed: the Fee column now always shows the
  "$25 × 1 = $25" breakdown for any per-unit item, not just when qty > 1 (test changed
  from `qty > 1` to `data.qty != null`, since qty's mere presence — not its value — is
  what marks a service as per-unit).
  REVERSED DECISION: an initial version deliberately excluded `printIO()` from this,
  reasoning the printed IO should stay a "clean" client-facing statement. Claire
  overrode this — correctly: the printed IO functions as the actual CONTRACT, so it
  should show the identical math as the internal review, not a simplified version. A
  printed "$175 one-time" next to an internal record showing "$175 × 3 = $525" is exactly
  the kind of inconsistency that could become a real dispute later. `printIO()` now uses
  the same `data.qty != null` test and shows the same breakdown. VERIFIED via isolated
  logic extraction: qty=1 → "$175 × 1 = $175", qty=3 → "$175 × 3 = $525", flat items
  unchanged. Minor wording-only note (not a numbers issue): a flat item's printed line
  includes the word "one-time" ("$850 one-time"); a per-unit line at this exact qty=1
  case does not ("$175 × 1 = $175") — dollar amounts are fully consistent either way,
  just a small stylistic difference Claire may want evened out later.
  NOT yet extended to modifier/add-on items (`*-offline`, `yttv-addl`) — deliberately
  parked; those are a different pricing shape (flat +$ on a parent total, not a multiplied
  quantity) and none of the 4 currently-converted sections have one to test against live.
- **Service ID auto-generated from Section + Label — BUILT + VERIFIED (2026-07-07).**
  Claire's request after the write-side screen went live: reduce manual typing and the
  chance of an inconsistent or accidentally-duplicated ID. Follows the same "auto unless
  manually overridden" pattern already used for the Group editor's slug field (though the
  actual slug algorithm differs — groups use an acronym style; services use a readable
  `section-label-slug` matching the existing convention like `alc-design`/`rep-bp`).
  Typing a Label (with Section selected) live-generates the ID; typing directly into the
  ID field marks it as manually overridden and stops auto-generation from touching it
  again; a "↺ Auto" button restores auto-generation. A live warning shows if the
  generated/typed ID matches an existing service, AND `adminSaveService()` hard-blocks
  the actual save attempt on a duplicate — checked BEFORE the RPC is ever called, so a
  collision never reaches Supabase as a confusing constraint-violation error. VERIFIED
  via simulation: auto-generate produces the expected slug; manual edit correctly stops
  further auto-overwrites; regenerate correctly restores it; a duplicate ID is blocked
  with a clear toast and the RPC call is confirmed to never fire.
- **Services screen — AM-tier could open/type into Edit, though save was already correctly
  blocked — FIXED (found live 2026-07-07).** Claire caught this logging in as an AM: the
  RPC's server-side super-admin check was working (the save genuinely failed), but nothing
  in the front-end hid the New Service/Edit/Deactivate controls, so an AM could still open
  and interact with them pointlessly. Fixed by mirroring the EXACT existing pattern already
  used for Group Custom Pricing (same restriction level) — four layers: (1) the "+ New
  Service" button is hidden for AM when opening the Suggested Map tab; (2) Edit/Deactivate
  are not rendered per-row for AM; (3) `adminNewService()` /
  `adminEditService()` / `adminToggleServiceActive()` each independently refuse and toast
  for AM even if somehow called directly, not just via a hidden button; (4) the RPC itself
  was already the real backstop and remains so. VERIFIED via simulation across all four
  layers: AM render has zero Edit/Deactivate buttons but still shows prices; super-admin
  render unaffected; New Service button hidden/shown correctly per role; all three
  functions called directly as AM correctly refuse with a clear toast and never open/act.
  FOLLOW-UP (found live immediately after, 2026-07-07): the Edit slot initially showed a
  placeholder "—" for AM instead of nothing, which read like a mystery unlabeled extra
  column next to KOC (the Actions header has no title). Claire compared it directly
  against the Groups Pricing button, which renders a true empty string for AM — no
  placeholder at all. Fixed to match that exact pattern: the AM actions cell is now
  genuinely empty, confirmed via simulation (cell content is "", no dash character
  present anywhere in it).
- **`priceAndFrequency()` — the SHARED live-form function — had a real inconsistency,
  FIXED + THOROUGHLY REGRESSION-TESTED (2026-07-07).** Claire caught this reviewing the
  Suggested Map output: "Per Unit, Monthly" and "Per Channel, Monthly" correctly compose
  both unit AND cadence, but "Per Hour", "Per Unit" (alone), and "Add-on" did not — the
  cadence word was silently missing. ROOT CAUSE (found in the actual live code): the
  "One Time" cadence word had an asymmetric condition
  (`billing_type === 'one_time' && parts.length === 0`) that ONLY added it when there was
  NO unit label — Monthly/Yearly/Annual never had this restriction. So a per-unit MONTHLY
  item correctly showed "Per Unit, Monthly" while the same item as ONE-TIME showed just
  "Per Hour" with the cadence dropped. Separately, "Add-on" (modifier items) was an early
  return that never even looked at billing_type at all. HIGHER STAKES than prior fixes
  tonight: this function is SHARED — it already powers the live form's own Frequency
  column for real AEs today, not just the admin screen, so this changes what Step 2
  displays (e.g. "Graphic Design (Hourly)" now shows "Per Hour, One Time" instead of
  "Per Hour"). FIXED: removed the asymmetric condition so one-time composes exactly like
  every other cadence; modifier items now compose a cadence word too (Claire's call: the
  offline-tracking add-ons recur monthly alongside their parent campaign, not a one-time
  addition — if any modifier's billing_type turns out to be set wrong, the upcoming AM
  catalog review will catch it). VERIFIED via a 14-case test: 9 regression cases
  (everything that already worked) confirmed BYTE-FOR-BYTE UNCHANGED, 3 previously-broken
  cases now correct, 2 edge cases (modifier with other/no billing_type) handled sensibly.
  Also checked: the live form's Frequency column has no forced single-line width
  constraint, so longer strings like "Per Hour, One Time" will wrap naturally onto a
  second line if needed (normal text wrapping, not the kind of form-control overflow
  chased earlier tonight) — worth a glance live since it can't be rendered from here.
- **Write-side form: soft warning before saving a Modifier/Spend service with no rate —
  BUILT + VERIFIED (2026-07-07).** Follow-up to the Price/Frequency consolidation: Claire
  asked whether every existing modifier already has a price (confirmed: yes, no current
  service is actually missing one — this is a safeguard against a FUTURE mistake, not a
  fix for anything broken today) and proposed a warning instead of touching the shared
  live-form function. Built: saving a service with Pricing Mode = Modifier and no Modifier
  Amount, or Spend with no Retail CPM, now shows a confirmable warning ("no rate entered,
  it will show as '—' — save anyway?") — Cancel returns to the form without saving, OK
  proceeds normally. Deliberately does NOT apply to flat/per-unit items with a blank
  price, since QUR (quote-on-request) is an intentional, common state for those — only
  Modifier/Spend are covered, since a blank rate there is more likely a forgotten entry.
  VERIFIED via simulation: warning fires with the right message when the rate is blank;
  clicking Cancel genuinely aborts the save (RPC confirmed never called); clicking OK
  proceeds normally; the warning does NOT appear at all when a rate IS entered, so it
  won't nag on ordinary saves.
- **Suggested Map's "Standard Price" / "Billing" columns had drifted inconsistent —
  FIXED by eliminating the duplicate logic, not patching it (2026-07-07).** Claire caught
  several real inconsistencies live: yearly/annual billing types silently showed NO
  suffix at all (a $450/yr fee displayed identically to a $450 one-time fee — a genuine
  bug, not just style) and the separate Billing badge showed a bare "—" for those same
  types, AS IF the billing type were unknown; unit phrasing was inconsistent across
  "each" / "per hour" / "per channel" / "/mo each" / "/mo per channel" depending on which
  combination happened to apply. ROOT CAUSE: this admin screen had its OWN separate
  price-formatting logic (`fmtPrice` + a hand-rolled billing check) that had drifted from
  the live form's already-correct, already-tested `priceAndFrequency()` function (built
  during the earlier v43 column-standardization work). FIX: deleted the duplicate logic
  entirely and made this screen call the SAME function the live form uses — so the two
  views can never say two different things about the same catalog row again. Renamed the
  "Billing" column header to "Frequency" since it now correctly carries unit info too
  (e.g. "Per Unit, Monthly"), matching the live form's own terminology. VERIFIED by
  actually rendering the real table with real code across every case Claire named
  (per-unit+each, per-unit+hour, per-unit+channel+monthly, yearly, annual, plain monthly,
  plain one-time) — all six produced clean, consistent Price/Frequency pairs, including
  the yearly/annual cases which previously silently failed.
- **Notes column (last column) crowding the card's own edge — FIXED, confidence lower than
  the spend fix, pending live confirmation (found live 2026-07-07).** Claire caught this
  right after the spend-input fix, on the SAME table (Targeted Display) — focusing the
  Notes box on the last row made the focus outline look like it touched/clipped against the
  card's outer edge. DIFFERENT mechanism than the spend bug (that input's sizing IS already
  correct — `width:100%; box-sizing:border-box`, properly bounded to its own cell). The
  real cause here: `.card-body{padding:0}` (by design, so header color bands sit flush
  edge-to-edge) means the table extends all the way to the card's boundary, and the card
  clips anything past it (`overflow:hidden`) — so the Notes column, being LAST, had only
  its own 12px cell padding as buffer before the clip boundary, tighter than any interior
  column would ever face. Fix: added `padding-right:16px` scoped ONLY to
  `.svc-table td:last-child` (does not touch any other column's width/alignment). HONEST
  CAVEAT: unlike the spend fix, this isn't a provable sizing defect I could verify by math
  — it's a reasoned structural fix. Needs Claire's live confirmation; if still tight, the
  padding value is a single, easily-adjustable number, not a structural change to redo.
- **Ad-spend input overflowing its own cell — FIXED, pre-dates tonight's work (found live
  2026-07-07).** Claire caught this testing Targeted Display: the Monthly Spend input's
  focus outline visually crowded into the Notes column. Root cause: the desktop rule
  (`.svc-table td input[type=number]`) hardcoded `width:120px` — the SAME width as the
  entire spend column (`.c-spend{width:120px}`) — but the cell itself also has its own
  12px-each-side padding, so the input was demanding more room than its cell actually had
  and had been quietly overflowing into Notes even at rest; the focus outline (a few extra
  pixels beyond the border) just made an existing overflow visible/obvious. Fixed by
  switching to `width:100%` (sizing to the cell's real content area, matching the pattern
  the mobile version of this same rule already correctly used). Confirmed the new
  quantity input (built earlier tonight, shares this same `input[type=number]` selector)
  is unaffected — it has its own inline `width:36px` which always overrides an external
  rule regardless of this change.
- **Notes input doesn't wrap while typing (Step 2) — checked, deferred pending AM
  feedback (2026-07-07).** Claire's memory check: NOT fixed, and can't be fixed the same
  way the Service name column was (that's plain wrapping table-cell text; Notes on Step 2
  is a single-line `<input type="text">`, which structurally cannot wrap — text scrolls
  horizontally instead, a basic HTML limitation, not a missing style). Fixing this for real
  would mean swapping to a `<textarea>` (multi-line, grows as you type) — a real UI change,
  not a CSS tweak, since it affects row height dynamically and would need applying
  consistently across every table. NOT urgent: the Step 3 REVIEW page's Notes column
  already displays and wraps normally (it's plain cell text there, not an input) — that's
  the version that actually gets saved, printed, and sent to Trello. So this only affects
  the TYPING experience on Step 2, not any output the AM or client ever sees. Claire is
  deferring until she has real AM feedback on whether it's worth the `<textarea>` change.
- **Amount doesn't reset when a box is unchecked — BUILT + VERIFIED (2026-07-07).**
  Claire's request: unchecking a service should visually clear its spend/quantity box, not
  leave the old number sitting there. Real gap: `toggle()`'s uncheck branch already deleted
  `selected[id]` (correctly dropping it from totals), but the DOM input itself is a
  separate element with no automatic link — it kept showing the stale typed value. If the
  same box were re-checked later WITHOUT retyping, `syncRowInputs()` would silently pick
  the stale number back up at the Step 2→3 transition. Fixed: unchecking now also clears
  the spend input (and its min-warning/highlight, if present) and resets quantity to its
  natural default of 1. VERIFIED via simulation: check → type qty=3 → uncheck (box resets
  to "1") → re-check with NO retyping → qty is fresh at 1, not the stale 3.
- **Intake-selected services don't flow to order/totals** — HIGH PRIORITY. Ask AM:
  should intake selections add to the order, or just flag interest? Affects invoice
  accuracy.
- **Hosting exclusivity / presentation** — own section vs mixed; one-time-build +
  recurring-hosting relationship. Connects to hosting-related bugs.
- **Duplicate clients from typos** — name-match list lookup creates duplicates.
  Apply `norm()` helper to list lookup + tighten Supabase name match. Longer-term:
  client dropdown sourced from Trello.
- **Archived/returning client Trello routing** — current submit logic matches client
  lists by name with no concept of archive state, so a returning client likely gets
  a duplicate empty list or cards added to a hidden list. Desired: find archived list,
  reactivate it, add new cards. SAME ROOT CAUSE as the duplicate-client problem
  (reliable client-list identity) — solve together. Verify actual current behavior
  against the real board first.

**Display / labels:**
- **Price drift — CLOSED (2026-06-25, v43).** Displayed prices are now generated from
  the `services` table at startup by `renderPriceCells()` (reads `default_price` /
  `retail_cpm` / `modifier_amount` and writes the amount into each Fee cell), so the
  hardcoded amount in the markup no longer matters — a stale HTML price gets overwritten
  on load. Frequency/suffix is also table-driven now (its own column). _Verify against
  LIVE Supabase before trusting: the Frequency words come from `billing_type` /
  `pricing_mode` / `unit_label` — confirm hosting = Yearly/Annual, hourly items = Per
  Hour, Modules = Per Unit, additional-email = Per Unit, Monthly. A wrong frequency means
  that row's table fields don't match (fix in data via SQL, not code)._
- **Label drift — CLOSED application-wide (2026-07-07).** `renderPriceCells()` now refreshes
  every row's service-name cell from the catalog's `label` field (`serviceTd.textContent =
  r.label`), not just sections converted to dynamic generation. Confirmed safe: this
  function has exactly one call site (page load, before any product is selected), so it
  can't collide with the later intake-link button that gets appended into the same cell
  after user interaction. Verified via real-code simulation: a static section's stale
  hand-typed HTML text is correctly overwritten by the catalog label, footnote symbols (*)
  and ampersands both surviving intact. HEADS UP for testing: since every label now tells
  the truth from Supabase for the first time, small mismatches may surface on sections not
  yet touched today — same category as the rep/llo/gbp section-name redundancy found
  earlier. Not a bug from this change; worth a broad skim across all sections after commit.
- **Label wording redundancy on rep/llo/gbp — PARKED for the write-side screen (2026-07-07).**
  Confirmed live: converting these 3 sections surfaced that their Supabase `label` values
  include the section name ("Reputation Management — Business Pro", "Local Listing
  Optimization — Business Pro", "Google Business Profile — Setup & Verification") — this
  was previously hidden by the old static HTML's shortened hand-typed labels, and became
  visible the moment the real catalog label started rendering. Confirmed redundant
  everywhere this label displays (the form's own section header, the Suggested Map's
  section grouping, and the printed IO's section grouping ALL already show the section name
  alongside it). A genuine example of "label drift" made concrete. Claire's call: purely a
  wording/content edit, not urgent, and will be easy to fix once the write-side screen
  exists — park it rather than hand-edit Supabase now.
  (See the consolidated "AM catalog review session" entry above for the current status —
  this is now bundled into that single AM sign-off pass rather than tracked separately.)
- **TLP page-count detail in labels** — "(1–5 Pages)" etc. live only in the HTML, not
  the stored label. Fold into the TLP structured build.
- **Contract-term footnote symbols** (◊ § ‡ * etc.) — carry real meaning (agreement
  terms, annual hosting). May need surfacing/explaining to the user. Table labels now
  preserve the symbols (canonical).
- **Accepted label differences (2026-06-25)** — table labels are canonical (cleaner/
  more complete than old inconsistent code): `w-domain`, `w-dns`, `w-ada-hosting`,
  `alc-radio`, `alc-banner`, plus PRODUCT_CONFIG's shortened labels wholesale. All
  behavioral fields matched exactly; only labels differed. Accepted, no action needed.

**Backend / code-review findings (from the 2026-06-24 full code review):**
_These were flagged when first reading the inherited file. Re-recorded here so they
aren't lost. None block current work; most belong to the form-edit pass. Grouped by
severity as originally assessed._

Critical / functional:
- ~~**Spend double-counted for offline-tracking add-ons** in `buildReview()` / `submitIO()`.
  Offline items carry a spend AND a CPM; if an AE enters spend on both the main
  targeting row and the offline row, both get summed and inflate the monthly total.
  Offline was meant to be a +$2 CPM modifier, not a separate spend line. SAME underlying
  item as the "offline-tracking modifiers re-quirk" flag above — fix together in the
  form-edit pass.~~ **RESOLVED 2026-07-07** — the spend input is gone entirely for
  modifier items now (nothing to double-enter), and the amount adds correctly on its
  own. See the resolved entry above for the fix.
- **`loadDraft()` restores selections without re-running side effects** — it re-checks
  boxes and restores `selected`, but never calls `updateIntakeStatusCard()` /
  `updateKocCard()` afterward. A restored draft with intake/KOC-requiring products shows
  an inconsistent state until the user navigates. (Note: switchover may have shifted line
  numbers — re-locate before fixing.)
- **QUR / $0 items submit silently at $0** — `em-bp-30kp`, `tlp-custom`, `w-custom`,
  `wm-custom` have no set price and contribute $0/mo with no warning. They can be
  submitted at $0. Decide: block submission, force a custom amount, or visibly flag.
  (Tied to the "QUR items" data flag above.)
- **`applyCustomPricing()` can't override QUR/$0 items cleanly** — its fee-vs-recurring
  test means a QUR item's visible "QUR" only changes if an override exists; otherwise
  totals quietly use 0. Revisit alongside QUR handling.

Moderate:
- **`esc()` XSS helper — DONE (v44, committed + tested 2026-06-26).** Wrapped all AE-typed
  values in `esc()` in both `buildReview()` (service label, row notes, full client recap)
  and `printIO()` (business name, contact/email/phone, website, city, business type, AE,
  campaign notes, special instructions, line-item labels/notes, typed signature, signer
  name/title). Verified live: a `<b>Test</b> Co` business name renders as literal text in
  both the Step 3 review and the printed IO. Drawn-signature data URL and admin-set brand
  color deliberately left unescaped (wrong context to escape).
- **`find_or_create_client` return-shape — INVESTIGATED, no fix needed (2026-06-26).**
  RPC is defined `RETURNS uuid`. Through PostgREST a scalar uuid serializes as a bare JSON
  string, so the front-end's `typeof cid === 'string'` check matches and the RPC path works
  as written. False alarm. (Optional future hardening: also accept array/object shapes in
  case the RPC is ever changed to return a row/json — speculative, not done.)
- **Dev-mode group slug `ctg` for "44i" — INVESTIGATED, no action (2026-06-26).** Not a
  leftover: `ctg` is the slug of the real **Claude Test Group** in Supabase. The dev-picker
  entry is just mislabeled — it's named "44i (Internal Test)" with 44i branding but carries
  the Claude Test Group's slug. Purely cosmetic, dev-only, and dev mode never writes data
  (fake `id` → hits the "DEV mode — not saved" guard), so deliberately left as-is. No client
  or AE sees it.
- **`kocIsRequired()` — partial intake forces KOC** — a not-completed, not-bypassed intake
  upgrades the product to require a KOC. Likely deliberate (info gets collected one way or
  the other) but confirm with AM.

- **Print preview grey lines covering data on page 2+ — FIXED + VERIFIED VIA REAL RENDER
  (2026-07-10).** Claire caught this in live testing: the 2026-07-08 print-overlap fix only
  held up on a single-page IO — any IO long enough to span multiple pages still had the
  running header/footer landing on top of real content, but only on pages AFTER the first.
  Root cause, finally confirmed with certainty this time (not just reasoned about): the
  2026-07-08 fix reserved a gap using `body{padding-top/padding-bottom}`, which CSS only
  ever applies ONCE — at the very top/bottom of the whole document's flowed content, i.e.
  effectively just page 1's top and the last page's bottom. But the running header/footer
  use `position:fixed`, which Chrome's print engine repeats on EVERY physical page at the
  same anchor point as the flowing content — so any page in the middle had zero reserved
  gap and the header/footer sat directly on top of the table/section content there.
  VERIFICATION METHOD (new for this project): built an actual multi-page test print using
  the real CSS/markup from `printIO()`, rendered it with headless Chromium (Playwright,
  pre-installed in this environment) to a real PDF, and inspected each page as an image —
  this is a step up from the previous session's "reasoning-based, needs Claire's live
  confirmation" caveat; the bug was reproduced and the fix confirmed by actually looking at
  rendered output, not by reasoning about CSS behavior alone. Also empirically ruled out an
  alternative fix (bigger `@page` margin alone, no body padding) — still overlapped
  identically, proving margin size was never the variable that mattered. Also prototyped
  the "textbook correct" fix (wrap the whole document in one table with `thead`/`tfoot` so
  the header/footer repeat the same reliable way the services table's own header already
  does) — but Chrome doesn't paginate a single giant table row cleanly; the footer
  misrendered at the TOP of the page instead of the bottom. Not viable without much more
  engineering time than made sense to spend right before Monday.
  REAL FIX SHIPPED: removed the repeating per-page running header/footer entirely.
  The letterhead (already only rendered once, at the very top of page 1) now serves as
  the one-time header. Added a small, plain (non-fixed) `.doc-footer` line after the
  signature section — appears exactly once, at the true end of the document. This
  guarantees zero overlap on any page in any browser, since there's no `position:fixed`
  content left to conflict with anything. TRADE-OFF: pages 2+ no longer show a running
  "Group / Business / IO#" identifier or "Page X of Y" — flagged to Claire; can revisit a
  true repeating header later with more time if she wants it back, but no CSS technique
  found today could deliver that reliably in Chrome's print engine.
- **Suggested Map drag-and-drop reorder — smoothed out after Claire's live testing
  (2026-07-10).** Two rough edges from the earlier session's build: (1) no visual feedback
  while dragging — the dragged row and the drop target both looked static, so it wasn't
  clear where a drop would land. Fixed by dimming the dragged row and drawing a highlight
  bar on whichever row the cursor is currently over, cleared on drop/dragend. (2) the page
  visibly jumped to the top after every successful reorder — root cause: `loadSuggestedMap()`
  (and the Sections tab's equivalent `loadAdminSections()`) briefly swap the table for a
  "Loading…" placeholder while refetching, which shrinks the page and makes the browser
  scroll up to keep the now-gone content in view. Fixed by capturing `window.scrollY`
  before the refresh and restoring it after. Found live by Claire, not by our own testing —
  the Sections tab had a fully separate, independently-written drag-and-drop
  implementation (not shared code with the Suggested Map's), so the same fix had to be
  applied twice; Claire specifically asked "did you also update the same function in
  Sections?" and it turned out no, it needed the identical fix ported over by hand.
- **Service editor: Pricing Mode-irrelevant fields no longer save leftover values
  (2026-07-10).** Claire's ask, directly triggered by the `alc-testdelete` incident from
  earlier this session (a flat-fee test service that kept a stray `spend_minimum` from an
  earlier edit, which silently blocked "Next: Review & Submit" for anyone who selected it
  on the live form): "should we look at limiting what can be added for spend/cost... based
  on the pricing mode." Unit/Modifier Amount/Retail CPM/Spend Minimum now hide in the
  Service editor unless the selected Pricing Mode actually uses them (Unit→Per-unit,
  Modifier Amount→Modifier, Retail CPM & Spend Minimum→Spend-based), and clear immediately
  if the admin actively switches Pricing Mode after filling one in. The REAL guarantee is
  server-side-payload-adjacent: `adminSaveService()` now force-nulls whichever of these
  four fields the FINAL selected Pricing Mode doesn't use, independent of whatever is
  still sitting in the DOM input — so even a stale/hidden field value from before a mode
  switch can never be saved. VERIFIED via simulation: reproduced the exact
  `alc-testdelete` shape (flat mode + a stray spend_minimum value) and confirmed all four
  fields correctly resolve to null; confirmed a genuine spend-mode save with real CPM/spend
  minimum values still passes them through unchanged.
- **Full hardcoded-catalog-data audit + cleanup pass (2026-07-10).** Claire asked for a
  sweep of `index.html`/`admin/index.html` given how many edits this session made, worried
  about lingering per-service data that should be Supabase-driven instead of a JS literal.
  Ran an Explore-agent audit across both files; confirmed the OLD hardcoded section maps
  (`SECTION_LABELS`/`MAP_SECTION_LABELS`/`SAFE_DYNAMIC_SECTIONS`) are genuinely gone, no
  renamed leftovers. Found and fixed four real cases, all verified via simulation against
  the old hardcoded values before shipping (baseline must match exactly, plus a "new item
  added later" case to prove the fix actually solves the brittleness, not just relocates it):
  - **`WEB_OTO`/`WEB_MRR`** (cross-section lock between Website One-Time and Monthly
    Recurring) — was a frozen 4-id array per section. Zero schema change needed: both are
    now derived at `loadCatalog()` time from whichever `exclusivity_group` the known
    anchor tier (`w-bs` / `wm-1p`) currently belongs to, via the already-existing
    `RADIO_GROUPS`. A future 5th tier added to the same group is picked up automatically.
  - **Tier-name derivation** (`if (selected['sm-bp']) tier='pro'`) — replaced with a new
    `services.tier` column (`starter`/`builder`/`pro`) read via a `tierOfSelected(anchorId)`
    helper that finds whichever service in the anchor's exclusivity group is currently
    selected and reads ITS `tier` value. Scoped deliberately to just the `tier` variable
    used in the client-record payload (submitted on every order) — left `seoTier` (line
    ~2600) untouched since it only feeds `TACTIC_MAP`, which is Trello-only code Claire
    asked to leave for next week's dedicated session.
  - **`HOSTING_LOCK_MAP`** (site-tier → standalone-hosting double-charge lock) — was a
    hardcoded 4-pair map with a comment defending it as an intentional one-off. Replaced
    with a new `services.standalone_hosting_service_id` column, now exposed in the
    Services editor (new field next to Hosting Prompt) and read/written by
    `admin_save_service`. Derived live from `CATALOG_ROWS` at catalog load — a renamed or
    added hosting product no longer needs a code change.
  - **`HOSTING_CFG`'s hardcoded `fee`** ($450/$750, tied to hosting page-type) — this was
    genuine duplicate-of-catalog-price data with real drift risk (if `w-hosting`'s price
    ever changed in the Services editor, the printed prorated hosting fee would still show
    the old hardcoded number). Fee now reads live via `standaloneHostingFee()` →
    `HOSTING_LOCK_MAP` → `CATALOG_ROWS[...].default_price`. Verified the fee automatically
    tracks a simulated price change from $450 → $500 with no code edit. Deliberately did
    **NOT** turn the proration `days` (10/30/60) or the page-type display wording
    ("1-page"/"E-Commerce") into DB columns — both are tied to `hosting_prompt_type`,
    which is itself explicitly documented elsewhere in the admin editor as a closed,
    fixed 4-value set ("a fixed dropdown, not a pick-list... nothing new to create here"),
    so unlike the other fixes above there's no real "new item added later" risk this
    solves; adding columns for it would be pure ceremony. Flagged this reasoning to
    Claire rather than deciding unilaterally.
  - **Explicitly deferred to next week, not touched:** `TACTIC_MAP` and
    `WORKFLOW_TO_INTAKE` — both are Trello card-creation config (workflow name → Trello
    list-search pattern / intake key), only reachable inside the "Setting up Trello…"
    submit branch. Same category of hardcoding, but Claire confirmed leaving these for
    the dedicated Trello session next week rather than fixing twice.
  - **SQL delivered:** `hardcode_cleanup_migration_2026-07-10.sql` — adds `services.tier`
    and `services.standalone_hosting_service_id`, populates the known rows, includes a
    verification query to run FIRST (confirms `sm-bs`/`sm-bb`/`sm-bp` really do already
    share one `exclusivity_group`, since the tier fix depends on that and it couldn't be
    verified without live DB access), and ships an updated `admin_save_service` RPC with
    both new columns wired in (case-when-present, same pattern as every other nullable
    field added this session). **CONFIRMED WORKING by Claire** (both verification
    queries + live checks all matched expected values) — CLOSED.
- **Three follow-up polish items after the hardcoding audit (2026-07-10).**
  1. **Renamed "Suggested Map" tab to "Services"** in `/admin` — cosmetic only, no
     behavior/id changes. Claire felt the old name no longer matched what the tab
     actually does now that it's a full CRUD editor, not just a read-only reference.
  2. **Hosting proration is now admin-editable.** Directly reopened the "should `days`/
     labels also be data-driven" question from the hardcoding audit — Claire said yes.
     New `hosting_proration_settings` table (`page_type` PK: `1p`/`5p`/`10p`/`ecomm`,
     `label`, `days`), a new "⚙ Hosting Proration" panel in the Services tab (a simple
     4-row edit list — no add/remove, since `hosting_prompt_type` is a fixed closed set
     by design), and a new `admin_save_hosting_setting` RPC. The dollar FEE is still NOT
     set here — it continues to read the real standalone hosting service's own Default
     Price (per the 2026-07-10 hardcoding fix above), so there's exactly one place to
     change a hosting price and one place to change its timing, never two.
  3. **Service editor decluttered** — grouped the now ~25-field form into three
     collapsible `<details>` sections (Basics / Pricing Details / Behavior & Workflow)
     instead of one long unbroken list. Basics and Pricing Details start open (most
     services touch these); Behavior & Workflow starts collapsed (rarer/advanced fields:
     Subsection, Hosting Prompt, Standalone Hosting ID, KOC, Intake Form, Workflow,
     Auto-Add Setup Fee, Fee Note). Purely a layout change — every field id, oninput
     handler, and save-payload key is untouched; verified via a jsdom DOM check that all
     fields still resolve correctly and the Save button is still present after the
     restructure.
  - **SQL delivered:** `hosting_proration_settings_2026-07-10.sql` — creates the table
    (seeded with today's existing values, zero behavior change until an admin edits a
    row), enables RLS with a public SELECT policy (the live form reads this table with
    the anon key, same as `services`/`intake_forms`/`sections`), and adds the
    `admin_save_hosting_setting` RPC.
- **Dev picker (`?dev=1`) now lists every REAL group, not 4 hardcoded fake ones —
  with a real submission-safety fix along the way (2026-07-10).** Claire wanted her
  bosses to browse every group's own branded version of the form ahead of Monday
  without typing dummy client data into each one. `showDevModePicker()` previously
  showed a hardcoded 4-entry list (CF Digital, STMM, Brazos, an internal test group) —
  none of them real, none of their branding/pricing able to drift as real groups
  change. Now fetches the live `groups` table directly (`groups?order=name&select=*`),
  so every current and future group appears automatically, with its real logo/colors/
  AM info AND its real Custom Pricing overrides (`applyDevGroup()` now calls
  `applyCustomPricing()` too, and fully rebuilds `SERVICE_DATA` from `CATALOG_ROWS`
  before applying — the old version only ever patched the specific keys a given
  group's overrides touched, so switching from an overridden group to a non-overridden
  one would leave the previous group's stale price stuck in memory for anything the
  new group doesn't itself override).
  **CAUGHT BEFORE SHIPPING — a real accidental-write risk, not just a UI gap:** the
  submit-time dev-mode guard (`isRealUuid` — skip Supabase/Trello if
  `selectedGroup.id` doesn't look like a UUID) was ONLY ever safe because the old
  hardcoded dev groups used fake string ids like `'dev-cfdg'`. The moment the picker
  lists REAL groups with REAL UUIDs, that inference silently breaks: someone
  previewing a real group through `?dev=1` and clicking all the way through to Submit
  would have created a real client record and a real Trello card under that group —
  the exact opposite of what a safe preview tool should ever do. Fixed by adding an
  explicit `isDevPreviewMode` flag, set once by `showDevModePicker()` and never
  cleared for the rest of that page session, used as the authoritative guard
  (`if (!isRealUuid || isDevPreviewMode)`) instead of inferring safety from the id's
  shape. VERIFIED via simulation: real-prod-submission path unaffected; a real group
  previewed via the dev picker now correctly skips the write; both old-style fake-id
  cases (dev-mode-flagged and, defensively, not-flagged) still skip the write either
  way. Also verified the SERVICE_DATA-reset fix directly: after applying a group with
  an override then a group with none, the first group's override no longer lingers.

Minor / cosmetic:
- **`onKocDateChange()` / `globalKocSchedule` / doubled `display:none` — DONE (v44,
  committed + tested 2026-06-26).** Removed the empty stub, the dead variable + its reset
  assignment, and the duplicate inline `display:none` on `admin-login-modal`. Admin login
  confirmed still opening.
- **`toggleRadio` alias / `currentHostingPageType`** — minor redundancy; page type is
  re-derived elsewhere.
- **`printIO()` uses `setTimeout(... win.print(), 600)`** — if the logo/fonts load slowly,
  print can fire before render. Works most of the time; fragile.

**Intake form enhancements (future, additive):**
- **Checkbox field type** — social channels are currently free-text; a checkbox type
  was added as a supported future field type but not yet used.
- **Conditional "if yes" fields** (e.g. SEO) — decide whether to add simple conditional
  support to the JSON definition once, for all forms that need it.

---

## OPERATIONAL / SECURITY (team decisions — surfaced earlier, not yet in this doc)

These came out of the first-session review and the rollout plan. None are catalog work,
which is why they slipped off this doc — but several gate a real client-facing launch.

- **RLS audit — RESOLVED 2026-07-14, triggered by a phishing scare.** Claire's AM
  forwarded a suspicious "IN REVIEW: Insertion Order" email with review/approve links,
  for a client not in her orders — confirmed via full repo grep this did NOT originate
  from this system (no email-sending code exists anywhere; no review/approve workflow
  concept exists in this app's design, which is direct-sign-only; the client isn't in the
  `orders` table this system writes to). Flagged to Claire as likely phishing, unrelated
  to this project. Understandably rattled, she asked for a full security pass over who
  can see what. Ran a comprehensive `pg_policies` query across all public tables and found
  the SAME wide-open historical mistake already fixed once on `clients` also exists,
  unfixed, on two more tables:
  - `groups` — has a `groups_anon_write` (or similarly named) `ALL`/`qual: true` policy
    alongside its narrower ones, meaning literally anyone with the anon key can read/write/
    delete every group's config (including pricing overrides, Trello board IDs, IO
    recipient emails).
  - `orders` — same shape: a wide-open `orders_anon_all` policy PLUS a duplicate "Public
    insert orders" policy, sitting alongside the already-correctly-scoped
    `orders_public_insert` / `orders_recent_read` / `orders_recent_update` policies that
    the live app actually needs.
  **Planned fix (established pattern from the `clients` fix earlier in the project):**
  DROP the wide-open/duplicate policies, keep the narrowly-scoped ones already in place.
  Confirmed via grep that the public form only ever needs anon INSERT + a time-window
  UPDATE on `orders` (both already exist as separate policies) and read-only access to
  `groups` (writes go through the admin panel). **Blocked on one verification step before
  writing the `groups` fix:** the admin Groups editor (`adminSaveGroup()` in
  `admin/index.html`) already tries a password-gated `admin_save_group` RPC as its
  PRIMARY save path (falling back to a direct anon PATCH only if the RPC throws) — good,
  since it means dropping `groups`' anon-write policy shouldn't break the admin editor.
  Claire ran `select pg_get_functiondef(oid) from pg_proc where proname =
  'admin_save_group';` and pasted the result — confirmed it genuinely checks the
  submitted name/password against `admin_users` (hashed comparison) and raises an
  exception on mismatch before writing, not just a JS-side assumption. That cleared the
  blocker. Delivered `rls-lockdown-2026-07-14.sql` (in scratch): dropped
  `groups_anon_write`/`Public insert`/`Public update` on `groups` and
  `orders_anon_all`/`Public insert orders` on `orders`. Claire ran it and pasted the
  "after" `pg_policies` result — confirmed clean: `groups` now has only read-only SELECT
  policies (writes exclusively via the password-gated RPC), `orders` has exactly the
  three narrowly-scoped policies the app needs (anon insert, 2-hour-windowed read/update
  for the "Submit Another IO" correction window). Re-tested live afterward: admin Groups
  tab and a new order submission both still work normally. Cosmetic follow-up also done
  same day (`rls-groups-dedupe-2026-07-14.sql` in scratch): consolidated the three
  duplicate (functionally identical) `groups` read policies down to one
  (`groups_public_read`, anon+authenticated, `qual: true`) — confirmed via `pg_policies`.
  RLS audit fully closed out.
- **Admin passwords (front-end hashes) — DONE + TESTED (2026-06-26).**
  Claire's call (James trusts her to decide): remove the SHA-256 hash fallback from the
  shipped file and make the `admin_login` RPC the sole gate. Rationale: everything's moving
  to Supabase, it cleans up the code, and keeps auth where it belongs. Accepted tradeoff —
  if Supabase is ever unreachable, admins can't open the panel until it's back (the public
  IO form is unaffected). Safe because admin management never depended on the front-end
  hashes anyway (see below). Hashes were created by James (plain SHA-256, matching the
  front-end `sha256Hex`); Claire has all the source passwords, so regenerating/adding is
  possible via the `admin_users` table if needed.
- **Admin emails removed from code too — front-end DONE + TESTED, RPC follow-up pending
  (2026-06-26).** Verified via View Source: no hashes (only a comment mentioning them), no
  `@44idigital` emails. Login, wrong-password rejection, and Groups/Orders panel all
  confirmed working. Claire's call: same logic as the hashes — don't leave admin emails sitting
  in page source. Removed all five emails from the front-end `ADMIN_USERS` map (now
  names→role only; names are unavoidable since the login dropdown lists them). Logged-in
  email now comes from the `admin_login` RPC response (`emailFromRpc`). KEY FINDING: the
  admin email is never actually read anywhere in the front-end (the badge uses name+role
  only), so removing it has ZERO functional impact and there's no broken window — the form
  works whether or not the RPC returns email yet.
  FOLLOW-UP (optional, do when next in SQL editor): update the `admin_login` RPC to also
  RETURN `email` (the `admin_users.email` column exists and is populated — Claire confirmed).
  Front-end already handles both array and object return shapes and falls back to empty
  string safely. Claude should write the exact `CREATE OR REPLACE` from Claire's ACTUAL
  current `admin_login` definition (not a template) to avoid breaking live auth.
- **No admin-user management UI yet — known gap, grows with Phases 2/3 (noted 2026-06-26).**
  Today, adding an admin / changing a password / removing someone is done by editing the
  `admin_users` table directly in Supabase (no screen for it). Fine now (5 admins, rarely
  change). This grows into a real feature when Phase 2 (strategists) and Phase 3 (accounting)
  add new user categories — admins + AMs + strategists + accounting, each with their own
  view and scoping. That's when a proper user-management UI earns its place. The
  `admin_users.role` column already supports adding roles, so nothing today blocks it. Same
  "move management out of code into a manageable place" theme as the rest of the project;
  build it with the Phase 2/3 work, not now.
- **Admin name list stays in code FOR NOW — resolve when the admin portal separates
  (decided 2026-06-26).** Claire correctly noted that keeping names→role in the front-end
  map means adding an admin = two places (Supabase row + code). Accepted as temporary: the
  admin portal is being removed from the public group IO pages entirely ("shared backend,
  separate views" — admin moves to its own internal URL). The hardcoded name list should be
  sourced from Supabase THEN, as part of the portal-separation work, rather than bolted onto
  the public form now (which is throwaway once the portal lifts out). Net: the security wins
  (hashes + emails removed) carry forward; the name-list-in-code annoyance is temporary and
  resolved by the portal split. Only bites if an admin is added in the interim.
- **IO ID (`io_number`) — BUILT, awaiting a submission-test session (2026-06-26).**
  System-assigned stored IO number, format `YYYYMMDD-BIZ6-XXX` (date + 6 alphanumerics of
  business name + 3-char random suffix so same-client/same-day IOs don't collide — Claire
  confirmed that happens). Shared `makeIoNumber()` helper used by BOTH submit (stores it on
  the order) and the PDF (reuses the stored value via `window.__lastIoNumber`, else
  generates a preview). The order's own UUID `id` stays the unchanging internal key; this
  is the human-readable reference. Built to be the stable anchor for the Phase-2 edit-an-IO
  / order_audit history.
  STATUS: code complete in `io_v2_44_freq_checkbox.html` but NOT yet committed. The Supabase
  `orders.io_number` text column HAS been added (Claire ran the SQL 2026-06-26). The only
  honest test is a real submission against `ctg`, which Claire is deferring to a dedicated
  submission-testing session (avoids a rabbit hole of Trello cards + cleanup mid-stream).
  Because the column is nullable, it sits harmless until the code goes live — nothing is
  half-broken. NEXT: commit + run the 4-step submission test (real submit on `ctg` → confirm
  io_number in orders table → same-day uniqueness → PDF match) when ready.
  CAVEAT: code now sends `io_number` on insert; safe because the column exists. Pre-existing
  orders have null io_number (fine; predate the feature). Optional later: backfill old rows.
- **Data retention on order records** — orders store the signature, signer name, and all
  intake answers in Supabase. Decide who can see this, how long it's kept, and whether
  there's any client expectation. Better settled before launch than after.
- **Failed Trello-sync visibility / ownership** — if Supabase saves but Trello fails, the
  order still "succeeds" with only a toast. The admin Orders view shows a ✓/⚠ sync status,
  but decide WHO watches it and re-runs failures.
- **Test environment for live submissions — CONFIRMED AVAILABLE (2026-06-26).** The
  **Claude Test Group** is a real Supabase group, slug `ctg`, pointed at the Claude test
  board `69b59ae8ce5662600fbf6b3d`. Loading the live form at the `ctg` URL (real group, NOT
  dev mode) lets you submit a real end-to-end IO that saves to Supabase and builds cards on
  the Claude board — no real client board touched. So real-submission + duplicate-client /
  archived-client testing can be done against `ctg`. No new group needs creating.
- **Trello board-conventions owner** — the system copies tactic-card templates by matching
  Trello LIST NAMES against patterns (`TACTIC_MAP`). If a template list is renamed or a new
  group's board names things differently, the match silently fails and cards just don't get
  copied — no error. Assign someone to own "the boards are named correctly."
- **`TACTIC_MAP` routing should move to Supabase (with the catalog)** — the service→Trello-
  template link currently lives in code and matches by name pattern (fragile to renames).
  Moving it to a `services` field (templates stay IN Trello; only the link moves) makes it
  non-developer-editable and lets it key off a stable list ID instead of a name. Folds into
  the catalog/admin direction. The reserved `trello_template_ref` column on `services` is
  the placeholder for this.

**Team-decision items (gather input; some may become later-phase features):**
- **Remove the admin portal from public group IO pages — COMPLETE (2026-07-10). Originally
  logged 2026-06-26; HARD GATE added 2026-07-07; see the detailed step-by-step entries
  under "Backend / code-review findings" above for the extraction (2026-07-08) and removal
  (2026-07-10) work.** Part of the "shared backend, separate
  views" architecture: the admin portal (gear → login → Groups/Orders panel) currently
  lives in the SAME file as the public IO form. Eventually it should move to its own
  internal URL, leaving the public form with no admin code. NOT urgent today: no links
  have been shared yet, so no client/AE can reach the gear — the only people with a group
  URL are the builders. Options when tackled: (1) hide the gear in production via the
  existing isProd/hostname check — quick, but code still present/console-reachable; (2) true
  split into two files sharing one Supabase backend — the real end state, bigger work;
  (3) staged: hide now, split later. Keep the dev page's admin access intact for testing
  regardless. Design this with the final URL structure, not piecemeal.
  HARD GATE (Claire, 2026-07-07): this URL/structure decision does NOT need to happen
  before Trello or before any of today's remaining work — it can slot in anywhere. But it
  MUST be decided and settled BEFORE starting Phase 2 (strategist worklist) or Phase 3
  (accounting/billing) work, since those introduce new user categories (strategists,
  accountants) that need to land in the correct place from the start, not be built into a
  structure that then has to be reorganized. Flag this explicitly if Phase 2/3 work is ever
  proposed before this decision has been made.
  PROGRESS (2026-07-08): mapped this out with Claire ahead of bringing in her web
  developer. Decided direction: Option 2 (true split), not the hide-the-gear stopgap —
  one new internal subdomain (name TBD, e.g. `admin.yourdigitalgroupresources.com`)
  hosting a standalone admin file, pointed at the SAME Supabase backend (zero data risk,
  zero backend changes). Confirmed this same one subdomain can hold Strategist (Phase 2)
  and Accounting (Phase 3) as additional role-based views inside it later, rather than
  needing a new subdomain per role — `admin_users.role` already supports adding role
  values beyond today's super/AM. Division of labor confirmed: Claude extracts the admin
  portal into its own file (code work); Claire's web developer handles the actual
  subdomain/DNS/deploy-workflow setup (infrastructure Claude has no visibility into).
  Claire is talking to her developer next about the subdomain setup.
  **STEP 1 (extraction) BUILT, awaiting live/browser confirmation — new files added to the
  repo, `index.html` left completely untouched (2026-07-08).** Claire chose the safe
  staged rollout: build the standalone admin file now, leave the public form's existing
  gear-icon admin panel exactly as-is and fully working until the new file is confirmed
  live on its real subdomain — only THEN does a separate, later step remove the admin
  code from `index.html`. Also chose the cleaner long-term structure for shared code
  (factor it into a shared file both pages load, rather than duplicate it into both) —
  matches this project's existing "single source of truth" pattern (the catalog table,
  `priceAndFrequency()` consolidation, etc.); the one tradeoff is her developer needs to
  know the admin subdomain must also serve `shared.js`/`shared.css` alongside
  `admin.html`, not just upload one file.
  New files, repo root: `admin.html` (the standalone admin panel — login, Groups, Orders,
  Suggested Map, Services editor), `shared.js` (Supabase config + `sb()` call wrapper,
  `esc()` XSS-escaping helper, catalog loading — `CATALOG_ROWS`/`loadCatalog()`/
  `rowToServiceData`/`rowToProductConfig`/`priceAndFrequency`, `showToast()` — everything
  confirmed used by BOTH the public form and the admin panel), `shared.css` (CSS reset,
  `:root` color/spacing variables, and the 3 classes admin.html's markup actually uses —
  `.card`/`.lbl`/`.toast`; the public form's own large stylesheet — service tables,
  modals, mobile responsive rules — stays exclusively in `index.html` since admin.html's
  markup never uses any of it, confirmed by scanning every `class=` in the admin markup).
  Extracted from `index.html` lines 931–1284 (admin panel markup), 1348–1369 (login
  modal), and 3570–4924 (all admin JS, one contiguous block) — `index.html` verified
  byte-identical to before the extraction.
  ONE REAL ADAPTATION NEEDED, caught and fixed during verification: the admin panel's
  "Save Group" flow originally had a line that live-updates on-screen pricing if the
  group being saved is also the one an AE currently has open in the SAME page — only
  possible when admin and public form share one page. Standalone, there's no public form
  for it to update, so that line is correctly omitted (not left in as dead/dangerous code
  that would throw if ever reached). Second, smaller adaptation: the "✕ Close" button
  used to reveal the public form underneath the admin panel; standalone, it now returns to
  the login screen instead (`adminLogout()`) — a reasonable stand-in, but a genuine small
  behavior change from the original Close button, not something Claire explicitly asked
  for, so it needs her eyes before relying on it.
  VERIFIED (mechanically, not yet in a browser): `node --check` passes on both new JS
  files with no syntax errors; every `getElementById()` call in `admin.html` resolves to
  a real element in the same file (checked programmatically, zero dangling references);
  every `onclick`/`onchange` handler resolves to a real function; the four RPC calls
  (`admin_login`, `admin_save_group`, `admin_save_service`, `admin_get_orders`) are
  present and byte-identical to the originals; `index.html` confirmed completely
  unmodified via diff.
  NOT YET VERIFIED — genuinely needs a real browser, can't be confirmed by reading code:
  visual/layout rendering (the admin panel is almost entirely inline-styled so risk is
  low, but the shared CSS variables and toast styling should be eye-checked once); actual
  live Supabase round-trips (login, saving a group, saving a service) against the real
  backend, not just traced statically; and the `adminLogout()` behavior-change question
  above. NEXT: Claire opens `admin.html` locally (needs to be served over HTTP, not
  double-clicked as a `file://` path, since the browser may block the `shared.js`/
  `shared.css` includes that way) and runs through login + one real save of each kind
  before this goes anywhere near the actual subdomain. Once confirmed, the follow-up step
  (removing admin code from `index.html`) can be scheduled.
  **CONFIRMED WORKING by Claire (2026-07-10) — login and saves all functioned correctly
  in a real browser.**
  **STEP 2 (removal) COMPLETE (2026-07-10, same session).** With `/admin` fully confirmed
  working (including today's real-bug fixes above), Claire asked for the cleanup pass
  itself rather than wait — the two duplication bugs found earlier today made the case for
  doing it now, not later. Mapped every admin-only boundary precisely before touching
  anything (via a dedicated Explore pass, not assumption): the gear icon (`index.html`,
  one `<div>`), the admin panel markup (`#page-admin` root, one contiguous block), the
  login modal (one contiguous block), and the entire admin JS section (`ADMIN_USERS`
  through `adminSaveGroup()` — one clean, unbroken run with zero public-form code
  interleaved). One delicate exception, NOT part of any contiguous admin block: a 23-line
  chunk inside the shared/public `loadCatalog()` function that derived the admin-only
  `PRICEABLE_SERVICES` global — trimmed out of that otherwise-kept function rather than
  left dangling once `PRICEABLE_SERVICES`/`MAP_SECTION_LABELS` were deleted along with the
  rest of the admin code.
  Removed roughly 1,766 lines total. The gear icon was removed with NO replacement (not
  even a link to `/admin`) — confirmed as the right call: the whole point of today's work
  is that the public form should carry zero admin surface area, and `/admin` is already
  the known, bookmarked entry point.
  VERIFIED programmatically, the same rigor as every prior extraction step: `node --check`
  passes on the modified script; every one of the ~45 deleted admin-only symbol names
  (functions, globals, DOM ids) confirmed to have ZERO remaining references anywhere in
  the file; every kept shared/public function (`loadCatalog`, `applyCustomPricing`,
  `applyGroupBranding`, `loadGroup`, `renderCatalogSection`, `renderMultiTableSection`,
  `buildReview`, `submitIO`, `printIO`, `RADIO_GROUPS`, `SPEND_MINIMUMS`, `CATALOG_ROWS`,
  `sb`, `esc`, `showToast`, `rowToServiceData`, `priceAndFrequency`) confirmed still present
  and intact; zero dangling `getElementById`/`onclick`/`onchange` references anywhere in
  the file (same completeness check used for the original admin.html extraction); braces
  and parens confirmed balanced; exactly one `DOMContentLoaded` listener remains (the
  public form's own startup sequence — admin never had a separate one, it was reachable
  on-demand via the gear icon, so nothing was lost there). `CLAUDE.md` updated to stop
  describing the admin portal as living in `index.html`, and to fix a separately-noticed
  stale reference to a working-file name (`io_v2_45_backend_security.html`) that no longer
  exists in the repo (the real file has been `index.html` this whole time).
  HONEST CAVEAT, same as every prior step touching this file: this can't be verified in an
  actual browser from here. Claire should do one real smoke test on the public form (load
  a group, select services across a few sections, submit a real test IO against `ctg`)
  before trusting this in front of her bosses — everything checked out at the code level,
  but rendering/runtime behavior needs a real browser to be certain.
  `index.html` and `admin/index.html` now each contain exactly one copy of the Custom
  Pricing/Services-editor code — the duplication that caused both of today's real bugs no
  longer exists.
- **Admin portal: subdomain vs. path decision — RESOLVED, path chosen (2026-07-10).** A
  coworker asked whether a subdomain (the original plan) was actually necessary versus
  putting the admin portal at a path on the existing `io` domain. Checked the actual
  deploy config (`.github/workflows/deploy.yml`) rather than assume: it FTP-uploads the
  ENTIRE repo root to `io.yourdigitalgroupresources.com` on every push to `main` — meaning
  a path-based admin portal needs ZERO new infrastructure (no new DNS record, no new FTP
  credentials/target, no new deploy step) versus a subdomain, which would need all of
  that coordinated with whoever manages hosting/DNS. Confirmed this doesn't compromise the
  Strategist/Accounting plan — role-based-views-inside-one-app works identically under a
  path or a subdomain, so the choice was purely about deploy simplicity, not architecture.
  **DECIDED: path-based (`io.yourdigitalgroupresources.com/admin`), and — a related,
  slightly bigger decision — Strategist and Accounting will be SEPARATE paths/files
  (`/strategist`, `/accounting`) rather than tabs inside one shared admin app**, since
  Claire expects they'll need different layouts, not just different visibility into the
  same screens. All three will still share `shared.js`/`shared.css` for the common
  Supabase/pricing logic — same "single source of truth" principle as everything else on
  this project. FLAGGED FOR LATER (not needed now, Phase 2/3 work): a single login gate at
  `/admin` should redirect Strategist/Accounting logins out to their own path; Super Admin
  needs to be able to reach all three (most likely via nav links between them, since
  they're separate apps, not one merged view); and if each path checks login
  independently, a Super Admin visiting all three would be prompted for a password three
  times unless a session is persisted across paths — worth deciding when that work
  actually starts, not blocking today.
  **BUILT (2026-07-10): `admin.html` moved to `admin/index.html`** so it's reachable at
  the clean `/admin` path rather than `/admin.html`. `shared.js`/`shared.css` deliberately
  LEFT AT THE REPO ROOT (not moved into `admin/`) specifically so the future `/strategist`
  and `/accounting` folders can reference the same two files via a relative `../` path
  without duplicating them — the folder structure was chosen with those two future
  additions already in mind, not just today's one file. Updated the two references inside
  `admin/index.html` (`<link href="shared.css">` → `../shared.css`; `<script src="shared.js">`
  → `../shared.js`). No deploy workflow changes needed — `deploy.yml`'s FTP upload already
  copies the whole repo tree recursively with no folder exclusions, so `admin/` deploys
  automatically. VERIFIED: `node --check` still passes on the relocated inline script;
  both updated paths confirmed correct via grep; `index.html` untouched (this was a pure
  file move + two path edits, no logic changes). NOT YET VERIFIED: hasn't been re-tested
  in a browser since the move (the pre-move version WAS confirmed working, per above) —
  worth Claire's usual local-serve smoke test again before this goes to the real domain,
  purely to rule out a path-resolution mistake, not because any logic changed.
  **CONFIRMED LIVE, one real hosting wrinkle found (2026-07-10).** Claire merged both
  extraction PRs to `main` herself to test directly on the live site (her established
  testing method — nothing has been shared with clients/AEs yet, so this carries no real
  risk). Deploy confirmed successful (`Deploy to io subdomain` GitHub Action, commit
  `63055d2`, ran clean). Visiting `https://io.yourdigitalgroupresources.com/admin/`
  (folder shorthand, no filename) incorrectly showed the PUBLIC FORM's own "Invalid Link"
  error screen — NOT a bug in the extraction; the file is there and correct. ROOT CAUSE:
  the live host apparently doesn't have "directory index" serving turned on for this path
  (i.e., automatically serving `index.html` when a bare folder URL like `/admin/` is
  requested) — that's a web-server SETTING, unrelated to the subdomain-vs-path decision;
  it does NOT reintroduce any of the subdomain work (no new DNS/SSL/deploy-target needed).
  CONFIRMED WORKING once Claire used the exact filename:
  `https://io.yourdigitalgroupresources.com/admin/index.html`.
  TWO WAYS TO HANDLE, not mutually exclusive: (1) always link to `/admin/index.html`
  explicitly wherever the admin URL is shared/bookmarked — works today, zero server
  changes; (2) ask whoever manages hosting to turn on directory-index serving for a
  cleaner bare `/admin/` URL — worth raising with Claire's developer when the
  Strategist/Accounting paths get built (same fix would apply to `/strategist`/
  `/accounting` too), not urgent on its own.
- **Spend minimums — wording vs. enforcement — RESOLVED (2026-07-10).** Claire's decision:
  recommended, not enforced — confirmed as the CORRECT existing behavior, not a bug to
  change. Checked the actual code before touching anything: the inline warning shown while
  typing a spend amount already said "Recommended minimum is $X/mo" (not "required"); the
  only hard block at submission is that a spend-tracked service needs SOME real spend
  entered (can't submit $0/blank) — the specific minimum number itself was never enforced.
  The one inconsistent piece was the legal disclaimer text, which said campaigns "require a
  minimum monthly spend as noted" — overclaiming a hard requirement that isn't real. FIXED:
  reworded to "have a recommended minimum monthly spend as noted, for the campaign to have
  a meaningful chance at results" — now consistent with the inline warning and the actual
  submit-blocking behavior. No JS logic changed, wording only.
- **Campaign Length required? — RESOLVED, confirmed as intentional (2026-07-10).** Claire's
  decision: stays optional, a quick-select helper — confirmed this already matches current
  behavior (the dropdown has always been optional; End Date is a normal, unlocked date
  field an AE can freely override regardless of what's picked). No change needed — this was
  already correct, just hadn't been explicitly confirmed as a deliberate choice before.
- **Auto-check a service when a spend is typed** — entering spend in an unchecked row
  currently doesn't count it. Auto-check on input so spend can't silently fail to register.
  (Tier-A correctness item from the rollout plan.)
- **Campaign length required?** — not currently required (still open).
  **Dropdown options updated 2026-07-10** (Claire's request, ahead of her Monday
  leadership meeting): options changed from 3/6/12 to **1/2/3/6/12 months**, for faster
  quick-select on shorter campaigns. Confirmed via code inspection (not just this edit)
  that the End Date field is a normal, unlocked `<input type="date">` — `calcEndDate()`
  only auto-fills it when Start Date or the Length dropdown changes, so an AE can freely
  type/pick a custom end date afterward and it holds. Purely an HTML options-list edit;
  no JS touched. Verified: `node --check` on the main script block still passes; the five
  new option values render correctly in the file.
- **Per-service start/end dates** — one date set today covers the whole order; per-service
  is a structural change. Confirm it's actually needed.
- **Intake form back button** — intake modal intentionally has no dismiss (forces a
  decision). Decide if that's too rigid.
- **Cancellations** — not handled anywhere. Decide if it lives here, in Trello, or as an
  order status (connects to "service status over time" in Phase 3).

---

## BUILT-BUT-EMPTY TABLES (awaiting data)

- **`group_service_overrides`** — CORRECTED (2026-07-10): this table is NOT the live
  mechanism and should NOT be treated as "awaiting population." The original plan
  (see the now-stale ADMIN UI ROADMAP note below) was to swap Custom Pricing's
  save-target from `groups.io_pricing` over to this table — that swap never happened.
  Custom Pricing has continued to write real, live overrides straight to
  `groups.io_pricing` (a JSON column on `groups` itself) ever since, including the
  paper-IO-sourced overrides loaded this session (e.g. CI Digital's site-tier pricing).
  This table remains empty and disconnected from every part of the running app —
  it is dead groundwork from an abandoned migration, not a populated-later table.
  Found live by Claire: she ran a Custom Pricing override, saw it correctly reflected
  in the admin editor, then checked this table in Supabase directly and (correctly)
  found nothing there — flagged it specifically so a future dev/AM poking around the
  database doesn't mistake it for where pricing overrides actually live.
  **Not dropped** — flagged here instead, since dropping a table is a one-way,
  destructive schema change; say the word if you want it removed outright instead of
  just documented as dead.
- **`ae`** — AE roster (name, trello_handle, group_id, active). Powers a name-picker
  so AEs select themselves and their Trello handle autofills. Populate via CSV once
  handles are collected from staff (a people task, not a code task). Needs each
  group's UUID in the CSV — run `select id, name from groups` to map names→UUIDs.

---

## ADMIN UI ROADMAP (front-end editing)

Building a table ≠ building its editing screen. Status per table:
- **`group_service_overrides`** — STALE NOTE, corrected 2026-07-10 (see
  BUILT-BUT-EMPTY TABLES above): the plan described just below ("needs its
  save-target swapped... Nearly free") never happened and should not be treated as
  upcoming/planned work — `groups.io_pricing` is the real, permanent, live mechanism
  now, with real production overrides already stored in it. Original stale note, kept
  for history only: ~~editing screen mostly EXISTS (the Custom Pricing sub-tab); needs
  its save-target swapped from the old `io_pricing` blob to override rows. Nearly
  free.~~
- **`services`** — NO admin screen yet. (A) read-only view = next up; (5b) full
  add/edit/retire CRUD with a permission-guarded server-side save (mirror the
  `admin_save_group` RPC pattern) = bigger, later.
- **`intake_forms`** — NO admin screen. A form-builder UI (edit questions through the
  interface) is the biggest "someday" front-end piece. Dev-edited for now.
- **`ae`** — no dedicated screen yet; CSV import covers initial population.

Role-gating to preserve: Custom Pricing is super-admin only (AM-tier can't see/change
pricing), enforced in UI AND server-side. Carry this pattern to new editing screens.

**Two feature requests logged, not built (2026-07-10).** Claire wants these as visible
progress to show her bosses, but correctly deprioritized both behind the `index.html`
cleanup and Monday prep — genuinely two different-sized pieces of work, checked against
the actual code before writing this down:
- **Drag-and-drop reordering of services within a section** — moderate-sized UI upgrade.
  `sort_order` already exists as a per-service field, editable today only by typing a
  number into the Services editor (no visual feedback on where it'll land relative to
  siblings). A drag-and-drop reorder would replace the number-guessing with something
  that shows the real order directly; self-contained to the Services editor, doesn't
  touch section-level structure at all.
- **Section-level management (reorder whole sections, add a new section without code)**
  — a bigger structural gap, confirmed by reading the actual startup code rather than
  assumed: a section's ON-SCREEN POSITION today is purely the physical order its HTML
  block is typed into `index.html` (`renderCatalogSection('id')`/`renderMultiTableSection
  ('id')` calls at startup only fill ROWS into a card that already exists at a fixed
  position — they don't control where that card sits). There is no database table for
  sections at all; unlike individual services, a section has no row, no order field, no
  admin screen. Adding a genuinely NEW top-level section, or reordering existing ones,
  needs a code change either way today. Closer in scope to the original services-table
  migration than a quick add — a real `sections` table (label, icon, order, whatever else
  a card needs) plus a generic per-section render loop instead of one hardcoded call per
  section.
Both parked for whenever there's time/priority — worth revisiting once the `index.html`
cleanup and Trello work are further along, per Claire's own prioritization.

**Drag-and-drop reorder — BUILT + VERIFIED (2026-07-10), same day, once the `index.html`
cleanup and pricing pass wrapped up.** Claire confirmed she wants the full
section-management feature too (not just reordering) — logic: same reasoning as the rest
of this project, get things out of code and into Supabase/admin screens. Given the size of
full section management (comparable to the original services-table migration), sequenced
into stages: this reorder feature first (small, self-contained, reuses existing
`sort_order` + `admin_save_service` — no schema or RPC changes), then the sections-table
foundation, verified on its own before any admin UI is built on top of it (see the two
entries below for that work).
BUILT: `admin/index.html`'s `renderSuggestedMap()` — a drag-handle (⠿) on each row,
`draggable="true"`, wired to `mapRowDragStart()`/`mapRowDragOver()`/`mapRowDrop()`. Drop is
constrained to WITHIN the same section band — cross-section drops are rejected outright,
matching the existing principle that changing which section a service belongs to needs a
deliberate action (the Edit form), not something drag should do silently. Drag handles are
hidden whenever a search filter is active (search hides sibling rows, which would break
the true adjacency the reorder math depends on) and for inactive rows (they don't
participate in the live form's ordering at all) — same super-admin-only gating as the
existing Edit button. On drop: recomputes `sort_order` sequentially by 10s for that
section's active rows in their new order, saves only the rows whose value actually
changed (minimizes RPC calls) via the EXISTING `admin_save_service` RPC — zero schema or
backend changes needed for this feature.
VERIFIED via simulation, 7 cases: dragging the last item to the front correctly bumps
every sibling's order; a deactivated service in the same section is correctly excluded
from the reorder entirely (never touched); a cross-section drop attempt is correctly
rejected; dropping a row on itself is a correct no-op; only genuinely-changed rows are
included in the update batch. `node --check` passes; zero dangling DOM/handler references
(same completeness check used for every prior admin-editor addition).

**Sections table + dynamic public-form rendering — BUILT, awaiting Claire's live/browser
confirmation before Stage B starts (2026-07-10).** The foundation for full section
management. Explicitly the highest-risk piece of this whole feature — it touches how the
ENTIRE public form assembles itself — so treated with the same rigor as every other
change to this specific file, plus an extra layer: simulating the generated HTML and
diffing it against the exact original static markup, not just checking it parses.
SCHEMA DECISION, simpler than first planned: the new `sections` table only stores what's
genuinely a content/business decision — `id`, `label`, `icon`, `header_note`, `sort_order`,
`active`. Dropped `render_type` and a "has spend column" flag from the original plan —
both are fully DERIVABLE from the services themselves (a section is multi-table if any of
its active services has a `subsection_label`; it needs a Spend column if any is
`pricing_mode='spend'`), so storing them separately would just be a second place that
could drift out of sync with the real catalog data — same reasoning behind everything
else this project has moved out of hardcoded/duplicated state.
Migration SQL (`create_sections_table.sql`, given to Claire) snapshots all 17 existing
sections' exact current label/icon/header-note/order — verified this is a complete,
faithful snapshot by re-deriving each section's expected shape from the ACTUAL catalog
data already established this session (e.g. confirming `td`/`sem`/`sma`/`lt` are the only
4 single-table sections with a spend item; `vid`/`ctv`/`audio` are the only 3 with
`subsection_label` set anywhere), not from assumption.
`index.html`: replaced the 17 hand-typed `<div class="card">` blocks with one empty
`<div id="dynamic-sections">`, filled at startup by a new `renderSectionCards()` (builds
every card's header/badge/table-or-container skeleton from `SECTIONS` + auto-detected
shape) and `renderAllSectionRows()` (replaces the old fixed, explicit
`renderCatalogSection('id')`/`renderMultiTableSection('id')` call list — now loops over
whatever's actually in `SECTIONS`, so a section added later gets its rows generated with
zero code change, which was the entire point).
**TWO REAL BUGS CAUGHT DURING THIS WORK, both about the SAME underlying risk — a section
added later being silently invisible to code that assumed the original fixed 17:**
1. `updateBadges()` had its OWN separate hardcoded 17-id array — a new section's "X
   selected" badge would never have updated. Now derived from `SECTIONS`.
2. `printIO()` grouped line items by a hardcoded `SECTION_LABELS` map — a service from a
   section NOT in that map would have been COMPLETELY OMITTED from the printed IO, not
   just mislabeled — its dollar amount excluded from the printed one-time/monthly totals
   too. This is the more serious of the two: a real money-accuracy risk on the actual
   contract document, not a cosmetic one. Fixed the same way — iterates `SECTIONS`
   directly now (which also fixed print ordering to correctly follow `sort_order`,
   matching the live form, rather than whatever arbitrary order the old hardcoded map
   happened to be typed in).
Searched the whole file afterward for any OTHER hardcoded list of section ids before
calling this done — found none; those two were the only ones.
VERIFIED via simulation: generated card HTML compared structurally against the exact
original markup for representative cases (a plain flat section, a spend section, a
multi-table section, a no-header-note section) — colgroup/thead/table-class/container-id
all matched exactly; cross-checked the auto-detection logic (multi-table vs single,
spend-column vs not) against all 17 real sections' actual service shapes from this
session's own catalog data, confirmed every one classifies correctly; simulated the fixed
`printIO()` grouping against a hypothetical brand-new section, confirming it's now
correctly included in both the printed line items AND the printed totals. `node --check`
passes; zero dangling DOM/handler references anywhere in the file; braces/parens balanced.
ONE MINOR, HONESTLY-FLAGGED COSMETIC DELTA: `web-ot`/`web-mo`'s header used to show
"— One-Time"/"— Monthly Recurring" in a distinctly lighter/smaller style than the rest of
the title; the generic template renders the full label uniformly instead (matching every
other section's plain title style). A deliberate simplification to avoid special-casing
2 of 17 sections — flagged directly rather than silently changed, since "zero visual
change" was the explicit goal for everything else.
NEXT: Claire runs `create_sections_table.sql`, then does a full visual pass across all 17
sections on the live form (collapsed/expanded, checkbox behavior, mobile view) — this is
the one thing that genuinely cannot be confirmed without a real browser. Stage B (the
admin Sections tab) does not start until this is confirmed.

**Sections admin tab — BUILT + VERIFIED (2026-07-10), full section-management feature now
complete.** Built once Claire confirmed the Stage A foundation looked correct in a real
browser (all 17 sections, including the 3 multi-table ones, rendered identically). New
"Sections" tab in `admin/index.html`, same visual/permission pattern as the existing Groups
Custom Pricing / Suggested Map screens (super-admin only, same hidden-not-dashed pattern
for AM-tier):
- **List + drag-to-reorder** — same pattern as the Suggested Map's service reorder built
  earlier today, simplified since sections are one flat list (no per-section "band"
  constraint needed). Recomputes `sort_order` sequentially by 10s on drop, saves only
  changed rows via the RPC below.
- **Edit form** — label, icon, header note. Deliberately NO render-type or table-shape
  field — both stayed auto-derived from the services themselves (decided back in the
  Stage A foundation work), so there's nothing here that could be set inconsistently with
  the actual catalog.
- **"+ New Section"** — creates a new, initially-empty section (placed after the current
  highest `sort_order`); services get added to it afterward through the existing Services
  editor, which now lists ALL active sections as valid choices (see cleanup below).
- **Deactivate/Reactivate** — same "hide, don't delete" principle as services. Added a
  clear warning when deactivating a section that still has active services in it, since
  the public form only loads `active=true` sections — deactivating would make that
  section's whole card, and every service in it, disappear from the live form at once,
  not just get hidden from a list.
New RPC `admin_save_section` (written fresh — no prior version existed to diff against,
unlike every other RPC update this project has made) mirrors `admin_save_service`'s exact
shape: password-validated, super-admin-only, case-when-present for nullable fields on
update.
**REAL CLEANUP UNLOCKED, not just added:** `SAFE_DYNAMIC_SECTIONS` and
`MAP_SECTION_LABELS` (both hardcoded lists in `admin/index.html`, dating from when only
SOME sections had been converted to dynamic rows) are now fully REMOVED, not merely
converted to read from data — the underlying restriction they existed for (a new service
in certain sections wouldn't have a checkbox to select it with) no longer exists anywhere,
now that Stage A made every section dynamic by construction. This removes an entire hard
block that used to stop a new service being created in most sections at all, and the
"Deactivate ⓘ" disabled-placeholder that used to show instead of a real button for those
same sections. Replaced by `SECTIONS` (loaded fresh at page init, same as the public form)
+ a small `sectionLabel(id)` helper.
VERIFIED via simulation, same rigor as every prior step today: reorder logic (drag-to-
front correctly bumps siblings; inactive sections never touched; self-drop is a no-op);
new-section id-collision validation (blocked before the RPC is ever called); new-section
default sort_order placement (after the current highest). ALSO verified end-to-end in a
real driven simulation of the actual admin page (not just isolated logic) — loaded the
page, opened the Sections tab, confirmed the list rendered with the correct label and a
working drag handle, opened "+ New Section", filled the form, and called the real
`adminSaveSection()` — completed cleanly with no thrown errors, form closed correctly
afterward. `node --check` passes; zero dangling DOM/handler references anywhere in the
file (same completeness check used for every admin-editor addition this project).

---

## LATER PHASES (not now)

- **Phase 2 — Strategist worklist (read-only, exception-based).** Compares the goal
  sold (from the IO) against platform actuals (Looker/TapClick). Surfaces off-track
  campaigns. NOT a reporting engine; NOT rebuilding analytics. Keystone open question:
  can underlying data be extracted from Looker, or only PDFs?
- **Phase 3 — Accounting / billing reconciliation.** Replaces the monthly spreadsheet.
  Needs three things not captured today: proration policy, revenue-share data, and
  service-status-over-time. `group_service_overrides` was originally earmarked to
  extend with revenue-share columns for this — still a reasonable option since it's
  currently unused either way, but note (2026-07-10) it is NOT where current pricing
  overrides live (that's `groups.io_pricing`); reusing it here would mean designing
  its actual activation from scratch, not just adding columns to something already live.
- **Shared join key — now an IO ID, not a campaign ID (decided 2026-06-26).** One IO can
  sell multiple campaigns, so the key identifies the IO; campaigns hang off it later. Being
  added now as a stored, system-assigned `io_number` (format `YYYYMMDD-BIZ6-XXX`, see
  OPERATIONAL section). The order's existing `id` UUID is the unchanging internal key;
  `io_number` is the human-readable stored reference shown on form/PDF/Trello/billing.
- **Edit-an-IO with change tracking (Phase 2 feature, context noted 2026-06-26).** Future:
  let staff edit a submitted IO. Requirement Claire flagged — each edit must be tracked
  WITH A REASON (who/what/when/why). The existing `order_audit` table is where that history
  lives. Design constraint this puts on today's work: `io_number` and the order `id` must
  stay STABLE across edits (an edit = a new version of the same IO, not a new IO), so audit
  rows and any joined campaigns/billing point at an anchor that never changes. The
  `io_number` being built now is designed to be that stable anchor.
- **Email notification on IO submission — PARKED, flagged 2026-07-13, updated 2026-07-14.**
  On real submission, send an email to a group's configured "IO recipients" — explicitly
  NOT the client, only internal staff (e.g. AM, possibly accounting). No actual
  email-SENDING capability exists anywhere in this app today (confirmed via repo search —
  nothing currently dispatches an email; this genuinely needs a provider + trigger code).
  Correction from the 2026-07-13 note: the RECIPIENTS FIELD ALREADY EXISTS and already has
  a full admin UI — found live 2026-07-14, built in an earlier session, missed on first
  pass. `groups.io_recipient` (singular column name, comma-separated text) is already
  editable in the Groups editor ("IO Recipients — comma-separated, notified on every
  submission," alongside From Name/From Email/Has KOC), and the public form already fetches
  it as part of `selectedGroup` (confirmed in console output) — nothing reads or acts on it
  yet, but no new column or admin UI work is needed for this piece. Still needs, before
  building the actual send:
  1. **Email provider** — none chosen yet (Resend/SendGrid/Postmark/tied to an existing
     Google or Microsoft business account are all options). Requires a new secret + likely
     a new Edge Function (or an addition to `claude-proxy`).
  2. ~~Recipients field shape~~ — RESOLVED, see above. Use `selectedGroup.io_recipient`,
     split on commas.
  3. **Email content — RESOLVED 2026-07-14: real PDF attachment, not inline HTML/text.**
     Context: the CURRENT (WordPress-based) IO submission process Claire's team is used to
     emails the team a notification with the submitted IO as a PDF attachment (there, it's
     a human-uploaded file, not machine-generated). An inline-HTML-email alternative (reuse
     `printIO()`'s existing styled output directly as the email body, no file at all) was
     proposed as a simpler option — Claire's boss confirmed a real PDF attachment specifically,
     so accounting can download it. This means actual PDF GENERATION is now a confirmed
     requirement, not just a nice-to-have — same underlying capability the parked
     IO-card-history feature below also needs, so building it once should serve both.
  **RESOLVED 2026-07-14 — PDF generation approach: client-side (Option a), no vendor.**
  Explicitly chosen over a hosted HTML-to-PDF API specifically to avoid a new recurring
  cost ("the idea with building this is to avoid recurring costs" — Claire). Screenshot-
  quality output confirmed acceptable — Claire's own words: current manually-uploaded IO
  PDFs from the WordPress-based predecessor system already "look like they used a fax
  machine from 1990," so a clean html2canvas capture is a real improvement, not a
  downgrade. Built 2026-07-14 (`9877052`): `buildIoDocumentHtml()` extracted from
  `printIO()` so the print view and the PDF are ALWAYS the same content (no second,
  driftable representation of the IO — the exact risk flagged before picking this
  approach); `generateIoPdfBlob()` renders that same HTML in a hidden iframe, captures it
  via `html2canvas`, and wraps the result into a real multi-page PDF via `jsPDF` — both
  free, client-side libraries loaded via CDN script tag, no account/key needed.
  Still needed before the email send itself works: **Email provider** (see point 1 above)
  — PDF generation itself is done and also already wired into Trello (see below).
- **Returning-client IO card should accumulate history, not overwrite — BUILT 2026-07-14
  (`d22d93a`), Edge Function deployed, payload-size bug fixed 2026-07-14 (`878be08`).**
  Originally flagged 2026-07-13: submitting a new IO for a client who already has an "IO"
  card on Trello OVERWRITES that card's description with the new IO, discarding the
  previous one's visible content (the full history was always safely preserved in
  Supabase's `orders` table regardless — this was only ever about what's visible on the
  Trello card itself). Resolved via the same PDF generation built for the email feature
  (see above) — the card's text description still shows the LATEST IO only (unchanged
  behavior), but every submission now ALSO attaches a dated PDF snapshot to that same
  card, so nothing before it ever disappears. Needed the new `trello_attach_file` Edge
  Function target (see `claude-proxy-index-2026-07-14.ts` in scratch — real multipart
  file upload, different shape from every other Trello target this function handles);
  Claire merged the app code and deployed the Edge Function.
  **Bug found on first live test:** the attach failed with HTTP 546 (Supabase Edge
  Function memory-limit-exceeded) — the base64-encoded, uncompressed PNG capture at
  `html2canvas` scale 2 was too large for the function to decode into a Trello upload.
  Compounding bug: the code logged `"Attached IO PDF to card"` even though the attach
  failed, because `fetch()` only rejects on network failure, not on HTTP error status —
  the code never checked `response.ok`, so a failed attach was indistinguishable from a
  successful one in the console. Both fixed in `878be08`: `html2canvas` scale lowered to
  1.5, canvas/PDF export switched from PNG to JPEG (0.85 quality) with jsPDF `compress:
  true`, shrinking the payload well under the memory limit; the attach fetch now checks
  `response.ok` and `console.warn`s with the actual status/body on failure instead of
  always logging success. **CONFIRMED LIVE 2026-07-14** — Claire merged, submitted a new
  order, and confirmed the PDF now attaches to the Trello IO card successfully. Feature is
  fully working end-to-end: real PDF attachment on every submission, no silent
  false-success logging.
- **AM/leadership meeting feedback (round 1) — 2026-07-14. Four items built, two scoped
  for later, two need Claire/AM follow-up before building.** Claire brought back initial
  notes from a meeting; more detail expected once the AM spends more time in the form.
  **Built (`dacd3e8`, `0f1b74a`):**
  1. **Business name on every Trello tactic card** — every tactic card name now ends
     `Tactic — Client` (e.g. `SEM — Acme Corp`). Applied before the existing dedup check
     so resubmissions correctly recognize a card that already has the suffix. The IO card
     itself is deliberately NOT renamed — it's already scoped to one client via its list,
     and renaming it would break `isIoName()`'s exact-match detection used to find/update
     it on future submissions (flagged to Claire as a deliberate exception, not an
     oversight).
  2. **New/reopened client lists always land at board position 5** — after the 4 fixed
     reference lists every group's board starts with (confirmed via Claire's screenshot:
     Quick Resources / Podcast / General Questions / 44i Recommendations). Computes an
     exact position between the current 4th and 5th list so a new one always lands in
     the same spot even if other client lists already exist; falls back to `'bottom'` if
     the board doesn't have 4 lists to anchor against. Applies both to brand-new list
     creation and to reopening an archived list. Needed the Edge Function's
     `trello_update_list` target extended to accept `pos` (not just `closed`/`name`).
  3. **Visitor ID Setup Fee auto-selects** — confirmed via Claire's screenshot that
     "Visitor IDs Setup Fee" is its own separate, standalone checkbox (not the existing
     spend-threshold `auto_add_setup_fee` mechanism, which is a different, already-built
     concept). Built a new `auto_select_service_id` column (mirrors
     `standalone_hosting_service_id`'s exact pattern) — checking a Visitor ID tier
     auto-checks its companion Setup Fee row, but it stays a normal, fully overridable
     checkbox (a courtesy pre-check, not a hard lock, per Claire: "have it selected if the
     AE forgets"). Added to the admin Services editor's field list.
     **Needs Claire to run/confirm:** `auto-select-service-2026-07-14.sql` (in scratch)
     adds the column and updates `admin_save_service`; the actual linking (which Visitor
     ID tier ids should point at the Setup Fee id) needs the real ids pulled from
     Supabase first — a verify query is included in the SQL file.
  4. **"Needs KOC" label attached automatically** — confirmed via Claire: exact label
     title `Needs KOC`, color yellow. Rather than relying on a Trello template card
     already carrying the label (confirmed it wouldn't transfer anyway — Trello's
     copy-card `keepFromSource` doesn't include labels, only checklists/attachments/
     stickers), the label is now applied by our own code based on each service's
     `koc_requirement`, reusing the `requires_koc` flag already computed per line item.
     Looked up by name once per submission (not per card, and only when something sold
     actually needs it), then attached to every tactic card under a KOC-requiring
     workflow. Logs a warning rather than failing the submission if the board has no
     "Needs KOC" label yet. Needs the new `trello_attach_label` Edge Function target (in
     `claude-proxy-index-2026-07-14.ts`, in scratch) deployed — attaches an EXISTING label
     by id, distinct from the pre-existing `trello_add_label` target which creates a
     brand new label every time (would have littered boards with duplicate "Needs KOC"
     labels over time).
  **Scoped, not yet built — bigger pieces, deliberately sequenced separately:**
  5. **Reselling a product should update its Trello card via a PDF, same pattern as the
     IO card** — Claire's own idea, directly solves the "reselling doesn't update the
     tactic card" question logged earlier today: keep the card's description showing the
     latest sale, but attach a dated PDF of that submission's intake answers for history,
     reusing the same PDF-generation approach already built for the IO card. Also
     resolves item 6 below (intake as PDF instead of in the description).
  6. **Intake answers as a PDF instead of in the card description** — folds into item 5
     above rather than being built twice.
  **Needs more detail before scoping further:**
  7. **QUR quoted price** — AEs need to enter the actual price once quoted for a QUR
     (Quote Upon Request) item; today there's no input for this at all, only the "QUR"
     placeholder label. Needs a new "Quoted Price" field on QUR rows that flows through
     Review, the printed IO, and Trello descriptions in place of the placeholder.
  8. **TLP Custom (15+) dynamic intake grid** — ties into item 7: the structured
     locations/services grid already exists for the 3 fixed TLP tiers (5/10/15 pages),
     with the Custom/QUR tier explicitly left out of it in the original build ("pending
     AM decision" per the code's own comment) — this isn't new territory, just finishing
     a decision that was already anticipated. Once an AE enters the quoted page count,
     the same grid mechanism can size itself to that number instead of a fixed tier cap.
- **New client didn't appear in Client picker until a hard refresh — FIXED 2026-07-14
  (`7119cf9`).** Claire noticed: submit an IO for a brand-new client, then immediately
  "Submit Another IO" for the same group — the client just created wasn't selectable in
  the Client picker dropdown yet. Root cause: `CLIENT_ROSTER` (the picker's data source,
  via `get_group_clients`) was only ever loaded once, on the initial group page load
  (`loadGroup()`/`applyDevGroup()`) — nothing re-loaded it after a submission actually
  created a new client record. Fixed by calling `loadClientRoster(selectedGroup.id)`
  right after a successful submit, before the success page shows, so the very next
  submission's picker is already current. Not yet retested live.
- **Services editor silently discarding Label edits — FIXED 2026-07-14 (`ef37166`),
  found by Claire while removing the diamond (§) service-specific term via the new Legal
  Text tab.** Editing an existing service's Label showed the normal "Service updated!"
  success toast, but the label itself never actually changed after reload — every other
  field saved correctly. Root cause: `autoServiceId()` (bound to the Label field's
  `oninput`) regenerates the ID field's value live from Section+Label, UNLESS the ID
  field is flagged `dataset.manuallyEdited` — a guard that exists specifically so editing
  an EXISTING service's label doesn't touch its (immutable, disabled) id. `adminEditService()`
  disabled the id field when opening an existing service, but never set that flag — so
  typing a new label silently regenerated the DISABLED field's value anyway (disabling an
  input only blocks direct typing into it, not JS setting `.value`). That regenerated id —
  not the service's real one — is what got sent as `p_service_id` on Save, matching zero
  rows in the RPC's `UPDATE ... WHERE id = p_service_id` (a 0-row UPDATE raises no error in
  Postgres), so nothing persisted despite the success toast. Confirmed via the exact same
  bug already found and fixed once before on the analogous Sections editor
  (`adminEditSection()`, which does set this flag, with a comment reading "don't let label
  edits during Edit clobber the existing id") — the fix was apparently never carried over
  to Services. Fixed with the identical one-line change: set
  `admin-svc-id`'s `dataset.manuallyEdited = '1'` when populating the edit form.
  **Also delivered (`admin-save-service-fix-2026-07-14.sql`, in scratch, Claire needs to
  run):** hardened the `admin_save_service` RPC itself so a `p_service_id` that matches no
  row raises a clear exception instead of silently updating nothing while still reporting
  success — this makes the RPC safe against any FUTURE bug of this same shape, not just
  today's specific cause. Not yet retested live — Claire should merge, run the SQL, and
  confirm editing a service's label (including the diamond-term removal she was in the
  middle of) actually sticks now.
- **Agreement & Disclaimers text made admin-editable — BUILT 2026-07-14 (`4c84de4`),
  Claire needs to run the SQL to activate.** Claire asked for a way to update the legal
  text without a code change — the 4 disclaimers (Non-Cancellation, Intellectual
  Property, Service-Specific Terms, Digital Advertising) and their 3 checkbox labels were
  hardcoded directly in `index.html`. Two design questions asked and answered before
  building (both her call, not guessed at): (1) global text for every group, not
  per-group — matches how it works today; (2) on-screen wording and printed/PDF wording
  stay two SEPARATE editable fields per disclaimer, same as today, rather than unified
  into one canonical version — **note:** while scoping this, found the on-screen and
  printed text for the same 4 disclaimers already say slightly different things today
  (e.g. the printed Digital Advertising clause omits "Mobile" and is worded around
  billing rather than minimum spend) — Claire chose to preserve this as-is rather than
  have me silently correct/unify actual legal wording.
  **Built:** new `legal_content` Supabase table (single global settings row, not a
  per-item list — this is a small fixed set of known fields, not something Claire adds
  new rows to), read-only to the public form, written only through a new
  `admin_save_legal_content` RPC (mirrors `admin_save_group`'s password+role validation;
  restricted to super-admin, same level as Custom Pricing/Services/Sections — Claire,
  flag if AMs should be able to edit this too). New "Legal Text" admin tab: one
  on-screen/printed textarea pair per disclaimer, plus the 3 checkbox labels, Save button
  (and textareas) disabled for AM logins. On the public form, the 4 on-screen disclaimers
  and 3 checkbox labels are wrapped in spans with stable ids; a new `loadLegalContent()`
  overwrites them from the table on page load — if that fetch fails, the existing
  hardcoded HTML is simply left in place untouched, so a Supabase hiccup degrades to
  today's exact text rather than breaking the Agreement card. The printed/PDF Terms &
  Conditions section in `buildIoDocumentHtml()` works the same way, with a literal
  `{{group_name}}` placeholder token (documented in the admin UI) substituted with the
  signing group's real name — used today only in the printed Intellectual Property
  clause, same as the current hardcoded `${groupName}` interpolation.
  **Verified:** all 3 files' script blocks parse; the SQL seed text was checked
  byte-for-byte against the actual live HTML/JS strings (not retyped from memory) to
  rule out a transcription error in the special characters (‡◊§) — confirmed exact
  match; the `{{group_name}}` fallback/substitution logic was simulated directly against
  the extracted function and produces identical output to today's hardcoded version when
  the table hasn't loaded, and correctly substitutes when it has.
  **Not yet done:** Claire needs to run `legal-content-2026-07-14.sql` (in scratch) in
  the Supabase SQL editor to create the table/RPC — nothing renders from the new source
  until then (the page just keeps showing the hardcoded default, which is intentionally
  identical). Not yet confirmed live in a browser either.
- **Duplicate-client-by-typo protection — BUILT 2026-07-14 (`4ed42ce`).** Claire asked
  whether anything catches an AE typing a client name that matches an EXISTING client
  instead of using the picker. Existing coverage (built earlier, `find_or_create_client`
  RPC): if no `client_id` is passed, it falls back to a case-insensitive EXACT name match
  within the same group. Gap identified: a typo, missing "Inc", or extra space still slips
  past an exact match and creates a genuinely separate client record. Closed the gap with
  a front-end-only advisory check, live while typing the Business Name field (only runs
  when no client is already picked): normalizes both the typed name and every roster
  name (strip punctuation, collapse whitespace, lowercase), then checks two ways — (1)
  strips a trailing business-entity suffix (Inc/LLC/Corp/Co/Ltd/etc.) from both and flags
  an exact match regardless of edit distance, specifically to catch "ABC Plumbing" vs.
  "ABC Plumbing, Inc." — the single most common real-world cause of this kind of near-
  duplicate; (2) otherwise falls back to a length-scaled Levenshtein distance to catch
  genuine typos, without flagging names that are just legitimately similar-but-different.
  On a likely match, shows an inline orange banner under the field naming the existing
  client with a one-click "Use existing client" link that pulls their record in via the
  same `applyClientPick()` the picker itself uses. Purely advisory, never blocks
  submission — an AE can still type straight past it for a genuinely new, similarly-named
  business. Verified via simulation run directly against the shipped functions (exact
  match, suffix-added match, single-typo match, "and" vs. "&", genuinely different name,
  too-short input all behaved correctly) before committing — not yet confirmed live in a
  browser.
- **Per-unit service rows corrupting after a dev-picker group switch — FIXED 2026-07-14
  (`816edc6`).** Claire noticed a screenshot showing "Email Marketing — Addl. Monthly
  Email" (a per-unit-priced service) with a duplicated "$175 × [box]" and a Notes column
  shifted out of alignment with every other row. `renderPriceCells()` is documented as
  running once at page load, but `applyDevGroup()` (the `?dev=1` picker's group-switch
  handler) ALSO calls it, to refresh prices for whichever group is now being previewed —
  a pre-existing call site, not something added this session. Root cause: the function's
  way of finding a row's genuine ad-spend column was `tds.find(td =>
  td.querySelector('input[type=number]'))` — but a per-unit row's own quantity box
  (`class="qty-field"`) is ALSO an `input[type=number]`. On a SECOND call (i.e. after
  switching groups in the dev picker), that quantity box — inserted by the FIRST call —
  got mistaken for a real ad-spend input, so the stale old fee cell was kept instead of
  removed, then re-inserted into what should have been the spend column slot, producing
  the doubled fee/quantity display and the resulting misalignment. Fixed by excluding
  `.qty-field` from the match: `input[type=number]:not(.qty-field)`. Verified via a DOM-
  shim simulation of the exact removal/insertion logic run twice in a row (the same
  sequence a dev-picker group switch triggers) — cell count grows 5→7 with the old
  selector (matching the garbled screenshot) and stays stable at 5 with the fix. Only
  reachable via the `?dev=1` preview picker's group dropdown, not the normal single-group
  live form (which only ever calls `renderPriceCells()` once) — but real regardless, since
  Claire and her AM are actively using that picker to test.
- **Dev-picker group switch not clearing prior form data — FIXED 2026-07-14 (`528b6a0`).**
  Claire noticed while prepping for an AM walkthrough: using the `?dev=1` picker dropdown
  to switch between groups left the previously-entered business info/selected services on
  screen under the new group's branding. Root cause: `applyDevGroup()` re-applies the
  newly-picked group's branding/pricing/AE-and-client rosters, but never reset the form
  itself — a different gap from the "Submit Another IO" bug fixed the same day (that one
  was in `resetForm()` itself; this one was a caller that never called it at all). Fixed
  by calling the existing `resetForm()` at the top of `applyDevGroup()`, same clearing
  logic already proven for Submit Another IO. Not yet retested live — Claire should
  confirm switching groups in the dev picker now shows a clean form before her AM meeting.
- **RESOLVED 2026-07-14 (see full root-cause writeup below) — Client Information fields
  (`biz-name`/`contact-email` etc.) were getting silently repopulated with the PREVIOUS
  submission's data on a genuinely fresh page load (hard refresh, no draft to restore).**
  Confirmed NOT any of the following, in this order, each with real evidence:
  1. NOT our own draft-restore code — `clearDraft()`'s own before/after log confirms the
     saved draft is genuinely removed (`null`) right before this happens.
  2. NOT `resetForm()` failing to clear the DOM — same symptom reproduces on a page load
     where `resetForm()` never even ran.
  3. NOT a duplicate `id="biz-name"` element — `document.querySelectorAll('[id="biz-name"]').length`
     confirmed `1`.
  4. NOT Chrome's own "Addresses and more" / "Payment methods" autofill — Claire turned
     both off directly in Chrome settings; still happened.
  5. NOT a browser extension — confirmed via incognito (clean there, which pointed at an
     extension) but Claire's actual installed extensions are only Google Drive launcher,
     Claude, and Google Docs Offline — none plausibly inject form data. Incognito being
     clean is still real signal, just pointing at something ELSE that differs in incognito
     (separate storage/session/profile state), not extensions specifically as first assumed.
  Tried so far, in order: `autocomplete="off"` (insufficient alone) → `readonly` +
  `onfocus="removeAttribute('readonly')"` (insufficient) → a delayed post-load guard
  (`695a44c`) that clears any unexpected value in these fields ~1s after a load with no
  draft to restore, skipping any field the AE has already focused (so it can't clobber
  real typing). **Not yet confirmed whether this guard actually fixes it** — Claire's
  last reproduction may have been tested before merging that specific commit. First thing
  to check next session: confirm `695a44c` is merged/live, then retest with console open
  (the `[loadDraft]`/`[autofill-guard]` logs are still in place) before trying anything new.
  If still unresolved after that, worth investigating: Chrome Sync (if enabled, form/
  autofill data can sync from a DIFFERENT device where addresses were never cleared),
  or a broader/newer Chrome "form fill predictions" feature possibly separate from the
  Addresses/Payment settings pages already checked. UPDATE (2026-07-14): Claire confirmed
  the delayed post-load guard (695a44c) did NOT fix it — still auto-fills. This is a real,
  useful data point: it means the guard's own precondition (only runs when `loadDraft()`
  found NO saved draft) may be wrong — worth checking next whether a draft IS actually
  present again at the point of the failure (i.e., something is still writing one after a
  clean reset, which would explain why a guard that only acts on "no draft found" never
  fires) rather than continuing to assume this is purely an external/browser-level fill.
  **RESOLVED 2026-07-14 (`0b53416`) — was never browser/extension autofill at all.**
  Following exactly the lead above: the `[loadDraft]` log on a fresh reload showed a real
  saved draft present, with `selected:{}` (correctly empty) but `biz`/`email`/campaign
  dates still holding the PREVIOUS submission's values — proving `resetForm()` itself was
  writing this stale draft back out, not something external restoring it. Root cause: the
  `formPages` variable (`'#page-1, #page-2, #page-3'`) is a string CONTAINING COMMAS,
  interpolated directly before `input[type=x]` in several `querySelectorAll` calls. As a
  CSS selector LIST, only the segment immediately after `#page-3` (no comma before it)
  ever got the type descendant-selector attached — `#page-1` and `#page-2` became bare,
  inert selectors matching the page `<div>`s themselves. Every text/email/date/number
  field AND every checked/selected row on pages 1–2 was silently excluded from clearing
  the entire time. It looked like most fields cleared correctly purely because those
  particular fields happened to be empty in every test run — only fields with real
  leftover data (biz-name, email, campaign dates) exposed it. Also explains the earlier
  "rows still visually highlighted despite unchecked checkboxes" report from the same
  investigation — same bug, the `tr.selected` line. Fixed by looping over each page
  individually instead of interpolating the joined string; confirmed via direct string-level
  reproduction of the broken vs. fixed selector construction (not yet confirmed by Claire
  live at time of writing — do that first before removing the temporary diagnostic
  `console.log` calls still present in `loadDraft`/`autoSaveDraft`/`clearDraft`/`resetForm`,
  and before removing the now-probably-unnecessary `readonly`/`autocomplete=off`/delayed-
  guard mitigations added while this was misdiagnosed as autofill — those are harmless to
  leave, but were never the real fix and can be cleaned up once the real fix is confirmed).
- **NEW — AE self-service "My IOs" view (in progress + submitted), raised by Claire's boss
  2026-07-14.** Not scoped yet — needs answers before any design/build:
  1. Should this show every order for the AE's OWN name only, or everything for whichever
     group they're viewing (closer to a lightweight version of the admin Orders tab)?
  2. "In progress" is the harder half — today, an in-progress IO exists ONLY as a
     browser-local draft (localStorage, one device/tab, never synced to Supabase at all).
     Showing "in progress" IOs to an AE — especially across devices — would mean turning
     drafts into a real server-side record (new table, or an `orders`-table draft/incomplete
     status), which is a real architecture change, not a small addition. Needs Claire's/her
     boss's confirmation this is actually intended before scoping further.
  3. Related to the concurrent-AE question also raised today: if this view is per-AE by
     name (not by login), two AEs with the same or similar typed name could see each
     other's IOs, or an AE could see none if their name is typed inconsistently across
     submissions (same class of fragility the AE picker/roster was built to fix) — the
     existing `ae` roster table might be the right identity anchor for this instead of a
     free-typed name, worth deciding together with the answers above.
- **Stale-data-after-admin-change — PARKED as a future improvement, 2026-07-14.** Came up
  while Claire was testing: the catalog, legal text, and group settings are all loaded
  ONCE when the public form's page first opens — nothing on the page re-checks Supabase
  after that. So if an admin changes something (a price, a new service, a template ref)
  while an AE already has the form open, that AE's tab keeps showing the old version
  until they reload. In practice this is a non-issue if each AE opens a fresh link per
  client conversation, but an AE who keeps one tab open across multiple meetings in a day
  could be working from stale data without realizing it. Claire's call: not worth solving
  now, since she doesn't plan to make frequent changes once AEs start actively using the
  form — parked as a future improvement (e.g. the page proactively checking for a newer
  version) rather than built speculatively. Worth mentioning in AE training regardless:
  open a fresh link at the start of each new client conversation.
- **AE-facing embed plan — SCOPED AND CONFIRMED READY, 2026-07-14.** Claire's plan: AEs
  will reach the form through a link/embed sitting inside an existing password-protected
  resource section, rather than ever seeing or navigating to the raw
  `io.yourdigitalgroupresources.com` URL directly. Decided as a plain `<iframe>` embed
  (not a link-out), fixed height with its own internal scrollbar (the simpler of two
  options discussed — the alternative, an auto-resizing iframe, was scoped but not
  chosen). Confirmed via Claire checking the live site's actual response headers in
  DevTools: no `X-Frame-Options` and no `Content-Security-Policy` header present at all
  (`Server: nginx`) — nothing server-side blocks this from being framed, which was the
  one real risk in the whole plan. Also confirmed: the resource section is WordPress, on
  the SAME domain as the IO tool (avoids any cross-origin storage-partitioning concerns
  entirely). **No code changes needed on our side** for the fixed-height approach — this
  is purely a WordPress-side embed:
  ```html
  <iframe
    src="https://io.yourdigitalgroupresources.com/[group-slug]"
    style="width:100%; height:1400px; border:none;"
    title="Insertion Order Form">
  </iframe>
  ```
  Notes for whoever builds the WordPress side: the `1400px` height is a starting guess
  (the form is tall, especially Step 2) — worth eyeballing live and adjusting; and the
  `<iframe>` must NOT have a `sandbox` attribute (or if one gets added by a WP plugin/page
  builder, it must include `allow-scripts allow-forms allow-popups allow-same-origin` —
  without `allow-popups` specifically, the Print/PDF button's popup window would silently
  stop working). Ready to set up whenever Claire's team is ready — nothing blocking on
  our end.

## KEY PRINCIPLES (how we've been working)

- Additive-first; defer the dangerous step; one change at a time so each is diagnosable.
- Distinguish bugs from design choices from team decisions before acting.
- Match storage to how data is used (rows for queried data; JSON for whole-unit reads).
- Don't go backwards to match incorrect old code — the table is canonical where it's
  more correct.
- Verify before trusting (the switchover's two-stage check caught real issues before
  they went live).
- GitHub commit = the undo button. Bank known-good checkpoints.
