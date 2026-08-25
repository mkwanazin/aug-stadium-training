# Story 1 — The Received files listing

**Slug:** `story-1-received-files-listing`
**Route:** `/files`
**Target file:** `web/src/app/(app)/files/page.tsx`
**Page action:** `create_new`
**Roles:** Importer, Approver
**Requirement IDs:** R1, R3, R10, R12, R18, R19, BR1, BR2
**Infrastructure only:** false

## Plain summary

After signing in, the user lands on Received files and sees every file that has come in — its name, its
file setting, when it was processed, how many records it holds, what it last did, and its current standing
shown as a coloured badge with the standing written on it. Each row carries an action that follows the
file's standing — Diagnose for a file that has faulted, Review for one awaiting a decision, Open for the
rest. Whatever a person's role does not allow them to do is simply not on the screen for them, rather than
shown and then refused. A footnote states how long imported data and its fault records stay visible.

## Summary

Creates the Received files screen at `/files` inside the **inherited** `(app)` route group — the sidebar,
signed-in block, `Sign out` and light/dark switch all come from `sign-in-and-session` story 2 and are not
rebuilt here; this story adds the content pane and its own nav-highlight state. Fetches
`GET /v1/file-logs` with the endpoint's **required** `IsActive` query parameter and renders the design's
column set through a composed Shadcn `table`, with `RecordCount` coerced for display, right-aligned and
thousands-separated. Introduces the reusable standing badge and the per-row action resolver, **both of
which sit behind a single standing-resolution module** whose rule is settled in Resolved design choices
below — the live service returns the workflow engine's six statuses, **not** the design's eight standings,
so the mapping must be an explicit, isolated, testable function with a defined fallback rather than a
lookup table sprinkled through the table markup. Row selection uses the design's tinted background and
brand-primary inset rail. The design's Approver-only `Uploaded by` column is **not built** — see Resolved
design choices. BR2's "omitted, never shown-then-refused" rule is carried instead by the header
`Upload a file` action, which the shell's role helper hides outright for an Approver.

**This story consumes the shared surface; it does not introduce one.** Do not create a `layout.tsx` or a
route group here.

## Acceptance criteria

| ID | Criterion | Coverage |
|---|---|---|
| AC-1 | The listing shows each received file with its file name, file setting, process date, record count, last activity and standing. | vitest |
| AC-2 | A file's standing appears as a badge pairing its colour with the standing written out, following the standing rule settled at approval — settled green, faulted red, awaiting amber, in-progress blue, cancelled grey — and a value that rule does not recognise gets a neutral badge showing the value rather than a blank or a silently-grey cell. | vitest |
| AC-3 | A role-gated affordance is absent from the screen entirely for a person whose role does not permit it, rather than shown and then refused — an Importer sees the Upload a file action, an Approver does not. | vitest |
| AC-4 | A row's action follows the file's standing — Diagnose when the file has faulted, Review when it is awaiting a decision, Open otherwise — and using it takes the user to that file's destination; clicking anywhere on a row selects it. | playwright |
| AC-5 | The listing carries a footnote stating how long imported transaction data and its fault records stay visible in the application. | vitest |
| AC-6 | While signed out, typing the received-files address straight into the address bar lands on sign-in rather than the listing. | playwright |

**Plus 3 technical checks the agents verify automatically** — that the required active-files parameter is
sent on every request; that record counts are formatted with thousands separators and right-aligned; and
that the standing resolution function is exercised directly across the engine's six statuses plus `End` and
an unknown value, so the fallback is proven rather than assumed.

## Resolved design choices

- **The standing shown is not the value the service returns verbatim.** A live probe of the file service
  returned `CurrentStatus="Finished"` with `LastExecutedActivityName="End"` for the only file in the system.
  `CurrentStatus` carries the workflow engine's six seeded statuses — `Idle`, `Running`, `Finished`,
  `Suspended`, `Faulted`, `Cancelled` (source: `linx_processautomation_reporting.Statuses`) — of which only
  `Faulted` and `Cancelled` appear among the design's eight standings. Rendering the raw value would give
  every normally-completed file an unrecognised badge, and would mean the `Review` action never appears on
  any row because `Validated` is never a status the service reports.
  **The user chose:** work the standing out from the step the file last completed
  (`LastExecutedActivityName`), named in the design's words — `RegisterFile`→Registered,
  `ValidateFileDuplicate`→Duplicate-checked, `Import`→Imported, `Transform`→Transformed,
  `Validate`→Validated, `Load`→Landed — with an engine status of `Faulted` or `Cancelled` overriding that,
  and anything unrecognised (including `End`) shown plainly as it comes on a neutral badge.
  **Consequences to build to:** (i) the standing is produced by ONE named resolution function — put it at
  `web/src/lib/file-logs/standing.ts`, not inline in the table; (ii) that function has an explicit fallback,
  and AC-2's second clause tests it; (iii) story 2's `Standing` filter options and its awaiting-a-decision
  count both consume the same function — three call sites, one rule.
- **`Uploaded by` is omitted for now.** The file service has no field naming who uploaded a file and no
  lookup endpoint exists that would supply one. The user chose to leave the column out until the backend
  exposes the field. BR2 keeps its anchor through AC-3 via the header `Upload a file` action, which stays
  role-gated (Importer-only). This overrides the design's column list.
- **The 90-day retention footnote is shown exactly as designed.**

## Manual test checklist

- Sign in → you land on Received files and see the files listed with name, setting, process date, records, last activity and standing
- Look at the Standing column → each badge shows a colour and the standing spelled out, never colour alone
- Check a file whose standing the app does not recognise → it shows a plain neutral badge with the value on it, not a blank cell
- Sign in as an Importer → the Upload a file action is on the header; sign in as an Approver → it is not there at all, not greyed out
- Find a file that has faulted → its action reads Diagnose; a file awaiting a decision reads Review; any other file reads Open
- Click a row → the row is visibly selected with a tint and a coloured rail down its left edge
- Read the footnote under the listing → it states how long imported data and its fault records stay visible
- Sign out, then type the received-files address directly → you are sent to sign-in, not the listing
