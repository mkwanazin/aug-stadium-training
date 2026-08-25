# Story 2 — The records that failed, and what was wrong with each

**Slug:** `story-2-failing-records`
**Route:** `/files/[logId]/diagnose`
**Target file:** `web/src/app/(app)/files/[logId]/diagnose/page.tsx`
**Page action:** `modify_existing`
**Roles:** Importer
**Requirement IDs:** R2, R3, R7, R8, NFR-diag-1, NFR-diag-3
**Infrastructure only:** false

## Plain summary

The Importer sees each record that failed validation in a table whose columns, labels and alignment
come from the field definitions returned for that particular file — never a fixed set — with a count
above it. Selecting a row opens a panel showing every field that record carried, with the offending
values picked out and a closing sentence naming exactly what was wrong. Account numbers stay masked
throughout.

## Summary

Adds the failing-records table and its selected-record detail panel. Columns come from
`GET /v1/files/validation-errors/columns` (`FileValidationErrorColumnGetList` → `ColumnList`),
honouring each `ColumnDefinition`'s `Name`, `HeaderText`, `Visible`, `CellAlignment` and
`CellDisplay`. Rows come from `GET /v1/files/validation-errors`
(`FileValidationErrorGetList` → `ValidationErrors`).

**Two contract details that are easy to get wrong.** `ValidationErrors.JsonArray` is a
**JSON-encoded string** the client must parse — not an array already. And the column set is
per-file: two files under different file settings legitimately render different columns, so nothing
may be fixed at build time (NFR-diag-1).

Row selection tints the row and draws the brand-primary inset rail; the panel below shows every
field the record carried in the design's eyebrow-labelled grid, with `Produced by <producer>`
right-aligned, offending values in the error colour, and a closing fault sentence. Account numbers
render pre-masked with **no reveal control anywhere on this screen** — reveal is an Approver-only
affordance belonging to `file-review-and-decisions` (NFR-diag-3). Apply the loading-timing
convention owned by `received-files` to the fetch; confirm that helper's path at BUILD.

## Acceptance criteria

| ID | Criterion | Coverage |
|---|---|---|
| AC-1 | The table's columns, their labels, their alignment and how each cell is displayed all come from the field definitions returned for the file being looked at, so two files under different settings can legitimately show different columns. | vitest |
| AC-2 | A count above the table states how many records failed. | vitest |
| AC-3 | Selecting a row marks it as chosen and opens a panel below it showing every field that record carried, together with what produced it. | vitest |
| AC-4 | In that panel the values which caused the failure are picked out from the rest, and a closing sentence names what was wrong with the record. | vitest |
| AC-5 | Account numbers appear masked wherever they are shown, and this screen offers no way to reveal them. | vitest |
| AC-6 | The table and its row selection can be operated with the keyboard alone. | playwright |

**Plus 2 technical checks the agents verify automatically** — that the validation-errors payload is
parsed from its JSON-encoded string form rather than consumed as an array, and that a column marked
not-visible in the definitions is genuinely absent rather than merely hidden by styling.

## Resolved design choices

- **The offending-value markers and the "what failed" sentence are expected from the service, with a
  graceful fallback when absent.** The spec's example `ValidationErrors.JsonArray` carries only each
  record's own fields plus `ChangeType` / `ChangedBy` / `ChangedAt` — no per-field error flag and no
  human-readable fault sentence — yet the design shows both. The user chose to **expect the service
  to supply them** and, where it does not, to show the record without the highlight and say plainly
  that no per-field detail was returned. The rejected alternative was deriving the fault client-side
  by comparing values against the column definitions' `CellDisplay`, which always produces a
  sentence but can be confidently wrong. **Do not derive and present a fault sentence as if it came
  from the system.** See this epic's second unverified assumption.

## Manual test checklist

- Open a faulted file that produced failing records → you see a table of them with a count above it
- Compare two faulted files under different file settings → the columns and labels differ, each following its own file's definitions
- Click a failing row → it is marked as chosen and a panel opens below with every field that record carried
- Read the panel → the values that caused the failure stand out, and a closing line says what was wrong
- Look at any account number → it is masked, and there is no control anywhere to reveal it
- Select rows using only the keyboard → you can move through them and choose one without a mouse
