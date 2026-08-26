# Story 2 — The file's standing, its identifiers, and switching runs

**Slug:** `story-2-file-summary-and-run-selector`
**Route:** `/files/[logId]/history`
**Target file:** `web/src/app/(app)/files/[logId]/history/page.tsx`
**Page action:** `modify_existing`
**Roles:** Importer, Approver
**Requirement IDs:** R6, FNFR2
**Infrastructure only:** false

## Plain summary

Beside the timeline the screen names the file and lists what is on record for it — its log
identifier, its process definition, its process instance, the activity it last executed and how
many records it holds. Its current standing shows as a badge in the control row, and the same
standing, last activity, process date, record count, who acted on it and when it last changed are
visible to an Importer and to an Approver alike. Where the service does not supply one of those
values the screen says so plainly instead of leaving a gap. A File chooser at the top swaps the
whole screen to another run without leaving it, and a footnote states that all times are South
African time and that processing history stays visible for 90 days.

## Summary

Adds the design's control row and 340px aside to the screen story 1 created. Both are driven by the
**file log entry**, fetched from `GET /v1/file-logs` with the endpoint's **required** `IsActive`
query parameter and matched on `Id` — there is **no single-file-log endpoint** in
`documentation/Transaction_Management_API.yaml`, so the entry is located within the listing
response. That same response supplies the `File` selector's options, formatted
`<file name> — <file setting>` (min-width 320px), with no second fetch. One fetch, three consumers:
the aside, the audit-trail summary and the selector. A missing `IsActive` is rejected HTTP 400 with
`The IsActive field is required.` (established by `received-files` story 4).

The aside renders the eyebrow-labelled `Log identifier`, `Process definition`, `Process instance`,
`Last executed activity` and `Records`. The control-row standing badge **calls the shared
standing-resolution function** at `web/src/lib/file-logs/standing.ts` landed by `received-files`
story 1 — this is a further call site for that one rule, **never a second mapping table**.

Delivers R6's audit-trail summary — current standing, last executed activity, process date, record
count, acting user and change timestamp — to both roles with **no role branch**. `FileLog` carries
no acting-user and no change-timestamp property; build to the resolution recorded below, with an
explicit stated-absence fallback rather than a blank cell.

Selecting a different run re-fetches that run's steps and re-renders the aside and the summary line
in place, without leaving the screen. The footnote is verbatim from the digest: `All times are South
African time (GMT+2). Processing history stays visible for 90 days.` (FNFR2).

This story carries the epic's keyboard path and its single accessibility scan, now that the screen
is complete.

**This story consumes the shared surface; it does not introduce one.** Do not create a `layout.tsx`
or a route group.

## Acceptance criteria

| ID | Criterion | Coverage |
|---|---|---|
| AC-1 | Beside the timeline the screen names the file and lists its log identifier, its process definition, its process instance, the activity it last executed and its record count. | vitest |
| AC-2 | The file's current standing, last executed activity, process date, record count, acting user and change timestamp are all shown, and an Importer and an Approver see the same set. | vitest |
| AC-3 | Where the service supplies no value for one of those entries, the screen states its absence plainly rather than leaving a blank or an empty cell. | vitest |
| AC-4 | Choosing a different run in the File chooser swaps the timeline, the standing badge and the summary beside it to that run without leaving the screen. | playwright |
| AC-5 | A footnote states that all times are South African time and that processing history stays visible for 90 days. | vitest |
| AC-6 | The screen can be read and operated with the keyboard alone and passes an accessibility scan. | playwright |

**Plus 3 technical checks the agents verify automatically** — that the file-log entry is located by
id inside the required-`IsActive` listing response rather than through an endpoint that does not
exist; that the absent-value fallback is exercised directly for acting user and change timestamp;
and that the selector's options come from the same listing response rather than a duplicate fetch.

## Resolved design choices

- **The change timestamp is worked out from the last completed processing step; who acted is shown
  as plainly not recorded.** `FileLog` in `documentation/Transaction_Management_API.yaml` carries
  neither an acting-user nor a change-timestamp property — the same gap that kept `Uploaded by` off
  the Received files listing. The user chose to derive the change timestamp from the `EndDate` of
  the file's last completed `FileProcessLog` step and to **state the absence** of the acting user
  rather than omit the row or hold the whole summary back. Both stay in the summary so the row is
  ready when the backend supplies a value; confirm the real source with the backend (see this
  epic's unverified assumptions).

## Manual test checklist

- Look at the panel beside the timeline → it names the file and lists its log identifier, process definition, process instance, last activity and record count
- Check the summary values → standing, last activity, process date, records, who acted and when it last changed are all there
- Sign in as an Importer, then as an Approver → both see the same summary, with nothing hidden from either
- Find a value the service does not supply → the screen says plainly that it is not recorded, rather than showing a blank
- Pick the other run in the File chooser → the timeline, the standing badge and the panel all switch to that run without the page navigating away
- Read the footnote → it states South African time and the 90-day visibility
- Tab through the screen using only the keyboard → every control is reachable and clearly focused
