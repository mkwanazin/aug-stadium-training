# Story 1 — The import activity report

**Slug:** `story-1-import-activity-report`
**Route:** `/import-activity`
**Target file:** `web/src/app/(app)/import-activity/page.tsx`
**Page action:** `create_new`
**Roles:** Importer, Approver
**Requirement IDs:** R2, R4, R6, BR2, BR4, BR6, BR7, NFR-1
**Infrastructure only:** false

## Plain summary

An Importer or an Approver opens Import activity and sees how many files were imported, approved
and rejected this month across every file setting — three headline counts, a breakdown of the same
three numbers per file setting with a total that agrees with them, and a line naming the period in
South African time. Where no files exist at all, the report says so and offers the upload action
instead.

## Summary

Creates the Import activity screen inside the **inherited** `(app)` route group — the sidebar, brand
lockup, signed-in block and `Sign out` all come from `sign-in-and-session` story 2 and are not
rebuilt here. The sidebar entry already exists in `NAV_GROUPS`
(`{ label: 'Import activity', href: '/import-activity', permission: 'imports.report' }`), so no nav
change is made.

There is **no aggregation endpoint anywhere in the API**, so every number on this screen is derived
in the browser. The page fetches the file log twice — `GET /transactions-api/v1/file-logs?IsActive=Yes`
and `…?IsActive=No` (the parameter is `required`, so there is no single "give me everything" call)
— merges the two by `Id`, and fetches `GET /transactions-api/v1/transactions` once. Both lists are
fetched **once on mount and held**; story 2's filters re-aggregate that held data in memory rather
than re-fetching, which is what keeps the recount inside NFR-1's budget despite the doubled fetch.

File bucketing per BR6: group transactions by `FileLogId`; a file counts as *approved* only when
every transaction on it is `Approved`, as *rejected* as soon as one is `Rejected`, and otherwise
counts only toward *imported*. Renders the three metric tiles with their digest sub-lines, the
`By file setting` table grouped on `SettingName` with a `Total` footer row summed from the same
rows (never fetched separately), and the right-aligned period line built from `SAST_TIME_ZONE` in
`web/src/lib/format/datetime.ts`. Defaults to `This month` / `All settings`. Empty state #12 and a
`StatusBanner` error state with retry cover the non-happy paths.

**This story consumes the shared surface; it does not introduce one.** Do not create a `layout.tsx`
or a route group here.

## Acceptance criteria

| ID | Criterion | Coverage |
|---|---|---|
| AC-1 | On opening Import activity, the three counts — files imported, files approved and files rejected — are shown for this month across all file settings, each with the line saying what it counts. | vitest |
| AC-2 | The `By file setting` breakdown lists one row per file setting with its imported, approved and rejected counts, and a `Total` row whose three figures match the three headline counts. | vitest |
| AC-3 | The period line names the range the counts cover, read in South African time. | vitest |
| AC-4 | Where no files exist in any standing, the report replaces the counts and the breakdown with `No files exist in any standing` and offers `Upload a file`. | vitest |
| AC-5 | While the counts are being fetched the report shows a loading state; if the fetch fails it explains the failure and offers a retry rather than showing zeroes. | vitest |
| AC-6 | An Importer and an Approver both reach the report from the menu and see the same counts. | playwright |

**Plus 4 technical checks the agents verify automatically** — that the file log is fetched for both
`IsActive=Yes` and `IsActive=No` and the two merged without double-counting a file present in both
responses; that the approved/rejected bucketing follows BR6 rather than reading a file-level status
that does not exist; that the `Total` row is summed from the rendered rows rather than fetched
separately; and that a failure of either list surfaces as the error state rather than a partial count.

## Resolved design choices

- **The counts cover both files still in use and retired ones.** `IsActive` is a *required* query
  parameter on the file-log listing, so "every file in any standing" cannot be asked for in one
  call. The user chose completeness over cost: fetch both and merge, rather than counting only
  active files. **Consequence to build to:** two file-log requests on mount, merged by `Id` before
  any counting; the doubled payload is absorbed by fetching once and re-aggregating in memory on
  every later filter change.
- **Deferred action for BUILD.** Per the approval pattern, a design choice is also recorded in the
  digest's **Your Decisions** section. That edit was deliberately *not* made during planning: the
  digest is a shared evolving artifact whose changes must ride the build branch, and both
  `sign-in-and-session` and a concurrently-planned epic have unmerged edits to the same file.
  Add the Your Decisions bullets when this epic is built.

## Manual test checklist

- Sign in as an Approver and choose Import activity from the menu → you land on the report with This month already chosen
- Read the three tiles → each shows a number and a line saying what it counts
- Read the By file setting table → each setting has its own row, and the Total row's three numbers match the three tiles
- Check the period line on the right → it names the date range in South African time
- Stop the transactions service and reload → you get an explanation and a retry, not a screen of zeroes
- Sign in as an Importer and open Import activity → you see the same report
