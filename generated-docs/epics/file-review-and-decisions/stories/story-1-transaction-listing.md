# Story 1 — The file's transactions, listed

**Slug:** `story-1-transaction-listing`
**Route:** `/files/[logId]/review`
**Target file:** `web/src/app/(app)/files/[logId]/review/page.tsx`
**Page action:** `create_new`
**Roles:** Importer, Approver
**Requirement IDs:** R1, R2, R4, R12, R14, R18, R19, BR2, BR8, BR9, BR10, BR11, BR13, FNFR2
**Infrastructure only:** false

## Plain summary

Opening a file that is awaiting a decision shows the file's own details at the top — its setting,
when it was processed, how many records it holds, what it last did — and beneath them every
transaction the file carries: reference, date, account number, description, amount, type and its
current standing. Dates read in South African time and amounts read in rands to two decimals.
The transactions can be ordered by any column and paged through. A file that holds no
transactions says so and names itself; a file whose transactions cannot be fetched says that
too, and still shows the file's own standing.

## Summary

Creates the File review screen at `/files/[logId]/review` inside the **inherited** `(app)` layout
from `sign-in-and-session` — sidebar, role-gated nav, signed-in block, `Sign out`, light/dark
switch, session check and `RoleGuard` all come from there and are not rebuilt. Renders the header
band (breadcrumb `Imports / <file name>`, file name, standing badge), the `Ready to review` info
alert, the hairline meta grid, and the transactions table.

**Reads two sources.** File-level context comes from the file-log data `received-files` already
fetches; the transactions come from `GET /v1/transactions`, which **takes no query parameters at
all and returns every transaction in the system** — so the response is filtered to this file by
`FileLogId` on the client. That filter is the whole listing, so it is a named function, not an
inline `.filter()` in the component.

**Reuses `received-files`' shared components rather than rebuilding them:** the composed Shadcn
`table`, the listing-agnostic sortable column header and pager (built shared in that epic's story
3 explicitly "for File review's tabs, Processing history and Import activity to reuse"), the
loading ladder and failed-retrieval pattern from its story 4, and the standing badge. Formatting
helpers go in `web/src/lib/format/` beside the existing `datetime.ts`, never inline in components.

**This story consumes the shared surface; it does not introduce one.** Do not create a
`layout.tsx` or a route group here. The `Processing history` and `Failed records` tabs are
navigation to sibling routes, not panels — see Resolved design choices.

## Acceptance criteria

| ID | Criterion | Coverage |
|---|---|---|
| AC-1 | The review screen names the file with its standing, summarises the file above the table, and lists every transaction the file carries with its reference, description, amount, type and standing. | vitest |
| AC-2 | Every transaction date reads as South African time and every amount reads to two decimal places with its currency, whatever time zone or locale the viewer's own machine is set to. | vitest |
| AC-3 | Ordering by a column and changing the rows-per-page reorder and repaginate the transactions, with the record count line and the page indicator agreeing with what is on screen. | playwright |
| AC-4 | A file that carries no transactions names the file, says it holds no records, and offers the way back to the files listing. | vitest |
| AC-5 | A failed retrieval says the transactions could not be fetched, still shows the file's own standing, and offers to request them again. | vitest |
| AC-6 | The transaction listing meets the accessibility baseline and renders a thousand records inside the performance budget. | playwright |

**Plus 5 technical checks the agents verify automatically** — that the listing is filtered to this
file's own transactions rather than showing the whole system's; that the file's standing comes from
the shared standing-resolution function and not the raw service status; that a transaction whose
reference is missing is still listed rather than silently dropped (BR13); that an amount carrying
more than two decimal places is surfaced rather than quietly rounded away (BR9); and that the
currency and transaction type render from the values the service returns rather than a hard-coded
`R` and a hard-coded `Credit`/`Debit` pair (BR10, BR11).

## Resolved design choices

- **The design's three tabs are three routes, so the tab bar is navigation.** The design draws
  `Transactions`, `Processing history` and `Failed records` as tabs on one screen. But
  `faulted-file-diagnosis` is already parked as its own route (`/files/[logId]/diagnose`), and
  `processing-history` will be another. Building a Shadcn `tabs` panel would mean panels that can
  never hold anything. **Built instead as a link-styled tab bar** across sibling routes:
  `Transactions` is this screen and is current; `Failed records` links to the diagnosis route;
  `Processing history` is present but inert until epic 6 lands it. This keeps the design's visual
  intent and the route split that is already on `main`.
- **The route is `/files/[logId]/review`.** Neither `received-files` nor `faulted-file-diagnosis`
  fixed this name — `received-files` story 1's `Review` row action goes to "that file's
  destination". This story defines it, symmetrical with the parked `/files/[logId]/diagnose`.
- **`Uploaded by` is not in the meta grid — decided here, not inherited.** `received-files` dropped
  the equivalent listing column but its recorded decision says "the review screen's meta-grid entry
  is unaffected", so it left this cell open on purpose. **The user chose:** omit it, for the same
  reason and on the same evidence — `FileLog` carries no property naming who uploaded a file and no
  lookup endpoint supplies one, so there is nothing to render, and a cell shown empty or filled
  with a placeholder is worse than a cell that is not there. This overrides the design's meta-grid
  order, which places it third for the Approver. The remaining cells are built as designed:
  `File setting`, `Process date`, `Records`, `Last activity`, `Direction`, `Log identifier`.
  Revisit if the backend adds the field.
- **The standing badge comes from the shared resolution function** at
  `web/src/lib/file-logs/standing.ts`, never from `CurrentStatus` directly — the live service
  returns workflow-engine statuses and `Validated` is derived from the last completed step. The
  "is this file reviewable" gate on this screen calls the same function; there is one rule.

## Manual test checklist

- Open a file awaiting a decision from the files listing → you land on its review screen with the file name and its standing at the top
- Read the row of details above the table → file setting, process date, records, last activity, direction and log identifier are all there
- Look at a transaction date → it reads in South African time, with the "Times in South African time (GMT+2)" note above the table
- Look at an amount → it reads like `R 18 450.00`, to two decimals
- Click a column heading → the transactions reorder; change `Rows` to 5 → the table repaginates and the count line agrees with what you can see
- Open a file that holds no transactions → the screen names that file and says it carries no records
- Stop the backend and reload → the screen says the transactions could not be retrieved, still shows the file's own standing, and offers to try again
