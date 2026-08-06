# Auth Migration Plan — Custom Password Scheme → Supabase Auth

**Status: planned, not started.** No code in this plan has been written yet. This
document exists so the migration can be picked up and scheduled deliberately,
rather than attempted piecemeal alongside other changes.

## Why

The Admin and Strategist portals currently use a custom password scheme, not
Supabase Auth:

- Each person has a row in `admin_users` with `pw_hash = encode(digest(p_pw,
  'sha256'), 'hex')`.
- Login (`admin_login` RPC, called from both `admin/index.html` and
  `strategist/index.html` — the strategist portal has no separate login scheme
  of its own) checks the hash server-side and returns `{role, email}`.
- On success, the client stores `{name, email, role, pw}` — **including the
  plaintext password** — in a plain JS variable (`currentAdminUser`/
  `currentStrategistUser`). Not sessionStorage, not localStorage — it resets on
  every page refresh.
- Every subsequent RPC call for the rest of that session re-sends `p_name`/
  `p_pw` as parameters, so the plaintext password travels over the wire
  repeatedly, not just once at login.
- No real session token, no expiry, no rate-limiting/lockout on repeated wrong
  attempts.

This works, but it's a meaningfully weaker security posture than Supabase's
own Auth (real JWT sessions, bcrypt hashing, built-in rate limiting, password
reset flows) — and it's already the pattern for a newer platform Claire was
given, whose migration plan this document adapts.

The public IO form (`index.html`) is untouched by any of this — it's
intentionally open/anonymous, no login at all, and stays that way.

## The one architectural difference from the reference plan

The reference plan's safety net works because its tables use real Postgres
RLS *policies* — it can swap which credential hits the database while leaving
the permission rule itself wide open, so a bug in the new login can't change
what anyone can actually access.

**We don't have that lever.** Every table in this project has RLS "enabled and
forced, zero policies" (see `CLAUDE.md`) — there's no external policy layer to
leave open as a safety net. All ~33 password-checking RPCs do their permission
check *inside their own function body* (`where au.pw_hash = ...`). The rule
and the credential check are the same piece of code, so there's no way to
"send a new token against an old, still-open rule."

**Adaptation**: instead of one global RLS toggle at the end (the reference
plan's Stage 4), each RPC gets its own dual-path guard during the middle
stages — accept *either* the legacy `p_name`/`p_pw` *or* a valid Supabase
session, one function at a time. This is more granular than a single RLS
flip, not less safe: a mistake in any one function can't cascade to the
others, and each one is independently reversible.

## Full inventory (sizing, from the 2026-08-06 scoping pass)

**Admin portal** — 21 distinct password-bearing RPCs, 36 call-sites in
`admin/index.html`:
`admin_login, admin_get_aes, admin_save_ae, admin_get_strategists,
admin_save_strategist, admin_get_staff, admin_save_user, admin_get_clients,
admin_save_client, admin_get_orders, admin_get_clients_missing_trello_list,
admin_get_accounting_map, admin_save_accounting_map, admin_save_group,
admin_save_hosting_setting, admin_rename_workflow, admin_delete_workflow,
admin_save_service, admin_save_section, admin_save_intake_form,
admin_save_legal_content, admin_save_notification_settings`

**Strategist portal** — 12 distinct password-bearing RPCs (`admin_login` is
shared with Admin, not counted twice), 17 call-sites in
`strategist/index.html`:
`strategist_get_clients, strategist_get_campaign_lines,
strategist_get_campaign_months, strategist_get_optimize_log,
strategist_get_budgeted_spend_rates, strategist_get_platform_report_cache,
strategist_save_campaign_line, strategist_save_campaign_month,
strategist_save_optimize_log, strategist_save_platform_report_cache,
strategist_delete_optimize_log`

**Not in scope** (already password-free, no change needed): `get_login_roster`,
`set_client_trello_list_id`.

**Client-side role gating**: `currentAdminUser?.role` is checked ~43 times in
`admin/index.html` (mostly `role === 'am'` hiding buttons). This is cosmetic
UI-hiding only today — the real enforcement lives in the RPCs — and maps
naturally onto reading the same `admin_users.role` column once looked up via
`auth_user_id`, so no separate redesign needed there.

**Supabase JS client library**: not currently loaded anywhere in the repo
(confirmed — no `supabase.auth`/`signInWithPassword`/`onAuthStateChange`
references exist). Needs adding for real session handling (auto-refresh,
persisted login) rather than hand-rolling that logic.

## Stages

### Stage 0 — Groundwork (zero risk, invisible to everyone)
- Add an empty `admin_users.auth_user_id uuid` column. Nothing reads or
  depends on it yet.
- Decide provisioning: an AM/super admin creates each person's real Supabase
  Auth account (matching how `admin_users` rows get created today), and that
  person gets an email to set their own password — cleaner than anyone
  sharing/knowing a password up front.

### Stage 1 — Create real accounts, change nothing about how the app works
- For each current `admin_users` row, create a matching Supabase Auth account,
  linked via `auth_user_id`.
- Add the real Supabase JS client to `admin/index.html` and
  `strategist/index.html`.
- Build a new login screen (real email + password, "Forgot password?") that
  calls `supabase.auth.signInWithPassword()`, then a new read-only RPC (e.g.
  `admin_get_profile_by_auth_uid()`) that looks up `{role, email, name}` from
  `admin_users` via `auth.uid()` — a NEW function, doesn't touch any of the 33
  existing ones. Leave the existing password-login modal fully working,
  unchanged, side by side.
- Risk: essentially none. A bug in the new screen just means people keep using
  the old one; nothing else in the app is touched.

### Stage 2 — Dual-path guards, one RPC at a time
- Go through the 21 admin + 12 strategist RPCs individually. For each one, add
  an additional guard clause that accepts EITHER a valid Supabase session
  (`auth.uid()` maps to an `admin_users` row via `auth_user_id`) OR the
  existing `p_name`/`p_pw` check — whichever succeeds, proceeds exactly as
  before.
- Each function is independently testable and independently revertible. No
  function's behavior changes for anyone still using the old login; the new
  login path just starts actually working, function by function, as each one
  is updated.
- Suggested order: lowest-traffic/lowest-risk RPCs first (e.g.
  `admin_rename_workflow`, `admin_delete_workflow`) to prove the pattern, then
  the higher-traffic ones (`admin_get_clients`, `strategist_get_clients`,
  etc.), saving `admin_login` itself and the most-called save RPCs
  (`admin_save_client`, `strategist_save_campaign_line`) for once the pattern
  is well-proven.

### Stage 2b — Centralize role-based UI gating (maintainability, not security)
Separate concern from the rest of this plan, added at Claire's request since
Stage 2 already means touching every RPC's role logic — a natural point to
also clean up how the CLIENT reads that role. Not a security fix: the real
enforcement already lives server-side in each RPC (confirmed during scoping —
client-side role checks are cosmetic UI-hiding only), so this carries none of
the risk the rest of this plan does and doesn't need to wait for any other
stage to finish. Can be done anytime, including entirely independently of the
Supabase Auth work if that ever stalls.

- **The problem being fixed**: `currentAdminUser?.role === 'am'` (and similar)
  is checked ~43 separate times throughout `admin/index.html`, inline at each
  gated button/tab, rather than in one place. Nothing stops a future new
  admin feature from forgetting to add its own check — the pattern only works
  if every single new gate remembers to copy it correctly.
- **The fix**: one small declarative permission map (e.g. `const
  ROLE_PERMISSIONS = { newAeButton: ['super','am'], newServiceButton:
  ['super'], legalTextSave: ['super'], ... }`) plus a single `canSee(feature)`
  helper that reads it. Replace the ~43 inline `role === '...'` checks with
  calls to `canSee('...')`. Adding a new gated feature becomes "add one line
  to the map" instead of "remember to inline the right condition correctly."
- Purely client-side, purely a refactor of existing behavior — every gate
  should show/hide exactly the same as it does today, just from one source of
  truth instead of 43 scattered ones. Verify with a pass through every
  existing role (`super`/`am`/`strategist`/`accounting`) confirming nothing
  that was visible/hidden before changed.
- Natural side effect: once JWT-based sessions exist (post-Stage 1), the role
  itself could come from a custom JWT claim instead of the looked-up
  `admin_users.role` — the permission MAP doesn't care where the role string
  comes from, so this cleanup and the auth migration proper compose cleanly
  without depending on each other.

### Stage 3 — Live-test with real traffic, old path still the safety net
- Roll the new login out for real day-to-day use — including live client work
  — while the legacy password path remains fully available as fallback for
  anyone who hits a problem.
- Watch specifically for: session expiring mid-edit, refresh/reload behavior,
  editing in two tabs, the cross-portal admin↔strategist handoff (currently a
  one-time sessionStorage handoff of `{name, pw}` — this needs its own
  redesign once real sessions exist, likely just relying on the same
  Supabase session across both portals instead of a manual handoff).
- Nothing gets removed until this stage has run clean for a real stretch of
  time. Deliberately the longest, most patient stage.

### Stage 4 — Remove the legacy password branch (the only genuinely risky step)
- Only after Stage 3 has proven clean: go back through the same 33 RPCs and
  remove the `p_name`/`p_pw` fallback branch, leaving only the Supabase-session
  check.
- Unlike the reference plan's single global RLS flip, this can be staggered
  across several quiet windows instead of one all-at-once cutover, since
  there's no single central switch forcing it to be atomic — pull the fallback
  from a few functions at a time, confirm clean, continue.
- Schedule for genuinely quiet windows, never mid-content-push. Keep the exact
  removed branch on hand (git history already preserves this) to instantly
  restore per-function if something unexpected breaks.

### Stage 5 — Cleanup
- Drop `admin_users.pw_hash`.
- Remove the old password-login modal/UI code from both portals.
- Remove the temporary `auth_user_id`-lookup RPC from Stage 1 if it's been
  superseded by something cleaner by this point.

## What's safe to start now vs. what waits

Stages 0–3 (and 2b) are additive and reversible — safe to start whenever
there's bandwidth, including now. Stage 2b specifically has no dependency on
any other stage at all — it's a pure client-side refactor of existing
behavior and could be done today, this week, or whenever, entirely
independent of how the rest of the migration is paced. Stage 3 doubles as
live proof the auth work itself works, using real ongoing work, without
putting that work at risk. Stage 4 (the only stage that can actually break
something, and only for the specific RPCs being migrated at that moment)
should wait for a deliberately quiet window — not mid-month, not alongside
other unrelated changes.
