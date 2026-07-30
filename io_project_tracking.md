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

## CURRENT OUTSTANDING ITEMS (as of 2026-07-16)

Read this section first — it's the up-to-date "what's actually left" list, verified
against the full document below (not just grepped for keywords; each item here was
individually checked to confirm it's still genuinely open, not just flagged once and
later resolved elsewhere in the doc without this summary being updated). Everything
below this section is full historical detail, kept for context/continuity, not a
second to-do list — if it disagrees with this section, this section is newer and wins.

**Waiting on a dedicated AM catalog review** (deliberately batched into one session
rather than trickled out one at a time):
- Website hosting/chatbot tier exclusivity — the 4 Monthly hosting/chatbot tiers have
  no exclusivity wiring; someone could currently select all 4 at once.
- Standalone Hosting Fee / E-Commerce Hosting Fee checkboxes vs. the hosting-setup
  modal triggered by site tiers — completely independent today, real double-charge risk.
- "AI Chatbot" bundles bought standalone — does it make sense, or should it be blocked?
- Modules / Optional Content Support vs. a site-tier pick — should selecting these be
  limited by which site tier was chosen? (Domain Transfer/DNS/Convert Logo already
  resolved as independent — this is narrower, just these two.)
- Traditional Media Buying & Consultation (`alc-media`, 15%) — percentage-based pricing
  that still calculates as $0; how should % pricing actually work?
- KOC requirements catalog-wide — never fully cross-checked against Claire's own
  expected list (Website/SMM/Email/SEO Builder & Pro).
- `hulu-bp`/`amz-bp` missing an intake form — confirm intentional.
- `yttv-addl` billing type — stored as a flat modifier, never explicitly AM-confirmed.
- Visitor-ID email-bundle intake (`w-vid200/350/500e`) — confirm the assumed fix (all
  six variants get the intake form) was correct.
- Multi-select in Targeted Display / Social Media Ads — single-select is currently
  forced; confirm intentional or allow multiple.
- Bundled tactic card's intake form (e.g. Targeted Landing Page riding inside a
  package) — should it get its own intake, none, or does it depend on the package?
- ~~Event Targeting resell behavior~~ — **BUILT 2026-07-17**, see entry below.
- Submission-email content/recipients — Claire confirming with her AM next week; email
  provider (Mailgun) identified and the whole send pipeline is built, just needs the
  real API key once she has it.
- Custom Pricing for ad-spend/CPM services — deliberately deferred (2026-07-10) as its
  own design pass (what does "override" even mean for a CPM rate — the rate itself, or
  a flat add-on?); still unbuilt, not urgent.
- Hosting exclusivity/presentation — own section vs. mixed with other services, and the
  one-time-build vs. recurring-hosting relationship; vague, never fully scoped.

**Small, still-open items (low priority, no urgency):**
- Duplicate clients from typos — the `norm()` normalization helper used elsewhere was
  never applied to the client-list-lookup step itself; a typo'd name can still create a
  duplicate client record. (The separate archived-client Trello-list routing bug this
  was originally bundled with IS confirmed fixed — see 2026-07-15 entries below — this
  is only the remaining name-matching half.)
- `loadDraft()` doesn't re-run `updateIntakeStatusCard()`/`updateKocCard()` after
  restoring a draft — a restored draft with intake/KOC-requiring products can show a
  stale status badge until the user navigates away and back.
- Notes input on Step 2 doesn't wrap while typing (it's a single-line `<input>`, not a
  `<textarea>`) — deferred pending real AM feedback on whether it's worth the change.
  Not urgent: Step 3's Review page already wraps Notes correctly, and that's the version
  that's actually saved/printed/sent to Trello.
- Contract-term footnote symbols (◊ § ‡ *) may need explaining to whoever signs — never
  addressed either way.
- TLP page-count detail ("1–5 Pages" etc.) lives only in hardcoded HTML text, not the
  service's actual stored label — cosmetic drift risk, never folded into the label itself.
- `printIO()`'s `setTimeout(..., 600)` before printing is a little fragile if fonts/logo
  load slowly on a given device — works in practice, not bulletproof.
- Two small future intake-builder features, never picked up: a checkbox field type
  (added as a supported type, never actually used by any form) and simple conditional
  ("if yes, show X") field support.

**Old item, found during this cleanup pass, status uncertain — needs a fresh look:**
- **"Intake-selected services don't flow to order/totals"** — flagged HIGH PRIORITY very
  early in the project (line ~1950 in the historical detail below), asking whether
  intake-form selections should add to the order or just flag interest. No resolution
  found anywhere later in the doc. Likely MOOT given how much the intake architecture
  has changed since (intake forms today are Q&A tied to an already-SOLD service —
  e.g. the TLP grid, visitor-ID details — not a mechanism for selecting additional
  services), but this is a guess, not confirmed. Worth a 2-minute sanity check next
  session rather than assuming it's fine.

**Mobile/tablet pass** (flagged as a launch requirement, never finished):
- Step 1 Campaign Length dropdown and Step 3 date field clipped on a real device.
- Intake modal usability on a phone.
- Signature canvas usability with a finger.

**People-task, not code:**
- AE roster table is built but still empty — needs a real CSV of AE names/Trello
  handles per group whenever Claire is ready to load it.
- Netflix Ads section header note (minimum spend) — **RESOLVED 2026-07-17**: confirmed
  from the new paper IO PDF, real minimum is $3,000/mo; SQL given to update the header
  note.

**Action items handed to Claire:**
- Deploy the `claude-proxy` Edge Function update for `send_email` — **confirmed
  deployed 2026-07-16.**
- Run `qty-preset-options-2026-07-16.sql`, fill in the Netflix header note, and
  retest the resell/PDF flow + QUR quoted-price uncheck/recheck fix — Claire
  acknowledged this list ("these should all be good") but did not explicitly confirm
  each one individually; worth a quick check next session rather than assuming done.
- **Run `enforce-spend-minimum-2026-07-17.sql`** (adds `enforce_spend_minimum` column,
  sets it true for Hulu/Amazon/Netflix by label match) — needed for the new hard-block
  minimum-spend fix below to take effect.

**New from Claire's 2026-07-17 batch (paper-IO reconciliation + 7-item AM-notes list)
— still open, needs her input before building:**
- **Item 1 — "tag the AM and AE on every card"**: confirmed 2026-07-17, real Trello
  card-member assignment, not a text mention. Built: resolves the AM/AE's stored
  `@handle` (group's `am_trello_handle`, AE roster's `trello_handle`) to a real Trello
  member id by looking up the board's member list once per submission
  (`findBoardMemberIds()`), then assigns both to the IO card and every tactic card via
  the new `trello_add_member` target. **Prerequisite Claire needs to know**: Trello can
  only assign a card to someone who is already a member of that specific board — if an
  AM/AE isn't added to a client's board yet, assignment silently no-ops (logged as a
  console warning, doesn't fail the submission). Needs the `claude-proxy` Edge Function
  redeployed with the 2 new targets (`trello_get_board_members`, `trello_add_member`)
  before this takes effect — full updated file given inline in chat.
- **Item 2 — "intake form attached in Trello is a little messy, missing spaces"**: fixed
  (see below) based on comparing the working IO-PDF generator against the intake-PDF
  generator — the intake PDF's hidden iframe never loaded the Montserrat webfont it
  references, so html2canvas could mismeasure text and drop spaces. This is a diagnosis-
  based fix, not visually re-confirmed against Claire's actual broken PDF — needs her to
  regenerate an intake PDF and confirm it looks right now.
- **Item 5/6 (her numbering) — Gold card at top of every list, Green card at bottom once**:
  built 2026-07-17. Claire gave real Trello share-link IDs for both templates (resolved
  to real card ids at runtime via `trello_get_card`, same shortLink-resolution pattern
  already used for single-card service templates). Gold gets a fresh copy at the top of
  the client's list on EVERY IO submission, never deduped, per her explicit "for every
  IO" wording. Green gets copied to the bottom only the very first time ever for a given
  client — confirmed "once ever per client" — checked by looking for a card already
  matching the Green template's own name anywhere on that client's list (via the same
  `existingCards` list already fetched for the tactic-card dedup logic, so no new
  Supabase column was needed). Verified via simulation of all 4 cases (Gold always
  copies even if one already exists; Green copies on a client's first-ever submission;
  Green skips on a later resubmission; matching is case/whitespace-insensitive). Not yet
  confirmed in an actual Trello board by Claire.
- **Item 3 — "allow Enter to create new lines in the Intake Form"**: no code change
  needed — the "Text Area" field type in the admin Intake Forms editor already renders
  a real `<textarea>` with native Enter-for-newline support. Claire opted to convert
  every existing plain "Text" field to "Text Area" across all intake forms (blanket
  change, her call, 2026-07-17) rather than pick specific fields — SQL given inline in
  chat (a jsonb rebuild of `intake_forms.definition`, since field defs live as one JSON
  blob per form, not a flat table). Hers to run.

**More Trello follow-ups, 2026-07-17 (after the 7-item batch above):**
- **Client name on the IO card** — built. The IO card is now named `IO — <business name>`
  instead of a bare "IO", same "Tactic — Client" naming convention every tactic card
  already uses. `isIoName()` (used to find/skip IO cards) updated to also recognize the
  new `IO — <name>` form, not just a bare "IO", so a returning client's already-created
  IO card is still found and updated (and renamed, if it predates this change) rather
  than treated as a brand-new card. Verified via simulation against 8 cases including a
  deliberate false-positive check ("IOnline Marketing" correctly does NOT match).
- **Do list-template "IO" placeholder cards still need to exist?** — confirmed NO, they
  are pure dead weight. Every whole-list Trello template (SEO/Website tier packages
  etc.) that includes its own "IO" card has that card silently skipped when the
  template is copied (`isIoName(cn)` check, existing since before this session) — the
  real IO card is always the separate one created once at the top of the client's list,
  regardless of what was sold. Told Claire she can safely remove the IO placeholder from
  her list templates going forward; leaving it in is harmless (just never copied) if she'd
  rather not touch the templates right now.
- **Whole-list template cards all currently get the "services sold" note overwritten
  onto them, not just the first** — corrected an earlier wrong answer I gave Claire (a
  stale 2026-07-13 code comment claimed this was "deliberately left off" whole-list
  templates; the actual 2026-07-15 rewrite of `finalizeTacticCard` already applies it
  to every card copied from a list, unconditionally). Claire asked whether it could be
  limited to just the FIRST card in the list instead (matching how the "Needs KOC"
  label already works) — she's holding this until she hears back from her AM on the
  broader question it came up under (Offline Tracking-style add-ons riding on a
  whole-list template's card). Not yet built.
- **Client name added to the IO card title, in-template "IO" placeholders confirmed
  dead weight** — see above.

**`notification_settings.always_bcc_recipients` was silently failing to save — FIXED
2026-07-17.** Claire added emails to the Notifications tab, got a "saved" confirmation,
but they were gone the next day. Root cause: the live database column was still named
`always_cc_recipients` (leftover from before this feature's naming changed to BCC on
2026-07-15 — see that entry above), while the front-end code sends the payload key as
`always_bcc_recipients`. The save RPC ran without error and bumped `updated_at`, but
since the incoming JSON had no key matching what the RPC was reading, it wrote `null`
into the column every time — nothing was ever actually persisted, even though the UI
reported success. Confirmed via `select * from notification_settings;` (showed
`always_cc_recipients` present but null, with a fresh `updated_at`). Fixed via a
column rename + `create or replace function` to bring the live RPC in line with what
the front-end already sends; Claire needs to re-enter her emails and re-save once
(the earlier save is unrecoverable — it was written as null). **Lesson for future
sessions**: a `notification-settings-2026-07-15.sql` file already existed in scratch
with the CORRECT (BCC-named) column/RPC — it was drafted but apparently never actually
run in Supabase, so the live database silently stayed on the older CC-named version
while the front-end code moved on. Worth remembering that a migration file existing
in scratch/chat history is not proof it was ever executed.

Also confirmed for Claire, while investigating: **no code path sends anything directly
to the client today** — `contact-email` is only ever displayed/stored, never used as a
send target anywhere. The one email-sending path that exists (`send_email`, Step 6 of
`submitIO()`) is an internal notification to the group's own `io_recipient` list +
the global always-BCC list — not the client — and it's still inert pending the real
Mailgun API key. The white-label warning under a group's From Name/From Email fields
("all client-facing emails... will show the group's branding, never 44i's") describes
intended behavior for a not-yet-built client-facing email feature; the only place
those two fields are actually used today is the printed/PDF IO document's footer.

**2026-07-17, AM follow-up meeting — 4 more items:**
1. **Confirmed policy: clients will never be emailed anything from this system.** No
   code change (matches current reality, see confirmation above) — recorded here so a
   future session doesn't accidentally build a client-facing send without checking this
   first.
2. **AEs now get the submission email for any IO they submit — built.** Added `ae.email`
   (new column + updated `admin_save_ae` RPC, SQL given inline in chat). Admin AE editor
   (`admin/index.html`) gained an Email field (form input, table column, save payload).
   Public form gained a hidden `#ae-email` field, populated only when an AE is chosen via
   the roster picker (`applyAePick()`) — same limitation as the Trello-handle autofill:
   an AE typed in freehand has no email on file, so they're silently not included, not a
   bug. Wired into Step 6's recipient list as a direct To (not BCC, no reason to hide it
   from them), case-insensitive deduped against the group's own `io_recipient` list so
   the AE never gets double-added if already on it. Verified via simulation of 5 cases
   (normal case, AE already in group list — caught and fixed a real duplicate-in-To bug
   here, no AE email on file, AE as the only recipient, nobody at all).
3. **AMs should see all orders in the admin, not just their own group's, "in case
   someone is out"** — BUILT 2026-07-17. Got the live `admin_get_orders` RPC source via
   `pg_get_functiondef` (asked for it rather than guessing, since it's not in this
   repo) — removed its `or o.group_id in (select ... where am_name = p_name)` clause
   entirely, so any valid admin (AM or super) now gets every order within the day
   window, no role check beyond valid credentials. Updated function given inline in
   chat, Claire's to run. Also removed the matching client-side fallback filter in
   `loadAdminOrders()` (only ever used if the RPC call itself errors) so it can't
   silently reintroduce the same restriction.
4. **Email copy edits — built**, all three in the Step 6 submission-notification email:
   - Group name added to the colored header banner ("New Insertion Order Submitted —
     `<group name>`").
   - Market row added, using the existing `#city` field (already free-text "City,
     State" combined, not split fields) — only shown if filled in.
   - "Overall Notes" row added — mapped to **Campaign Notes** (Claire confirmed: "that
     is what it has been," 2026-07-17 — corrected from an initial wrong guess of
     Special Instructions since there's no field literally labeled "Overall Notes" in
     the form); only shown if filled in.
   - Built a live preview artifact of the actual email markup (real code, sample data)
     so Claire could see it without a working Mailgun key — caught 2 more real requests
     from her looking at it:
     - **Removed the One-Time Total / Monthly Recurring rows entirely** ("we don't need
       the amounts from the IO in the email copy").
     - **"Calendar" link in the email — built, then reverted same session, and this is
       worth reading in full since it clarifies a real distinction.** Initially built a
       real calendar-file link (`buildKocCalendarLink()`, `data:text/calendar` `.ics`,
       30-minute block from the exact KOC date/time) to replace the old link, which just
       pointed at the AM's generic booking-page URL, disconnected from whatever
       date/time actually got picked. Verified via simulation of 6 cases, including a
       genuine bug caught and fixed (initial manual modulo-math rollover past midnight
       produced a DTEND before DTSTART; rewritten to use real `Date` arithmetic).
       **Claire then clarified the actual ask was different**: the AM's booking link
       (Google Appointment Schedules) already creates a REAL invite the moment someone
       books through it — she didn't want a second, separate invite generated by us, she
       wanted to know whether the ALREADY-CREATED invite's time could flow back into
       this system automatically instead of the AE retyping it. Investigated: Google
       Appointment Schedules are plain hosted pages (not an embeddable widget), so
       there's no client-side signal at all when someone books through a link opened in
       a new tab — genuinely not possible without a real Google Calendar API + OAuth
       integration per AM (a real, separate project: connecting each AM's account,
       polling/webhooking for newly-created events, matching the right new event to the
       right submission — not something to bolt on quickly). Parked as a possible future
       project, not built. **Net result, per Claire's explicit follow-up ("remove the
       calendar link")**: the calendar-file-link code was fully reverted —
       `buildKocCalendarLink()` deleted entirely (confirmed unused first), the KOC row in
       the email is back to plain text (date + time, no link at all). The Review page's
       actual booking link (the one that opens the AM's real scheduling page for the AE
       to book) is unrelated and untouched throughout all of this.
     - **Removed the Client Contact row entirely, added the AE's email next to their
       name** — same `#ae-email` field already wired in for item 2 above (only shows if
       the AE was picked via the roster, same limitation as everywhere else it's used).

**Event Targeting always gets a fresh Trello card on resell — BUILT 2026-07-17.**
Long-open item (see historical entry above, 2026-07-16): Claire's AM wants a brand new
card every time Event Targeting is resold for the same client, since each event is a
genuinely different booking — unlike every other tactic card, which intentionally
updates in place on resell. Claire resolved the open "how should repeat cards be
distinguished" question by sending a real Trello card screenshot: the card title should
just include the campaign's date range (e.g. "Event Targeting Jun 25 - 29 — Louisiana
Land Bank"). Implementation turned out simpler than the originally-proposed design: no
separate "always create new" bypass was needed at all — since a different resell
almost always has different campaign dates, baking the date range into the card title
means the existing "does a card with this exact name already exist?" lookup naturally
fails to match and creates a new card on its own. New `always_new_card` boolean column
(same "new column, not hardcoded ids" pattern as everything else in this catalog),
checked per-workflow (`workflowWantsDatedCard()`) and applied identically across all
four card-naming code paths (single-card template, whole-list template, whole-list
fallback, no-template plain) via a new shared `datedCardSuffix()` helper. New
`formatCampaignDateRange()` matches Claire's screenshot format exactly: same
month → "Jun 25 - 29", different months → "Jun 28 - Jul 3", different years →
"Dec 29 - Jan 2". Verified via simulation: date formatting across 6 cases (same
month/cross month/cross year/only-start/only-end/neither), and the full naming+lookup
interplay across 4 scenarios (different-dates resell creates a new card, a normal
non-flagged service resold twice still just updates in place, unaffected). **Honest
edge case, not fixed, low priority**: if the exact same date range is ever resold twice
for the same client, the second submission will match and update the first's card
rather than create a genuinely separate one, since dedup is still by name — accepted as
reasonable rather than engineered around, but worth knowing about. SQL needed (uses
label matching, not a guessed-at id — same reasoning as the earlier Hulu/Amazon/Netflix
minimum-spend SQL):
```sql
alter table services add column if not exists always_new_card boolean not null default false;
update services set always_new_card = true where label ilike '%event targeting%';
select id, label, section, workflow, always_new_card from services where always_new_card = true;
```

**New "Reconcile Lists" admin tool — BUILT 2026-07-17.** Claire raised a real concern
after the above: with a large existing Trello client base (many with card titles in
inconsistent historical formats), how do we minimize new duplicate lists/cards being
created going forward? Traced the actual risk precisely rather than reasoning
abstractly:
- **Client LISTS (the higher-risk one)**: once a client has been submitted through this
  system once, their Supabase record gets a permanent `clients.trello_list_id`, and
  every future submission uses it directly — completely safe regardless of naming.
  The risk is entirely the FIRST submission for anyone who doesn't have that id yet
  (i.e. most of the existing client base, since this only started auto-populating
  2026-07-13) — that path falls back to an EXACT case-insensitive name match against
  the board's list names, so any real-world naming drift silently creates a duplicate
  list instead of finding the real one.
- **Individual cards (lower risk)**: once the right list is found, matching an
  existing card on resell is also a name comparison, not fuzzy — a historical card
  whose title doesn't match today's exact naming convention will get a duplicate the
  first time that service is resold. Recommended AGAINST an automated bulk fix here
  (trades "creates a duplicate" for the riskier "silently updates the wrong card") —
  better solved with a light manual glance per currently-active client.

Built the tool for the higher-risk, safely-automatable half: a new **"Reconcile
Lists"** admin tab (super-admin only, same restriction level as Legal Text/
Notifications). Finds every client missing a stored `trello_list_id` (new
`admin_get_clients_missing_trello_list` RPC), fetches each affected group's board
lists ONCE per group (not per client — deliberately avoids an N+1 pattern against the
Trello API), and suggests a best-match list per client using the exact same fuzzy-match
logic already proven on the public form's own duplicate-client warning
(`normalizeClientName`/`stripBizSuffix`/`levenshtein`, ported into
`admin/index.html` rather than inventing a second, possibly-inconsistent rule) —
labeled EXACT (suffix-stripped exact match) or CLOSE (within a length-scaled edit-
distance tolerance), with a dropdown to override or select "no match" if a client is
genuinely new. Confirming a row calls the already-existing `set_client_trello_list_id`
RPC (same one the public form itself uses) — no new write path needed. Verified: the
matching logic against 5 cases (exact match, suffix variant, one-character typo,
genuinely-new-client correctly yields no match, empty name), and the full render →
pre-select → dismiss → re-render cycle via a real headless-browser test (confirmed the
correct list is pre-selected per row, a no-match row is correctly left blank, and
dismissing a row correctly removes just that row and re-indexes the rest). New RPC SQL
given inline in chat.

**Client Profiles admin tab + Import from Trello — BUILT 2026-07-17.** Claire pointed
out a real gap right after the Reconcile tool above: since her real client base has
never gone through this system, they have NO Supabase `clients` row at all (Reconcile
only helps clients that already have a row but are missing the link) — so a genuine
bulk-import is needed, not just reconciliation. She also flagged, separately, that
there's never been any way to edit an existing client's profile after the fact (a
changed contact, a typo) — confirmed true: `clients` could previously ONLY be written
during a live IO submission or by Reconcile (link only).

Decisions confirmed with Claire before building: AM-tier gets FULL access to client
profiles, same as Orders (no group scoping — any admin can help on any client). The
existing client PDFs vary in format / she's not sure they're consistent, so **no
automated PDF-parsing was attempted** — pulling in the rich contact/business info from
those PDFs is left as a manual one-time data-entry pass into the new editor, not
scripted extraction (a script silently misreading an inconsistent format is a worse
failure mode than a bit of manual typing).

Built:
- **New "Clients" admin tab** (`section-clients`) — full CRUD on client profiles (name,
  group, contact name/email/phone, website, city, business type, and a manual Trello
  List ID override field), search box, same list+edit-form pattern as Groups/Services/
  AEs. New `admin_get_clients`/`admin_save_client` RPCs (SQL given inline in chat) —
  any valid admin (am or super) allowed, no role restriction beyond valid credentials,
  per Claire's explicit call above.
- **"Import from Trello" panel**, inside the same tab — for a chosen group, scans that
  board's lists (`trello_get_lists`, already-existing target), filters out any list
  already linked to a client (regardless of which group that client is filed under,
  since a Trello list id is a Trello-side fact), and shows the remainder as a checklist
  defaulted to all-checked. Deliberately review-before-create, same spirit as
  Reconcile — Claire unchecks anything that isn't really a client (a template list, an
  archived reference list) before anything gets written. Confirming calls the same
  `admin_save_client` RPC once per checked list (`{name, group_id, trello_list_id}`) —
  no separate bulk-insert RPC needed.
- **Real layout bug caught and fixed during build, before it ever shipped**: the edit
  form uses the same flex `order` trick as Groups (renders above the list regardless
  of DOM position) — but Clients has 5 top-level siblings (header, search box, import
  panel, form, table) vs. Groups' 2, and only giving the form an explicit `order` while
  leaving the rest unset would have sorted the form to the very BOTTOM instead of above
  the table (unset order defaults to 0, which sorts before the form's order:1). Fixed
  by giving every sibling an explicit order (1 through 5) so the sequence is
  deterministic. Also had to add `'clients'` to the same special-cased `display:flex`
  branch in `adminSection()` that `'groups'` already needed, for the same reason.
- Verified via two real headless-browser tests: (1) the Clients tab itself — row
  rendering, LINKED/NOT LINKED badges, search filtering, edit-form populate-on-click,
  and new-client-form blank state; (2) the import flow's actual filtering + selection
  logic — confirmed an already-linked list is correctly excluded from the candidate
  list, and unchecking a candidate (simulating Claire excluding a non-client list)
  correctly excludes it from what actually gets saved.

New SQL, all given inline in chat (not committed as files, per Claire's no-SQL-files
constraint): `admin_get_clients_missing_trello_list` (Reconcile tool, above) and
`admin_get_clients`/`admin_save_client` (Client Profiles + Import, this entry).

**Import from Trello extended to include ARCHIVED lists — BUILT 2026-07-17.** Claire
asked whether the import scans archived lists too — it didn't, and this turned out to
matter more than a simple gap: `trello_get_lists` was hardcoded to `filter=open`
everywhere it's used, including the LIVE SUBMISSION's own name-search fallback for any
unlinked client. That means a former client whose list is archived wouldn't be found
by either path — not the import, and not the live form's own fallback — so without a
stored `trello_list_id`, a returning-but-archived client would get a genuine duplicate
list on resubmission (only the stored-id path correctly reopens an archived list).
Fixed by adding an optional `filter` passthrough to the `trello_get_lists` Edge
Function target — defaults to `'open'` so every existing caller (the live form's
fallback search, the "5th position" calc, etc.) keeps its exact current behavior
unchanged; the import tool explicitly passes `filter:'all'`. Whitelisted against
Trello's real accepted values (`open`/`closed`/`all`/`none`) server-side, so a
caller-supplied value never reaches the request URL unvalidated. Each candidate list
now shows an ARCHIVED badge when `closed:true`, so Claire can tell at a glance which
ones are former/inactive clients before deciding whether to import them. Verified via
simulation (the whitelist correctly passes through `'all'`, defaults `undefined` to
`'open'`, and falls back to `'open'` for a garbage value) and a real headless-browser
render check (the ARCHIVED badge appears on exactly the closed list, not the open
one). Full updated Edge Function file given inline in chat — needs redeploying.

Also confirmed for Claire, while discussing this: **clients are tied to the GROUP,
not to an AE** — `ae_name` is only ever recorded on the individual order/submission,
never stored on the client record itself. So there's no risk of a stale AE-to-client
link if someone leaves; each new IO for a client just records whichever AE handled
that particular submission. Nothing needed here — already built the way she wanted.

**AE roster management opened up to AM-tier — BUILT 2026-07-17.** Per Claire, same
call as Orders/Clients: any admin (AM or super) can now add/edit/deactivate AEs across
every group, not just their own — "in case someone is out." Removed the three
client-side `role === 'am'` blocks in `adminNewAe`/`adminEditAe`/`adminToggleAeActive`,
removed the now-unused `isSuperAdmin` gating in `renderAdminAeList` (Edit/Deactivate
buttons always render), and removed the "+ New AE" button's AM-hiding in
`adminSection('ae')`. Verified via a real headless-browser render check confirming an
AM-tier login now sees both the Edit and Deactivate buttons. **Still needs a matching
server-side RPC update** — `admin_save_ae` currently hard-rejects any role other than
`'super'`, so the client-side change alone doesn't do anything until this is run:

```sql
create or replace function public.admin_save_ae(p_name text, p_pw text, p_ae_id uuid, p_data jsonb)
 returns uuid
 language plpgsql
 security definer
 set search_path to 'public', 'extensions'
as $function$
declare
  v_role text;
  v_id uuid;
begin
  select au.role into v_role
  from admin_users au
  where lower(au.name) = lower(p_name)
    and au.pw_hash = encode(digest(p_pw, 'sha256'), 'hex');

  if v_role is null then
    raise exception 'Invalid admin credentials';
  end if;

  if p_ae_id is null then
    insert into ae (name, trello_handle, email, group_id, active)
    values (
      p_data->>'name',
      p_data->>'trello_handle',
      p_data->>'email',
      (p_data->>'group_id')::uuid,
      coalesce((p_data->>'active')::boolean, true)
    )
    returning id into v_id;
  else
    update ae set
      name          = coalesce(p_data->>'name', name),
      trello_handle = case when p_data ? 'trello_handle' then p_data->>'trello_handle' else trello_handle end,
      email         = case when p_data ? 'email' then p_data->>'email' else email end,
      group_id      = case when p_data ? 'group_id' then (p_data->>'group_id')::uuid else group_id end,
      active        = case when p_data ? 'active' then (p_data->>'active')::boolean else active end
    where id = p_ae_id
    returning id into v_id;
  end if;

  return v_id;
end;
$function$;
```

**Group filter added to Clients and AEs tabs — BUILT 2026-07-17.** Same "filter by
group" convenience Orders already has, per Claire's direct request. Clients tab: added
a group `<select>` next to the existing search box, combined via `renderAdminClients()`
(a row must pass BOTH the group filter AND the search term, not either/or). AEs tab had
no filter bar at all before this — added one group `<select>` above the table, wired
into `renderAdminAeList()`. Both dropdowns are populated from `allGroups` with a
prepended "All groups" option, kept deliberately separate from the existing
`populateClientGroupDropdown`/`populateAeGroupDropdown` helpers (those serve the
edit-form/import-panel group selects, which must never have an "all" option and always
need the full unfiltered list) — new `populateClientFilterGroupDropdown`/
`populateAeFilterGroupDropdown` instead. Verified via a real headless-browser test:
dropdown option counts, single-group filtering on each tab (confirmed exactly the
right row remains), and the combined group+search case on Clients (a client matching
the search term but NOT the selected group correctly returns zero rows, proving it's
an AND, not an OR).

**IO Slug collision warning added — BUILT 2026-07-17.** Came up while explaining to
Claire how slugs are generated (auto-derived from the Group Name's initials, e.g. "CF
Digital Group" → `cdg`, capped at 8 chars, editable/overridable) — pointed out there
was no check anywhere for whether a slug is already in use, unlike Services/Sections/
Intake Forms, which all warn on an id collision. Real risk, not cosmetic: `io_slug`
has no uniqueness constraint enforced, and the public form's lookup
(`groups?io_slug=eq.X`) just takes `results[0]` — two groups silently sharing a slug
means the second one's link always resolves to the first, permanently, until someone
notices. New `checkGroupSlugCollision()`, wired into every path that can change the
slug field: manual typing, `autoSlug()` (typing the Group Name), `regenerateSlug()`
(the ↺ Auto button), and once on `adminEditGroup()` load (in case an existing group's
slug already collides from before this check existed). **Meaningfully different from
the Services/Sections/Intake pattern it's modeled on**: those ids are the primary key
and get locked after creation, so their collision check only ever needs to fire for
brand-new items. A group's `io_slug` stays editable even when editing an EXISTING
group, so this checks against every OTHER group's slug (excludes the group currently
being edited by its own id) rather than gating on "is this a new group." Verified via
a real headless-browser test across 4 cases: a new group's auto-generated slug
colliding with an existing one (warns), editing a group and leaving its OWN existing
slug unchanged (correctly does NOT warn against itself), changing that same group's
slug to match a DIFFERENT existing group's (warns), and a genuinely unique slug (no
warning). No SQL needed — purely front-end, and there's still no database-level
uniqueness constraint on `io_slug`, so this is a helpful warning, not a hard guarantee.

**Group deactivate/reactivate — BUILT 2026-07-17** (the `admin_save_group` RPC gap
below was resolved same-day — see the full audit entry further down). Claire has a few groups
in her list she no longer works with and asked how to remove them — recommended
against a hard delete (same reasoning as every other entity type here: a group can be
referenced by real historical orders/clients/AEs via foreign key, so deleting it
risks breaking or cascading into that history) in favor of the same soft-deactivate
pattern Services/Sections/Intake Forms/AEs already use. Claire agreed.

Built:
- New `groups.active` boolean (default true).
- Deactivate/Reactivate button + INACTIVE badge/grayed row in the Groups list
  (`renderAdminGroups`), super-admin only — new `adminToggleGroupActive()`.
- Deactivated groups are excluded from the AE and Client edit-forms' "assign to
  group" dropdowns (`populateAeGroupDropdown`/`populateClientGroupDropdown`) — no
  reason to add a new AE or client to a group no longer worked with — EXCEPT an
  entity's own currently-assigned group stays visible (marked "(inactive)") so
  editing an existing AE/client already in that group never silently blanks or
  reselects it out from under them. New `includeInactive` param on
  `populateClientGroupDropdown` so the Import-from-Trello panel's group picker
  (`client-import-group`) can deliberately show inactive groups too — still useful
  for finishing historical client linkage on a group being wound down.
- Deliberately UNCHANGED: Orders/Clients/AEs group FILTER dropdowns (as opposed to
  the assignment dropdowns above) still show every group regardless of active
  status, same as they already do for Orders — you'd still want to look up a
  deactivated group's historical orders/clients/AEs, not have them disappear.
- Public form: visiting a deactivated group's slug now shows the same "Invalid
  Link" screen a bad/missing slug already shows, instead of silently still
  accepting submissions.
- Verified via a real headless-browser test across 6 cases: new-AE/new-client
  dropdowns correctly exclude the inactive group; editing an AE/client already
  IN that inactive group correctly still shows and pre-selects it, marked; the
  Import panel correctly shows both; the Groups list correctly shows the INACTIVE
  badge and Reactivate button only on the deactivated row. Also verified the
  public-form check handles the backward-compat case correctly — an existing
  group with no `active` value set yet (`undefined`, from before this column
  existed) defaults to still-accessible, not accidentally locked out.

**Still needed**: `adminToggleGroupActive()` calls the existing `admin_save_group`
RPC with a minimal `{active: makeActive}` payload, same pattern as
`adminToggleAeActive`/`admin_save_ae` — but unlike `admin_save_ae`/`admin_save_client`
(both written fresh this session, so their exact column-handling is already known),
`admin_save_group` is an older RPC not in this repo, and every other admin_save_*
RPC in this codebase explicitly enumerates its columns rather than forwarding
arbitrary jsonb keys — so it likely needs `active` added to its update statement
before this actually persists anything. Asked Claire for its current source via
`pg_get_functiondef` (same approach used for `admin_get_orders` earlier this
session) rather than guessing at a rewrite and risking silently dropping an
existing column. There IS a working direct-PATCH fallback already coded in both
`adminSaveGroup()` and the new `adminToggleGroupActive()` (used if the RPC call
throws) — so deactivating may already work today via that fallback path even
before the RPC itself is updated, but this needs confirming live, not assumed.

```sql
select pg_get_functiondef(p.oid)
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.proname = 'admin_save_group' and n.nspname = 'public';
```

**Full pre-rollout audit — COMPLETE 2026-07-17.** Claire asked for a full solidity
check across everything built this session before starting to use it for real
(creating groups, adding real clients) — wanted to catch any big issues before
relying on it more broadly. Checked:
- **Code structure**: fresh syntax check of both files, no duplicate function/variable
  declarations anywhere, no dangling references (every `onclick`/etc. call site
  resolves to something real, including cross-file `shared.js` dependencies), no stale
  state collisions across the new admin tabs (Clients/Reconcile/AE/Groups all reload
  fresh on tab open; the Import-from-Trello flow correctly refreshes the Clients list
  afterward).
- **Full re-read of the submission pipeline** (`submitIO()` and everything it calls) —
  the highest-stakes code path, given how many incremental edits touched different
  parts of it this session (AE email, dated Event Targeting cards, KOC copy, market/
  notes rows, AM/AE assignment). Confirmed everything still composes correctly as a
  whole, not just individually.
- **Every `admin_save_*` RPC**, pulled via a single consolidated
  `pg_get_functiondef`-over-`pg_proc` query, specifically checked for the same
  "unconditional field overwrite on a minimal payload" bug class that broke
  `admin_save_group` (see the entry above). Result: **`admin_save_service`,
  `admin_save_section`, `admin_save_intake_form`, and `admin_save_hosting_setting`
  were already written safely** (case-when-present/coalesce throughout) — that bug was
  unique to `admin_save_group`, not systemic, and it's already fixed and confirmed
  live. Found one latent (never actually triggered, since its one caller always sends
  every field) instance of the same pattern in `admin_save_legal_content` — hardened
  it the same way as a precaution; Claire confirmed this SQL has been run.
- **Permissions consistency** across every RPC — super-admin-only ones match their UI
  restrictions exactly; the ones opened to any admin this session (Orders, Clients,
  AEs, Groups) are consistently unrestricted beyond valid credentials.
- **No SQL injection surface** — every function is properly parameterized, no dynamic
  SQL built from raw string concatenation anywhere.
- **Deploy verification**: diffed the live `claude-proxy` Edge Function (pasted back
  by Claire) against the version given in chat — confirmed a match on every functional
  line (the live one just has comments stripped) — genuinely confirmed via diff, not
  assumed. Confirmed via `git merge-base --is-ancestor` that the working branch is
  fully merged into `main` (PR #75), and `groups.active` exists per Claire's manual
  check. Every checklist item from this session is now closed.
- Minor, non-urgent note surfaced (not acted on): admin passwords are hashed with
  unsalted SHA-256 rather than something like bcrypt — acceptable given this is a
  small internal tool with a handful of known named admins, not treated as a real risk
  at this scale, just recorded here in case it's ever worth revisiting.

**Net result: build confirmed solid, cleared for Claire to start real use** (creating
groups, adding real clients) as of 2026-07-17.

**Bigger-picture planning notes, 2026-07-17 (post-audit conversation) — no code built,
recorded for continuity into future sessions:**
- **AM picker, decided but not yet built**: Claire wants the Group form's AM Name/
  Email fields turned into a picker (same spirit as the AE picker) to eliminate typos
  — real AMs today are Carol, Peggy, and Shania (James and Jon are Super Admins;
  James is parked on the Claude Test Group for now, not a real AM to include yet).
  Confirmed the right home for this is the EXISTING `admin_users` table, not a new
  parallel roster — because strategists and accounting (see below) will need real
  logins too, and `admin_users` already has the right shape (name + password + role).
  Plan: add nullable `email`/`am_calendar_url`/`am_trello_handle` columns to
  `admin_users`, then a Group-form dropdown sourced from `admin_users where role =
  'am'` that auto-fills those fields on pick, same UX as the AE picker. Not yet built —
  next session's work.
- **Strategist/accounting roles — confirmed scope, deliberately deferred.** Claire
  confirmed both will need their own logins (they'll each see their own views, not
  just be selectable in a dropdown) — so they belong in `admin_users` via new `role`
  values, not a separate staff table. AEs stay OUT of this unification — they're
  external to the company, not staff, so they keep their own existing per-group
  roster. Claire explicitly chose to wait on building the actual strategist/accounting
  views/tables until later rather than build the full thing now — the AM picker above
  is the only near-term piece.
- **Role-based tab visibility, forward decision for that same future phase**: when
  strategist/accounting logins do get built, Claire wants each role to see only the
  admin tabs relevant to them, not the full current list — explicitly framed as an
  extension of the pattern already in place today (AM-tier already has several
  things hidden — the Pricing tab, "+ New Service/Section/Intake" buttons — just as a
  binary super/AM split currently). No new mechanism needed, just more roles applied
  to the same existing gating pattern once those roles exist.
- **Admin tab audit, at Claire's request** — walked through whether the now-10-tab
  admin portal has grown any dead weight. Verdict: everything is either core/vital
  (Groups, Orders, Clients, Services, Sections, Intake Forms, Legal Text) or a real,
  actively-useful convenience worth keeping (AEs, Notifications) — **except
  "Reconcile Lists," which was explicitly built as a ONE-TIME onboarding tool** (see
  its own entry above) to link Claire's pre-existing client base to their real Trello
  lists before relying on this system for them. Flagged as the one tab with a natural
  expiration point — harmless to leave (shows "nothing to reconcile" once done), but
  a real candidate to remove later once Claire's finished onboarding her historical
  clients via the Import-from-Trello flow, rather than something that needs to stay
  in the nav permanently.

**AM picker — BUILT 2026-07-18** (decided the previous session, built once Claire
realized she needed it working before creating real groups). New `admin-am-picker`
dropdown on the Group form, above the existing AM Name/Email/Calendar/Trello fields
— picking a name fills all four together, same UX as the AE/Client pickers. Reuses
`admin_users` (login accounts) rather than a new parallel roster, per the previous
session's decision — added nullable `email`/`am_calendar_url`/`am_trello_handle`
columns there, plus new `admin_get_staff` RPC (deliberately excludes `pw_hash`, any
valid admin can call it — same access level as `admin_get_orders`/`admin_get_clients`).
Picker options are filtered client-side to `role = 'am'`, so James/Jon (Super Admins)
never show up as AM choices. When editing an EXISTING group, the picker pre-selects
by case-insensitive name match against the group's current (free-typed, pre-picker)
`am_name` — if it matches a real AM, the picker shows it selected; if not (a custom/
unrecognized name), the picker stays blank without touching or overwriting whatever's
already in the text fields. `adminNewGroup`/`adminEditGroup` both made `async` to
load the roster (lazy-loaded once, same pattern as `allGroups` elsewhere) before
populating the dropdown. Verified via a real headless-browser test across 4 cases:
picker only lists the 3 real AMs (not James/Jon), case-insensitive pre-select match
works, an unrecognized existing name correctly leaves the picker blank, and picking a
name correctly fills all 4 fields. SQL given inline in chat, not yet run by Claire —
includes commented-out placeholder UPDATE statements for backfilling Carol/Peggy/
Shania's real contact info once she has it, since the roster starts empty otherwise.

**From Name / From Email — REMOVED 2026-07-18.** Traced actual usage first: From Name
was fully dead code (computed, never rendered anywhere); From Email's only effect was
the printed IO document's footer line — neither was ever used for actual email
sending (the one real email path uses a fixed sender, confirmed in the earlier
audit). Confirmed with Claire they're no longer needed (the plan is to keep sending
from the same shared address as before, not white-label per-group) and that the
footer should just become `GroupName · IO#` with no email at all. Removed: the two
input fields and their now-stale white-label warning note from the Group form, the
required-field validation that used to block saving a group without them (with a
misleading "appears on all client emails" message), both from the save payload, from
`adminNewGroup`'s clear-list, and from `adminEditGroup`'s populate step; the
`fromName`/`fromEmail` variables and the footer template in `index.html`. Deliberately
did NOT drop the `from_name`/`from_email` columns from the database — no reason to
take an irreversible schema step just to stop showing/editing them in the UI; they're
simply unused now (a new group's `admin_save_group` insert will just store `null` for
them going forward, since the RPC's update branch was already fixed earlier this
session to only touch a field when it's actually present in the payload). Verified via
a fresh structural check of both files (no syntax errors, no leftover references) and
a footer-format simulation.

**CORRECTION, same day**: momentarily told Claire this had somehow never actually
landed in git history and re-did the change from scratch — that was wrong. The real
cause was a stale LOCAL checkout losing track of the already-pushed-and-merged commit
(`900e5c3`, confirmed present on both the branch and `main` via `git log
origin/...`), not a lost commit — `git push` correctly rejected the resulting
divergent duplicate push, which is what surfaced the mistake. Resolved by rebasing
the follow-up work (the client-picker fix below, plus one small additional cleanup —
removing the now-pointless `from_name`/`from_email` entries from the public form's
stray-whitespace-trim list, which the original removal missed) cleanly onto the real,
already-merged history, rather than layering a duplicate. **Lesson for future
sessions**: a `git commit`/`git push` success result is normally sufficient
confirmation on its own — but if a long gap or session interruption occurs before
that code path is touched again, running `git log`/`git fetch` against the actual
remote (not just trusting local history) before concluding something is "missing" is
cheap insurance against exactly this false alarm.

**Client picker — business name locked once a client is picked, BUILT 2026-07-18.**
Claire asked whether an AE can edit a picked client's info, and specifically didn't
want the name editable (to protect against the wrong Trello list being used) while
wanting contact info left editable. Checked the live `find_or_create_client` source
(not previously audited — doesn't match the `admin_%` prefix the earlier audit
covered) to answer precisely rather than guess: confirmed contact fields (email,
phone, city, business type, etc.) already write back to the SAME client record on
every submission as long as the id stays attached — exactly what Claire wants kept.
But the name was a real, live risk, worse than just "editable": nothing actually
blocked editing it — a client-side safety net just silently un-pinned the selected
client the instant the name changed, and the submission would then fall through to
`find_or_create_client`'s name-based lookup, which creates a **brand-new duplicate
client (and duplicate Trello list)** if the edited name doesn't exactly match
anything — the exact failure mode the picker exists to prevent. Fixed by actually
`disabled`-locking the Business Name field the moment a client is picked (new
`setBizNameLocked()`), with a visible hint explaining why and pointing to the admin
Client Profiles editor as the right place to fix a genuinely wrong name. Wired the
unlock into every place that clears `selectedClientId` — switching back to "New
Client", "Submit Another IO"'s form reset, and switching groups — not just the
picker's own onchange handler, so the field can never get stuck locked. Verified via
a real headless-browser test: name locked and unfocusable after picking, contact
fields still freely editable, and switching back to "New Client" correctly unlocks
and clears.

**Database growth/scale discussion, 2026-07-18 — no action taken, informational.**
Claire started bulk-importing her real (active + archived) client base via
Import-from-Trello and asked what effect this, plus ongoing incoming IOs, has on the
database, and what to watch for. Assessed: client rows are tiny (short text fields)
— hundreds or thousands of them is negligible for Postgres. Orders are the real
long-term growth driver (richer per-row data: `line_items`/`intake_responses` jsonb,
signature image), but even a couple years of normal-paced submissions stays modest by
database standards. Real practical ceiling flagged: Supabase's Pro-tier storage
limit (billed by total DB size in GB, tracked **per project** — she has multiple
databases on the same account, so worth checking this specific project's own usage,
not an org-wide aggregate), not row count. Current setup confirmed: Pro plan, Micro
compute size — Micro should be comfortably sufficient for this app's actual query
load (a handful of admin users, occasional public submissions), not a near-term
concern. Longer-horizon, not-urgent items flagged: DB indexes if admin screens ever
feel sluggish at higher row counts; Trello API rate limits only in a scenario of many
simultaneous AE submissions at once.

**Forward idea, not yet decided or built**: Claire is considering eventually
replacing the in-form intake questions with just a link on the Trello card instead
(e.g., to an external form/document), specifically because it would reduce future
per-order storage — confirmed this is accurate: `intake_responses` (the raw Q&A data
captured today) is genuinely one of the larger per-order fields, and would disappear
entirely under that model. Clarified one distinction for accuracy: the e-signature
capture (`signature_data`) is a separate, unrelated field (the legal agreement
signature, not part of intake) and would be unaffected either way — the intake-link
idea would help but isn't the single biggest contributor on its own. Logged here for
whenever Claire is ready to revisit; nothing needs to happen until then.

**Import AEs from Trello board members — BUILT 2026-07-18.** Claire finished
importing her ~300-client Trello base and asked for an equivalent bulk-add for AEs
(~300 of those too) — confirmed her staff are already board members, which is what
makes this possible. Same review-before-create spirit as the Client import, but
scans a board's MEMBERS (`trello_get_board_members`, already built earlier this
session for AM/AE card assignment) instead of its LISTS — there's no per-AE Trello
object the way a client has its own list. A board's member list includes the AM (and
possibly super admins), not just AEs, so this is deliberately never an auto-import —
new "Import from Trello" panel on the AEs tab shows every member as a checkbox-
reviewed checklist (default-checked, same as the Client import), and Claire unchecks
anyone who isn't actually an AE before confirming. Trello's members endpoint doesn't
expose email, so only name + Trello handle import automatically — email still needs
filling in per AE afterward, same limitation already true of the AE picker generally.

**Real design difference from the Client import, worth being explicit about**: dedup
is scoped to the SELECTED GROUP ONLY, not global. A Trello list genuinely can't
belong to two different clients (global dedup was correct there), but the AE table is
inherently per-group (same shape as the Client picker — "this AE only appears in the
picker for this group's form") — the same real person legitimately needs a SEPARATE
`ae` row for each group they work across. Deduping globally by Trello handle would
have wrongly blocked re-adding a real AE to their second or third group. Reuses the
existing `admin_save_ae` RPC (no new backend needed) and the same generic group-
dropdown populator already shared by the Client import/edit-form pickers (renamed its
comment to reflect three callers now, not renaming the function itself). Verified via
a real headless-browser test: confirmed the critical per-group distinction directly
(a person already an AE on group A is correctly excluded when scanning group A, but
correctly still shows up as importable when scanning group B, even though they're the
same real person) — and confirmed unchecking a non-AE candidate (simulating
unchecking the AM) correctly excludes them from what actually gets saved.

**Duplicate-AE bug found and fixed — 2026-07-18.** Claire accidentally created
duplicate AEs for a group via the new import. The per-group dedup logic itself was
already confirmed correct (verified above), so this pointed at a different, real bug:
neither "Import Selected" button (AE or Client) guarded against being clicked twice
in quick succession — a double-click could fire two concurrent import runs against
the same candidate list before the panel closed, each independently creating the same
rows. Fixed both `importSelectedAes` and `importSelectedClients` with a synchronous
guard — the button disables itself (and shows "Importing…") on the very first call,
before anything `await`s, closing the race window entirely; a second call while
already running is a no-op. Verified via a real headless-browser test that fired two
overlapping calls back-to-back and confirmed only one `admin_save_ae` call actually
went out (previously would have been two). Gave Claire cleanup SQL (a
`select ... group by group_id, trello_handle having count(*) > 1` to see exactly
what's duplicated, then a `row_number()`-based delete keeping one row per
group+handle) for the duplicates already created before this fix landed.

**Row-action button sizing normalized across all admin tabs — BUILT 2026-07-18.**
Claire noticed the Edit/Deactivate/Reactivate/Pricing buttons were visibly different
sizes between tabs and asked to match the Group editor's size. Confirmed: Group used
`padding:5px 12px;border-radius:6px;font-size:12px`, while Services/Sections/Intake
Forms/AEs/Clients all used a smaller `padding:3px 9px;border-radius:5px;font-size:10px`
(9 identical button instances, one global find-and-replace), and Reconcile's
Confirm/Dismiss buttons used a third, in-between size. Normalized all of them to the
Group editor's size. Deliberately left every other differently-sized button in the
file untouched (Close buttons, Manage Workflows' Rename/Delete, the intake-form-
builder's Add/Remove Section/Question buttons, etc.) — those aren't the same kind of
row-action button Claire flagged, and changing them wasn't asked for. Verified via a
fresh structural check (no syntax errors) and a grep confirming all 12 targeted
row-action buttons (Group ×3, Services ×2, Sections ×2, Intake Forms ×2, AEs ×2,
Clients ×1, Reconcile ×2 — one more turned up matching by coincidence) now share the
exact same size string.

**Users tab — BUILT 2026-07-18.** Claire needs to add Carol/Peggy/Shania's AM contact
info (email, Trello handle, calendar URL) and asked for a real editor instead of raw
SQL, "since we will need it for the next stages" (strategist/accounting roles landing
later). New "Users" admin tab manages `admin_users` (the login table itself) directly —
full CRUD (Name/Role/Email/AM Trello Handle/AM Calendar URL/password), restricted to
super-admin only (same sensitivity level as Legal Text/Notifications/Reconcile, since
this table holds login credentials for the whole team). Design decisions:
- Keyed by NAME (admin_users has no separate id exposed anywhere in this app — name is
  the natural key login itself already uses), so `admin_save_user` takes an
  `p_original_name` to support renaming, same insert-or-update shape as every other
  `admin_save_*` RPC.
- Role dropdown deliberately only offers Account Manager / Super Admin for now — NOT
  Strategist/Accounting, since those roles have no actual permission-gating built yet
  and would behave identically to Super Admin if selectable today. Add them as real
  options once role-based tab visibility (already discussed, deferred) actually lands.
- Added a `active` boolean column (soft-deactivate, same pattern as Services/Sections/
  Intake Forms/AEs/Groups) — a deactivated user can't log in but their history/
  assignments aren't destroyed. This wasn't explicitly requested; flagging that it's
  in scope for you to veto if you'd rather leave it out.
- Password changes go through a dedicated "New Password" field, hashed server-side
  (never stored or transmitted in plaintext beyond the one hashing pass) — required on
  create, optional (blank = keep current) on edit.
- Loose end this surfaced and fixed in the same pass: `admin_get_staff` now also
  returns `active`, and the Group editor's AM picker (`populateAmPickerDropdown`) now
  excludes deactivated staff from new picks — matching the same convention already used
  for deactivated groups in the AE assignment dropdown — while still keeping a group's
  *already-assigned* AM selectable/visible (labeled "(inactive)") so editing that group
  never silently blanks out its AM.

Verified via `node --check`-equivalent syntax scan (no errors) and a Playwright
headless-browser simulation against a mocked `admin_get_staff`/`admin_save_user`:
create-with-password succeeds, create-without-password is rejected client-side before
any network call, editing an existing user's email while leaving password blank
updates the email and leaves the password payload key absent entirely (server keeps
old hash), and deactivate correctly flips `active` to false. Also separately verified
the AM-picker fix: an inactive AM is excluded from a fresh dropdown build, but still
appears (marked "(inactive)") and stays selected when the group being edited already
has that AM assigned.

SQL to run (not yet executed by Claire — gave inline in chat, not committed to the
repo): adds `admin_users.active`, updates `admin_get_staff` to return it, and adds the
new `admin_save_user` RPC (insert-or-update, password-hashed, `v_role = 'super'`-gated,
uses the same safe `case when p_data ? 'x'` pattern as every other admin_save_* RPC).

**Strategist scaffold + Strategist/Accounting roles — BUILT 2026-07-18.** Claire has
usage left this month but is blocked on the AM-testing side, so asked to get a head
start on the strategist build — confirmed with her this means foundation only (data
model + empty page skeleton), not any actual strategist features or permission-gating,
since what strategists/accounting should see or do is real business-logic scope that's
explicitly parked pending its own review (per CLAUDE.md's non-negotiable rule on this).
Two pieces:
1. Added `strategist`/`accounting` as selectable roles in the Users tab's role dropdown
   (previously only Account Manager/Super Admin) and extended `renderAdminUsersList`'s
   role-label map to match.
2. New `strategist/index.html` — an empty, login-gated placeholder page ("Coming
   Soon"), sharing `shared.js`/`shared.css` exactly the way CLAUDE.md's architecture
   note already anticipated. Its login modal accepts `strategist` or `super` role
   accounts only (super included so James/Jon can log in and see it as it's built).

**Bug found and fixed in the same pass: login was hardcoded to 5 names.** Building the
strategist login surfaced a real gap in the *existing* `/admin` login: the name picker
was populated from a hardcoded JS object (`ADMIN_USERS = {James, Jon, Carol, Peggy,
Shania}`), and `checkAdminPw()` required a name to exist in that object even when the
server-side `admin_login` RPC succeeded — meaning anyone added through the Users tab
built earlier this session (a new AM, or now a strategist/accounting user) could never
actually log in until someone also hand-edited that object and the `<select>` markup.
Fixed by replacing it with `LOGIN_ROSTER`, populated from a new public, no-password
`get_login_roster` RPC (same "derive the picker from the table" pattern as the AE/
Client pickers) — a new user now shows up and can log in immediately after being
created in the Users tab, no code change required. Also added a deliberate rejection:
if `admin_login` succeeds but the account's role is `strategist` or `accounting`,
`/admin` now shows "This account isn't set up for the admin portal" instead of letting
them in — those roles have no tabs scoped to what they should actually see here, so
succeeding a password check alone shouldn't grant full admin access.

Verified via Playwright headless-browser simulation against mocked `sb()`/`admin_login`
responses: (a) the roster loads and populates the `<select>` correctly; (b) an AM
(Carol) still logs into `/admin` successfully; (c) a strategist account is correctly
turned away from `/admin` with the new message; (d) on the new strategist page, the
name picker is filtered to strategist/super only client-side, and even if an AM's name
is forced into the picker, the server-side role check still rejects them; (e) a
strategist account successfully reaches the placeholder landing page. Structural
syntax scan (no errors) run on both files.

SQL to run (not yet executed by Claire): adds the new `get_login_roster()` function —
see `login-roster-2026-07-18.sql`, given inline in chat.

Deliberately NOT built yet (same reasoning as the Users-tab role dropdown restriction):
any actual strategist/accounting permission-gating, what tabs/data they should see, or
real features on the strategist page. This stays a "Coming Soon" shell until that scope
is decided.

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

## STRATEGIST PORTAL — SCOPING NOTES (started 2026-07-18, no build yet)

Started while Claire has a little usage left this month but is blocked on AM testing
for the rest of the platform. Deliberately kept to planning/documentation only — no
code, no schema changes — since what strategists actually need is real business-logic
scope, same "park it, don't guess" rule as everything else undecided in this doc.

**Claire's answers so far:**
- She has an existing pacing template the strategists already use twice a week (shared
  and analyzed below) — a real starting point instead of guessing at fields.
- Strategist work corresponds to items ordered on the IO. Not yet confirmed whether
  strategists need to see the IO itself directly — she's confirming.
- One shared portal for all strategists (not one portal per strategist) — but each
  strategist's items are separated/scoped within it, the same reasoning as AM
  assignment: if someone's out, another strategist can easily pick up their work.
- Some fields need to be strategist-editable; others should populate automatically
  (not yet mapped which is which — see template analysis below for a concrete guess).

**Pacing template analysis (`Pacing_Draft.xlsx`, shared 2026-07-18, data stripped but
formulas intact):**

Five tabs: `Layout` (the actual working dashboard) plus four raw-data tabs, one per ad
platform — `Google Ads`, `Simpli.fi`, `Facebook Ads`, `The TradeDesk`. Claire pulls
reports from each platform twice a week and pastes them into their matching tab as
plain data (no formulas in those four tabs at all) — this is the manual step she
described.

`Layout` has one row per campaign/tactic and two kinds of columns:
- **Manually entered per row** (columns A–O): Group, Client, Campaign, Tactic,
  Platform, Gross Budget, In-Platform Budget, Goal (stored as a text range like
  "1000-1500", averaged by a formula elsewhere — confirm this is impressions or clicks
  goal), Start Date, End Date, Optimize (purpose not yet clear — need to ask), Notes.
- **Auto-calculated** (columns H, J, K, and P onward): Actual Spend and Actual Clicks/
  Impr. are pulled via a big IF/IFS keyed on the Platform column, which routes to a
  VLOOKUP against whichever of the four platform tabs matches, joined on Campaign
  name. MTD Pacing is the real "pacing" number: `(actual metric / average of the Goal
  range) ÷ (days elapsed in the campaign's active window / total days in that window)`
  — i.e., are we tracking ahead of, on, or behind where we should be given how much of
  the flight has run so far.

**What this suggests for schema shape (not yet built, just the shape it implies):**
- A per-campaign-line table keyed to (probably) the client + a specific ordered IO
  service — this is likely where "corresponds to items ordered on the IO" plugs in:
  Group/Client/Platform/Tactic/dates could very plausibly auto-populate FROM the
  matching order line rather than being re-typed, with Gross/In-Platform Budget, Goal,
  Optimize, and Notes being the strategist-entered/editable part. This lines up with
  Claire's "some fields auto, some editable" answer above, but needs her confirmation
  on exactly which fields map to which before building anything.
- The platform-report pasting (twice weekly) is a separate concern from the campaign-
  line data — whether that manual paste step stays exactly as-is (someone pastes into a
  table) or eventually connects to real ad-platform APIs is a much bigger, separate
  decision — not assumed one way or the other here.

**Claire's answers, round 2 (2026-07-18):**
- **Optimize** = a log entry: a date plus what the strategist did (an optimization
  action taken on that date) — not a single status flag. Implies this is really a
  one-to-many history (multiple dated entries over a campaign's life), not a single
  editable field like Notes — worth designing as its own small table
  (`pacing_optimizations` or similar: campaign line id, date, note) rather than one
  text column, once this gets built.
- **Goal** is impressions- and clicks-based for SEM specifically (confirms it varies —
  other platforms/tactics may use a different metric; not yet asked one-by-one).
- **Goals should be calculated automatically from the IO submission's budget and
  CPM/CPC** — not manually typed. Claire explicitly wants this automatic if possible.

**Checked feasibility of the auto-Goal idea against the real order data (read-only
check, no changes):** this is genuinely buildable. `index.html`'s `submitIO()` already
stores a `line_items` JSON array per order (`orders.line_items`), and each spend-priced
line item already carries the client's monthly `spend` dollar amount alongside its
`service_id`. That `service_id` resolves to the catalog's rate — `retail_cpm` for CPM-
priced services, or the `sem-bp` CPC range ("$4–$12") for SEM specifically. So `Goal`
could genuinely be derived as `spend ÷ CPM × 1000` (impressions) or `spend ÷ CPC`
(clicks), with no new manual entry needed, confirming Claire's "automatic if possible"
is realistic — not a promise made without checking.

**CPC-range question — RESOLVED 2026-07-18.** Claire confirmed some groups' actual
negotiated rate/split differs slightly from the catalog default, and asked for the
same mechanism the Suggested Map/Custom Pricing already has: groups already carry an
`io_pricing` JSONB override column (edited on each group's own Custom Pricing tab) that
lets one group's price differ from the catalog default without touching every other
group. The rate used for auto-calculating Goal should follow the exact same pattern —
catalog default CPM/CPC unless a specific group has its own override set, same UI
convention Claire and the AMs already know from pricing. This makes Goal fully
automatic end to end: spend (from the order) ÷ rate (catalog default, or that group's
override if one exists) — no per-campaign manual input needed after all.

**Claire's answers, round 3 (2026-07-18):**
- **Platform-report pulling should be automated** — not a reproduction of the manual
  twice-weekly paste step. This is a real scope increase from "build a dashboard over
  existing data" to "integrate with each ad platform's own reporting API (Google Ads,
  Simpli.fi, Facebook Ads, The Trade Desk)" — each is its own OAuth/API-credential
  setup, its own rate limits, and needs some kind of scheduled pull (a cron-style job,
  not something that happens live in a page load). Meaningfully bigger than anything
  built so far in this project — flagging that clearly rather than treating it as a
  small add-on.
- **IO visibility**: still waiting on her confirmation — no answer yet.
- **Goal metric confirmed**: non-SEM platforms/tactics use **impressions**; SEM
  specifically uses **clicks**. (Resolves the last open question on what Goal means.)

**New consideration Claire raised: reporting overlap with Google Data Studio /
TapClicks.** 44i currently uses both for client-facing reporting. Worth asking before
any automation work starts: **does TapClicks already aggregate pulls from these same
ad platforms** (Google Ads, Simpli.fi, Facebook Ads, The Trade Desk)? If so, pulling
FROM TapClicks's own API/export (one integration) could replace building and
maintaining four separate direct ad-platform integrations — meaningfully less work and
fewer things that can break. This needs Claire (or whoever owns the TapClicks
relationship) to check what TapClicks actually exposes before deciding which way to
build the automation. Not assumed either way — just flagging the option since it could
change the entire shape of this piece.

**TapClicks/Data Studio split clarified (2026-07-18):** it's not one-or-the-other —
44i uses TapClicks specifically for Simpli.fi reporting, because their Google
connection to it keeps having its token expire; the majority of everything else stays
in Google Data Studio since TapClicks costs more to run broadly. So this isn't "one
aggregator covers everything" — it's a mixed setup, per platform, largely for
reliability/cost reasons rather than data availability.

**Real risk this surfaces, not yet answered:** if Simpli.fi's OAuth token expiring is
a property of *Simpli.fi's own API* (not something specific to how Google Data Studio
happens to implement its connector), a direct Simpli.fi integration built for this
platform could hit the exact same expiring-token problem — meaning TapClicks might be
the more reliable path for Simpli.fi specifically, even though it's the pricier option
generally. Needs Claire (or whoever manages the TapClicks/Simpli.fi relationship) to
confirm whether the token issue is Data-Studio-specific or inherent to Simpli.fi's API
before deciding how to pull Simpli.fi data for this platform.

**Both remaining questions RESOLVED 2026-07-18:**
- **IO visibility for strategists** — Claire confirmed strategists are already set up
  to receive every IO as a BCC today (outside this platform, presumably via each
  group's existing notification settings — the `always_bcc_recipients` mechanism
  built earlier this session). Since they already see every IO by email, giving them
  the same visibility inside the strategist portal (an Orders-style view, same shape
  as what AMs already get) is just matching existing practice, not a new access grant.
  Confirms the earlier assumption that Layout rows should be able to auto-populate
  from real order/line-item data.
- **Simpli.fi token issue** — Claire believes it's specifically because Data Studio's
  Simpli.fi connector isn't a native integration (i.e., a Data-Studio-side limitation),
  not a property of Simpli.fi's own API. This suggests a direct, purpose-built
  Simpli.fi integration for this platform should be fine on its own merits — but this
  is Claire's belief, not something independently verified against Simpli.fi's actual
  API docs, so worth a quick real check before committing engineering time to a direct
  integration (cheap to verify up front; expensive to discover mid-build that Simpli.fi
  really does expire tokens unusually often regardless of client).

**Still open before any of this gets built:**
- Quick verification of the Simpli.fi API's real token/auth behavior (see above) before
  assuming a direct integration is the right call.
- For the other three platforms (Google Ads, Facebook Ads, The Trade Desk) — direct
  integration, or any reason to route those through TapClicks too? (Leaning direct,
  not yet explicitly confirmed.)
- Scope/sequencing: platform-report automation is a substantially bigger lift than the
  Layout-equivalent dashboard itself (which is mostly "derive from data already in
  Supabase," this project's usual pattern) — worth deciding whether the dashboard ships
  first with the existing manual paste step, and automation comes as its own later
  phase, rather than treating both as one project.
- Whether strategist Orders-view access should be scoped per-strategist (like the
  per-group AM scoping already built) or see everything, given Claire's answer that
  the portal is shared but separated by strategist.

All four rounds of scoping questions from this pass are now resolved except the items
above — this is likely close to ready for an actual implementation plan once those
last few are nailed down, rather than more open-ended scoping.

**Pacing color thresholds — RESOLVED 2026-07-18.** Claire confirmed the exact
conditional-formatting bands already in use on the pacing spreadsheet: **light green
≥ 90%, light yellow 70%–89.99%, light red ≤ 69.99%.** A simple 3-band system, not the
4-state "Ahead / On Pace / Behind / At Risk" language invented for the first mockup
draft — that was a guess, corrected once Claire pointed to the real spreadsheet rule.
Whatever gets built should show the literal percentage with this exact 3-color
threshold, not an invented label system.

**Concept mockup + plan/questions doc — BUILT 2026-07-18, shared as an Artifact (not
committed to the repo — a discussion aid, not application code).** Claire asked for
something simple to have ready to share with the strategist team, since this section
is being scoped from scratch rather than mid-build like the rest of the platform.
Built a single page with three parts: (1) a static visual mockup of the dashboard using
the pacing template's real columns, sample fictional data, and the corrected 3-band
pacing color coding; (2) a plain-language recap of every decision from this scoping
pass (rows auto-populate from the IO, Goal auto-calculates from spend + rate including
per-group overrides, Optimize is a dated log not a single field, IO visibility already
matches existing BCC practice, report automation is a later phase); (3) open questions
grouped by topic (Pacing & Goals, Optimize Log, Day-to-Day Use, Reporting Automation)
for Claire to walk the strategists through directly. Explicitly labeled throughout as
a concept only — nothing built, meant to gather feedback before any build starts.

**Mockup revised 2026-07-18 (same day) — two corrections from Claire's review:**
- **Actual Spend added alongside Actual Performance.** The mockup originally only
  showed Actual clicks/impressions; Claire wants dollars spent tracked too, not just
  the performance metric. Added as its own column, distinct from Goal/Budget.
- **Platform is strategist-selected, not auto-populated.** Originally assumed
  Group/Client/Platform/Tactic could all auto-populate from the matching IO line item.
  Claire corrected this: Platform specifically needs to be picked by the strategist,
  because the same ordered tactic can run on more than one platform depending on how
  it's actually executed (the IO records what tactic a client bought, not which ad
  platform fulfills it). Tactic, Client, Budget, and dates still auto-populate — this
  is a narrower exception, not a reversal of the "derive from the order" plan. Updated
  the mockup's auto/manual legend dots and the "Rows come from the IO" plan card to
  reflect Platform as the one exception, and added two new questions for the
  strategists: whether pacing should weigh Actual Spend, Actual Performance, or both,
  and whether a tactic's platform ever changes mid-flight or is set once and left alone.

**Mockup revised again 2026-07-18 (same day) — layout/grouping corrections:**
- **Budget/Actual Spend and Goal/Actual Perf. now sit adjacent** — Claire wants the two
  spend figures next to each other and the two performance figures next to each other,
  so they're easy to compare side by side, instead of the original interleaved order
  (Budget, Goal, Actual Spend, Actual Perf.). New column order: Client, Tactic,
  Platform, Flight, Budget, Actual Spend, Goal, Actual Perf., Pacing, Optimize Log,
  Notes.
- **Rows grouped visually by Group** — matches how the rest of the platform already
  organizes everything (Groups is the top-level entity everywhere else in this app).
  The mockup now shows a group-header row above each cluster of that group's campaigns,
  instead of repeating the group name in every row's client cell.
- **Start/End dates added back as a "Flight" column** — Claire confirmed these are
  needed; they'd been described in the plan text ("flight dates populate from the
  order") but weren't actually shown in the visual table until now.
- Added a new "Rows grouped by Group" plan card explaining the grouping choice.
- Structural check: tag-balance verified (table/thead/tbody/tr/td/th/div/section counts
  all matched) before republishing.

**New requirement surfaced 2026-07-18 (same day) — historical data / per-strategist
tabs.** Claire clarified something she said she should have mentioned from the start:
the current pacing spreadsheet has a separate tab per strategist AND a separate tab
per month, specifically so historical data stays available alongside the current
month. This doesn't need to carry over as literal "tabs" in the portal — a database-
backed dashboard can just filter by month and by strategist instead of duplicating a
whole sheet each time. Added to the mockup: a "July 2026 ▾" month selector next to the
existing My Campaigns/All Strategists scope toggle, plus a short inline note
explaining that history accumulates automatically instead of requiring a new tab each
month. Added a new "History is a month picker, not a new tab" plan card, and a new
"Historical data" question group covering: how far back strategists actually need to
look in practice, whether a closed-out month should be locked/read-only or still allow
adding Optimize Log entries retroactively, and whether they ever need to compare two
months side by side. None of this is decided yet — purely added to the discussion doc
for the strategist conversation, same as everything else in this section.

**Gross Budget vs. In-Platform Budget split added 2026-07-18 (same day).** Claire
clarified the single "Budget" column in the mockup needs to be two real columns,
matching the original spreadsheet's actual F/G columns that got collapsed into one
during the first mockup draft: **Gross Budget** (what the client pays) and
**In-Platform Budget** (what actually gets spent with the ad platform, after agency
margin). Updated the mockup's column order to Gross Budget → In-Platform Budget →
Actual Spend → Goal → Actual Perf.

**Real open question this surfaces, not yet decided:** Gross Budget is what's on the
IO (the client's payment), so it can auto-populate the same way the rest of the order
data does. In-Platform Budget is NOT something the IO records — it depends on the
agency's margin arrangement for that client — so it's marked strategist-entered
(manual) in the mockup, not automatic. This directly affects the earlier "Goal
calculates itself automatically" plan: if Goal should be based on what's actually
spent with the platform (In-Platform Budget) rather than what the client pays (Gross
Budget), Goal can't be 100% automatic end-to-end after all — it would need In-Platform
Budget entered first, then calculate from that. Flagged clearly in the mockup's plan
card and added as a new question under Pacing & Goals rather than assumed either way.

**Two more additions, same day (2026-07-18):**

1. **In-Platform Budget should auto-calculate from an "accounting map."** Claire
   resolved the Gross-vs-In-Platform Goal question from the entry above: Goal should
   be based on In-Platform Budget, and In-Platform Budget itself should be calculated
   automatically from Gross Budget via a new reference source she called "the
   accounting map" that this project will also need to build/reference — not something
   a strategist manually enters after all. Updated the mockup's In-Platform Budget
   column to auto (was manual), and the plan card now describes it as automatic
   pending the accounting map's real shape. **Nothing about the accounting map's
   actual structure is known yet** — added as its own new question group: what it
   contains (a margin % per client? per platform? per tier?), where it currently lives
   (a spreadsheet, the accounting software, somewhere else), and who maintains it. This
   needs real answers before any schema work can start — deliberately not guessed at.

2. **Click-through detail view + live campaign link.** Claire asked whether
   strategists could click a client/tactic row to see more granular platform-report
   detail (to help pinpoint exactly what needs attention) and potentially a link to the
   live campaign in the actual ad platform, once the API/automation work is in place.
   Answered yes — added to the mockup as an expanded detail panel below a selected row
   (Harbor & Vine used as the example), showing an ad-group-level breakdown pulled from
   the same platform-report data already powering Actual Spend/Performance, plus a
   "View in Simpli.fi ↗" link. Framed honestly: until platform APIs are connected, this
   would be a plain reference link a strategist keeps updated by hand, becoming a real
   deep link only once that automation phase lands — not promising live-linking before
   the API work it depends on exists. Added a new question group asking what specific
   detail would actually help them (beyond the illustrative ad-group breakdown), and
   whether a manually-kept reference link is worth having on its own before the real
   API-based version exists.

**Accounting map headers received 2026-07-18 (same day):** Claire shared the actual
column headers from the real accounting map: Item, Default Retail, YDA, 44i Cut %,
44i Cut $, (Of Gross) Budgeted Spend, (0 is not fixed) 44i Fixed Cut, Retail CPM, 44i
CPM, Platform CPM, Spend %.

**Not enough to design a schema/formula from yet — asked Claire for specifics rather
than guessing:**
- What does **YDA** stand for?
- **44i Cut %** vs. **(0 is not fixed) 44i Fixed Cut** — when a row has a nonzero
  Fixed Cut, does that override the percentage cut for that item, or do the two
  combine somehow?
- Is **Item** the same thing as this project's `services` catalog rows (one accounting
  map row per service), or a different, coarser/finer grouping?
- Does **Spend %** mean the percentage of Gross that actually becomes in-platform
  media spend, or something else?
- Two apparently-parallel pricing shapes show up here — a percentage/dollar-cut model
  (44i Cut %/$$) and a CPM model (Retail CPM / 44i CPM / Platform CPM). Does the
  formula for In-Platform Budget depend on which pricing shape a given Item uses (i.e.
  CPM-priced items use the CPM columns, percentage-priced items use the Cut columns),
  or is one formula used universally?
- Is this map company-wide per Item (a standard cut/rate applied the same way for
  every group), or can an individual group's negotiated rate override it — and if so,
  is that the same `io_pricing` override mechanism already built, or something
  separate?

No schema or formula work has started — this needs real answers first, same
discipline as everything else parked in this section.

**Claire's answers, 2026-07-18 (same day):**
1. **YDA = Group Cut %** — the white-label group's own cut, separate from 44i's cut.
   So there are two cuts to account for: the Group's cut (YDA) and 44i's cut (44i Cut
   %/$$), both presumably coming off Default Retail/Gross before arriving at the actual
   in-platform media spend.
2. **Fixed Cut vs. percentage cut interaction — still not resolved.** Claire isn't
   sure herself and said this may need research on her end before it's answered.
   **This is the one remaining blocker on the actual formula** — everything else below
   is confirmed, but this piece specifically needs to come back from her before real
   schema/formula work can start.
3. **Item = the same as this project's `services` catalog rows**, confirmed — one
   accounting map row per service. Very likely means this data becomes new columns on
   the existing `services` table (or a table keyed 1:1 to it), not a new parallel
   catalog — same "don't duplicate what already exists" principle used everywhere else
   in this project.
4. **Spend % confirmed** as the percentage of Gross that becomes actual in-platform
   media spend.
5. **One universal formula**, not split by CPM-priced vs. percentage-priced items —
   simplifies the eventual calculation meaningfully.
6. **Group-negotiated rates do exist** — confirms an override layer is needed. Still
   to be confirmed: whether that's the same `io_pricing`-style override mechanism
   already built for Custom Pricing, or a separate one specific to the accounting map
   (not yet asked — worth clarifying once the fixed-cut question above comes back, so
   both remaining questions can be resolved together rather than piecemeal).

Still blocked on: the Fixed Cut/percentage-cut interaction (Claire researching), and
whether group overrides reuse `io_pricing` or need their own mechanism. No formula,
schema, or build work should start until both are answered.

**Mockup cleaned up 2026-07-18 (same day) to match.** The accounting-map details
above got resolved directly between Claire and me, not through the strategist team —
so the mockup's "Accounting map" question group (what it contains, where it lives, who
maintains it) no longer belonged in a doc meant for strategists to answer. Removed
that question group entirely, and updated the "In-Platform Budget calculates itself
too" plan card to describe what's now actually confirmed (Group cut, 44i cut, tied to
the existing services catalog) instead of listing it as an unresolved unknown — the
one still-open piece (fixed vs. percentage cut interaction) is now framed as an
internal detail being confirmed, not a question for the strategist team.

---

## OPEN QUESTIONS FOR THE AM

- **TLP 15+ intake timing — RESOLVED/MOOT 2026-07-15.** Originally: fill structured
  intake before or after the quote? Claire's call: no longer needs a separate answer —
  building the QUR Quoted Price field and the TLP Custom dynamic intake grid (both built
  2026-07-14) already resolves this naturally, since the AE now enters the quote and the
  page count together at intake time, in whichever order makes sense for that
  conversation. Nothing further needed here.
- **Visitor-ID email-bundle intake** — `w-vid200e` / `w-vid350e` / `w-vid500e` had
  NO intake form in the old code, while the plain versions (`w-vid200/350/500`) route
  to the `visitorid` intake. The table now gives all six the intake form (assuming the
  omission was an oversight). Confirm that's correct, or whether the email versions
  should skip intake for a reason. **STILL OPEN as of 2026-07-15.**
- **Wrong intake form attached to a bundled tactic card — FOUND LIVE 2026-07-15, asking
  the AM.** Claire spotted a "Targeted Landing Page" card on Test Business 6's Trello
  list with an SEO/AEO intake PDF attached, even though neither IO sold TLP on its own —
  traced to a real bundled package where TLP comes along as one of several cards inside
  a whole-list Trello template. Root cause: `finalizeTacticCard()` resolves ONE intake
  form for the entire WORKFLOW (via `resolveWorkflowIntakeFormId`, "first sold row's
  intake_form_id wins" — a known ambiguity, already flagged in its own code comment) and
  attaches that SAME PDF to every card copied from that workflow's template list,
  regardless of which specific tactic each individual card actually represents. So a
  package whose primary/first-listed component is SEO-intake-tagged puts the SEO intake
  PDF on every card it produces — including an unrelated bundled TLP card. **Not yet
  fixed — Claire is checking with the AM on what the CORRECT behavior should be** (options
  discussed: skip intake entirely for a bundled card that isn't the package's own primary
  service, vs. give it its own correctly-matched intake, vs. it depends on the specific
  package) before choosing an approach, since this is a business-logic call about what
  each package should actually collect, not a pure code bug with one obvious right
  answer.
- **QUR quoted price silently reverting to "Quote Upon Request" — FIXED 2026-07-15, found
  live by Claire testing TLP Custom.** Typed a quoted price, confirmed it showed correctly
  on Review after a hard refresh, then later saw it revert to "Quote Upon Request" again
  with no obvious cause. Root cause found via a real headless-browser test driving the
  actual extracted `toggle()`/`renderPriceCells()`/`syncRowInputs()`/`buildReview()`
  functions against a real DOM: `toggle()`'s UNCHECK branch resets a row's spend input via
  a selector that excludes `.qty-field` but NOT `.quoted-price-field` — the same
  class-exclusion gap already fixed in `renderPriceCells()`/`syncRowInputs()`/
  `buildDraft()`/`loadDraft()` earlier this session (see the "Quoted Price input box
  clipped" entry and the per-unit-row-duplication fix), just missed in this 5th location.
  A QUR row's own quoted-price box gets misidentified as a plain spend input and silently
  blanked every time the row is unchecked — so if the checkbox ever gets unchecked and
  rechecked (an accidental double-click, some other interaction toggling it) without the
  AE consciously re-typing the price, Review/print reverts to "Quote Upon Request" with
  nothing on-screen obviously explaining why. Fixed by adding the same `:not(.quoted-
  price-field)` exclusion used everywhere else, plus an explicit reset of the quoted-price
  box's own value on uncheck (previously implicitly caught by the buggy selector, now
  handled deliberately and consistently with the qty-field reset right next to it).
  Verified via the same real-browser test: uncheck now cleanly clears the box, and a
  recheck without re-entering a price now HONESTLY shows "Quote Upon Request" (matching
  what's actually stored) instead of a silent, confusing mismatch. Not yet re-confirmed
  live by Claire.
- **Notifications recipients changed from CC to BCC — DONE 2026-07-16, per Claire.**
  The global always-notified admin field (see "Notification recipients" entry above)
  renamed `always_cc_recipients` → `always_bcc_recipients` throughout (label, textarea
  id, load/save JS, SQL migration) — a clean rename since the migration still hadn't been
  run in Supabase yet, not a breaking schema change. **The migration still needs to be
  run** (`notification-settings-2026-07-15.sql`, updated in place with the new column
  name) before the Notifications tab will load/save.
- **New section got a long auto-generated id ("social-display-ads") instead of a short
  one — FOUND LIVE + FIXED 2026-07-16.** Claire created a new section and noticed its id
  didn't match the short style of the original sections (`vid`, `ctv`, `audio`, `alc`).
  Root cause: `generateSectionId()` just slugified the WHOLE label
  (`social-display-ads`) — most of the original short ids (`td`, `sem`, `sma`, `lt`,
  `gbp`, `llo`, `tlp`, `alc`, `em`) are actually literal INITIALS of their own labels, a
  different convention than what the generator was doing. Rewrote it to build initials
  (first letter of each word, splitting on whitespace/slash/hyphen, accents stripped so
  "À La Carte" → "alc" instead of dropping the accented word), falling back to the full
  word only for a genuinely single-word label (a lone initial would be too cryptic).
  Verified via direct simulation against all 17 original section labels — reproduces
  9 of them exactly, reasonable short ids for the rest. Same fix applied to
  `generateServiceId()` (service ids follow the identical "section-prefix +
  short-label-suffix" convention — `alc-design`, `rep-bp`, `tlp-bs/bb/bp` — verified
  against those exact examples too). Both generators now share one `slugOrInitials()`
  helper so they can't drift into two different conventions. Still just a starting
  suggestion — the ID field stays fully editable before saving, same as before.
- **Accidental duplicate service created under the new section — CLEANED UP 2026-07-16.**
  Direct fallout of the long-id issue above: Claire created a NEW "Social Display Ads —
  Business Pro" service under her new section (intending to move an existing one there),
  not realizing an identical service already existed in the `audio` section under the
  short id `sda-bp` (same for `sda-offline`, "Social Display Ads — Offline Visits
  Tracking"). Resolved via direct SQL: moved both real services (`sda-bp`, `sda-offline`)
  from `audio` into the new section, and deleted the accidental duplicate row (whose id
  had baked in the pre-rename long section id, doubled: `social-display-ads-social-
  display-ads-business-pro`). Also renamed the section itself from its original long
  auto-generated id to `sda` via direct SQL (same pattern as any section id rename:
  `services.section` has no enforced foreign key to `sections.id`, so both the section
  row and every service pointing at it need updating together, or those services would
  silently stop appearing anywhere).
- **Supabase compute/connection health check — CONFIRMED HEALTHY 2026-07-16.** Claire was
  on high alert after hitting a real capacity wall on a separate, unrelated database
  project (too many uncapped calls, ultimately needing a support ticket + a compute
  upgrade to recover) and wanted 44i-io checked for the same risk. Reviewed the Supabase
  dashboard together: CPU 2%, RAM 31%, disk 11%, 7 of 60 connections in use, 642 total
  requests with a 99.8% success rate over 24 hours (the one error traced to a duplicate-
  key SQL error Claire hit and already resolved earlier the same session — not a new or
  ongoing issue). All comfortably healthy for this project's current usage (internal
  testing only, not yet AE-launched). Added a new standing principle (below, under KEY
  PRINCIPLES) to check query patterns for N+1/uncapped-call risk on every new feature
  going forward, rather than only after traffic grows.
- **Sections didn't match the paper IO — split 3 merged sections into 12, per Claire's
  AM, 2026-07-16.** Claire's AM flagged that some sections were "pulled together and
  given sub headers" compared to the paper IO. Confirmed by reading the SnapMe paper
  IO PDF directly: the video/streaming/audio family has 12 separate top-level sections
  there (YouTube Video, Native Video, Native Display, Programmatic Video, Programmatic
  Audio, Mobile Audience Targeting, Social OTT/CTV, Social Display Ads — split earlier
  the same day, see above — YouTube TV Ads, Streaming TV Advertising, Hulu Ads, Amazon
  Prime Ads), but the tool had only 3 merged sections (`vid`, `ctv`, `audio`) using
  `subsection_label` sub-tables to fake the distinction. Split via direct SQL: 12 new
  section rows (ids reused from each service's own existing id prefix — `yt`, `nv`,
  `pv`, `yttv`, `stv`, `ottctv`, `hulu`, `amz`, `netflix`, `pa`, `nd`, `mob` — for
  consistency, same reasoning as `sda` earlier), every affected service's `section`
  updated to its new home with `subsection_label` cleared (no longer needed — each
  is single-table now), and the 3 old merged sections deactivated (not deleted,
  reversible). Header-note minimums pulled directly from the paper IO's own printed
  text. **Gap flagged, not guessed at:** Netflix Ads doesn't appear on the SnapMe
  paper IO at all, so its header note (minimum spend) was left blank — Claire needs to
  fill in the real number via the Sections tab.
- **Section icons removed entirely, per Claire, 2026-07-16.** After the 12-way split
  above, several new sections would have had to reuse the same 2-3 emoji (🎬/📺) right
  next to each other, which read as visual noise rather than helping scannability —
  Claire's own read: "pretty busy now." Considered giving each of the 12 a distinct
  icon instead, but several (Native Video vs. Programmatic Video vs. YouTube Video)
  don't have a meaningfully different real-world icon, so forced distinctness would
  have been arbitrary rather than useful. Claire's call, once framed as an all-or-
  nothing consistency question (icons on some sections but not others would look
  unfinished): remove icons from every section, site-wide, not just the new ones —
  `update sections set icon = null;`. Fully reversible — nothing about the underlying
  data or rendering requires icons; the `<h3>` header simply omits the icon span when
  `sec.icon` is falsy (unchanged existing behavior, already handled by
  `renderSectionCards()`'s `sec.icon ? esc(sec.icon) + ' ' : ''`).
- **Optional Content Support quarter-hour billing — BUILT 2026-07-16, per Claire's
  AM.** Scoped to ONLY the two Optional Content Support rows (web-ot and web-mo
  sections) — confirmed explicitly NOT for every hourly service. Below 1 hour, bills
  in 15-minute increments (15/30/45 min); at or above 1 hour, whole hours (1-8 hrs).
  Claire's own call on mechanism: a constrained dropdown rather than free-typed
  minutes, so an AE can't enter an invalid increment that doesn't correspond to a
  real billing tier. New `services.qty_preset_options` column (jsonb array of hour
  values, e.g. `[0.25,0.5,0.75,1,2,3,4,5,6,7,8]`) — same "put per-service behavior in
  data, not code" pattern as `exclusivity_group`/`spend_minimum`/`subsection_label`/
  `hosting_prompt_type`. When set, a per_unit service's qty control renders as a
  dropdown (labeled "15 min"/"1 hr"/"2 hrs" etc., generated from the raw number) instead
  of the free-typed box every other per-unit service still uses. Pricing needed ZERO
  special-casing — it's still `fee = default_price × qty`, so $175/hr × 0.25 = $43.75
  falls out of the exact same math every other per-unit service already uses. Two real
  gaps this surfaced and fixed: (1) `fmt()` rounded to 0 decimal places unconditionally,
  which would have silently rounded $43.75 to $44 — raised to 2 decimal places max
  (minimum stays 0, so every existing whole-dollar price still renders exactly as
  before); (2) every place that reads a qty value assumed `input[type=number]` and used
  `parseInt` — neither matches a `<select>` element, and `parseInt("0.25")` truncates to
  0 regardless. Fixed in `updateQty()`, `syncRowInputs()`, `loadDraft()`, and the
  `.qty-field` lookup selector itself (dropped the tag restriction). Verified via a real
  headless-browser test using the actual extracted functions: dropdown labels render
  correctly, selecting 15 min produces exactly $43.75 on Review, selecting 3 hrs
  produces $525, totals update correctly for both. **SQL migration
  (`qty-preset-options-2026-07-16.sql`) still needs to be run** — adds the column and
  sets it on the two Optional Content Support rows (matched by label + section, since
  their exact ids weren't confirmed in this session).
- **Submission email — provider identified, PIPELINE BUILT 2026-07-16, ready for the
  Mailgun API key.** Claire confirmed the current WordPress-based submission process
  already emails from `info@yourdigitalgroupresources.com`, and checking a received
  email's "Show original" headers (`mailed-by: mg.yourdigitalgroupresources.com`)
  identified the provider as **Mailgun** — meaning the domain is already verified there,
  the hardest part of setting up transactional email. Claire will get the API key from
  whoever manages that Mailgun account, after her next meeting with her bosses/AM
  (timing: sometime next week, not blocking). Built the whole pipeline ahead of having
  the key so it's ready the moment it's added:
  - `claude-proxy` Edge Function gets a new `send_email` target (checked/handled BEFORE
    the existing Trello-credential check, since it doesn't need Trello creds at all) —
    calls Mailgun's HTTP API (`POST /v3/{domain}/messages`, Basic auth `api:{key}`) with
    `to`/`bcc`/`subject`/`html`/attachment passed straight through from the caller.
    Needs 3 new secrets: `MAILGUN_API_KEY`, `MAILGUN_DOMAIN` (`mg.yourdigitalgroupresources.com`),
    and optionally `MAILGUN_FROM` (defaults to `Digital Resources <info@{domain minus
    "mg." prefix}>` if not set). Full updated file in scratchpad
    (`claude-proxy-index-2026-07-16.ts`) — **still needs to be deployed**, and the 3
    Mailgun secrets still need to be added once Claire has the key.
  - `submitIO()` gets a new Step 6 (after the Trello block, independent of whether Trello
    is configured/succeeded): builds recipients from `selectedGroup.io_recipient` (To) +
    `notification_settings.always_bcc_recipients` (Bcc), deduped case-insensitively so
    someone in both lists isn't emailed twice (closes the gap flagged 2026-07-15), falls
    back to sending as a plain To if a group has no `io_recipient` but does have
    always-BCC addresses (BCC-with-no-To is malformed). Builds a short HTML summary
    (IO #, client, contact, AE, KOC, totals) in the group's brand color, reuses
    `generateIoPdfBlob()` for the same IO PDF already attached to Trello. Wrapped in its
    own try/catch — until the Mailgun secrets exist, `send_email` just returns an error
    and this silently no-ops (a console warning only; the IO itself already saved
    successfully regardless).
  - Verified via direct simulation: recipient dedup (case-insensitive), the
    no-group-recipient fallback, the no-bcc-list case, and the nothing-configured case
    all produce the correct result. **Cannot verify actual email delivery until the
    Mailgun secrets are added** — this is expected, not a gap, since that's the one
    piece we're waiting on.
- **Archived/returning clients (Trello) — CONFIRMED WORKING 2026-07-15.** Claire tested
  this live: submitting an IO for a client whose Trello list was archived correctly
  reopens that same list (and repositions it to board slot 5, per the fix built the same
  day) instead of creating a duplicate. No further action needed.
- **Multi-select in Targeted Display / Social Media Ads — IN TESTING as of 2026-07-15.**
  Clarified into two SEPARATE questions (2026-07-10), since the old vague note conflated
  two different situations. Pulled the real tier membership via SQL rather than guess:
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
  ANSWERED 2026-07-15: YES.** Raised 2026-07-14, found while testing the archived-client
  reopen flow. Confirmed current code behavior at the time (never explicitly decided with
  the AM before, just how it quietly worked since the original build): when a product
  being sold already has a matching-named card in the client's Trello list, that card was
  skipped entirely — never touched, updated, or duplicated. Claire's decision: yes, build
  it, scoped to work the same way the IO card already does — keep the card's description
  showing the LATEST sale, but attach a dated PDF snapshot for history on every
  resubmission, so nothing before it is ever lost. This also folds in the earlier
  "intake answers as a PDF instead of in the description" request — one build serves
  both. **BUILT 2026-07-15 (`cebddda`).** Rewrote the whole Step 5 tactic-card loop:
  every one of the 4 card-creation paths (single-card template, whole-list template,
  whole-list-unreadable fallback, no-template plain card) now shares one
  `finalizeTacticCard()` finishing step, called whether the card was just created OR
  already existed before this run — no more "skip if it already exists." The card
  description no longer ever contains intake answers, only the services-sold summary
  (`formatSiblingLineItems`), always refreshed to the current state. Intake answers
  instead go into a new `generateIntakePdfBlob()` — deliberately NOT the IO PDF's
  html2canvas-screenshot approach, since intake content is plain structured text with no
  layout worth reproducing pixel-for-pixel; draws real text directly via jsPDF's own API
  instead, much lighter than a screenshot. Preserved the existing within-run dedup
  (`addedCardNames`) so two workflow entries resolving to the same card name in one
  submission still only get processed once, now distinguished from
  "already existed before this run, needs updating" via a new `findExistingCardByName()`
  lookup against `existingCards` (fetched once at Step 3, already in scope). Verified via
  simulation: all four routing scenarios (brand-new card, resold existing card, and both
  flavors of within-run duplicate) resolve correctly, and the new PDF generator produces
  correct title/subtitle/wrapped body text, pagination, and filename — not yet confirmed
  live in a browser.
  once built).
- **Intake PDF/card follow-up fixes — BUILT 2026-07-15, found live by Claire testing the
  feature above.** Claire tested a resold tactic card and reported the intake PDF was
  "messy": literal `**bold**` markdown showing as raw asterisks, emoji/checkmarks
  (✅/⚠️) rendering as garbled characters (e.g. `&þ`), odd letter-spacing throughout. Root
  cause: `generateIntakePdfBlob()`'s first version drew intake text directly via jsPDF's
  plain-text API (`.text()`/`.splitTextToSize()`), which has no markdown support and can't
  render most emoji/Unicode at all — a real limitation of that approach, not a bug in the
  text itself. Fixed by abandoning raw text-drawing and switching to the SAME
  html2canvas-screenshot approach the IO PDF already uses: render real styled HTML (real
  `<strong>` tags, real emoji, a colored status banner) into a hidden iframe, capture it
  with html2canvas, embed as a JPEG image across paginated jsPDF pages — guarantees the
  PDF renders exactly as a browser displays it, no font-limitation garbling possible.
  Two more pieces of feedback landed in the same fix: (1) Claire wants the short
  completion-status line (not started / partially complete / complete / AM-help-requested)
  kept visible in the card DESCRIPTION too, not moved entirely into the PDF — `buildIntakeDesc()`
  now returns `{ formTitle, banner, bannerHeader, html }` instead of one string: `banner`/
  `bannerHeader` are the short plain-text status line appended to the card description
  (after the services-sold summary), `html` is the full styled fragment for the PDF.
  (2) For a whole-list Trello template that copies several cards for one workflow (e.g. a
  Website tier package), the KOC label was landing on every copied card — Claire wants it
  on the FIRST card only. `finalizeTacticCard()` gained an `applyKoc` parameter
  (default `true`); the whole-list-template loop now tracks `isFirstCardThisWorkflow`,
  passes it through, and flips it to `false` after the first genuine card is processed
  (test/IO/AE-placeholder cards skipped by earlier filters never touch the flag). Verified
  via simulation: all four intake-completion states (not started/partial/complete/bypassed)
  produce correct banner text and color; a simulated 3-card whole-list copy (with an IO
  placeholder, an AE-questions card, and a test card interspersed) correctly applies
  `applyKoc:true` to only the first real card and `false` to the rest. Not yet confirmed
  live in a browser — Claire was mid-test (about to do the second submission for the same
  test client to verify description-updates-to-latest + PDF-history-accumulates) when she
  paused to report this.
- **Stuck submit button breadcrumb fix — CONFIRMED WORKING LIVE 2026-07-15.** Claire
  retested; clicking a Step 1/2/3 breadcrumb while the success screen is showing no longer
  leaves the submit button frozen — the breadcrumb-disable fix (`pointer-events:none`
  while success is showing, re-enabled by `resetForm()`) holds up in practice.
- **Stale "similar to existing client" warning surviving Submit Another IO — FIXED
  2026-07-15, found live by Claire.** Created a new "Test Business 6" client, got the
  expected typo/duplicate warning ("looks similar to Test Business 1" — a false positive
  from her own test naming, not a real bug in the similarity logic itself), then clicked
  "Submit Another IO" — the warning banner was still showing even though the business-name
  field itself was blank. Root cause: `resetForm()`'s text-input wipe clears the
  `biz-name` input's VALUE, but the warning is a separate element
  (`#biz-name-match-warning`) that nothing in `resetForm()` ever hid directly — it's
  normally only hidden/updated by `checkClientNameMatch()`, which only runs on typing, not
  on form reset. Fixed by explicitly hiding/clearing that element inside `resetForm()`
  alongside the other leftover-state clears already there. Verified via `node --check`-
  equivalent syntax parse only — the actual disappearing-banner behavior itself hasn't
  been re-confirmed live yet.
- **Section-collapse fix — CONFIRMED WORKING LIVE 2026-07-15.** Same test round; sections
  now correctly collapse back to closed on "Submit Another IO" instead of staying open
  from whatever the previous submission had expanded.
- **Intake status emoji regression — FIXED 2026-07-15, found live by Claire same day as
  the PDF-format fix above.** The PDF-format fix's own rewrite had swapped the banner's
  full compound emoji (⚠️/✅, with the variation selector) for bare text glyphs (⚠/✓),
  which render as small monochrome symbols rather than full-color emoji — Claire correctly
  read this as "we lost the emojis" in the card description. Restored the full emoji
  versions. Also bold-wrapped the description-only `bannerHeader` with Trello's own `**`
  markdown (safe there — Trello renders it — unlike the shared `banner` string, which
  still carries zero markdown since it also feeds the PDF's styled div, and literal
  asterisks there was the ORIGINAL messy-PDF bug this whole feature started from).
- **Intake PDF visual redesign — BUILT 2026-07-15, per Claire ("less bland, more
  structured like the IO").** The PDF-format fix earlier the same day switched intake
  PDFs from garbled jsPDF text-drawing to an html2canvas screenshot, but the HTML itself
  was still just a flat stack of plain `<div>`s — functionally correct but visually
  unstructured. Rewrote `buildIntakeDesc()`'s `html` fragment to mirror the IO PDF's own
  visual language: a letterhead-style header bar in the group's brand color
  (`selectedGroup.brand_color`, same fallback the IO PDF uses), uppercase bordered section
  headers, and a real two-column table per section for Q&A instead of stacked lines. The
  TLP structured grid gets its own numbered-row table (parsed back out of the stored
  "1. Dallas, TX" line format) instead of inline text with `<br>` breaks — this was
  reported missing from a PDF Claire generated, but tracing the code found the
  grid-rendering logic itself works correctly given real saved data (confirmed via
  simulation); root cause not fully pinned down, watching for a repeat now that the
  section is visually much more prominent. Also fixed a latent gap while touching this
  code: `bizName` was being interpolated into this template raw (unescaped) — now goes
  through `esc()` like everywhere else. Verified via simulation (field escaping, TLP
  row-number parsing) AND by rendering the actual template to a screenshot via a headless
  browser to visually confirm layout/colors/table structure — not the same as seeing it
  render inside the real PDF pipeline, but as close as this environment allows.
- **Notification recipients — SCOPED + FOUNDATION BUILT 2026-07-15.** Discussed the
  planned submission-email feature (still parked pending an email provider choice, per
  Claire: "very similar to what we're doing now... some of the information in the email
  copy and then a PDF of the actual IO"). Two recipient audiences: per-group recipients —
  already exists, `groups.io_recipient` (comma-separated, edited on the Group Info tab) —
  and a NEW global "always CC every group" list for internal team members, which didn't
  have a home. Built the global side now (independent of the email feature itself actually
  sending anything yet): new `notification_settings` table (singleton row, same shape as
  `legal_content`) with one `always_cc_recipients` column, a new `admin_save_notification_
  settings` RPC (super-admin only, same restriction level as Legal Text), and a new
  "Notifications" admin tab mirroring the Legal Text tab's exact pattern (one textarea,
  AM-tier view-only). **Requires running `notification-settings-2026-07-15.sql` in
  Supabase** before this tab will load/save — not yet run as of this entry. Verified via
  `node --check`-equivalent syntax parse and simulated load/save payload logic; the tab
  itself hasn't been opened live yet (blocked on the migration).

---

## REVIEW / BUG / FORMATTING FLAGS (condensed 2026-07-16)

Everything below is now a condensed history — the original entries here ran to ~1700
lines of blow-by-blow investigation narrative for work that's long since finished and
confirmed. Anything still genuinely open was already pulled out into "CURRENT
OUTSTANDING ITEMS" at the very top of this doc; nothing here needs action. Kept only so
later sessions can see roughly what happened and when, without re-reading the full
original investigation — if you need the full story behind any item (exact root cause,
every verification step, exact commit), check git history around the date shown.

**Full catalog → dynamic-rows migration (2026-07-07, one long day).** All 17 public-form
sections converted from hardcoded HTML to catalog-driven rows, one batch at a time, each
verified via real-code simulation before moving on: À La Carte (prototype) → Reputation/
Local Listing/GBP (simple) → SEO/SEM (tier + spend) → Social Media Management/Email/TLP
(tier + untiered extras) → Targeted Display/Social Ads (combined tier+spend; closed a
gap where `td-offline`'s spend cell wasn't generating) → Location Targeting → Video/
Streaming TV/Audio (shared multi-table extension) → Website (most complex, saved for
last: two tier groups + hosting-prompt modals). Along the way: fixed a double-count bug
in offline-tracking modifiers (was display-only, not actually added to totals) and
removed stale spend boxes from 10 still-static rows sharing the same bug; fixed
`RADIO_GROUPS`/`SPEND_MINIMUMS` being frozen hardcoded snapshots instead of deriving live
from the catalog (a real bug — a brand-new tier item wouldn't have been recognized);
fixed `PRICEABLE_SERVICES` showing stale placeholder prices. Website's business-logic
questions (hosting/chatbot exclusivity, AI Chatbot standalone, Modules/Optional Content
Support ambiguity) were parked for AM review — see top of doc; the standalone-hosting
double-charge specifically WAS fixed same day (locks trigger on the actual hosting
choice, not just the tier being checked).

**Admin write-side Services editor built (2026-07-07 → 2026-07-10).** Exclusivity
Group, Spend Minimum, Subsection, Pricing Group, and Setup Fee fields added to the
editor as each was found missing (all follow the same pick-list-not-free-text pattern to
prevent typo'd duplicate groups); Service ID auto-generation added (later rebuilt
2026-07-16 to use initials, matching the Sections fix); AM-tier permission gating added
(4 layers: hidden buttons, blocked functions, RPC-level enforcement). Real bugs found and
fixed: the Suggested Map's own price-formatting logic had drifted from the live form's
(now shares one function); editing a service's `pricing_group` didn't refresh the Custom
Pricing list without a full reload (stale `CATALOG_ROWS`, fixed); fields irrelevant to
the selected Pricing Mode could save stale leftover values across a mode switch (now
force-nulled server-side). Full hardcoded-catalog-data audit (2026-07-10): `WEB_OTO`/
`WEB_MRR`, tier-name derivation, `HOSTING_LOCK_MAP`, and `HOSTING_CFG`'s hardcoded fee
all converted to derive live from the catalog; `TACTIC_MAP`/`WORKFLOW_TO_INTAKE`
deliberately left hardcoded for a later Trello-specific session. QUR items (`w-custom`,
`em-bp-30kp`, `tlp-custom`) fixed to visibly show "Quote Upon Request" instead of a bare
$0/blank (2026-07-08); a related regression where EVERY ad-spend/CPM service incorrectly
showed "Quote Upon Request" too was caught and fixed (2026-07-10) — this one was showing
on the actual printed IO contract, not just internally, so it mattered.

**Visual/branding polish (2026-07-08).** Header logo visibility fixed (a neutral
background chip replaced luminance-based inversion, which was failing for several real
groups' logos); logo sizing made uniform across groups. Review page totals bar and
header shadow made to follow group brand color instead of a hardcoded blue. Print preview
overlap with the running header/footer fixed in two passes (first attempt didn't fully
work — root cause was Chrome's print engine repeating `position:fixed` elements on every
page; final fix removed the repeating header/footer entirely in favor of a one-time
letterhead + one-time footer) — confirmed working live in an actual print dialog. Mobile
clipping on Step 1's Campaign Dates row and Step 3's signer row fixed across several
real root causes (rigid grid columns, native date-input sizing, iOS Safari overriding
CSS). Fee/Frequency/Spend column alignment "zigzag" fixed to a consistent right-aligned
rule.

**Per-unit quantity feature (2026-07-07).** Built a quantity box for per-unit/hourly
services (previously no way to record how many units/hours were actually billed); typing
a value auto-checks the row; an always-visible "$X × qty = $Y" breakdown shows on both
Review AND the printed IO — a deliberate reversal from an initial "keep the print clean"
decision, since the printed IO is the actual contract and should show the same math the
internal review does.

**Safety/dev-tooling (2026-07-08, 2026-07-10).** The `?dev=1` picker was reachable on the
live production domain by accident (a missing group slug alone triggered it); fixed to
require an explicit override, with a clean "Invalid Link" error otherwise (that error
screen was itself then fixed to actually replace the whole page, not sit as one small div
underneath a still-visible normal-looking form). Dev picker later expanded to list every
real group instead of 4 hardcoded fake ones, which required a new explicit
`isDevPreviewMode` flag as the real submission-safety guard — the old id-shape-based
inference would have silently allowed a real accidental Supabase/Trello write the moment
real group UUIDs were involved.

**Everything else, briefly:**
- `esc()` XSS escaping applied throughout Review/Print (2026-06-26).
- Label drift (a service's live catalog label not reflecting on the actual public form)
  closed application-wide (2026-07-07).
- Full PDF-vs-catalog reconciliation pass (2026-07-10) ahead of Claire's leadership
  presentation — real data corrections found and fixed: a wrong spend minimum, a missed
  `pricing_group` tag, internal working-notes accidentally baked into client-facing
  labels, a leftover active test row, a full Website Monthly Hosting restructure, and a
  new Netflix Ads service added.
- Suggested Map / Sections drag-and-drop reorder smoothed out (visual feedback while
  dragging, scroll position preserved after a save).
- Groups list's "X overrides" badge was counting stale overrides for deactivated
  services — fixed to only count active ones (2026-07-10).
- A leftover test service (`alc-testdelete`, active with an inconsistent data
  combination) silently and invisibly blocked "Next: Review & Submit" for anyone who
  selected it — fixed at the root (a data-consistency check), and the test row itself
  deactivated.

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
  **UPDATE 2026-07-15 — content confirmed + always-CC recipient list added:** Claire
  confirmed the email itself will be "very similar to what we're doing now... some of the
  information in the email copy and then a PDF of the actual IO" — same for every group,
  nothing group-specific in the template beyond the recipients. Also confirmed a SECOND
  recipient audience beyond `groups.io_recipient`: internal team members (e.g. every AM)
  who should be CC'd on every group's emails, not just their own, in case someone's out —
  built as a new global `notification_settings.always_cc_recipients` field (see
  "Notification recipients" entry above for the admin-tab build). **Requirement flagged
  for whenever the actual send logic gets built:** an AM will likely appear in BOTH their
  own group's `io_recipient` list AND the global always-CC list — the send step must
  merge both recipient lists into one set (case-insensitive dedup) before sending, so that
  person doesn't get the same email twice. Not yet built (no send logic exists at all
  yet) — just recorded here so whoever writes the actual send function doesn't miss it.
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
- **Submit button stuck "Submitting..." after clicking the step breadcrumb post-success —
  FIXED 2026-07-14 (`6954a9c`).** Claire noticed this while testing the KOC label feature:
  the IO looked fine in Trello, but when she went back to check something else in that
  same browser tab, the submit button was still frozen mid-spin. Root cause: the Step
  1/2/3 breadcrumb at the top of the page stays visible and clickable even on the success
  screen — she'd clicked "Client Info" instead of "Submit Another IO" after seeing
  success. Only "Submit Another IO" (`resetForm()`) ever resets the submit button back to
  normal; navigating via the breadcrumb (`goStep()`) skipped that entirely, so the
  button's leftover disabled/"Submitting..." state from the already-completed submission
  was still sitting there, just not visible until she scrolled back to Step 3. **The
  submission itself was never broken** — client, order, Trello card, and the KOC label
  had all already succeeded correctly before she clicked away; this was purely a stale
  leftover UI state on a button that was temporarily out of view.
  **First fix attempt:** had `goStep()` detect "the success screen is currently showing"
  and run the same full `resetForm()` reset in that case, so any way of leaving the
  success screen behaved consistently. Had to hide `page-success` BEFORE calling
  `resetForm()` specifically to avoid infinite recursion — `resetForm()` itself calls
  `goStep(1)` at its own end, and without hiding it first, that inner call would still
  see success as "showing" and call `resetForm()` again, forever. Caught this during
  implementation, not after — verified via a direct simulation of the control flow before
  committing.
  **Superseded same day (`eb9b769`) — Claire's better idea:** rather than letting a
  breadcrumb click through and silently redirecting, make the breadcrumb itself inert
  (`pointer-events:none`, dimmed) the instant the success screen shows — nothing left to
  click at all, so there's no silent-redirect surprise (e.g. clicking "Services" right
  after a submit would otherwise land on a blank services page with no client info filled
  in, since everything was just cleared). "Submit Another IO" is now the ONLY way back
  into the form; `resetForm()` re-enables the breadcrumb as part of its reset. The
  `goStep()` safety net from the first attempt is left in place as defense in depth
  (unreachable via normal clicks now, but still correct if anything else ever calls
  `goStep()` while success is showing). Verified via simulation: breadcrumb confirmed
  inert immediately after a submission, fully re-enabled after Submit Another IO. Not yet
  retested live in a browser.
- **Full admin-editor coverage audit — COMPLETE 2026-07-14.** Claire asked, after noticing
  Pricing Mode/Unit felt hard to find on a service, to confirm every real database column
  across every admin-editable table actually has a matching field somewhere in the admin
  UI (minus auto-managed columns like `id`/`created_at`). Ran `information_schema.columns`
  directly against Postgres (not against what any save function claims to handle) for
  `services`, `groups`, `sections`, `intake_forms`, `ae`, `legal_content` and cross-checked
  every single column.
  **Clean — every real column already covered:** `ae` (4/4), `intake_forms` (3/3),
  `sections` (4/4), `legal_content` (11/11), `services` (24/24 — confirms Pricing Mode and
  Unit were never actually missing, see the real bug found instead, next entry).
  **Two real gaps found in `groups` — NOT built, Claire's explicit call:**
  `trello_email` and `portal_domain`. Unlike every other finding this session, these
  aren't merely absent from the admin UI — they don't appear ANYWHERE in either file at
  all (not read, not written, not referenced). No history on them in this tracking doc
  either, so origin unknown before this audit.
  - `trello_email` — Claire confirmed: a group-specific email address meant to be used to
    email questions directly into that group's Trello board (Trello's own board-level
    email-to-board feature). A real, understood concept — just never wired up.
  - `portal_domain` — Claire wasn't sure what this was for either.
  Claire's explicit decision: don't build admin UI for either right now. Logged here so
  the audit and the decision are both on record — revisit if either ever becomes relevant
  again (e.g. `trello_email` could matter if email-to-board ever comes up as a feature).
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

## 2026-07-17 — Paper-IO reconciliation + fee-note wording + intake-PDF font fix + hard
minimum-spend enforcement

Claire uploaded a new paper IO PDF (Version 7.9.26) and asked for a full comparison
against live Supabase data.

**Found and fixed:**
- `wm-email` and `wm-ai` were inactive and still living in `web-mo` (Monthly) — the new
  PDF has them active under One-Time Website. Reactivated, moved to `web-ot`, then
  renamed to `w-email`/`w-ai` to match that section's `w-` naming convention (same
  pattern as the earlier `sda-bp` rename — self-referencing columns
  `standalone_hosting_service_id`/`auto_select_service_id` checked and updated first).
- Netflix Ads header note (real minimum spend, $3,000/mo) — confirmed from the PDF,
  filled in the previously-blank header note.
- Full line-by-line comparison of every remaining section against the PDF — everything
  else matched exactly. Flagged (not fixed, needs her/her AM's call) that the Social
  Media Ads "minimums vary by platform" footnote doesn't match the uniform $1,000
  minimum currently set for all 4 platforms in the catalog.

Then Claire sent a batch of 7 items (one "small bug" plus 6 numbered AM notes). Of
those, 3 were code-completable this session:

1. **SEM fee-note wording bug** — Claire had edited the manual `fee_note` field directly
   in Supabase, expecting it to show, but it never did. Root cause: `getFeeNoteText()`
   always prefers the auto-generated setup-fee sentence (driven by `auto_add_setup_fee`/
   `setup_fee`/`setup_fee_threshold`) over the manual `fee_note` field whenever
   auto-add is on — by design, so the wording can never drift from the real numbers, but
   Claire didn't know that sentence existed or that it took priority. Fixed by changing
   the auto-generated wording itself to what she asked for: `(a $200 setup fee will be
   added to campaigns <$1,000/mo)`. Verified via direct simulation of the function
   against real inputs — output matches exactly (only difference from her literal request
   is a comma in "$1,000" from `toLocaleString`, a readability improvement, not a bug).

2. **Intake-form Trello PDF "missing spaces"** — `generateIntakePdfBlob()`'s hidden
   iframe never loaded the Montserrat webfont its own HTML references, unlike the
   working `generateIoPdfBlob()`, which writes a full `<head>` with the Google Fonts
   `<link>` and waits 700ms before capturing. Without the real font loaded, html2canvas
   can mismeasure an unloaded/substituted font's glyph widths — a known way text loses
   its inter-word spacing. Fixed by adding the same font `<link>` and 700ms wait.
   **Honest caveat: this is a diagnosis based on comparing the two PDF generators, not a
   visual re-confirmation against Claire's actual broken PDF** — needs her to regenerate
   one and confirm it looks right.

3. **Hulu/Amazon/Netflix can't go below their spend minimum** — the existing
   `SPEND_MINIMUMS`/`updateSpend()` mechanism is soft/advisory only (a "Recommended
   minimum" warning that never blocks navigation), for every spend-priced service. Since
   Claire wants a HARD block for just these three, added a new `enforce_spend_minimum`
   boolean column (same "new column, not hardcoded ids" pattern as everything else in
   this catalog) and a new `spendProblems` check in `goStep()`'s Step-3 validation:
   blocks navigation if spend is missing entirely (existing behavior, any spend
   service) OR if spend is entered but below the minimum AND `enforce_spend_minimum` is
   true for that row. Verified via direct simulation against 5 synthetic cases (below
   minimum with hard-enforce → blocks; at minimum → passes; below minimum on a
   soft-only service → does NOT block; missing spend on a hard-enforce service →
   blocks; stray non-spend row with leftover spend_minimum data → does NOT block, same
   protection added 2026-07-10). SQL given: `enforce-spend-minimum-2026-07-17.sql` —
   uses label matching (`ilike '%hulu%'` etc.) rather than guessed-at ids, since I don't
   have Hulu/Amazon/Netflix's real service ids confirmed; ends with a verify SELECT so
   Claire can confirm exactly 3 rows match before trusting it.

The remaining 3 items from her batch (tag AM/AE on every card, Gold card at top of every
list, Green card at bottom once) need clarifying info only Claire has before they can be
built — see "CURRENT OUTSTANDING ITEMS" above for the specific open questions on each.

## KEY PRINCIPLES (how we've been working)

- Additive-first; defer the dangerous step; one change at a time so each is diagnosable.
- Distinguish bugs from design choices from team decisions before acting.
- Match storage to how data is used (rows for queried data; JSON for whole-unit reads).
- Don't go backwards to match incorrect old code — the table is canonical where it's
  more correct.
- Verify before trusting (the switchover's two-stage check caught real issues before
  they went live).
- GitHub commit = the undo button. Bank known-good checkpoints.
- **Watch database load on every new feature, not just correctness** (added 2026-07-16,
  per Claire — a separate project of hers hit a real wall: too many calls with no cap on
  how much could run, eventually needing a support ticket and a compute upgrade to
  recover). Before adding any new query pattern, especially inside a loop, check: is this
  making ONE call per item instead of one call for the whole batch (an N+1 pattern)? Is
  there any cap on how many things a single action can trigger, or could a large enough
  input make it call the database an unbounded number of times? Does a new admin/AE
  feature add repeated Supabase calls per keystroke/render where a single call would do?
  This project's actual usage is currently light (internal testing only, low request
  volume, connections nowhere near the pool limit — see the 2026-07-16 Supabase-metrics
  check in this doc), so nothing here is urgent, but it's worth checking as a habit on
  every new feature rather than only after traffic grows and it becomes a real problem.

## 2026-07-18 — AM Trello handle/calendar edits not showing up on Group editor (FIXED)

**Symptom (Claire):** added Trello handles and calendar links for AMs in the new Users
tab, but they didn't show up when picking that AM on a group.

**Root cause:** `ensureStaffRosterLoaded()` (built alongside the AM picker) caches
`ALL_STAFF` once per page load — `if (ALL_STAFF.length) return;` — and never refetches
after that. If the Groups tab's AM picker had already been opened once earlier in the
same browser session (caching the roster as it was then), any edit made afterward in
the Users tab wouldn't be reflected until the whole page was reloaded. The Users tab
itself saved correctly; the picker was just reading a stale in-memory copy.

**Fix:** `adminSaveUser()` and `adminToggleUserActive()` both now reset `ALL_STAFF = []`
right after a successful save, so the next time `ensureStaffRosterLoaded()` runs (next
time a group's New/Edit form opens) it fetches fresh data instead of returning early on
the stale cache.

**Verified:** Playwright simulation — loaded a mock staff roster, applied the AM pick
(empty Trello/calendar, as before any edit), then simulated saving new Trello/calendar
values through `adminSaveUser()`, then re-ran the AM-picker lookup. Before the fix this
would have kept returning the old blank values; after the fix, the second lookup
correctly returns the newly-saved Trello handle and calendar URL. Structural syntax
check also passed.

## 2026-07-18 — Wrong group logo showing via dev picker; logo chip dark-background option

**Reported:** switching between groups via the public form's dev group dropdown (no
page reload) sometimes showed the wrong logo — "whatever the last logo was" — for
ESPN Arkansas, Galaxy Media Interactive, Kensington Digital Media, Ohana Digital (no
logo at all), P5 Digital, Paradise Digital, Paragon Marketing, Piedmont Digital Group,
and SAGE Media.

**Investigated:** `DEV_GROUPS` (the dev picker's data source) is fetched fresh from the
real `groups` table at page load (`select=*`), and `applyDevGroup()` → `applyGroupBranding()`
reassigns `logo.src` directly from that fetched group object on every switch — no
caching layer sits between the picker and the real data, unlike the AM-roster bug
fixed earlier today. That rules out a code-side caching bug. **Most likely
explanation: the actual `logo_url` values stored for these groups are wrong** (very
possibly several groups accidentally sharing the same URL from a copy/paste mistake
when they were set up). Gave Claire `logo-check-2026-07-18.sql` to run — selects each
affected group's stored `logo_url`, plus a broader query finding any two groups
anywhere that share an identical `logo_url`. Awaiting results before concluding
anything further; no code changes made for this part, since the code path checks out.

**Separate, confirmed issue: white-lettered logos invisible on the chip.** Mavrik
Media Group and Online Visibility Pros' logos have white/light lettering, which
disappears against the logo chip's fixed near-white background — a real design gap,
not a bug (the fix for the wrong-logo issue above wouldn't touch this). Asked Claire
how to fix it; she chose a **per-group dark-background toggle** over reusing the
group's brand color or requesting new logo files, since it's the most surgical fix
(doesn't touch groups that don't need it, doesn't risk still clashing depending on
brand color chosen).

**Built:** new `logo_dark_bg` boolean on `groups` (SQL below). Admin Group editor gets
a checkbox right under Logo URL: "Logo needs a dark background — for white/light
lettering," wired into `adminNewGroup()` (resets unchecked), `adminEditGroup()`
(populates from `g.logo_dark_bg`), and the save payload. `index.html`'s
`applyGroupBranding()` now sets the logo chip's background to a dark near-black
(`#1A2332`) when `logo_dark_bg` is true, the existing near-white otherwise — untouched
for every group that doesn't set the flag.

**Verified:** Playwright simulation calling `applyGroupBranding()` with
`logo_dark_bg: false` then `true` — chip background correctly switches between
`rgba(255,255,255,.95)` and the dark color, and the logo `src` itself still updates
correctly either way. Structural syntax check passed on both `index.html` and
`admin/index.html`.

**SQL still needed (not yet run):**
```sql
alter table groups add column if not exists logo_dark_bg boolean not null default false;
```
Also need to add `logo_dark_bg = case when p_data ? 'logo_dark_bg' then (p_data->>'logo_dark_bg')::boolean else logo_dark_bg end` to `admin_save_group`'s UPDATE branch (same safe pattern the rest of that function already uses, fixed during the earlier admin-RPC audit) — asked Claire to run
`select pg_get_functiondef('public.admin_save_group'::regproc);` and share the result,
since editing that function blind (without seeing its current real body) risks
breaking one of its other fields' safe-update logic. **Received and patched** —
`logo-dark-bg-2026-07-18.sql` given inline, adds the column plus a `CREATE OR REPLACE`
of the exact function Claire pasted with only the two `logo_dark_bg` lines added,
nothing else touched.

**Investigated further — root cause confirmed as browser caching of external files,
not a code or data bug.** Ran the actual `logo_url` values for all 11 named groups:
every one is a distinct, correct URL pointing to that business's own WordPress site —
no duplicate/copy-paste mistakes in the data. Also confirmed the wrong logo does NOT
correct itself after waiting (rules out ordinary network loading lag). Conclusion:
these are all externally-hosted files this app doesn't control — if a business
replaces the file at that same URL later, browsers that already cached the old bytes
for that exact URL (common for WordPress media uploads, which often don't set
aggressive re-validation headers) will keep serving the stale version indefinitely,
regardless of what the live file actually is now. Confirmed by Claire's report exactly
matching this pattern.

**Solution — house logos in Supabase Storage instead of linking to external
files, BUILT 2026-07-18.** Claire's own suggestion, and the right fix: since we now
own the actual file bytes, and every upload gets a genuinely new, unique filename
(timestamp + random suffix), there's nothing for a browser to have stale-cached the
way it could with a reused external URL. Replaces the old plain "Logo URL" text input
in the Group editor with:
- A real file picker (`accept="image/png,image/jpeg,image/svg+xml,image/gif"`),
  client-side validated for type and size (2MB max) before ever attempting a network
  call.
- A small preview thumbnail once uploaded (or already set, for existing groups).
- A "Remove" button that clears the logo entirely.
- Upload happens immediately on file selection (`adminUploadGroupLogo()`), via a
  direct `fetch()` POST to the Supabase Storage REST API (new `group-logos` bucket) —
  the resulting public URL gets written into the same hidden `logo_url` field the rest
  of the form already saves, so `admin_save_group` and everything downstream in
  `index.html` (`applyGroupBranding()`) needed ZERO changes — `logo_url` is still just
  a plain URL column, only where it points and how it's populated changed.
- Existing groups' current external `logo_url` values are left untouched and still
  display fine (the display code has never cared where the URL points) — this only
  affects logos uploaded from now on. Migrating an existing group off its external URL
  is as simple as picking a new file for it whenever convenient; nothing forces an
  immediate re-upload of all 11+ groups.

**Verified via Playwright simulation** against a mocked `fetch()`: an unsupported file
type is rejected client-side with no network call; an oversized file (>2MB) is
likewise rejected with no network call; a valid PNG upload produces a correctly-shaped
unique public URL, shows the preview, and displays a "click Save Group to apply"
status message; clearing resets the hidden field and hides the preview. Structural
syntax check passed.

**Honest, disclosed security trade-off — flagged directly in the SQL, not
glossed over:** unlike every `admin_save_*` RPC (which validates the caller's password
server-side inside the function), a Supabase Storage bucket policy has no way to see
this app's own password check — there's no real Supabase Auth session in this app to
require instead. The upload policy is therefore public at the storage-policy level;
the real safeguard is the bucket's own file-size (2MB) and MIME-type (image only)
limits, which prevent anything but a small image file from landing there, not a true
per-request authentication check. This is the same level of exposure the public anon
key already has everywhere else in this app (it's embedded in every page's own JS
source, not a secret) — not a new or larger gap than what already exists, but worth
being explicit about rather than implying storage uploads are as strongly gated as the
RPCs are. If this ever becomes a real concern, the fix would be routing uploads
through a new `claude-proxy` Edge Function action that checks the password server-side
first, the same pattern the Trello actions already use — not attempted here to avoid
scope creep on what was asked for.

**SQL to run (not yet executed by Claire):** `group-logo-storage-2026-07-18.sql` —
creates the `group-logos` bucket (public read, 2MB/image-only limits) and its
read/insert/update policies. Given inline in chat, not committed to the repo.

## 2026-07-18 — Security review: CONFIRMED live data leak on `ae`, plus cleanup

Claire asked whether the logo-upload security trade-off above pointed to other gaps
worth checking. It did — a real, live, exploitable one, found and closed same day.

**Audit approach:** ran `pg_policies` and `pg_class.relrowsecurity` against `orders`,
`groups`, `ae`, `clients`, `admin_users`. All five have RLS *enabled* but *zero
policies* defined. In Postgres, that combination is supposed to mean "deny everyone by
default" (RLS enabled + no policies = no rows visible to any non-owner role) — verified
this held for `orders` (a live anonymous REST request via the browser console, using
only the app's own already-public anon key, returned `[]`) but did NOT hold for `ae`:
the same kind of anonymous request returned **all 304 rows** — every AE's name, email,
and Trello handle across every single group, with zero authentication. Root cause not
fully diagnosed (most likely a table-ownership/bypass difference from how `ae` was
originally created vs. the others — Postgres RLS doesn't apply to a table's owner
unless `FORCE ROW LEVEL SECURITY` is also set), but `alter table ae force row level
security` closes it regardless of the precise mechanism.

**Fixed:** `lock-down-ae-2026-07-18.sql` — forces RLS on `ae`, and adds two narrow
RPCs so the app's two legitimate `ae`-reading features keep working once direct access
is closed (same "add a scoped RPC instead of leaving a table open" pattern already
used for `clients` after ITS leak was closed 2026-07-13):
- `get_group_aes(p_group_id)` — public, no password, returns id/name/trello_handle/
  email for one group's active AEs only. Powers the public form's own AE picker
  (`loadAeRoster()` in `index.html`), which previously read the raw table directly
  with no scoping at all.
- `admin_get_aes(p_name, p_pw)` — password-gated, returns every AE across every group
  (id/name/trello_handle/email/group_id/active) — the admin AE tab manages the whole
  roster, so intentionally not scoped to one group, mirroring `admin_get_orders`'
  shape.

Both call sites updated (`loadAeRoster()` in `index.html`, `loadAdminAes()` in
`admin/index.html`) to call these RPCs instead of the raw table. Verified via
Playwright: `loadAeRoster('group-abc')` calls `rpc/get_group_aes` with the correct
`p_group_id` body and `applyAePick()` correctly resolves name/Trello/email from the
response; `loadAdminAes()` calls `rpc/admin_get_aes` and populates `ALL_AES` correctly
from its response. Structural syntax check passed on both files.

**Also cleaned up, same pass:** `admin_get_orders`/`admin_save_group`/
`admin_save_group`-toggle each had a "defensive fallback" that fell straight through
to a direct, unauthenticated REST read/write on `orders`/`groups` if the real
password-gated RPC ever errored. The live test above confirms `orders` and `groups`
are both correctly locked down (zero policies, not force-bypassed like `ae` was), so
these fallbacks could never actually have worked — but they were misleading to read as
though a real safety net existed, and represented exactly the pattern that caused the
`ae` leak if a table's policy were ever misconfigured. Removed all three fallbacks;
each function now just surfaces the RPC's error directly if it fails, rather than
silently attempting an insecure-looking (if currently inert) direct write/read.

**SQL to run (not yet executed by Claire):** `lock-down-ae-2026-07-18.sql` — this is
the important one, closes a real live leak. Given inline in chat, not committed to the
repo.

**ROOT CAUSE FOUND AND FIXED — 2026-07-18 (same day).** `force row level security`
alone did NOT stop the leak — Claire re-tested from a fresh Incognito window with HTTP
caching explicitly disabled (`cache: 'no-store'`) and still got all 304 rows back,
which ruled out both the earlier caching theory and confirmed something more
fundamental was wrong, not something already fixed. Traced through several
possibilities that all checked out clean (role-level `BYPASSRLS` on `anon` — false;
wrong Supabase project — confirmed correct project; `ae` being a view rather than a
real table — confirmed `relkind = 'r'`, a genuine table) before finding the real
answer: a policy named **"Public can read ae"** existed — `SELECT`, `roles: {public}`,
`qual: true` — explicitly granting every role unrestricted read access. This is very
likely a leftover from Supabase's own "Enable read access for all users" template,
which the dashboard offers as a one-click suggestion the first time RLS gets turned on
for a new table — someone most likely accepted that suggestion when `ae` was first
created, months before this review. This explains why `FORCE ROW LEVEL SECURITY`
didn't help: that setting only matters when there's NO policy granting access at all;
an explicit permissive policy always wins regardless. It also explains why the
original "zero policies on all 5 tables" audit read as clean — that policy either
wasn't caught cleanly in how the combined multi-table result was read at the time, or
this was simply missed reading two result sets pasted together — either way, checking
the single table directly (`select * from pg_policies where tablename = 'ae'`) is what
finally surfaced it unambiguously.

**Actual fix:** `drop policy "Public can read ae" on ae;` — confirmed by Claire
re-running the exact same Incognito/no-store fetch test one more time: now returns
`[]`. The `FORCE ROW LEVEL SECURITY` setting and the two new RPCs
(`get_group_aes`/`admin_get_aes`) from earlier in this entry are still correct and
still needed — nothing about them was wrong, they just weren't sufficient on their
own while this explicit permissive policy also existed.

**Lesson for future review:** when auditing RLS on a specific table, check
`pg_policies` filtered to JUST that table directly and read the result before moving
on to broader theories (ownership, role bypass, caching) — a multi-table combined
query result is easy to misread, and the actual policy list is the first and most
direct thing to verify, not something to arrive at last after several other
hypotheses.

## 2026-07-18 — Logo upload moved behind a password-gated Edge Function

Follow-up to the group-logo-upload feature built earlier the same day, which had a
disclosed but real gap: uploads went straight to Supabase Storage using the anon key,
gated only by the bucket's file-size/type limits, not a real password check (unlike
every `admin_save_*` RPC). Claire asked to close this properly rather than leave it,
same day as the `ae` leak fix — good timing to fix both storage-related gaps together.

**Built:** a new `upload_group_logo` target added to the `claude-proxy` Edge Function
(the same one already used for every Trello action). Diffed line-by-line against the
exact current source Claire pasted first — confirmed the only change is the new target
block plus one header comment; nothing else touched. The new target:
1. Validates the admin's password server-side via the SAME `admin_login` RPC every
   other admin action already trusts (no new hashing logic duplicated — reuses the
   single source of truth for what a valid login looks like).
2. Re-checks file type (image/png, image/jpeg, image/svg+xml, image/gif) and size
   (2MB max) server-side — not just trusting the browser's own check.
3. Uploads using `SUPABASE_SERVICE_ROLE_KEY` (provided automatically to every Supabase
   Edge Function, no new secret needed) — Storage always allows the service role
   through regardless of bucket policy, so the bucket itself needs NO public write
   policy anymore at all.
4. Returns the resulting public URL, same shape as before.

`admin/index.html`'s `adminUploadGroupLogo()` now calls this Edge Function target via
the existing `PROXY` endpoint (same calling convention as every Trello action already
uses) instead of POSTing to Storage directly — sends the file as base64 (new
`fileToBase64()` helper) alongside the admin's name/password. Client-side type/size
checks stay in place too, as a fast fail before ever hitting the network — the
server-side check is the real gate, but there's no reason to make someone wait on a
round trip just to find out their file was the wrong type.

**Verified via Playwright:** correct credentials + a valid PNG → correct
`target`/`p_name`/`p_pw`/`filename`/`mime_type`/`base64` sent to the proxy, response
URL correctly sets the hidden field and preview; wrong password → error surfaced,
nothing saved; an unsupported file type is still rejected client-side with zero
network calls, exactly as before. Structural syntax check passed.

**Storage policy simplified as a result:** `group-logo-storage-2026-07-18-v2.sql`
replaces the original bucket-setup script — drops the two public write policies
entirely (no longer needed or wanted, since the Edge Function bypasses them via the
service role key regardless) and keeps only public SELECT, so the public IO form can
still display a group's logo with no login. If Claire already ran the original
version, this new one safely tightens it back up.

**SQL to run (not yet executed by Claire):**
- `claude-proxy-index.ts` — the full updated Edge Function source, paste into the
  Supabase dashboard (Edge Functions → claude-proxy) and redeploy. Given inline in
  chat, not committed to the repo (matches how this file has always been handled —
  it's deployed separately from this git repo).
- `group-logo-storage-2026-07-18-v2.sql` — run this instead of (or after) the original
  storage setup script.

**Both deployed and verified working same day** — Claire had forgotten this branch
wasn't merged to `main` (only pushes to `main` trigger the deploy per this project's
GitHub Action), which is why the first live test still showed the old
`"Upload failed (400)"` error format (matches the pre-Edge-Function code, not the new
one) — merging resolved it immediately.

## 2026-07-18 — User editor: generic labels, Calendar URL is AM-only

Claire noticed the Users tab (built earlier this session) read as "geared toward AM"
even though it now covers every role — every new user got a Calendar URL field
regardless of role, and both it and Trello Handle were still labeled with an "AM"
prefix left over from when this editor only managed AMs.

**Fixed:**
- Relabeled "AM Trello Handle" → "Trello Handle" (generic — any role plausibly has a
  Trello presence for board tagging, no reason to restrict this one).
- "AM Calendar URL" → "Calendar URL — for KOC scheduling, AMs only", and the field
  itself is now hidden entirely unless the selected Role is Account Manager. New
  `adminUserRoleChanged()` toggles it live on the Role dropdown's `onchange`, and is
  also called once from both `adminNewUser()`/`adminEditUser()` so the field's
  visibility always matches whichever role is currently selected, not just whatever
  role the form happened to open with.
- Save payload now sends `am_calendar_url: null` for every non-AM role rather than
  whatever the (now-hidden) field still holds — switching an existing AM to another
  role correctly clears their stale calendar link instead of leaving it sitting unused
  in the data.

**Verified via Playwright:** a new user defaults to AM with the calendar field
visible; switching the role dropdown to Strategist hides it live; editing an existing
AM shows their calendar value intact; editing an existing Strategist keeps it hidden;
and switching an existing AM (with a calendar link already set) to Strategist and
saving sends `am_calendar_url: null` while leaving their Trello handle untouched.
Structural syntax check passed.

## 2026-07-18 — Strategist team's first-round feedback on the mockup

Claire held the first real meeting with the strategist team, walking them through the
mockup/plan doc. Their read: "on the right track," plus five pieces of new feedback,
folded into the mockup the same day.

1. **Overrides in case an IO is filled out incorrectly, verify an IO before its
   campaign lines get created — Claire flagged this one herself as (Pending).**
   Genuinely undecided territory — not designed around yet, just captured as its own
   plan card explicitly marked "Pending — not yet decided," plus a new question group
   asking for a real example of an IO gone wrong, whether verification should block
   line creation or just flag a correction afterward, and whether an override should
   replace the original IO value or keep it visible for reference. Deliberately not
   guessed at further than that.
2. **Different budgets per month.** A single ongoing campaign's Gross/In-Platform
   Budget isn't necessarily one flat number for the whole flight — it can change month
   to month. Ties directly into the month picker already in the mockup (whichever
   month you're viewing should show that month's actual budget). Added as its own plan
   card, tagged "Confirmed needed, shape still being worked out" — and a new question
   about where a mid-flight budget change actually originates (a new/updated IO, or
   something entered directly) before this can go further.
3. **Campaign status — Pending / Active / Paused / Complete.** New `status-pill`
   component, deliberately a different color language from the pacing pills (accent
   blue for Active, amber for Paused, muted grey for Pending, accent2 teal for
   Complete) so status and pacing are never visually confused — one is where a
   campaign is in its life, the other is how it's performing while it runs. Added a
   new Status column (first, right after Client) and one new example row (Meridian
   Dental, Pending — ordered on the IO but flight hasn't started, shown with dashes
   for every actual/pacing figure that doesn't apply yet) so all four states are
   represented across the mockup's rows.
4. **MTD pacing for spend.** The very first template analysis, back at the start of
   this whole scoping effort, already noted the original spreadsheet had a "Month To
   Date Budget Pacing" column separate from performance pacing — that distinction got
   flattened into one pacing figure in earlier mockup drafts. Restored as its own
   **Spend Pacing** column, same 3-band color logic, placed right after Actual Spend
   (paired, matching Claire's earlier "keep related figures adjacent" feedback), with
   Perf. Pacing renamed from the old plain "Pacing" for symmetry. Harbor & Vine's row
   now deliberately shows the two pacing figures disagreeing (135% spend pacing vs.
   78% performance pacing) as a concrete illustration of exactly why tracking them
   separately matters — spending ahead of schedule without matching results is a
   different problem than under-spending.
5. **A way to import current campaigns.** Existing campaigns already running before
   this portal exists won't have gone through the "auto-populate from the IO" path.
   Added as a plan card explicitly mirroring the Client/AE import pattern already
   built elsewhere in this platform: review-before-import, nothing auto-created. New
   question group asks how much history needs to come in with an imported campaign,
   and roughly how many campaigns this would need to cover at once.

Table now has 14 columns (Client, Status, Tactic, Platform, Flight, Gross Budget,
In-Platform Budget, Actual Spend, Spend Pacing, Goal, Actual Perf., Perf. Pacing,
Optimize Log, Notes) — verified tag-balanced (table/tr/td/th/div/section/ul/li/span/p
counts all matched) before republishing. Still a concept only, no build started.

## 2026-07-18 — Budget-per-month decided (v1: manual); accounting map partly solved;
## Campaign Setup workflow + status tabs resolve the "Pending" override item

**Budget-per-month — DECIDED.** Confirmed with Claire: today, when a client's budget
varies by month, that only exists as free text in the IO's Notes field — not
structured data, so the portal can't reliably auto-populate it (parsing arbitrary
sentences for dollar amounts is fragile and will eventually misread something).
Decision: **v1 is manual entry** — a strategist types in each month's actual budget in
the portal, same trust level as the Platform field already has. A structured version
on the IO form itself (an AE fills in a real month → budget breakdown instead of
writing it in Notes) is a real v2 candidate, explicitly deferred until the team is
comfortable with the online IO process as it stands today — not attempted now.

**Accounting map — partly solved with real numbers.** Claire shared an actual sample
(fake-data-free real numbers, no client names). Verified two facts by checking the
arithmetic directly against every row:
- **`44i Cut $` = `Default Retail` × `44i Cut %`** — holds exactly, every row.
- **`YDA` (Group Cut %) + `44i Cut %` = 100%** — every single row, no exceptions.
- Therefore: **`44i Fixed Cut = 0` means "use the percentage calculation" (dynamic —
  recalculates if Retail changes); a nonzero `44i Fixed Cut` means that flat dollar
  amount is used instead of the percentage, and stays fixed even if Retail later
  changes.** This directly answers the original blocking question from the earlier
  entry.
- **Still unresolved:** the sample had zero rows with `Retail CPM`/`44i CPM`/
  `Platform CPM` filled in, and — despite `YDA + 44i Cut % = 100%` holding even on rows
  that DO have a `(Of Gross) Budgeted Spend %` value (2.20%, 17.86%, 39.20%, etc.) —
  that percentage clearly isn't simply "what's left after the two cuts," since the two
  cuts already account for 100% of Retail on those rows too. What that percentage (and
  the CPM columns) actually represent for real media-buying items is still not known.
  Asked Claire for a sample row with the CPM columns populated to close this out
  completely — not guessed at further than the two confirmed facts above.

**Campaign Setup workflow + status tabs — Claire's proposal, resolves the earlier
"Pending — not yet decided" override/verify item.** Every IO lands in a **Campaign
Setup** queue first, not straight onto the pacing list — the strategist gets notified,
reviews what came from the IO, corrects anything wrong, picks the Platform, then
confirms — which is what actually creates the campaign and moves it to Active. This
gives Status a real starting point instead of just being a label: **Pending IS the
Campaign Setup queue**, not a status a campaign passes through unattended. Claire also
proposed organizing the whole dashboard into **tabs by status** (Campaign Setup /
Active / Paused / Complete) instead of one flat table with a Status column to scan —
a strategist's default view becomes just what needs attention now.

Added to the mockup: a status-tab bar (with counts) above the dashboard, and a new
Campaign Setup review panel for the Meridian Dental example (shows the IO-sourced
fields, an empty Platform picker to fill in, "Confirm & Activate" / "Flag an issue"
actions) — replacing the earlier flat Pending row in the main table, since Pending
campaigns now live in their own queue, not mixed into the pacing list. Added an inline
note clarifying that a real app would show one tab's content at a time; this mockup
stacks Campaign Setup and the pacing table together on one page just to show both at
once. Updated/replaced the affected open questions: dropped the now-resolved
"verify-before-or-after" question, added new ones about who sees a "Flag an issue"
click, whether IO-sourced fields can still be corrected after a campaign goes Active,
and whether manual monthly budget entries need any sign-off.

Verified tag-balanced (table/tr/td/th/div/section/ul/li/span/p/button counts all
matched) before republishing. Still a concept only — no schema or build work started.

## 2026-07-18 — Accounting map fully resolved; Campaign Setup gets inline overrides + monthly budget entry

**Accounting map — FULLY RESOLVED.** Claire shared a second sample with the CPM
columns actually populated. Checked the arithmetic across 10 more real rows:
**`Platform CPM = Retail CPM × (Of Gross) Budgeted Spend %`**, exact match every row
(e.g. Retail CPM 46.5, Budgeted Spend % 48.39% → Platform CPM 22.5, confirmed to the
cent). This resolves the whole question more simply than expected: **In-Platform
Budget = Gross Budget × Budgeted Spend %**, looked up per Item against the services
catalog — nothing else from the accounting map is actually needed for this
calculation. The Group Cut/44i Cut/YDA/Fixed Cut columns turn out to be a *separate*
concern — 44i's and the Group's own internal revenue-share split — not something the
strategist portal needs to touch at all, since the portal only ever cares what
actually gets spent with the ad platform. This closes out every open question from
the earlier accounting-map entries; no more diagnosis needed there.

**Campaign Setup — inline overrides + monthly budget entry, per Claire's design
question.** Asked: could "Flag an issue" instead be empty override cells next to each
IO-sourced field, plus a way to indicate a campaign's budget varies by month right
there in the same screen? Yes to both — built into the mockup:
- Every IO-sourced field (Client, Tactic, Flight, Gross Budget, In-Platform Budget) now
  shows the IO's original value with an empty override input directly beneath it —
  blank means "this is correct," filled in means "the IO had this wrong." Resolves the
  earlier open question about whether an override should replace the original value or
  keep it visible for reference — the answer built into the design is: both, always,
  side by side.
- A "Budget is different by month for this campaign" checkbox reveals a simple
  month-by-month Gross/In-Platform entry list right in the same Campaign Setup screen
  — matches the earlier "manual for v1" decision on monthly budgets, and puts that
  entry exactly where a strategist is already reviewing the IO instead of somewhere
  separate to find later.

Verified tag-balanced (including the new `input`/`label` elements) before
republishing. Still a concept only — no schema or build work started, but the
accounting-map math is now settled enough that the actual In-Platform Budget formula
could be built with confidence whenever this moves forward.

**Confirmed same day: the Group Cut/44i Cut/YDA/Fixed Cut columns ARE still needed —
just for a later, separate part of the build (the accounting side), not this one.**
Doesn't change anything about the strategist portal itself, but worth remembering this
data isn't dead weight — it'll matter once that phase starts.

**"Flag an issue" behavior + Setup Notes — added to the mockup.** Claire asked what
actually happens when a strategist clicks "Flag an issue," and separately asked for a
notes field in Campaign Setup for whatever a campaign is waiting on before it can go
live (creative, video assets, client sign-off, etc.) — distinct from the Optimize Log,
which is about what's been tried once a campaign is already running.
- **Flag an issue — proposed default**, not yet confirmed by Claire: clicking it
  reveals a text box to describe the problem, which notifies the AM tied to that
  group, and the campaign stays in Campaign Setup marked **Flagged** rather than
  disappearing or blocking silently. Added to the mockup with this framing explicitly
  labeled as a proposal, and kept the open question (does the AE need to be looped in
  too, not just the AM) rather than asserting this as decided.
- **Setup Notes** — a plain textarea added to the Campaign Setup panel, with a
  realistic example ("Waiting on creative from the client... checked in with AE
  7/22, no ETA yet"), explicitly distinguished from the Optimize Log in both the
  mockup's own copy and the plan card describing it. New question added: would a
  plain notes field be enough, or is there value in Pending campaigns being able to
  show at a glance which ones are actually blocked vs. just newly arrived.

Verified tag-balanced (including the new `textarea` elements) before republishing.
