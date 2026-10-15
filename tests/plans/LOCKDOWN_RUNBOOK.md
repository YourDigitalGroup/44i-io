# Embed-key lockdown: runbook (prepared 2026-10-15; Claire chose to wait until tomorrow)

Everything below is built and tested in a throwaway database (`tests/db-lockdown.test.js`, 16 checks, against the live function text Claire pasted on 2026-10-15). Nothing is live. The Admin/Strategist code is held as a patch so it cannot be merged before its SQL.

## What the lockdown does
- **Section 1:** takes public access away from the 17 OLD (no-key) versions of the form functions. The key versions (same names, first argument `p_t`) are untouched. Revoked, not dropped: the owner and the service-role key keep access.
- **Section 2A:** drops the public read of `notification_settings` (the always-BCC list). **Section 2B:** drops the public read of the `groups` table (pricing, AM emails, Trello board ids). **2B IS HELD:** the API logs (2026-10-15) show an unknown automatic job reading `groups` every hour at :15 (about 159 requests a week; columns id, name, io_slug, logo, colours, trello_board_id, AM/recipient/from emails, portal domain...). Dropping the policy would break it until its owner is found and moved to a narrow read.
- **Section 3 (separate, later):** the old functions the Fourge Playbook may use: `save_group_draft(p_group_id…)`, `get_group_roster`, `get_group_clients(p_group_id)`, `get_group_aes(p_group_id)`.
- A form opened WITHOUT its key (the old slug address) stops loading. That is the point.

## What had to change first (found 2026-10-15; would have broken without these)
- Strategist portal "import" pickers used the old no-key `get_client_agents` / `get_client_counties` -> now `admin_get_agents` / `admin_get_counties` with the strategist's own login (existing functions; no new SQL).
- Admin Settings tab and the approval emails read `notification_settings` directly -> new `admin_get_notification_settings`.
- Admin Reconcile and Retry Trello linked a client to its Trello list through the old public `set_client_trello_list_id` -> new `admin_set_client_trello_list_id`.
- Permanent safety nets added: `tests/forms-use-key-versions.test.js` (every group-scoped call in the order form and Companion carries the key helper) and, in the patch's pending test, "no other page calls a closed function".

## Order of operations (after hours, Claire available the next day)
0. **PLAYBOOK (answered by reading its code, 2026-10-15):** it uses the PUBLIC key for most IO calls (`find_or_create_client`, `find_or_create_ae`, `set_client_trello_list_id`, `get_group_roster`/`get_group_clients`/`get_group_aes`, and the hourly `directory-sync` read of `groups`); only its draft write, `orders` read and strategist/admin reads use the service key. **Before ANY lockdown section: the Playbook developer changes the two defaults in `supabase/functions/_shared/io.ts` (`ioRest`, `ioRpc`) from `"anon"` to `"service"` and deploys.** The service key keeps working after every section. After each section ask them to run `directory-sync` and save one test draft. (Old note, now answered: (a) public (anon) key or service-role key? (b) which functions/tables it calls: `save_group_draft`, `get_group_roster`, `get_group_clients`, `get_group_aes`, or the `groups` table? Sections 1 and 2 do not touch the first four; Section 2 would break a Playbook that reads the `groups` table directly.
1. Run `tests/fixtures/lockdown-prerequisites.sql` (two NEW functions; additive; safe any time; does not touch the submission path).
2. Claude commits `tests/fixtures/lockdown-callers.patch` (+ moves `tests/lockdown-callers.test.js.pending` into place) to the branch; full suite; Claire merges. Check: Admin > Settings shows the always-BCC list; Admin > Reconcile links a client (or one Retry Trello on a client with no list); Strategist > New Campaign import for a multi-agent client lists agents/counties.
3. Before touching anything: one test order through a keyed IO link and one Companion request through a keyed Companion link (baseline).
4. Run `tests/fixtures/lockdown.sql` SECTION 1 only. Reload a keyed IO form and Companion (client picker, AE picker, drafts); submit a test order. 
5. Run SECTION 2A (after checking the logs for `/rest/v1/notification_settings`). Reload the keyed forms again; submit a test order; open Admin > Settings. SECTION 2B only when the hourly job's owner is found and moved.
6. Section 3 only when the Playbook is confirmed on keys / service key (`tests/fixtures/lockdown-section3-playbook.sql`); ask the Playbook team to save one test draft right after.

## Proof after each section
Run `tests/fixtures/lockdown-verify.sql` (read-only): after Section 1 every `section_1` row must show `anon_can_run = false`, `signed_in_can_run = false` and `service_role_can_run = true`; after Section 2 the policy list at the bottom must return no rows.

## Rollback (seconds; plain re-grants / re-create policy)
`tests/fixtures/lockdown-rollback.sql` has three parts, one per section; run only the part for the section that went wrong. Symptoms: "Couldn't load just now" / empty client or AE pickers = a function still closed that a page calls; an Admin tab blank = Admin patch not merged before Section 2.

## Not covered by this lockdown (separate later phases in the notes)
Anon `orders` insert and 2-hour read/update; `pending_requests` anon insert; the Trello/email relay requiring the key; `group_service_overrides` public read (no caller in the forms; tidy-up candidate); `get_group_logo` stays open on purpose (audit tool).

## Playbook orders check (Claire asked, 2026-10-15; answered by reading the Playbook code)
- Since 2026-10-11 the Playbook does NOT create orders in the IO: signing writes a DRAFT (`save_group_draft`, service key) and the AE presses Resume in the keyed IO form and submits, so the form creates the client, order, cards and PDF (`_shared/handoff.ts` header). No Playbook code inserts into `orders`. (Its docs/RUNBOOK section for 2026-10-01 still describes the old direct order insert with the public key: stale docs.)
- What it still does with orders: READS them (service key) to mark the hand-off done; the older `io-trello` function (manual retry buttons) can PATCH an order's Trello fields (public key until the two-line change, then the service key).
- The lockdown does not touch `orders` or its policies. The link the Playbook gives AEs is the WordPress page (`partner.io_page_url`, default `https://yourdigitalgroupresources.com/insertion-order/`), which carries the key.
- Extra end-to-end test after Section 1 (and again after Section 3): the Playbook team signs a TEST proposal for the Claude Test Group, Claire (as the AE) opens the IO link from the card, presses Resume, and submits; the order and cards should appear as usual.
