# Story 3 — Retrieve the data file and the original file

**Slug:** `story-3-retrieve-the-data-and-original-files`
**Route:** `/files/[logId]/history`
**Target file:** `web/src/app/(app)/files/[logId]/history/page.tsx`
**Page action:** `modify_existing`
**Roles:** Importer, Approver
**Requirement IDs:** R2, R3, R5, BR1, FNFR1
**Infrastructure only:** false

## Plain summary

From the file's Processing history the user can retrieve two plainly different things — the data
file recorded against the file log entry, and the file exactly as it was received, kept so the run
can be repeated from the original. Each is its own labelled action rather than one ambiguous button,
each downloaded file arrives named after the file it belongs to, and while a retrieval is under way
its control shows it is working and cannot be started twice. A retrieval that fails says what
failed and offers a retry rather than leaving the screen stalled.

## Summary

Adds the two retrieval affordances **the design never placed** — see the resolved design choice
below. The Processing history artboard exposes only the `File` selector and `Back to the file`, and
the File review header's `Download data` button has no described behaviour anywhere in the digest.

- `GET /v1/file-logs/data?LogId=<id>` streams the data file recorded against the file log entry
  (R2/R5).
- `GET /v1/files/download?FileLogId=<id>` streams the file as originally received, retained per BR1
  so the run can be repeated from it (R3).

Note the two endpoints take **differently-named parameters for the same id** (`LogId` versus
`FileLogId`), and both return `application/octet-stream`, **not JSON** — never parse either
response as JSON.

**Extract one download helper** under `web/src/lib/api/` rather than a third copy of this pattern:
`faulted-file-diagnosis` story 3 streams `GET /v1/files/bulk-errors/download?FileLogId=` the same
way, and `import-activity-and-export` will be the fourth caller. Go through
`web/src/lib/api/client.ts` — never a bare `fetch()` in a component.

Per FNFR1 both retrievals must carry files up to the design's 20 MB upload ceiling and surface a
**user-visible, retryable** error on failure through the inherited
`web/src/components/feedback/StatusBanner.tsx` / feedback surface (NFR-base-5) rather than a silent
or generic failure. Neither may block the rest of the screen — the timeline stays readable while a
retrieval runs or fails. A 401 routes through the inherited session handling, not the retrieval's
own error state.

**This story consumes the shared surface; it does not introduce one.** Do not create a `layout.tsx`
or a route group.

**BR1** is satisfied by faithfully offering what the backend retained — the original file is kept so
the run can be repeated from it. This screen does not repeat the run itself; it hands over the file
that makes repeating possible.

## Acceptance criteria

| ID | Criterion | Coverage |
|---|---|---|
| AC-1 | The user can retrieve the data file recorded against the file, and the browser downloads it. | playwright |
| AC-2 | The user can separately retrieve the file exactly as it was received, and the two retrievals are offered as distinctly labelled actions rather than one ambiguous control. | playwright |
| AC-3 | Each retrieved file arrives under the name of the file it belongs to, not a generic or blank name. | playwright |
| AC-4 | While a retrieval is under way its control shows it is working and the same retrieval cannot be started a second time. | vitest |
| AC-5 | A retrieval that fails states plainly what failed and offers a retry, and the rest of the screen stays readable and usable. | vitest |

**Plus 3 technical checks the agents verify automatically** — that the data-file request carries
`LogId` while the original-file request carries `FileLogId`, against two different endpoints; that
both responses are handled as binary streams and never parsed as JSON; and that a 401 routes
through the inherited session handling instead of rendering as a retrieval failure.

## Resolved design choices

- **Both retrievals live on the Processing history screen, as two separately labelled actions.**
  The design places no download control on this screen at all, and the File review header's
  `Download data` button carries no described behaviour anywhere in the digest — so the affordance
  had to be decided rather than translated. The user chose Processing history for both, keeping the
  data file and the original file as two distinct, plainly-named actions rather than one ambiguous
  button. File review is left untouched; its undescribed `Download data` button stays unused until
  `file-review-and-decisions` settles it.

## Manual test checklist

- On a file's Processing history, use the action for the data file → the data file downloads
- Use the action for the file as it was received → the original file downloads, and the two actions are clearly different things
- Check your downloads folder → each file is named after the file it belongs to, not something generic
- Press a retrieval action and watch the control → it shows it is working and cannot be pressed again while it runs
- Stop the backend and press a retrieval action → you see what failed with an action to try again, and the timeline is still readable
