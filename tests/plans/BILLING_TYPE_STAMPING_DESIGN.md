# Billing-type stamping: design note (2026-10-16, for Claire to approve or park; nothing built)

## The problem in plain words
When an order is placed, each line stores its amounts (`fee`, `recurring`, `spend`) but NOT how it bills (monthly, yearly, one-time). Every part of the system works that out again, later, by looking the service up in TODAY's catalog: the order form, the printed IO, the Trello cards, Admin, Accounting, the Companion, the order trigger and the Correct Service function. Two things go wrong:
1. **The copies drift.** Found this month: yearly Hosting showed "/mo" on the IO and in Trello; Correct Service wrote a corrected Hosting Fee as a one-time fee. Each time the rule was fixed in one place, another copy still had the old rule.
2. **Old orders change meaning if the catalog changes.** If someone later edits a service's billing type, every past order for it is reinterpreted.

## Proposal (small, in three safe phases)
Stamp the billing type on each line when the order is placed: one extra key (`billing_type`) inside the line item. No new column and no schema change (line items are stored as JSON). Everything that reads a line prefers the stamp and falls back to today's catalog lookup when there is no stamp, so every existing order keeps working exactly as now.
- **Phase 1 (order form):** stamp `billing_type` on each line at submit. Harmless extra key; nothing reads it yet. Touches the submission path (the saved order), so it waits for the Playbook testing to end and ships with a test order.
- **Phase 2 (readers):** Admin, Accounting, Companion, Strategist, print and Trello use the stamp when present. Front-end only, no SQL.
- **Phase 3 (order trigger and Correct Service):** prefer the stamp. SQL on the submission path. Bundle it with the renewal SQL (both change the same trigger) so there is ONE smoke test, run outside AE hours.
- Old orders: no backfill. They keep using the catalog fallback. (A backfill would guess what the catalog said at the time; not worth the risk.)

## What is NOT changing
Amount fields, totals, Accounting math, which services exist, or any pricing. It only records how a line bills.

## Decisions for Claire
1. Do it at all? Value: removes a whole class of "shows /mo but is yearly" bugs. Cost: three small steps, one on the submission path. No live bug is open today. **My recommendation: yes, but after the Playbook testing ends, Phases 1-2 first, Phase 3 with the renewal SQL.**
2. Stamp only `billing_type`, or also the unit label? **Recommendation: only `billing_type`** (smallest; add more later if a real need appears).

## Test plan when built
A test per reader (a stamped yearly line shows "/yr" everywhere; an unstamped old order still uses the catalog), a pglite test of the trigger on stamped and unstamped lines, and a real test order on the Claude Test Group.
