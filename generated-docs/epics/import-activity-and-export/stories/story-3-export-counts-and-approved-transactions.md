# Story 3 — Handing the data out: the two exports

**Slug:** `story-3-export-counts-and-approved-transactions`
**Route:** `/import-activity`
**Target file:** `web/src/app/(app)/import-activity/page.tsx`
**Page action:** `modify_existing`
**Roles:** Importer, Approver (the counts export); Approver only (the finance export)
**Requirement IDs:** R1, R3, R5, R8, BR1, BR3, BR5, BR8, NFR-2
**Infrastructure only:** false

## Plain summary

The user downloads the counts as they currently stand, and an Approver hands approved transactions
to finance as a delimited file carrying exactly the seven agreed columns. Each export confirms
itself — naming the period, or how many files it covered. Where the chosen scope holds nothing
approved, no file is produced and the outcome names the empty scope instead of failing quietly.

## Summary

Adds `Export these counts` (ghost button with a download icon, right-aligned in the intro row) and
the `Hand approved data to finance` aside — the fixed 360px right-hand column of the design's
two-column grid — carrying the `Scope` select, the in-scope line, and the full-width primary
`Export approved transactions` button.

**No export endpoint exists in the API.** Both files are generated in the browser from data already
held: the counts export from story 1's aggregated tiles and breakdown rows, the finance export from
the transaction list filtered to `Status === 'Approved'` and then by the chosen scope. CSV is
hand-rolled to a `Blob` (no CSV library is installed and none is to be added) and handed to the user
via an object URL, with proper quoting/escaping for values carrying a delimiter, quote or newline.
Generation is yielded off the main thread's critical path so the report stays interactive (NFR-2).

The seven columns are exactly `Reference`, `TransactionDate`, `AccountNumber`, `Description`,
`Amount`, `TransactionType`, `Currency` — in that order, no more, no fewer (BR3). Values are taken
**verbatim** from the service: `TransactionType` and `Currency` are not remapped, and dates are
written at GMT+2. Account numbers are **unmasked** (BR5, confirmed at planning).

Role gating goes through `session.can(...)` — never a role-name comparison. This story adds a new
permission to the union and `GRANTS` in `web/src/lib/auth/permissions.ts`
(e.g. `'transactions.export': [ROLE_APPROVER]`); the existing `imports.report` already grants the
report and its counts export to both roles. An Importer does not see the aside at all, and the
breakdown table takes the full width in its place (BR8).

Confirmations use `useToast`; the empty-scope outcome renders state #11 in the aside rather than a
toast, since it persists until the user changes the scope.

## Acceptance criteria

| ID | Criterion | Coverage |
|---|---|---|
| AC-1 | `Export these counts` downloads a delimited file of the tiles and the breakdown as they currently stand, and confirms with a message naming the period covered. | playwright |
| AC-2 | `Export approved transactions` downloads a delimited file carrying only approved transactions, with exactly the seven columns named in the brief and no others, and confirms with a message naming how many files were covered. | playwright |
| AC-3 | Where the chosen scope holds nothing approved, no file is produced and the outcome names the empty scope and offers a way out. | vitest |
| AC-4 | The aside states how many approved files the chosen scope covers, and that line changes with the scope, the period and the file setting. | vitest |
| AC-5 | An Importer sees the report but not the finance export, while an Approver sees both. | vitest |
| AC-6 | Producing the finance export leaves the report usable rather than freezing it. | none |

**Plus 3 technical checks the agents verify automatically** — that a value containing the delimiter,
a quote or a newline is escaped so the file still parses into seven columns; that only
`Status === 'Approved'` rows reach the file, with no transaction from a scope the user did not
choose; and that the export permission is resolved through `session.can(...)` rather than a role-name
comparison, so an account holding both roles gets the union and an unrecognised role gets nothing.

## Resolved design choices

- **The finance export carries account numbers in the clear.** Inherited BR-11 obfuscates sensitive
  fields "wherever a transaction is shown to a reviewer"; the user confirmed the export is data
  handed to a downstream team to act on, not a reviewer presentation, so the masking rule does not
  reach it. This settles the brief's BR5 assumption. **Consequence to build to:** `AccountNumber`
  is written verbatim, and the produced file is itself sensitive material.
- **The `Approved and not yet exported` scope is not built.** Nothing in the transaction service
  records export state — no field, no endpoint that sets one — and the user chose to drop the option
  rather than approximate it in browser storage (which would not survive a different device, browser
  or session, and would give two Approvers different answers). **Consequence to build to:** `Scope`
  offers exactly two options — `Everything approved in this period` and `Approved on a single file…`.
  The third option from the design is not rendered.
- **An Importer does not see the finance export panel.** Hidden entirely rather than shown disabled,
  matching how the sidebar already withholds destinations a role cannot use. **Consequence to build
  to:** the breakdown table takes the full width when the aside is absent.
- **Deferred action for BUILD.** The digest's **Your Decisions** bullets for the three choices above
  are owed when this epic is built — see story 1's note for why they were not written at plan time.

## Manual test checklist

- As an Approver, click Export these counts → a file downloads and a message names the period it covers
- Open the downloaded counts file → it holds the same numbers you can see on screen
- Leave Scope on "Everything approved in this period" and click Export approved transactions → a file downloads and a message says how many files it covered
- Open that file → it has exactly seven columns: reference, transaction date, account number, description, amount, transaction type and currency
- Check the Scope select → it offers two options, not the three drawn in the design
- Narrow to a period and setting with nothing approved → the aside says no approved files are in scope, and the export produces no file and says why
- Sign in as an Importer and open Import activity → you see the report and the counts export, but no finance export panel
