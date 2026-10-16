# Email safety net, Step 2: runbook (built 2026-10-16; HELD until the Playbook testing ends)

Everything is built and tested; none of it is live. Files are in `tests/fixtures/email-safety-net/`.

## What it adds
- The order form records when the order email really went out (`orders.email_sent_at`), emails the group's AM when the Trello setup did not finish, and a test group can be set to leave the always-BCC list ("team copy") off its emails.
- Admin shows ✉ sent / ✉⚠ not sent in the Orders list and Order Detail, a Send/Resend button (same recipients as the original, with the PDF), "Trello or email needs attention" in the filter, and a "Team copy" setting in the group editor.

## Order (each its own quiet window, outside AE hours, with a test order; Claude Test Group)
Prerequisite: the lockdown prerequisites SQL and `lockdown-callers.patch` are already in (the Admin patch below is written to apply after them).
1. **SQL:** `tests/fixtures/email-safety-net/step2.sql` (ONE block; touches the submission path). Then Claire runs `scratchpad/smoke-test-submission-path.sql` (rebuild it first: ask Claude) and a normal test order; the new order should show an empty email time (not yet recorded by the old form).
2. **Form:** Claude commits `form-step2.patch` (+ `io-form-email-safety-net.test.js.pending` moved into place); Claire merges; a test order from Claude Test Group: the email arrives and Admin (after step 4) will show ✉ sent.
3. **Backfill again:** immediately after the merge, Claude fills the exact merge time into `step2-backfill-again.sql`; Claire runs it (marks orders placed between step 1 and the merge as sent).
4. **Admin:** Claude commits `admin-step2.patch` (+ `admin-email-status.test.js.pending`); Claire merges. Check: the test order shows ✉ sent; press Resend (a second email arrives and the time updates); set Claude Test Group's Team copy to "No" and place a test order (the team is NOT copied; the real recipients are).
Failure paths (mail service down, Trello incomplete) cannot be provoked safely live; they are proven in the browser and database tests.

## Rollback
Form: revert the merge (the columns can stay unused). Admin: revert the merge. SQL: re-run the previous function texts (`live-step2-functions.2026-10-16.sql`, `../admin-save-group-with-history.proposed.sql`); the two new columns are harmless.

## Who counts as "should have been emailed" (Claire's correction, 2026-10-16)
The order form emails the group's IO recipients, the AE (when picked from the roster) and the always-BCC list; with no IO recipients it still goes to the AE and the team list. So Admin flags an order whose email time is empty in EVERY case, except a group set to "don't copy the team" that also has no IO recipients and an AE with no email on the roster (nothing was attempted there).
