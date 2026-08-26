# Story 4 — Waiting for the listing, and listings that arrive incomplete

**Slug:** `story-4-loading-and-incomplete-listings`
**Route:** `/files`
**Target file:** `web/src/app/(app)/files/page.tsx`
**Page action:** `modify_existing`
**Roles:** Importer, Approver
**Requirement IDs:** R6, R15, R16, R17
**Infrastructure only:** false

## Plain summary

A listing that arrives quickly simply appears — no flicker of a placeholder. If it is slow, a placeholder
takes the table's place, and if it is slower still a message says it is still fetching and nothing has gone
wrong. If only some of the files could be fetched, the ones that arrived are shown with a note saying the
listing is incomplete and an action to request it again; if none could be fetched, the failure is stated
with the same way back.

## Summary

Adds the reusable loading ladder and the incomplete/failed-retrieval states to `/files`. Nothing renders
below 300 ms (so a fast response never flashes a placeholder), a shimmering skeleton in the table's grid
from 300 ms, and past 3 s the skeleton is joined by the states sheet's still-working copy.

Partial retrieval renders the records that did arrive above a warning note stating the listing is
incomplete — explicitly, not implied by a short list — with a "request the listing again" ghost action;
total failure renders the error note with the same retry, satisfying NFR-base-5. Reuse
`web/src/components/feedback/StatusBanner.tsx` in its warning tone rather than introducing a second banner.

Note the service **rejects a missing `IsActive` parameter with HTTP 400** and the message
"The IsActive field is required." — that path must surface through the failure state rather than as a
blank table. R17's p95 of 1.5 s to first readable listing is a measured budget verified by hand, not by an
automated assertion.

## Acceptance criteria

| ID | Criterion | Coverage |
|---|---|---|
| AC-1 | A listing that comes back quickly appears straight away, with no flash of a placeholder first. | playwright |
| AC-2 | A listing still being fetched past a short wait shows a placeholder in the table's place. | playwright |
| AC-3 | A listing still being fetched past a long wait shows the placeholder together with a message saying it is still fetching and nothing has gone wrong. | playwright |
| AC-4 | When only part of the listing could be fetched, the files that did arrive are shown above a note stating the listing is incomplete, with an action to request it again. | vitest |
| AC-5 | When the listing could not be fetched at all, the failure is stated with an action to try again, and trying again brings the listing back. | vitest |
| AC-6 | The first readable listing appears within a second and a half of arriving on the screen. | none |

**Plus 2 technical checks the agents verify automatically** — that no placeholder is rendered at all below
the 300 ms threshold, and that a rejected request carrying the service's own message surfaces that message
rather than a generic failure.

## Manual test checklist

- Open Received files on a normal connection → the listing appears within about a second and a half, with no placeholder flicker on the way
- Slow the connection and reload → a placeholder takes the table's place while it fetches
- Slow it further and reload → the placeholder is joined by a message saying it is still fetching and nothing has gone wrong
- With only part of the listing available → the files that arrived are shown and a note says plainly that the listing is incomplete
- Press the request-again action on that note → the listing is fetched afresh
- With the file service unavailable → you see what failed and an action to try again, not a blank table
