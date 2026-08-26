# Story 2 — Search, restrictions and the empty listings

**Slug:** `story-2-search-filters-and-empty-states`
**Route:** `/files`
**Target file:** `web/src/app/(app)/files/page.tsx`
**Page action:** `modify_existing`
**Roles:** Importer, Approver
**Requirement IDs:** R2, R7, R8, R9, R13, R14
**Infrastructure only:** false

## Plain summary

The user narrows the listing by typing a file name or setting into Search, by choosing a Standing or a File
setting, or by turning on Active files only — and the restrictions stack. A count line keeps saying how many
files are in view, how many await a decision and how many faulted. When no files have come in at all, the
listing says so and offers Upload a file; when restrictions have hidden everything, it shows which
restrictions are in force with a Clear all restrictions action and does not offer to upload.

## Summary

Adds the wrapping filter row to `/files` — the `Search` input (client-side, case-insensitive substring over
`CurrentFileName` and `SettingName`), the `Standing` select, the `File setting` select, and the
`Active files only` ghost toggle which drives the endpoint's required `IsActive` parameter (the literal `No`
is the only value that selects the inactive set). Restrictions combine as AND.

**Two source rules matter, and neither takes its options from the design.** The `File setting` select is
populated from the live file-settings lookup the `upload-a-file` epic already fetches — the design's five
names (`Salary Payments`, `Collections Batch`, `Vendor Payments`, `Debit Orders`, `Adjustments`) are
prototype fixture data and must **not** be hard-coded; the real service returns settings such as
`Transaction-Import`. The `Standing` select is populated from the standing vocabulary produced by story 1's
resolution function, not from the design's eight-value list, so the options always match what rows can
actually show. The awaiting-a-decision count in the count line consumes that same function.

Introduces the reusable count indicator (exact to 99, `99+` beyond, absent at zero) computed over the
restricted set, and the reusable empty-state pattern in its two distinct shapes from the design's states
sheet — the genuinely-empty listing with the `Upload a file` primary action (offered only to a viewer who
may upload), and the filtered-empty listing with restriction chips, `Clear all restrictions`, and no
creation action.

## Acceptance criteria

| ID | Criterion | Coverage |
|---|---|---|
| AC-1 | Typing in Search narrows the listing to files whose name or file setting matches what was typed, whatever the capitalisation. | playwright |
| AC-2 | The Standing and File setting choices offer only values the listing can actually contain, and choosing a Standing, choosing a File setting and turning on Active files only each narrow the listing further, applying together rather than replacing one another. | playwright |
| AC-3 | The count line reports the files in view, how many await a decision and how many faulted — exact up to 99, shown as 99+ beyond that, and absent when a count is zero. | vitest |
| AC-4 | When no files have been received at all, the listing names that absence and offers the upload action to a viewer who may upload. | vitest |
| AC-5 | When restrictions hide every file in a listing that is not itself empty, the restrictions in force are shown with a clear-all action and no upload action is offered; clearing them brings the listing back. | playwright |

**Plus 2 technical checks the agents verify automatically** — that the File setting options come from the
live lookup response rather than a hard-coded list, and that applying or lifting a restriction returns the
listing to its first page while leaving story 3's ordering in force.

## Manual test checklist

- Type part of a file name into Search → only files whose name or setting contains it remain, whatever case you type
- Open the File setting list → the settings are the ones your system actually holds, not the five names drawn in the design
- Open the Standing list → every option there is one you can actually see on a row
- Choose a Standing and then a File setting → the listing narrows on both at once, not just the last one you chose
- Turn on Active files only → files that are no longer active drop out; turn it off → they come back
- Watch the count line as you narrow → the file, awaiting-a-decision and faulted counts follow what is on screen
- Narrow until nothing matches → you see which restrictions are hiding everything and a Clear all restrictions action, with no Upload offered
