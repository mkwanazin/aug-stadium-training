# Story 5 — Approve or reject the whole file

**Slug:** `story-5-decide-the-whole-file`
**Route:** `/files/[logId]/review`
**Target file:** `web/src/app/(app)/files/[logId]/review/page.tsx`
**Page action:** `modify_existing`
**Roles:** Approver
**Requirement IDs:** R7, R8, R10, R16
**Infrastructure only:** false

## Plain summary

An Approver can settle a whole file in one action instead of row by row. Both `Approve all` and
`Reject all` ask for confirmation first, naming the file, saying how many transactions will be
affected and how many are already settled and so left alone, with the safe choice ready under the
finger. Rejecting the file asks for a reason the same way rejecting one transaction does. When it
is done, the app says how many were settled — and if some could not be, it says that too rather
than claiming success.

## Summary

Adds the header actions `Approve all` (primary, tick icon) and `Reject all` (secondary,
circled-cross icon), both Approver-only. Each opens a confirmation naming the file and the count
(`Approve all <n> transactions on <file>?`), carrying the design's irreversibility line, and
stating either `<n> transactions are already settled and are excluded from this action.` or
`Every transaction on this file is awaiting a decision.` The non-destructive choice (`Cancel`)
holds focus when the dialog opens (R10). `Reject all` additionally collects a reason, refused on
empty or whitespace exactly as the single-transaction path is, reusing that validation rather than
restating it.

**There is no bulk endpoint.** `POST /v1/transactions/approve` and `/reject` each take one
`TransactionId`. So the action enumerates the transactions on this file that are still awaiting a
decision and calls the single-transaction endpoint once per transaction, each carrying the acting
user and — for a bulk rejection — the same reason. "Already settled" is derived from each
transaction's real `Status`, **never from local component state**: the design does it by checking
its own local bookkeeping, which the digest flags as a prototype shortcut.

The whole run sits behind story 3's re-authentication gate, so it is confirmed once rather than
per call. Because a run of N calls can partly fail, the outcome reports what actually happened —
see Resolved design choices.

## Acceptance criteria

| ID | Criterion | Coverage |
|---|---|---|
| AC-1 | `Approve all` and `Reject all` are in the header for an Approver, and each asks for confirmation naming the file and how many transactions the action will affect. | vitest |
| AC-2 | The confirmation says how many transactions are already settled and excluded, or that every one is still awaiting a decision, and the safe choice holds focus when it opens. | vitest |
| AC-3 | Rejecting the whole file asks for a reason and will not proceed without one, the same way rejecting a single transaction does. | vitest |
| AC-4 | Confirming settles every transaction still awaiting a decision, leaves the already-settled ones untouched, and then says how many were settled. | vitest |
| AC-5 | When some transactions could not be settled, the outcome says how many succeeded and how many did not, instead of reporting success. | vitest |
| AC-6 | `Approve all` works end to end in the browser and the listing reflects every settled transaction afterwards. | playwright |

**Plus 3 technical checks the agents verify automatically** — that "already settled" is read from
each transaction's own standing rather than local bookkeeping; that one service call is made per
still-awaiting transaction, each carrying the acting user; and that a bulk rejection sends the same
reason against every transaction it settles.

## Resolved design choices

- **A partial failure is reported, not hidden, and the run continues.** With no bulk endpoint, a
  twenty-transaction approval is twenty calls, and call seven can fail on its own. The run
  continues through the rest and the outcome names both numbers — settled and not settled — rather
  than stopping at the first failure or reporting a success that did not fully happen. Stopping
  early would leave the file in a half-settled state the person did not choose and cannot see; the
  brief requires the applied count in the toast but is silent on the failure, so this resolves it.
  The listing shows the true standing of every row afterwards either way.
- **The confirmation counts what will actually change.** The count named in the dialog is the
  number of transactions still awaiting a decision, not the file's total record count — those
  differ as soon as anything has been settled row by row.

## Manual test checklist

- Open a file with a mix of settled and awaiting transactions as an Approver → `Approve all` and `Reject all` are in the header
- Click `Approve all` → the confirmation names the file, says how many will be approved, and says how many are already settled and excluded
- Look at where the keyboard focus is when the dialog opens → it is on `Cancel`, not on the action that cannot be undone
- Press Escape or `Cancel` → nothing is settled
- Confirm it → every transaction that was awaiting a decision becomes approved, the already-settled ones are untouched, and the message says how many were settled
- Click `Reject all` and confirm with the reason box empty → it refuses and settles nothing
- Give a reason and confirm → every awaiting transaction becomes rejected and carries that reason
- Open a file where every transaction is already settled → the confirmation tells you there is nothing left to act on
- Sign in as an Importer → neither header action appears
