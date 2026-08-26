# Story 1 — Why the file faulted

**Slug:** `story-1-why-the-file-faulted`
**Route:** `/files/[logId]/diagnose`
**Target file:** `web/src/app/(app)/files/[logId]/diagnose/page.tsx`
**Page action:** `create_new`
**Roles:** Importer
**Requirement IDs:** R1, R6, R11, R12, BR4, BR5, BR7, BR8, NFR-diag-2, NFR-diag-4
**Infrastructure only:** false

## Plain summary

Arriving from a faulted row in Received files, the Importer sees the file named with its Faulted
badge, a banner saying which step failed, how many records could not be read, the recorded fault
message and when it was logged, and a plain statement that nothing has reached the permanent
record. A summary grid names the setting, the process date, the record count and the failing step.
When the run faulted before any record was staged, the screen says so instead of showing an empty
table.

## Summary

Creates the diagnosis screen at `/files/[logId]/diagnose` inside the **inherited** `(app)` layout
from `sign-in-and-session` — sidebar, role-gated nav, signed-in block, `Sign out`, light/dark
switch, session check and `RoleGuard` all come from there and are not rebuilt. Renders the header
band (breadcrumb `Imports / <file name>`, page title, `Faulted` badge), the full-width error banner,
and the five-cell meta grid (`File setting`, `Process date`, `Records`, `Failing step` bold in the
error colour, `Bulk error file` when one exists) from `GET /v1/files/{LogId}`-class file-log data
plus `GET /v1/file-process-logs/{LogId}` for the failing step. Also owns the *no failing records
were produced* variant and the `Processing history` navigation link (the timeline itself is a later
epic). Importer-only via the inherited guard.

**This story consumes the shared surface; it does not introduce one.** Do not create a `layout.tsx`
or a route group.

**BR4/BR5/BR7/BR8** are satisfied by faithfully presenting what the backend recorded — a faulted run
is durable and retrievable, the disposition applies to the whole file, and nothing was imported.
This screen asserts none of that itself; it reports it. **BR1/BR2/BR3 have no surface here** —
validation-before-landing and the backend's own remediation-and-re-entry-at-transform behaviour are
run mechanics with no control on this screen, consistent with the settled no-retry decision.

## Acceptance criteria

| ID | Criterion | Coverage |
|---|---|---|
| AC-1 | The screen names the file with its Faulted standing and states which step failed, how many of the file's records could not be read, and that nothing from the file has reached the permanent record. | vitest |
| AC-2 | The recorded fault message is shown with the time it was logged; where no such message was recorded, the screen states the failing step alone rather than leaving a gap. | vitest |
| AC-3 | The summary grid names the file setting, the process date, the record count and the failing step, with the failing step marked out from the rest. | vitest |
| AC-4 | A run that faulted before any record was staged shows a stated absence in place of the records table, together with the recorded fault message, so the screen still explains itself. | vitest |
| AC-5 | The Processing history link takes the Importer to that file's step timeline. | playwright |
| AC-6 | The screen can be read and operated with the keyboard alone and passes an accessibility scan. | playwright |

**Plus 2 technical checks the agents verify automatically** — that the failing step is read from the
process-log data rather than inferred from the standing, and that a non-Importer reaching the route
is handled by the inherited guard rather than a bespoke branch.

## Resolved design choices

- **The recorded fault message is read from the failing processing step, degrading to the step name
  alone when absent.** Neither `FileLog` nor `FileProcessLog` in
  `documentation/Transaction_Management_API.yaml` declares a fault-message property, yet the design's
  banner shows a specific sentence with a logged timestamp. The user chose to source it from a note
  on the failing `FileProcessLog` step, and — critically — to **state the failing step alone when no
  message is present** rather than fabricate one or leave a gap. Confirm the real source with the
  backend before wiring; see this epic's first unverified assumption.

## Manual test checklist

- Click Diagnose on a faulted row in Received files → you land on that file's diagnosis screen, named, with a Faulted badge
- Read the banner → it names the step that failed, how many records could not be read, and says nothing has reached the permanent record
- Look for the recorded fault → the message appears with the time it was logged
- Read the summary grid → file setting, process date, records and failing step are all there, with the failing step standing out
- Open a file that faulted before any record was staged → you see a plain statement that no failing records were produced, not an empty table
- Click Processing history → you arrive at the step timeline for this file
- Tab through the screen using only the keyboard → every control is reachable and clearly focused
