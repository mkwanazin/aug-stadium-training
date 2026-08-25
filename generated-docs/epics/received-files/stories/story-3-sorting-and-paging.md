# Story 3 — Ordering and paging the listing

**Slug:** `story-3-sorting-and-paging`
**Route:** `/files`
**Target file:** `web/src/app/(app)/files/page.tsx`
**Page action:** `modify_existing`
**Roles:** Importer, Approver
**Requirement IDs:** R4, R5, R11, R20
**Infrastructure only:** false

## Plain summary

The user orders the listing by clicking any column heading — first click ascending, second descending, one
column at a time, and the choice sticks for the rest of the session. Underneath, Back and Next move through
the listing and a Rows chooser sets 5, 10, 20 or 50 per page, starting at 20; when everything fits on one
page the controls stay where they are but do nothing.

## Summary

Adds the reusable sortable column header and pager to `/files`, both operating client-side over the
filtered set (`GET /v1/file-logs` exposes no sort or paging parameters). Single-field sort, ascending then
descending, with the previously-sorted header's indicator returning to the neutral glyph and real `th`
semantics carrying `aria-sort`; the chosen field and direction persist for the session (`sessionStorage`,
keyed per listing so the four screens that later reuse this do not collide).

Comparators coerce deliberately: ordering by `Process date` parses the service's space-separated
`YYYY-MM-DD HH:mm:ss` form rather than assuming ISO-8601, and ordering by `Records` sorts the coerced
number, not the string. Pager is a composed Shadcn `pagination` plus a `Rows` select (5/10/20/50, default
20 per R4/UI-04 — the tie-breaker for the design's own page-size inconsistency), with the
`Showing 1-n of n records` and `Page x of y` copy, and controls present-but-disabled below one full page.
Carries the epic's accessibility scan and the icon-only-control labelling rule.

**Both the sortable header and the pager are shared components** for File review's tabs, Processing history
and Import activity to reuse — build them listing-agnostic, not local to `files/page.tsx`.

## Acceptance criteria

| ID | Criterion | Coverage |
|---|---|---|
| AC-1 | Clicking a column heading orders the whole listing by that column, ascending on the first click and descending on the next, and only one column orders the listing at a time. | playwright |
| AC-2 | The ordering the user chose is still in force after moving to another screen and coming back within the same session. | playwright |
| AC-3 | Back and Next move through the listing a page at a time, and choosing 5, 10, 20 or 50 rows repaginates it — 20 being what the listing starts on. | playwright |
| AC-4 | When the listing is smaller than one page, the page controls stay visible but cannot be used. | vitest |
| AC-5 | Any control shown as an icon on its own reveals a label on hover and on focus, and carries that same name for assistive technology. | vitest |
| AC-6 | The listing, with its ordering and page controls in place, meets the accessibility baseline. | playwright |

**Plus 3 technical checks the agents verify automatically** — that the ordering column is announced to
assistive technology and the others as orderable; that only one ordering field is ever active, with the
previous column's indicator returning to neutral; and that the process-date parser handles the service's
space-separated form without falling back to string ordering.

## Manual test checklist

- Click the File name heading → the listing orders A–Z; click it again → it orders Z–A
- Click a different heading → the listing reorders by that one and the previous heading's arrow goes back to neutral
- Order by Process date → the dates run in true date order, not alphabetically
- Order by Records, go to Upload a file, come back → the listing is still ordered by Records the way you left it
- Press Next and then Back → you move a page forward and a page back through the listing
- Change Rows to 5 → the listing shows five at a time and the page count changes; it starts on 20 when you first arrive
- Hover and then tab to any icon-only control → a label appears both times and reads the same
