# Story 3 — Retrieve the error file, or cancel the run

**Slug:** `story-3-error-file-and-cancel`
**Route:** `/files/[logId]/diagnose`
**Target file:** `web/src/app/(app)/files/[logId]/diagnose/page.tsx`
**Page action:** `modify_existing`
**Roles:** Importer
**Requirement IDs:** R4, R5, R9, R10, R13, R14, R15, R16, BR6, NFR-diag-4
**Infrastructure only:** false

## Plain summary

When the run produced a bulk error file the Importer can retrieve it; when it did not, no such
control appears at all rather than one that fails when pressed. Cancel run asks for confirmation,
naming the file and spelling out that it is deactivated and removed from staging, that its failing
records stop being listable, that nothing from it reached the permanent record, and that this cannot
be undone. Confirming cancels the file and says so; declining changes nothing.

## Summary

Adds the action cluster and its two outcomes. `Bulk error file` streams
`GET /v1/files/bulk-errors/download?FileLogId=` as a download when one exists. **`HasBulkErrorFile`
is typed `string` in the spec, not boolean** — treat it as truthy/falsy string and render the control
only when it is genuinely present, never render-then-fail (R13, NFR-diag-4).

`Cancel run` opens the design's confirmation dialog — titled with the file name, stating that the
file is deactivated and removed from staging, that its failing records stop being listable, that
nothing reached the permanent record, and that it cannot be undone — with `Keep the file` (ghost,
visible focus ring) and `Cancel the file` (destructive). Confirming calls `DELETE /v1/files` with
`LogId` as a query parameter and `LastChangedUser` as a header, then reflects the file's new
`Cancelled` standing and raises the completion notice. BR6 holds because this screen only ever shows
`Faulted` files, which by definition have not landed.

The three notices (R14 run faulted, R15 failing records available, R16 cancellation complete) use the
project's shared feedback surface introduced by `sign-in-and-session` and first exercised by
`upload-a-file` story 2 — not a bespoke toast. **No notification design exists** for R14/R15
arriving asynchronously; if no project-wide pattern is settled when this epic builds, render them
through the shared surface and flag the result as a placeholder rather than inventing a new one.

## Acceptance criteria

| ID | Criterion | Coverage |
|---|---|---|
| AC-1 | Where a bulk error file exists for the run, the Importer can retrieve it. | playwright |
| AC-2 | Where no bulk error file exists, no retrieval control is shown at all — rather than one offered and then failing. | vitest |
| AC-3 | Cancel run asks for confirmation, naming the file and stating that it will be deactivated and removed from staging, that its failing records will stop being listable, that nothing from it reached the permanent record, and that this cannot be undone. | vitest |
| AC-4 | Confirming the cancellation cancels the file, tells the Importer it is done, and the file's standing becomes Cancelled. | playwright |
| AC-5 | Declining the confirmation leaves the file and the screen exactly as they were. | vitest |
| AC-6 | The Importer is told in-app when a run is logged as a fault, and when its failing records become available to inspect. | vitest |

**Plus 3 technical checks the agents verify automatically** — that `HasBulkErrorFile` is evaluated as
a string rather than a boolean, that the cancel request carries `LogId` as a query parameter and
`LastChangedUser` as a header, and that a failed cancel surfaces a retryable error rather than
silently leaving the dialog open.

## Resolved design choices

- **`Cancel run` keeps its label exactly as drawn on this screen.** The design digest flags that the
  review screen's `Cancel file` and this screen's `Cancel run` may be the same operation under two
  names, and that only this one has a confirmation designed. The user chose to build this screen's
  version as specified and leave reconciling the two labels to the review epic, rather than
  committing `file-review-and-decisions` to a naming decision it has not been planned for. Keep the
  dialog copy verbatim from the digest.

## Manual test checklist

- Open a faulted file that produced an error file → a retrieval control is offered, and using it downloads the file
- Open a faulted file that produced no error file → there is no retrieval control at all, not one that errors when pressed
- Click Cancel run → a confirmation names the file and spells out what cancelling does, and that it cannot be undone
- Choose "Keep the file" → nothing changes and you stay exactly where you were
- Choose "Cancel the file" → the file is cancelled, you are told so, and its standing reads Cancelled
- Watch for notices → you are told when a run faults, and when its failing records are ready to inspect
