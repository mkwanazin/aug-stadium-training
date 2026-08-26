# Story 1 — The file's processing steps, in order

**Slug:** `story-1-processing-timeline`
**Route:** `/files/[logId]/history`
**Target file:** `web/src/app/(app)/files/[logId]/history/page.tsx`
**Page action:** `create_new`
**Roles:** Importer, Approver
**Requirement IDs:** R1, R4, FNFR3
**Infrastructure only:** false

## Plain summary

Arriving from a file in Received files — or from the Processing history link on a faulted file's
diagnosis screen — the user sees every recorded step of that file's run laid out in the order it
ran: Register, Duplicate check, Import, Transform, Validate, then Await decision, Land or Cancel.
Each step names the activity, its decision outcome, when it started and ended in South African
time, and how long it took. A step that has not finished reads as still running; a step that
faulted is marked out and its note reads in the error treatment. A line above the timeline says how
many steps were recorded and the span of the whole run, and Back to the file returns the user to
that file.

## Summary

Creates the Processing history screen at `/files/[logId]/history` inside the **inherited** `(app)`
layout from `sign-in-and-session` story 2 — sidebar, nav group with `Received files` active,
signed-in block, `Sign out`, light/dark switch, session check and `RoleGuard` all come from there
and are not rebuilt. Fetches `GET /v1/file-process-logs/{LogId}` and renders the design's vertical
timeline: a 26px rail with numbered filled nodes and a 2px thread (transparent on the last step)
beside cards carrying a 3px left border, node and border colour encoding outcome — success
completed, warning still running, error faulted.

Per-step **duration and the still-running state are derived client-side** from `StartDate`/`EndDate`:
`FileProcessLog` declares no `Duration` property, and a step with no `EndDate` renders `running`,
not a blank or a zero. Wire the API client against `FileProcessLogList.FileLog: FileProcessLog[]`
and **do not conflate it with the unrelated `FileLogList.FileLog: FileLog[]`** wrapper the listing
uses — same property name, different schema. Type these as two distinct schemas in
`web/src/types/` so the client cannot confuse them.

Timestamps parse the service's space-separated `YYYY-MM-DD HH:mm:ss` form via the process-date
parser landed by `received-files` story 3 rather than assuming ISO-8601, and render SAST throughout
(FNFR3). Reuses that epic's loading ladder (nothing below 300 ms, shimmering skeleton from 300 ms,
still-working copy past 3 s) and `web/src/components/feedback/StatusBanner.tsx` for the
retrieval-failed and no-steps states rather than introducing new ones.

`Back to the file` is **inert in the design** (it mutates local state only) and must be wired to
real navigation per the resolved design choice below. This story owns the epic's route creation;
stories 2 and 3 modify the same page.

**This story consumes the shared surface; it does not introduce one.** Do not create a `layout.tsx`
or a route group.

## Acceptance criteria

| ID | Criterion | Coverage |
|---|---|---|
| AC-1 | The timeline lists every recorded step of the run in the order it ran, each naming the activity, its decision outcome, and the times it started and ended in South African time. | vitest |
| AC-2 | Each step shows how long it took, and a step that has not ended yet reads as still running rather than as a blank or a zero. | vitest |
| AC-3 | A step that faulted is marked out from the completed and still-running steps, and its recorded note reads in the error treatment. | vitest |
| AC-4 | Above the timeline a summary line states how many steps were recorded and the span of the whole run. | vitest |
| AC-5 | Back to the file returns the user to that file's own surface — the diagnosis screen for a file that has faulted, and Received files for any other file. | playwright |
| AC-6 | While the steps are still being fetched a placeholder holds the timeline's place, and when they cannot be fetched — or none were recorded — the screen says so plainly with an action to try again. | vitest |

**Plus 3 technical checks the agents verify automatically** — that the step list is read from
`FileProcessLogList.FileLog` and not the identically-named listing wrapper; that duration and the
still-running state are computed from start/end rather than expected as a returned property; and
that the space-separated timestamp form parses without falling back to string handling.

## Resolved design choices

- **`Back to the file` sends a faulted file to its diagnosis screen and every other file to
  Received files.** The control is inert in the design, and its intended destination — the File
  review screen — belongs to `file-review-and-decisions`, which is not yet planned or built. The
  user chose to route by standing so every click lands somewhere real today, with the faulted path
  already permanently correct. When File review is built, the non-faulted branch changes to point
  at it; nothing else on this screen moves.

## Manual test checklist

- Click Open on a file in Received files → you land on that file's Processing history with its steps listed in order
- Read a step card → it names the activity, its decision, when it started and when it ended, and how long it took
- Find the step that has not finished → it reads as still running rather than showing a blank or a zero duration
- Open a file that faulted → the faulted step stands out from the others and its note reads in the error colour
- Read the line above the timeline → it states how many steps were recorded and the span of the run
- Click Back to the file → you return to that file's own surface
- Stop the backend and reload → you see what failed and an action to try again, not an empty timeline
