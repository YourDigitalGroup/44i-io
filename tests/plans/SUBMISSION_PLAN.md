# Submission-path work plan  (written 2026-10-15, for Claire)

This folder is not published with the site (`tests/**` is excluded in the deploy workflow).
Companion files, all in `tests/fixtures/`:
- `live-create-campaign-lines-from-order.as-pasted-2026-10-12.sql` -- the last copy of the live order trigger function that you pasted (see "Check 1" below: it must be re-confirmed before anything is built on it).
- `print-layout-13a3b9b.resolved-on-2026-10-15.patch` -- the parked print/PDF layout change, already re-fitted to today's code (checked with `git apply --check`: applies cleanly).

"Submission path" here means: anything that runs before the order is saved (form checks, totals, client lookup, order insert), the order trigger, and the steps right after the save (Trello, PDF, email). Items are labelled **BEFORE SAVE**, **TRIGGER (SQL)**, or **AFTER SAVE** so you can see exactly where each one sits.

---

## 0. The gate every item goes through (no exceptions)

1. **Tests first.** A test that fails on today's code and passes on the new code goes into `tests/`. Whole-path tests with unusual data (custom price, cents, agent lines, gap month, yearly fee), not only the piece being changed.
2. **SQL is labelled** "touches the submission path" in its first line, ships in ONE block together with any new column it needs, and is run against the real function text in `@electric-sql/pglite` (real Postgres in Node) before you ever see it. plpgsql does not check column names when a function is created, so "ran without error" proves nothing.
3. **You run the smoke test** (`smoke-test-submission-path.sql`; it clones a real order inside a transaction, fires the trigger and rolls back) right after any SQL. The old file was lost in the Oct 8 reset; **rebuilding it is part of item 4** and I will hand it over with the first SQL.
4. **Quiet window, one item per merge, one-click revert ready.** Never two submission-path items in the same merge. After each merge: one real test order from Claude Test Group with the specific things to look at (I write that checklist for each item).
5. **Rollback:** every item below states how it is undone. For code: revert the merge. For SQL: the previous live definition is saved first (the same `previous-live` pattern used for `admin_correct_order_service`).

---

## 1. Two things I found while planning that change the picture

**A. The order trigger has changed since the copy I hold.** The text you pasted on 10-08 and the one pasted later differ (the later one has the hosting-proration-month change). The later copy is the one saved here. It may still be out of date. **Check 1** (below) takes you ten seconds and settles it. If the live function differs, I need the new text before writing anything.

**B. I left an item off the outstanding list I gave you: the "blank IO" plan.** It is a submission-path feature with dates (see item 5 below). I am adding it now.

---

## 2. Work items, in the order I recommend

### Item 1 -- Print/PDF layout change  (AFTER SAVE + the Print button; no SQL)  -- READY
**What you get:** each service stays together with its own month-by-month breakdown on the printed IO and the PDF (no service line at the bottom of one page and its table on the next); months shown as a compact strip (6 across, "Paused" for paused months, total at the end) instead of the 5-row "days in flight" table; the Additional Notes box moves as one piece. The on-screen Step 3 review is unchanged.
**Where it touches the submission path:** only the document builder (`buildIoDocumentHtml`) and the PDF page-cut code that runs after the order is saved. It changes nothing that is saved, no totals, nothing sent to Trello except the PDF's contents. A PDF failure no longer blocks the email (Batch 2a).
**Status:** the patch conflicted with today's code in three places (my wording and yearly-fee changes); I re-fitted it by hand. With it applied: the full suite passes (34 files, 376 checks) and `git apply --check` is clean. I rendered a long 8-service order both ways in real Chromium: today's layout = 6 pages with service lines separated from their month tables; new layout = 3 pages, every service whole.
**Still to do before merge (about an hour of my time):** (1) apply the patch; (2) add a repo test that builds the IO document for a varying-budget order and asserts the structure (one block per service, section header with the first block, subtotal with the last, balanced tags, the "$3,000 total" wording and Annual row still present); (3) re-run the full submit smoke tests; (4) the Oct 8 "full submission" comparison (live `main` vs the branch: saved order and every Trello/email request identical, only the PDF differs) -- I will rebuild that harness and keep it in `tests/` this time.
**NOT testable in my sandbox:** the real emailed-PDF slicing (needs html2canvas from the internet). Your test order is that check: look at a long order's PDF in the email and on Trello.
**Your checklist after merge:** order with 3+ spend services and varying months (include one paused month) + a long Additional Notes -> check the PDF in the email and the Trello IO card, and press Print IO on the same order.
**Rollback:** revert the merge. **Risk: low.**

### Item 2 -- Small order-form fixes  (mixed; no SQL)
Grouped so they go out in one reviewed merge after Item 1.

| # | Fix | Where | Real? | Plan |
|---|-----|-------|-------|------|
| 2a | "Pick at least one module" check can never fire | BEFORE SAVE | **Confirmed in code.** `syncRowInputs()` turns a quantity of 0 into 1 (`parseFloat(x) \|\| 1`), so a Website Modules row ticked with nothing chosen is saved as 1 paid module. | One-line fix: for the module service keep 0 so the existing guard fires; every other service keeps the "blank or 0 means 1" rule. Test: tick Modules, pick nothing, submit -> refused, nothing saved; pick one -> saves qty 1. |
| 2b | Long orders cut off the totals in Trello | AFTER SAVE | Confirmed: the description is cut at 16,000 characters from the END, and the totals are at the end. | Cap only the services list so the totals and contact lines always fit, with a "see the IO PDF for the full list" note. Test: 60-line order -> totals present, under 16,000. |
| 2c | Hosting proration divides by 365 even in a leap year | BEFORE SAVE (+ a database function) | Real but tiny: only matters for hosting that starts in 2028 (first affected IOs ~mid-Dec 2027). | **Do NOT fix the form alone.** Admin's "correct hosting date" function recomputes the same proration in the database, also by 365 -- changing only the form would make a later correction disagree with the original. Fix both together in Q4 2027, or never. Parked with a reminder. |
| 2d | A quote-on-request service with no price typed saves as $0 | BEFORE SAVE | Real. | **Needs your decision:** (1) block the submit until the AE types a quote, or (2) allow it but flag it ("price to be quoted") on the IO, Trello and Admin. I recommend (1). |
| 2e | Two template cards in one workflow can collide on name and one is skipped | AFTER SAVE | **Not reproduced yet.** Needs a specific workflow with two cards. | Only worth doing if you have seen it live. I will try to reproduce with a test first and report; no code until then. |

**Rollback:** revert the merge. **Risk: low** (2a, 2b), none until decided (2c, 2d, 2e).

### Item 3 -- Hardcoded service ids in the order form  (BEFORE SAVE / AFTER SAVE; the columns may need SQL)
Complete inventory of ids typed into `index.html` (the other pages are a separate, non-submission cleanup):

| Where in the form | What it does | Proposed catalog column |
|---|---|---|
| `w-bp`, `wm-10p`, `wm-ecomm`, `w-bb`, `wm-5p` (Trello card label "Website (10-page)" / "(5-page)") | Names the card only when a template cannot be read | the existing `tier` / `hosting_prompt_type`, or a new `trello_label` text column |
| `w-bs`, `wm-1p` (lock between one-time and monthly Website plans) | finds the two exclusivity groups | none needed: look up the group from the service's own `exclusivity_group` instead of naming the services |
| `sm-bp` (Social tier lookup) | anchors "which Social tier was chosen" | existing `tier` + `exclusivity_group` (the comment in the code already says so) |
| `sem-bp` (CPC text "$4-$12 CPC", clicks vs impressions) | price text and the clicks tactic | the Accounting Map already has `cpc_low` / `cpc_high`; add a `pricing_basis` ('clicks' or 'impressions') on the service |
| `tlp-custom`, `tlp-bp`, `tlp-bs`, `tlp-bb` (Top Local Pages grid) | page caps, tier names, custom grid | `tlp_page_cap` already exists; add `tlp_soft_min`; tier names from `tier` |
| the word "offline" (15 places) | finds the Offline Visits add-on | `is_cpm_adjustment` already exists; add an `adjustment_kind` ('offline' / 'addl') |

**Plan:** one column at a time, each as its own tiny change (add column in SQL together with its Admin editor field, then move the form to read it, then test). The service editor must be able to edit each new column first (CLAUDE.md rule). **Priority: low.** Nothing is broken today; the data-health check shows all these ids exist. The risk this removes is someone renaming or deactivating one of those services. I would do `w-bs`/`wm-1p` and `sm-bp` first (smallest, no new column).
**Rollback:** revert the merge (the new columns can stay unused).

### Item 4 -- Renewal bundle  (TRIGGER SQL; the riskiest item)
**What it is (your decisions of 10-08 and 10-13):**
- **A. Stop the IO form renewing existing lines.** Today a repeat order for the same client + service + tactic **renews** an existing line (keeps the old start date, moves the end date, merges months) when exactly one active line matches. This is what caused Perrys (duplicate SEO line), Active Heating (kept the old Nov start for an order that said Dec) and can silently shorten an end date. After the change an IO-form order **always creates new lines**; renewals happen only in the Companion or by an AM in Admin.
- **B. History row when an order revives a line.** In the agent-split branch an order sets a Complete/Cancelled/Paused line back to pending; it should also write a `campaign_status_history` row ("Renewed by order") so Strategist stops filing it under Complete (the MS Farm Bureau case).
- **C. Setup-fee agent label.** When exactly one split row on the order is a new agent, put that agent in the setup-fee line's `split_label` (never `agent_name`, which would let a later renewal match the setup-fee line). **Blocked on your answer: is a setup fee per NEW agent? Today it is per order and service.**
- **D. Gap months.** A renewal across a gap leaves a phantom month in both portals. Once A is in, order renewals no longer exist; the gap case remains for Admin and Companion renewals, which are different functions (`admin_renew_*`) -- **not part of this item**; I will list it separately if you want it.

**Dependency on the Companion go-live (early November): this is the part to get right.** Today the IO form is the ONLY way an AE renews. If A goes live before the Companion is live and tested, AEs lose their only renewal path. So: **A ships on the same day as the Companion release (or after), never before.** B and C do not depend on that and could ship earlier, but they live in the same function, so one block is simpler and safer: one change, one test, one smoke test.

**What I need from you (two read-only queries):**
1. **Check 1** -- is my saved copy of the function still the live one? Run this and tell me whether the number matches `59a1cf46c64708a5361a299a9c06847c`:
   ```sql
   select md5(pg_get_functiondef('public.create_campaign_lines_from_order'::regproc)) as live_md5;
   ```
   Match: nothing else needed. No match: this can also be only a stray space from copying, so don't worry -- paste `select pg_get_functiondef('public.create_campaign_lines_from_order'::regproc);` and I will update my copy.
2. **Check 2** -- what else is attached to the `orders` table that fires on insert (so I know nothing else sits beside this function):
   ```sql
   select tgname, pg_get_triggerdef(oid) as definition from pg_trigger where tgrelid = 'public.orders'::regclass and not tgisinternal order by 1;
   ```

**How I will build it (nothing built yet):** (1) load the exact live function into pglite with minimal tables (`orders`, `campaign_lines`, `campaign_months`, `services`, `accounting_map`, `agents`, `counties`, `campaign_status_history`); (2) re-run the five scenarios from 10-08 (three spend orders back to back; spend line activated then reordered; flat services; existing single active line; Location Targeting auto-split) -- **before** (must reproduce today's behaviour) and **after** (must show the new rule); (3) new scenarios: repeat flat order creates a second line and the first is untouched; a corrected IO for the same service creates a new line pair (see "Trade-off" below); agent-split renewal still renews and now writes the history row; an agent line with `county` null (the live match `county = null` never matches, so such an order always creates a new line -- I will confirm and tell you); hosting-proration and setup-fee lines unchanged; (4) rebuild `smoke-test-submission-path.sql` and run the whole function body against a realistic copy of the live order shapes; (5) hand you: the SQL block, the previous-live rollback file, the smoke test, and a checklist.
**Trade-off you chose, in plain words:** after A, if an AE submits a *corrected* second IO for the same service (like Active Heating's "please update IO"), the system creates a second set of lines instead of merging into the first. The AM must cancel the old line in Admin. Before A it merged, but with the wrong start dates. The Companion and the blank-IO plan are what make this rare. I recommend keeping your decision; flagging it so it is a conscious one.
**Test order after the SQL (outside AE hours):** (1) place order 1 for a spend service and a flat service from Claude Test Group; (2) place order 2 for the same two; (3) check Strategist/Accounting: two separate lines each, nothing merged; (4) for B: renew an agent line through a test order and check Strategist shows it Pending/Active, not Complete.
**Rollback:** run the saved previous-live function (one paste). Lines already created stay (they are ordinary lines). **Risk: HIGH if rushed, medium with this gate.**

### Item 5 -- Blank-IO plan  (BEFORE SAVE + a settings row; from your decisions of 10-08)
**What it is:** stop AEs submitting an IO with no services (they have been using it to ask for changes); send them to the Companion instead.
**Your dates:** October -- Admin "No services - needs manual action" flag, Companion "message to my AM"; Nov 1-15 -- soft warning in the form (submit still allowed); Nov 15-25 -- global switch column in `notification_settings` + Admin setting, switch OFF; about Nov 30 -- switch ON outside AE hours; optional database backstop only after a week with no mistaken blocks.
**Status of each part:** the Admin flag and the Companion "message to my AM" were not built (the second needs the live Companion request RPC and the AM email recipients). The form changes touch BEFORE SAVE (the submit guard) and read `notification_settings` on load (a group/notification read the form makes -- submission path).
**My recommendation for sequence:** build the Admin flag and the Companion message in the next two weeks (neither touches the submission path), the soft warning in the form as its own merge on Nov 2-3, the switch column as SQL on its own (a new column + the form reading it in the same block, per the rule), and the ON switch last. I will write the detailed plan for this the same way as Item 4 when you want to start it; it needs: the live `notification_settings` shape and the empty-orders query result.
**Rollback:** the switch itself is the rollback (turn it OFF). **Risk: medium** -- a wrong block stops real orders, so the soft-warning stage is the safety net.

### Item 6 -- Stamp the billing type on order lines  (BEFORE SAVE; payload shape; no SQL)
**What:** save each line's `billing_type` (and pricing mode) in the order's line items at submission, and make the readers prefer it over the live catalog. **Why:** today yearly/monthly is decided from the live catalog, so deactivating or editing a service would re-label old orders.
**Evidence it is not urgent:** your data-health check found **zero** order lines on missing or inactive services today.
**Readers to update (all non-SQL):** `shared.js` (`describeLineItemAmount`, `orderLiveTotals`), Admin totals, Accounting's yearly rule. The order trigger ignores unknown keys, so adding two keys is safe for it (I will confirm in pglite as part of Item 4's work, since that loads the real function).
**Priority:** last. **Rollback:** revert the merge; readers fall back to the catalog.

### Item 7 -- Features that need a design talk first
Each needs your answers before I can plan it properly. What I would ask:
- **Retry Trello button (AFTER SAVE).** Questions: where does it live (Admin order screen? success screen?); can it re-run only the missing cards, or only what failed; what is the rule for "already exists" (match by card name on the client's list, as Admin's checks do); who may press it (AM only?). Design constraint: it must never create duplicate cards -- the Trello code already searches for cards by name; the new part is a stored "what was created" record on the order (a small JSON column -> SQL).
- **Several covering strategists per group.** Questions: how many; does each cover a discipline or the whole group; who is tagged on which card; do they see the group in Strategist. Touches the group read the form makes on load and Trello tagging.
- **"44i first" services (specified 10-14, not built).** One switch per service in the editor, a group flag that marks 44i, the service hidden for non-44i groups AND refused at submission, super admin only, existing orders unaffected. Touches the services the form loads and a BEFORE SAVE refusal; needs a new column on `services` and `groups` (SQL, column + function together).
- **Lockdown (retire slug links).** Not built; the SQL and its rollback are written only when you say go (your note of 10-09). Waits on a quiet few days with no group reaching the form by slug.

---

## 3. Recommended calendar

| When | What | Notes |
|---|---|---|
| This week | Check 1 and Check 2 (your queries); decisions 2d and 4C | no risk |
| This week | Item 1 (print layout) built to merge-ready; Item 2a/2b | one merge each, quiet window, test order each |
| Late October | Admin "no services" flag + Companion "message to my AM" (Item 5 prep) | none touches the submission path |
| Late October | Item 4 built and tested in pglite, SQL + rollback + smoke test handed over **but not run** | ready to go the moment the Companion is |
| Companion release day (early Nov) | Run Item 4 SQL after the Companion passes its live checks; test order | A must not precede the Companion |
| Nov 2-15 | Item 5 soft warning merge | |
| Nov 15-25 | Item 5 switch column + Admin setting (OFF) | |
| ~Nov 30 | Item 5 switch ON, outside AE hours | |
| After | Items 3 and 6 (low priority), Item 7 as you decide | |

## 4. Decisions only you (or Kim) can make
1. **2d:** quote-on-request with no price -- block the submit (my recommendation) or allow and flag?
2. **4C:** is a setup fee per NEW agent (changes the form and the function) or per order and service (today)?
3. **4A trade-off:** confirm that a corrected second IO creating duplicate lines (cleaned up by the AM) is acceptable.
4. **Item 5:** confirm the November dates still stand.
5. **Item 7:** which of the four features, if any, you want designed before the end of November.

---

## 5. Claire's answers (2026-10-15) and what was built since

| Decision | Answer | Effect on the plan |
|---|---|---|
| 2d: quote-on-request with no price | **Block the submit** | Goes into Item 2 (BEFORE SAVE): the AE must type a quote before the order can be submitted. |
| 4C: setup fee per NEW agent? | **Claire will confirm** | Item 4C stays out of the SQL block until answered. |
| 4A trade-off: a corrected second IO makes duplicate lines | "Shouldn't happen once the Companion is used" | Mostly true -- the Companion's Edit changes start date, end date and budget, which covers "please update IO". But NOTHING stops an AE submitting a second full IO for the same service; only EMPTY IOs are blocked (Item 5). So it depends on AEs using the Companion. Optional safeguard to discuss: a warning in the IO form when the client already has an active line for a service being ordered ("use the Companion to change it"). |
| Item 5: November dates | **Yes, they stand** | Calendar unchanged. |
| Item 7: which features to design | **All four** (Retry Trello, covering strategists, "44i first", lockdown) | Design talks, one at a time; questions are listed under Item 7. |
| Check 1 (is the saved order-trigger text live?) | **Yes -- md5 matched exactly** | The saved fixture is the live function. |
| Check 2 (other triggers on `orders`) | **Only `trg_create_campaign_lines`** (AFTER INSERT, calls that function) | Nothing else fires on an order insert. |

### Built (draft only, NOT live): the renewal bundle parts A and B, tested in pglite
- `tests/fixtures/create-campaign-lines-from-order.proposed-renewal-bundle.DRAFT.sql` -- the live function with two changes: (A) spend and flat services always create a new line (no renewal), (B) reviving a Complete/Cancelled/Paused agent line writes a `campaign_status_history` row "Renewed by order". Part C (setup-fee agent label) and the gap-month item are NOT in it.
- `tests/db-order-trigger-renewal.test.js` -- 16 checks. It runs the LIVE function and the draft against the same orders in an in-memory Postgres. The "today" half reproduces what you have seen live (Perrys: second SEO order renews the first; a shorter repeat order shortens an active line), which also proves the harness is faithful. The "after" half shows the new rule. Unchanged things are asserted identical: three back-to-back spend orders, auto-split services, hosting proration month, setup-fee lines, varying monthly plans, empty orders, an agent split with no county (creates a new line every order today and after -- a quirk this change does not touch).
- **Still to do before this can go live:** the rebuilt smoke test (`smoke-test-submission-path.sql`), the previous-live rollback file (the saved live fixture is it), the final SQL block labelled "touches the submission path", C once decided, your quiet window and the Companion go-live.

### Update (same day): "For MS Farm Bureau there is no SEM setup fee"
This changes Item 4C. The agent label on the setup-fee line is **probably not needed**: the real problem is that the order form ADDED setup fees for Farm Bureau (any SEM order under $1,000 a month gets one; the rule is read only from the service's catalog settings and no group can opt out). Two such lines exist (Oct 5 and Oct 9, shown as "(unlabeled split)" in Accounting).
- **New design item (to discuss):** a way to waive the setup fee for a group (or client). Touches the form's price rule (BEFORE SAVE) and a new column + Admin field + the group read the form makes on load (so: SQL block with the column, the Admin editor field and the function that saves it, per the one-block rule).
- **Questions:** is it Farm Bureau only, or other groups/clients too (group setting vs per-service)? Does agent-split ordering exist for any group other than Farm Bureau (if not, 4C is dropped)?
- **Clean-up (data, not the submission path):** the two existing setup-fee lines and the setup fee on the signed IOs of those two orders -- Claire to check whether the client was actually invoiced for them.

---

## 6. Design talk 1 -- Retry Trello (2026-10-15, in progress)
Decided with Claire: (1) today AMs create missing cards by hand and she wants that to stop (keep things standard); (2) the button is for AMs in Admin only, never AEs; (3) Retry creates only what is missing and never touches or duplicates what already exists.
Findings from the code: Admin already shows `trello_synced` (Orders list and Order Detail "Trello Synced: ⚠ No"); the order stores `trello_card_ids` and `trello_client_list_id` (written only at the END of the form's Trello step, so a step that stops early stores nothing -> Retry must discover what exists by reading the client's Trello list and matching card names, as Admin's audit already does); Admin's Correct Service follow-up (`adminCorrectionTrelloFollowUp`) already builds the right card(s) for one order line from its template (name, due dates, KOC label, members, summary comment) with a duplicate check by name. A first version can therefore live ENTIRELY in Admin (no form change, no SQL, NOT the submission path).
Open questions: which pieces Retry covers (tactic cards; the IO overview card + PDF; the client list; Gold/Green marker cards), whether the AM should be emailed automatically when an order saves with Trello incomplete, and whether to store the failure reasons on the order (needs a new column -> SQL; recommended NOT in v1, Retry re-reads Trello instead).

---

## 7. BUILD PLAN -- Retry Trello + order-email safety net (agreed 2026-10-15)

**Agreed scope.** Step 1 (Admin only, no SQL, NOT the submission path): a "needs attention" view + a Retry Trello button for AMs. Step 2 (SQL + form + Admin, IS submission path): record whether the order email went out, show it in Admin, a "Resend order email" button, and an automatic email to the group's AM when an order saves with Trello incomplete. Out of scope for now: storing failure reasons (Retry re-reads Trello instead); Gold/Green marker cards; AE-facing buttons.

### Before building: three read-only checks (Claire runs; nothing changes)
1. **How many orders are "not synced" today, and why** -- tells me what the attention view will show on day one (groups with no Trello board will never sync and must not be flagged):
   ```sql
   select (g.trello_board_id is not null and btrim(g.trello_board_id) <> '') as group_has_board, o.trello_synced, count(*) as orders, min(o.created_at)::date as oldest, max(o.created_at)::date as newest
   from orders o left join groups g on g.id = o.group_id group by 1, 2 order by 1, 2;
   ```
2. **Who may write to `orders`** (Admin must be able to update `trello_card_ids`/`trello_synced` the same way the form does, or Step 1 needs a small function):
   ```sql
   select policyname, cmd, roles, qual, with_check from pg_policies where tablename = 'orders' order by 1;
   ```
3. **Which database functions read `trello_synced`** (so I know whether a new `email_sent_at` column will flow to Admin on its own or a read function must change in the same SQL block):
   ```sql
   select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.prosrc ilike '%trello_synced%' order by 1;
   ```

### STEP 1 -- Admin only (no SQL, no form change)
**1A. "Needs attention" view.** On the Orders tab: a count chip and filter showing orders that are `trello_synced = false`, whose group HAS a Trello board, that are not fully cancelled, and (default) placed in the last 90 days (adjustable). Orders of groups with no board never appear. The existing ⚠ marker stays.
**1B. Retry Trello (Order Detail, AMs only, shown when the order is not synced).** Idempotent -- pressing it twice never duplicates anything. Algorithm:
1. Find the client's Trello list: the order's stored `trello_client_list_id`; else the client's stored list; else search the board by name; **only if truly absent** create it (after a confirm box). Agent-split orders: the submitting AE's own list (existing rule `adminTrelloListIdForLine`).
2. Read every card on the list. **If Trello does not answer or the list is unreadable, STOP and say so** (never treat unreadable as empty -- that exact mistake created duplicate cards before, Batch 2).
3. IO card: if no card named "IO — {client}" exists, create it at the top, attach the revised IO PDF (Admin already builds it), post a comment. If it exists, leave it.
4. Service cards: for each line item, work out the card(s) its template calls for (the same logic Admin's Correct Service already uses: name, due dates, KOC label, members, summary comment) and create **only those whose normalized name is not already on the list** (dashes/spaces/case normalized exactly as Admin's audits do). If a template cannot be read it does NOT invent a bare card (that was a Batch 2 bug class): it reports "template unreadable" for that service and leaves the order unsynced.
5. Re-read the list to verify, then record the result on the order (`trello_card_ids` merged, `trello_client_list_id`, and `trello_synced`/`trello_synced_at` ONLY if every piece now exists).
6. Show a plain report: "Created 3 · Already there 5 · Could not create 1 (why)". Anything that could not be created leaves the order marked not synced, so it stays on the attention list.
**Not in v1 (stated so nobody is surprised):** per-agent cards for agent-split orders (Retry will say "this order has agent cards -- finish by hand" and list what is missing), Gold/Green markers, comments the original run would have posted beyond one "completed by {AM}" note.
**Tests (fail on today's code because the feature does not exist; the behavior ones are the point):** real Admin code + a fake Trello that remembers cards -- (a) nothing exists -> creates list items correctly; (b) everything exists -> creates NOTHING; (c) some exist (including name variants: hyphen/en-dash/em-dash, double spaces) -> creates only the missing; (d) list unreadable / Trello error -> stops, creates nothing, order stays unsynced; (e) card creation fails for one -> reports it, others succeed, still unsynced; (f) press twice -> second press creates nothing; (g) template unreadable -> no bare card; (h) group without a board -> button absent, not on the attention view; (i) the order update carries exactly the expected fields.
**Live check (Claire):** place a test order from Claude Test Group; in Trello archive ONE of its tactic cards; in Supabase mark just that test order unsynced (`update orders set trello_synced = false where order_number = '…'` -- I will give the exact statement); open the order in Admin -> Retry Trello -> expect "Created 1 · Already there N", the missing card back, no duplicates of the others, order marked synced; press Retry again -> "Created 0".
**Rollback:** revert the merge. **Risk: low** (Admin only; it creates Trello cards, never deletes). **Effort: about a day of my time, in steps.**

### STEP 2 -- order-email safety net (touches the submission path; after Step 1 is live)
**2A. SQL block (outside AE hours; label: "touches the submission path"):** `alter table orders add column email_sent_at timestamptz;` + a one-time backfill so existing orders do not all look unsent (`email_sent_at = created_at` for every order placed before the cutover; we cannot know if each email went out, so we assume sent; the statement is mine to write exactly once the columns are confirmed) + any read function from check 3 that returns a fixed column list (in the SAME block, per the one-block rule). Tested in pglite with the REAL order trigger function (it must still fire and write the same lines). You run the rebuilt smoke test right after.
**2B. Form change (AFTER SAVE; merged ONLY after 2A is run):** after the email step succeeds, one small update `email_sent_at = now()`. If the email fails, nothing is written (null = not sent). If the group has no email recipients at all, nothing is attempted and Admin does not flag it (Admin checks the group). Same step: when the Trello step ended with `setupIssues`, send the AM an email ("Order … saved but Trello is incomplete -- open it in Admin and press Retry Trello") using the group's AM address the form already has. A failure of this alert email changes nothing else.
**2C. Admin:** Orders list and Order Detail show the email status next to Trello ("✉ sent {date}" / "⚠ not sent"); "Resend order email" for AMs (Admin already sends through the same email service; it builds the revised IO PDF and sends to the group's IO recipients + the always-BCC list -- the same people the original goes to) and sets `email_sent_at`; the attention view includes unsent emails. The AM alert email is a convenience; **the Admin view is the dependable signal**, because if the email service itself is down an email cannot report it.
**Tests:** pglite (column + backfill + the real trigger still writes identical lines); real submit in Chromium with the fake Trello/email proxy -- email ok -> the update carries `email_sent_at`; email fails -> no timestamp and the AE notice stays; PDF fails but email sends -> timestamp set; Trello incomplete -> exactly one alert to the AM address; Trello complete -> no alert; no recipients -> nothing attempted, nothing flagged; the existing submit tests unchanged. Admin: Resend button sends once to the right people and sets the timestamp; unsent shows ⚠.
**Live check (Claire):** a normal test order from Claude Test Group (email arrives; Admin shows ✉ sent); press Resend order email on it (a second email arrives, timestamp updates). The failure paths cannot be provoked safely live; they are proven in tests with the fake service.
**Rollback:** revert the form merge (the column can stay unused); the SQL itself is additive and leaves everything else unchanged. **Risk: medium** (it is a submission-path change, but AFTER the order is saved; the order and its Trello setup are unaffected if the new update fails).
**Sequence:** Step 1 anytime (no gate beyond tests + the live check). Step 2 after Step 1 is live and the print-layout item is done: 2A run in a quiet window with the smoke test -> 2B merge in a separate quiet window with a test order -> 2C can ship with 2B or just before it (harmless while the column is null... and only meaningful once the backfill ran).

### Open decisions for Claire
1. Attention view default window: 90 days -- OK, or another number?
2. Agent-split orders in v1: "finish those by hand, Retry lists what is missing" -- OK, or must Retry handle agent cards too (adds time)?
3. Resend email recipients: the group's IO recipients + always-BCC (what the original sent), plus the AE? Recommended: same as the original, no AE.

### Findings from the three checks (Claire, 2026-10-15) -- these CHANGE Step 1
1. **Every one of the 145 orders on file (2026-05-22 .. 2026-10-14) is from a group with a Trello board and is marked synced.** The attention view would be empty on day one, so Retry is protection for the future, not a clean-up. Caveat: before Batch 2a (2026-10-14) the form marked an order synced even when a Trello step had failed, so a "synced" order from before then is not proof every card exists (Admin's per-client Trello audit is the tool for that).
2. **Admin cannot update an older order directly.** The `orders` policies let the anonymous key INSERT freely, but read and update only rows created in the LAST 2 HOURS. That is exactly why the form can record its result right after saving. It also means Retry's final step (recording `trello_card_ids` / `trello_synced`) and a later Resend (`email_sent_at`) CANNOT be done from Admin the way the form does it for any order older than two hours.
   **Consequence: Step 1 needs ONE small database function** (a login-protected, admin-only function that updates only the Trello fields of one order, following the same pattern as the existing `admin_edit_order_line_item`). It does not touch the order trigger or the insert path, so it is NOT the submission path (it is labelled "does not touch the submission path", tested in pglite, run by Claire before the Admin merge). Step 2 later re-creates that function to also allow `email_sent_at`, in the SAME block as the new column (a function that names a column ships with the column, never before).
3. **No function names `trello_synced`**, so Admin's order list returns whole order rows: a new `email_sent_at` column should reach Admin by itself (to be confirmed when Step 2's SQL is tested against the real list function; if not, the list function is added to that block).
**Other consequence of the 2-hour rule (for Step 2):** the form's own `email_sent_at` update runs seconds after the save, well inside the window, so it works for the anonymous key as the Trello update already does.

### Decisions on the three open questions (Claire, 2026-10-15)
1. Attention window: clarified (it only limits how far back the "needs attention" list looks, so ancient orders do not clutter it; default 90 days with a 30 / 90 / all-time choice; irrelevant today because every order is synced) -- Claire to confirm she is happy with that.
2. Agent-split orders: Retry lists what is missing and the AM finishes those per-agent cards by hand (v1). YES.
3. Resend recipients: the original recipients PLUS the AE. NOTE: today's original email goes only to the group's IO recipients (To) + always-BCC; the AE is named in the body but does not receive it. So the resend will include the AE; whether the ORIGINAL email should also go to the AE is a separate question (a small after-save change to the form) -- asked of Claire.
### Built so far (not live): the admin function for Step 1
`tests/fixtures/admin-set-order-trello-state.proposed.sql` + `tests/db-admin-set-order-trello-state.test.js` (8 pglite checks): login required (same `admin_resolve_role` pattern as the other admin functions); an AM or super can set ONLY `trello_card_ids`, `trello_client_list_id`, `trello_synced`, `trello_synced_at` on one order of any age; every other field (totals, line items, created_at...) is refused; wrong types refused; missing order refused; unspecified fields keep their values. Labelled "does not touch the submission path". Claire runs it before the Admin Retry change is merged.
