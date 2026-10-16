# AM Admin guide ("Changing an Order in Admin"): source and how to update it

Claire's internal reference for Account Managers. **Keep it short: 3 pages.** The guide is a PDF built from one HTML file.

- `am-admin-guide.html`: the source (edit this).
- `Admin-Guide-for-AMs-2026-10-16.pdf`: the current published version.
- `previous-2026-10-08.html`: the version before the 2026-10-16 update (for comparison).
- `build.js`: builds the PDF (`node tests/guides/am-admin-guide/build.js out.pdf`; needs playwright + Chromium).

## To update it
1. Edit `am-admin-guide.html` (same pattern: a row in "Which button do I use?", an `.act` block with Steps / Result / Watch for, or a line in "Also good to know").
2. Build the PDF and check it is still 3 pages (shrink wording before shrinking type); look at every page.
3. Save the new PDF here with the date in its name, and add a line to the change list below.
4. Verify every new statement against the code (the AM can do what `ADMIN_ROLE_PERMISSIONS` in `admin/index.html` allows; the rest is "Ask an admin").

## Change list
- 2026-10-08: first short version (Swap, Correct, Cancel, Renew, Edit, intake, Requests, "confirm with the AE").
- 2026-10-16: added Retry Trello (table row + block), the red message also covers Trello refusing a comment or file, Cancel keeps the line running in Strategist/Accounting through the effective month, the group History tab.

## Waiting for these to go live, then add them
- Order email status (✉ sent / not sent) and the Send/Resend order email button, "Trello or email needs attention" filter, and the group "Team copy" setting (email safety net Step 2, held until the Playbook testing ends).
- Anything else that ships in Admin: see the master list in `io_project_tracking.md`.

Note: this repository is public; the guide contains no secrets.
