# Story 2 — Told plainly whether the file was accepted or refused

**Slug:** `story-2-upload-outcome`
**Route:** `/upload`
**Target file:** `web/src/app/(app)/upload/page.tsx`
**Page action:** `modify_existing`
**Roles:** Importer
**Requirement IDs:** R4, R6, R7, R8, BR1, BR3, FNFR-3
**Infrastructure only:** false

## Plain summary

When the Importer submits, the screen says what happened. An accepted file is confirmed by name
against the setting it was registered to, and the confirmation clears itself. A refusal states the
reason and stays until it is dealt with, keeping the chosen setting so a corrected file can go
straight in. The panel beside the form keeps a short list of what has recently been submitted and
where each file stands.

## Summary

Wires the real submission — `POST /v1/files/upload` with `FileSettingId`, `FileSettingName` and
`FileName` as query parameters and the file body as `application/octet-stream` — and maps its
`DefaultResponse` into the two outcome banners from the design. Acceptance is transient (clears
after four to eight seconds) and also raises the NT-01 in-app notice through the inherited feedback
surface; refusal is persistent and deliberately retains the chosen file setting. Adds the busy /
non-resubmittable state on `Submit for import` and a retryable error for a connection failure or
500, per NFR-base-5. Fills the "Recently submitted" aside from the file-log listing, with its own
empty and retrieval-failed states that must not block the form. Use the inherited API client
(`web/src/lib/api/client.ts`) — never a bare `fetch()` — and the inherited feedback components
rather than a hand-rolled toast.

**BR1 / BR3 are enforced server-side.** The duplicate check and its `FileHash` comparison happen in
the backend; this story's job is to surface whatever the service reports, not to reimplement a
duplicate check in the browser.

## Acceptance criteria

| ID | Criterion | Coverage |
|---|---|---|
| AC-1 | An accepted file is confirmed by name, naming the setting it was registered against, and the confirmation clears itself after a few seconds. | playwright |
| AC-2 | A refused file shows the reason it was refused, and that message stays on screen until the Importer dismisses it or submits again. | playwright |
| AC-3 | After a refusal the chosen file setting is still selected, so a corrected file can be submitted without choosing the setting again. | vitest |
| AC-4 | While a submission is in flight the submit control shows it is working and cannot be pressed twice; a lost connection or a server error gives a message that can be retried rather than leaving the screen stalled. | vitest |
| AC-5 | An accepted file also raises the in-app notice that it has been accepted and registered. | vitest |
| AC-6 | The panel beside the form lists the most recently submitted files with where each one stands, says so plainly when nothing has been submitted yet, and when that list cannot be fetched says so without stopping the Importer from uploading. | vitest |

**Plus 3 technical checks the agents verify automatically** — the request shape (three query
parameters plus an octet-stream body, not multipart), the accept-versus-refuse mapping read off
`DefaultResponse` rather than the HTTP status, and a 401 routed through the inherited session
handling rather than rendered as a refusal.

AC-1 and AC-2 are tagged `playwright` because the contrast between them is a *timing* behaviour —
the transient four-to-eight-second clear versus the persistent state — which needs `page.clock`.

## Resolved design choices

- **"Recently submitted" shows the five most recent files, newest first.** Neither the design nor
  the API spec states a count or a recency window, so this is a rule the user set. Sort by
  `ProcessDate` descending and take five.
- **Nothing routes the Importer onward; the acceptance notice is the whole promise.** The design's
  copy says "You will be told when it is ready to review", but no notification surface and no
  onward control was ever drawn — an open uncertainty in the design digest. The user chose to keep
  the promise modest: the in-app acceptance notice only, with the Importer looking in Received files
  themselves. Do **not** add a link from the confirmation to the new file. This keeps the epic's
  Out of Scope intact.

  > **Deferred action for BUILD.** Per the approval pattern, a choice that answers an open design
  > digest Uncertainty is also recorded in the digest's **Your Decisions** section. That edit was
  > deliberately *not* made during planning: the digest is a shared evolving artifact whose changes
  > must ride the build branch, and `sign-in-and-session` has unmerged edits to the same section —
  > writing from a plan worktree would have collided at its merge. Add the Your Decisions bullet
  > when this epic is built.

## Manual test checklist

- Submit a valid .csv against a setting → a confirmation names the file and the setting, then clears itself after a few seconds
- Watch the notice area when a file is accepted → you also get an in-app notice that it was registered
- Submit a file the system refuses → the reason stays on screen and does not disappear on its own
- After a refusal, look at the setting dropdown → your setting is still chosen, so you can pick a new file and go straight again
- Press Submit for import and watch the button → it shows it is working and cannot be pressed a second time
- Stop the backend and submit → you get a message you can retry, not a screen that hangs
- Look at the Recently submitted panel → it lists your recent files with a standing badge on each
