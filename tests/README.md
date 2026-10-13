# Tests

Safety net for the pages (nothing here is deployed to the website).

**Run everything:**  `node tests/run-all.js`  (from the repo root, takes about a minute)

Two tests need extras and say `SKIP` if they are missing:
- `io-form-per-unit-row.test.js` runs the real IO form in a headless browser (needs `playwright`).
- `db-admin-edit-line-item.test.js` runs the live Admin edit function in an in-memory Postgres (needs `@electric-sql/pglite`).
  Install both once with `cd tests && npm install`.

**How it works:** most tests pull the real functions out of `index.html`, `admin/`, `accounting/` and `strategist/` and run them with made-up data. If someone renames or deletes a function a test needs, the test fails with `MISSING` instead of quietly passing.

**The rule:** every bug we find gets a test that fails on the old code and passes on the fix, so it cannot come back. Run the whole suite before every push.

**Known problems that are NOT tested yet (written up in `io_project_tracking.md`, "ACCOUNTING AUDIT"):** past-month totals that drop completed lines, a rollup counting its completed/paused children, and a renewal after a gap showing a phantom month. When those are fixed, add tests for them here.

`tests/fixtures/live-admin-edit-line-item.sql` is a copy of the live database function (with three branches stubbed). If the real function changes, paste the new text there.
