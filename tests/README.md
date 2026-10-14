# Tests

Safety net for the pages (nothing here is deployed to the website).

**Run everything:**  `node tests/run-all.js`  (from the repo root, takes about a minute)

Two tests need extras and say `SKIP` if they are missing:
- `io-form-per-unit-row.test.js` runs the real IO form in a headless browser (needs `playwright`).
- `db-admin-edit-line-item.test.js` runs the live Admin edit function in an in-memory Postgres (needs `@electric-sql/pglite`).
- `admin-service-editor-roundtrip.test.js` / `admin-group-editor-roundtrip.test.js` open each Admin editor on realistic saved data and press Save without changing anything: what is sent must equal what was stored (needs `jsdom`). Add a row here whenever an editor gets a new field, and whenever a saved value turns out to change just by opening the editor.
  Install both once with `cd tests && npm install`.

**How it works:** most tests pull the real functions out of `index.html`, `admin/`, `accounting/` and `strategist/` and run them with made-up data. If someone renames or deletes a function a test needs, the test fails with `MISSING` instead of quietly passing.

**The rule:** every bug we find gets a test that fails on the old code and passes on the fix, so it cannot come back. Run the whole suite before every push.

**Known problems that are NOT tested yet (written up in `io_project_tracking.md`, "ACCOUNTING AUDIT"):** past-month totals that drop completed lines, a rollup counting its completed/paused children, and a renewal after a gap showing a phantom month. When those are fixed, add tests for them here.

`tests/fixtures/live-admin-edit-line-item.sql` is a copy of the live database function (with three branches stubbed). If the real function changes, paste the new text there.

- `data-health.sql` is NOT an automated test: a read-only catalog/data sanity script (57 catalog checks, 4 accounting-map checks, 8 saved-data checks) that Claire runs in the Supabase SQL editor as three separate queries. Every row returned is something that looks wrong. Re-run it after catalog changes and before invoicing. Written 2026-10-14 from the logic audit; run only against empty stand-in tables so far, so its first real run may need column-name fixes (the file says which names were guessed).
