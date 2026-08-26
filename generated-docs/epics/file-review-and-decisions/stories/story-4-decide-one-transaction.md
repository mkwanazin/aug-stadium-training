# Story 4 — Approve or reject one transaction

**Slug:** `story-4-decide-one-transaction`
**Route:** `/files/[logId]/review`
**Target file:** `web/src/app/(app)/files/[logId]/review/page.tsx`
**Page action:** `modify_existing`
**Roles:** Approver
**Requirement IDs:** R5, R6, R9, R11, R15, R17, R20, R21, R23, BR1, BR4, BR5, BR7, FNFR4
**Infrastructure only:** false

## Plain summary

An Approver settles transactions one at a time from the row. Approving takes effect straight away.
Rejecting asks why first, and will not go through without a reason — the reason is kept against
the transaction and shown under its description afterwards. Either way the app says what happened,
and the person who made the decision is on the record. A transaction that has already been settled
shows who settled it and when, in place of the buttons.

## Summary

Adds the per-row decision controls and their outcomes. `Approve` commits immediately with no
dialog; `Reject` opens the 460px dialog carrying the `Reason *` textarea (78px min-height,
vertically resizable, the design's placeholder and the hint naming where the reason ends up),
alongside the masked account number from story 2. An empty or whitespace-only reason turns the
textarea's border error-coloured, shows
`A reason is required before a rejection can be recorded.`, records nothing and **keeps what was
already typed**.

Calls `POST /v1/transactions/approve?TransactionId=…` and
`POST /v1/transactions/reject?TransactionId=…`, both wrapped by story 3's re-authentication gate.
The acting user rides the `LastChangedUser` header via the API client's **existing**
`APIRequestConfig.lastChangedUser` field — the client already builds that header, so it is never
hand-set. The rejection reason is sent as `UserNote` verbatim.

On success the row's standing badge changes, the decision cell is replaced by muted text naming
who settled it and when, a rejection's reason appears beneath the description prefixed `Reason: `,
the counts line above the table updates, and a toast confirms in the design's words. On failure the
failure is stated and **the standing is left exactly as it was** — no optimistic update that has to
be walked back. Controls appear only for the Approver and only while a transaction is still
awaiting a decision, so a settled transaction offers no way to change its mind.

## Acceptance criteria

| ID | Criterion | Coverage |
|---|---|---|
| AC-1 | An Approver approves a single transaction from its row, its standing becomes approved, and a message confirms it. | vitest |
| AC-2 | Rejecting asks for a reason first, and the reason is held against the transaction and shown beneath its description afterwards. | vitest |
| AC-3 | Confirming a rejection with the reason empty or only spaces says a reason is required, records nothing, and keeps what was already typed. | vitest |
| AC-4 | A settled transaction shows who settled it and when in place of its decision controls, and offers no way to change it. | vitest |
| AC-5 | A decision the service refuses says so plainly and leaves the transaction's standing exactly as it was. | vitest |
| AC-6 | Approving and rejecting from the row work end to end in the browser, each recorded against the person who made the decision. | playwright |

**Plus 3 technical checks the agents verify automatically** — that the acting user is carried
through the API client's own audit-header field rather than a hand-built header (BR4); that
decision controls are offered only while a transaction is still awaiting a decision, so a settled
one can never be re-decided (BR5); and that the rejection reason reaches the service as the
transaction's user note, unedited (BR1, BR7).

## Resolved design choices

- **Approving a row needs no confirmation; rejecting does.** Straight from the design: the per-row
  `Approve` is a primary button that acts immediately, while `Reject` opens a dialog because it has
  to collect a reason. Whole-file actions are the ones that confirm (story 5). Kept as designed —
  the asymmetry is deliberate, since an approval has a reason-free meaning and a rejection does not.
- **No optimistic updates on a decision.** The row changes only once the service has confirmed it.
  R20 requires that a failed decision leave the standing unchanged, and an optimistic update that
  reverts shows the person a state that was never true.
- **Decision controls are absent, not disabled, for anyone who cannot use them** — the project's
  established rule, and the same one `received-files` applies to its `Upload a file` action.

## Manual test checklist

- Open a file awaiting a decision as an Approver → each transaction still awaiting one carries `Approve` and `Reject`
- Click `Approve` on a row → the standing becomes approved, the row shows you settled it and when, and a message confirms it
- Click `Reject` on a row → a dialog opens asking for a reason, showing the transaction and its masked account number
- Press `Record rejection` with the reason box empty → it tells you a reason is required and records nothing
- Type spaces only and try again → same refusal, and the text you typed is still there
- Give a real reason and confirm → the standing becomes rejected and the reason shows under the description prefixed "Reason:"
- Stop the backend and try to approve a row → it tells you the decision could not be recorded and the standing is unchanged
- Sign in as an Importer → no `Approve` or `Reject` appears on any row
