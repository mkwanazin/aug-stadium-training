# Story 2 — Narrowing the report by period and file setting

**Slug:** `story-2-narrow-by-period-and-setting`
**Route:** `/import-activity`
**Target file:** `web/src/app/(app)/import-activity/page.tsx`
**Page action:** `modify_existing`
**Roles:** Importer, Approver
**Requirement IDs:** R7, BR4, NFR-1
**Infrastructure only:** false

## Plain summary

The user narrows the report to Today, This week, This month or Last 90 days, and to a single file
setting or all of them. The tiles, the breakdown, the total and the period line all move together,
and a period with nothing in it shows zeros rather than the last period's figures.

## Summary

Adds the wrapping filter row from the design — period chips (`Today`, `This week`, `This month`,
`Last 90 days`, the active one taking the tinted brand-primary treatment), a thin vertical divider,
and the `File setting` select — above the tiles built in story 1.

The two filters compose: period narrows on `FileLog.ProcessDate`, file setting on `SettingId`, and
both apply to the same single pass over the data story 1 already holds. **No refetch on a filter
change** — re-aggregation is in-memory over the held lists, which is what keeps the recount inside
NFR-1's budget (p95 ≤ 400ms at 10³ records) given the doubled file-log fetch.

Period boundaries are computed with native `Date` + `Intl` against `SAST_TIME_ZONE` (no date library
is installed and none is to be added); the period line re-renders from the same boundaries, so the
line and the counts can never disagree. The file-setting options come from
`GET /transactions-api/v1/file-settings` filtered to active settings, with `All settings` prepended
— **not** the five hard-coded names in the artboard, which are prototype fixtures. An empty result
renders zeroed tiles and an empty breakdown, never the previous selection's figures.

## Acceptance criteria

| ID | Criterion | Coverage |
|---|---|---|
| AC-1 | Choosing `Today`, `This week`, `This month` or `Last 90 days` recounts the tiles, the breakdown and the `Total` row over that period, and the period line changes to match. | playwright |
| AC-2 | Choosing a single file setting narrows the tiles and leaves the breakdown showing that setting only; `All settings` restores every row. | playwright |
| AC-3 | A period and a file setting chosen together apply as one narrowing, not one replacing the other. | vitest |
| AC-4 | The file-setting list offers `All settings` plus the settings actually in use, rather than a fixed list. | vitest |
| AC-5 | A period with no files in it shows zero counts and an empty breakdown, not the previous period's figures. | vitest |
| AC-6 | Narrowing recounts the report without a visible stall. | none |

**Plus 2 technical checks the agents verify automatically** — that a filter change re-aggregates the
already-fetched lists rather than issuing a new request, and that the period boundaries are computed
at GMT+2 rather than the viewer's local zone.

## Resolved design choices

None specific to this story. Story 1's active-and-retired decision governs the data these filters
narrow.

## Manual test checklist

- Click Today → the tiles and the table drop to today's numbers and the period line shows today's date with its times
- Click Last 90 days → the numbers grow and the period line spans about three months
- Choose Salary Payments from File setting → the tiles show only that setting and the table narrows to its single row
- Set it back to All settings → every setting's row comes back
- Choose Today and Vendor Payments together → the counts reflect both, not just one
- Pick a period you know has no files → you see zeros and an empty table, not the last period's numbers
