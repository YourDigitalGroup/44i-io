# CLAUDE.md

Project context for Claude Code. Read this at the start of every session, then read
`io_project_tracking.md` for full history before making changes — this file is
deliberately short; that one is the source of truth for detail.

## What this project is

A single-page Insertion Order (IO) form for 44i, a digital marketing agency. Client-facing
groups (white-labeled agency partners) fill out a form selecting services, review pricing,
sign, and submit. Submissions create a client record in Supabase and build a Trello card.
A separate admin portal at `/admin` lets super-admins and account managers manage groups,
custom pricing, and the service catalog — same Supabase backend, its own page, no admin
code left in the public form.

- **Working file:** `index.html` (the public IO form — inline CSS/JS). Admin portal lives
  at `admin/index.html`, sharing `shared.js`/`shared.css` (repo root) for the catalog-
  loading logic both pages genuinely need.
- **Backend:** Supabase project "44i-io" (Postgres + RPCs, no separate API server)
- **Deploy:** GitHub Actions on push to `main` → `io.yourdigitalgroupresources.com`
  (deploys the whole repo tree, so `/admin` and any future `/strategist`/`/accounting`
  paths need no separate deploy step)
- **Tracking doc:** `io_project_tracking.md` — full session history, open questions,
  parked decisions, everything currently pending an AM/business review. Check this before
  assuming something is undecided or unbuilt — it's usually already been resolved and
  recorded here, or explicitly parked with the reason why.

## Non-developer context — READ THIS FIRST

Claire, who owns this project, is a process analyst, not a developer. She catches issues
through live testing and screenshots, not by reading code. This means:

- Explain changes in terms of what a user would see/click, not code internals.
- Never assume she's seen a diff — describe the actual before/after behavior.
- She reads carefully and pushes back when something doesn't add up — treat that as
  useful signal, not something to smooth over. If she flags something as still wrong
  after a fix, the first fix was probably incomplete or wrong, not her misunderstanding.
- Business-logic questions (pricing rules, which services exclude each other, what a
  discount should mean) are her call or the Account Manager's, not something to infer
  or guess at from context. When in doubt, ask instead of assuming.

## Architecture the catalog is built on

Services (pricing, labels, exclusivity, KOC/intake requirements) live in a Supabase
`services` table, not hardcoded in the HTML — this was a full-session migration completed
2026-07-07. Row generation, pricing display, and exclusivity groups all derive from this
table live at load time. **Do not reintroduce hardcoded per-service data into the JS** —
if you need a new per-service behavior, it's very likely a new column, not a new
hardcoded object. `io_project_tracking.md` documents the exact pattern used for each
existing mechanism (`exclusivity_group`, `spend_minimum`, `subsection_label`,
`hosting_prompt_type`) — follow the same shape for anything new.

The write-side admin editor (Services tab) is the intended way non-developers add or
change catalog entries going forward — check it can actually support whatever you're
building before assuming a schema change is enough on its own.

## Working conventions (how this project has been built)

- **Verify against the real file before claiming something is true.** Don't describe
  behavior from memory or assumption — grep/view the actual current code first,
  especially before telling Claire something works a certain way.
- **Test before presenting.** For any non-trivial JS change, extract the relevant
  function(s) and run them against realistic data (not just "it parses") before saying
  something is fixed. Structural checks (balanced braces, `node --check`) are a minimum
  bar, not sufficient on their own.
- **Be honest about what's verified vs. reasoned.** If something can't be tested without
  actually rendering the page (CSS layout, print preview), say so explicitly rather than
  presenting it with the same confidence as something proven by simulation.
- **Every fix gets logged in `io_project_tracking.md`** with what was found, why it
  happened, and how it was verified — including honest write-ups of mistakes (e.g. a
  first fix attempt that didn't work). Keep doing this; it's how continuity across
  sessions works given Claude has no persistent memory otherwise.
- **Don't expand scope unprompted.** If you find a related issue while fixing something
  else, flag it and ask rather than fixing it silently — Claire manages usage/cost
  consciously and prefers to make that call herself.
- **SQL on the submission path is high-stakes — label it, bundle it, smoke-test it.**
  Two live incidents (2026-09-23 `max(uuid)` in the order trigger; 2026-09-24 a
  function referencing a column shipped in a separate message) broke or degraded real
  AE submissions. The submission path = `find_or_create_client`/`find_or_create_ae`
  (both signatures), the `orders` AFTER INSERT trigger, `save_group_draft`/
  `get_group_drafts`, and the group/notification reads the form makes on load. Rules:
  (1) say "touches the submission path" in the first line of any such SQL; (2) a
  function that depends on a new column ships in the SAME block as the column, never
  separately; (3) Claire runs `scratchpad/smoke-test-submission-path.sql` right after
  (it clones a real order inside a transaction, fires the trigger, and rolls back);
  (4) prefer outside AE hours. plpgsql does NOT validate column references at CREATE
  time, so "the SQL ran without error" proves nothing about runtime. (5) **Execute
  handed SQL locally first**: `@electric-sql/pglite` (real Postgres in Node, installs in
  seconds into the session scratchpad) runs plpgsql for real — build the minimal tables
  the function touches, load the exact .sql file, call it across realistic scenarios,
  and read back the rows. Pattern: scratchpad `pg-test-swap.js` (2026-09-25). This is
  the check that would have caught both incidents; "shape-checked only" is no longer
  an acceptable verification level for a function Claire is about to run.
- **Business-logic ambiguity gets parked, not guessed at.** Several real examples exist
  in the tracking doc of exactly this pattern — read a couple before assuming you should
  resolve an ambiguous rule yourself.

## Current state (check tracking doc for anything more recent than this)

All 17 catalog sections are converted to dynamic, catalog-driven rows. Several Website
business-logic questions are explicitly parked for an Account Manager review (see
"OPEN QUESTIONS FOR THE AM" in the tracking doc). The admin portal has moved to its own
path (`/admin`) and all admin code has been removed from the public form's file
(`index.html`) — no more duplicate copies to keep in sync. Future `/strategist`/
`/accounting` role-based views are expected to land as their own paths the same way,
sharing `shared.js`/`shared.css`.
