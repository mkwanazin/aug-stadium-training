# Story 2 — Masked account numbers, revealed on the record

**Slug:** `story-2-masked-account-numbers`
**Route:** `/files/[logId]/review`
**Target file:** `web/src/app/(app)/files/[logId]/review/page.tsx`
**Page action:** `modify_existing`
**Roles:** Importer, Approver
**Requirement IDs:** R3, R13, BR3, BR12, FNFR3
**Infrastructure only:** false

## Plain summary

Account numbers never appear in full by default — every one shows as dots followed by its last
four digits, for everybody. An Approver who needs to see a full number can reveal one row at a
time, or every number on the page at once, and put them back again. Revealing tells them, in
words, that the reveal is recorded against their name. Anyone who does not hold the Approver role
has no reveal control at all.

## Summary

Adds masking and the reveal controls to the transaction listing. Masking is the default rendering
of the `AccountNumber` field wherever a transaction is presented on this screen — the table cell
and the tinted strip inside the rejection dialog — as `•••••• ` plus the last four digits, muted
and letter-spaced per the design.

Masking derives from the real `AccountNumber` value the service returns. The design does this by
slicing a full number already sitting in fixture data; that is a prototype shortcut, and the
digest names it as one. The masking function lives at `web/src/lib/format/account-number.ts` with
the other formatters, takes the grouped-digit form the service sends, and **masks anything it does
not recognise rather than falling through to the raw value** — the failure mode of a masking
function must be to over-mask, never to leak.

Reveal is a per-row eye/eye-slash toggle plus a header-level `Reveal account numbers` /
`Mask account numbers` covering the current page, both gated on the Approver role through the
inherited `RoleGuard`/permission helper — absent, not disabled, for anyone else, per the project's
"omitted, never shown-then-refused" rule. Revealing raises the design's toast through the existing
`components/toast/`. Reveal state is component state only: it is deliberately not persisted, so
leaving the screen re-masks everything.

## Acceptance criteria

| ID | Criterion | Coverage |
|---|---|---|
| AC-1 | Every account number on the screen is masked by default, showing no more than its last four digits, for every role including the Approver. | vitest |
| AC-2 | An Approver can reveal a single account number and put it back, and can reveal or re-mask every account number on the page in one action. | vitest |
| AC-3 | Revealing tells the person in words that the reveal is recorded against their name. | vitest |
| AC-4 | A person who does not hold the Approver role has no reveal control anywhere on the screen, and every account number stays masked for them. | vitest |
| AC-5 | The account number repeated inside the rejection dialog is masked there too and carries its own reveal. | vitest |
| AC-6 | Revealing does not outlive the screen — leaving the review and coming back shows every account number masked again. | playwright |

**Plus 3 technical checks the agents verify automatically** — that the mask is computed from the
value the service actually returns rather than a fixture; that the last four digits are taken from
the grouped-digit form the service sends without assuming a fixed overall length (BR12); and that
a value not matching the expected pattern is masked entirely rather than rendered raw.

## Resolved design choices

- **The reveal is announced to the person, but nothing records it.** The design's toast promises
  "the reveal is recorded against your name", and POPIA is an active compliance domain on this
  project — but the Transaction Management API exposes no operation that records a reveal against
  a user. The notice is built exactly as designed, because telling the person is itself worth
  having; the recording is not built, because there is nowhere to record it. **The copy therefore
  makes a promise the system does not yet keep** — carried on the epic's assumptions so it
  surfaces at the manual-test gate rather than shipping silently. One endpoint closes it.
- **The header toggle covers the current page, not the whole file.** The design's wording is
  page-scoped, and a file-wide reveal would unmask rows the person is not looking at.

## Manual test checklist

- Open a file for review → every account number shows as dots with only the last four digits
- Click the eye on one row → that number is shown in full; click it again → it goes back to masked
- Click `Reveal account numbers` in the header → every number on the page is shown and the button becomes `Mask account numbers`
- Read the message that appears when you reveal → it tells you the reveal is recorded against your name
- Open the reject dialog on a row → the account number is masked there too, with its own reveal
- Sign in as someone without the Approver role → there is no reveal control anywhere and every number stays masked
- Reveal some numbers, leave the screen and come back → everything is masked again
