# Story 6 — Read-only review, and a dropped connection

**Slug:** `story-6-read-only-review-and-lost-connection`
**Route:** `/files/[logId]/review`
**Target file:** `web/src/app/(app)/files/[logId]/review/page.tsx`
**Page action:** `modify_existing`
**Roles:** Importer, Approver
**Requirement IDs:** R22, R24, BR6
**Infrastructure only:** false

## Plain summary

An Importer can open a file for review and read the whole record — every transaction, its standing,
the reason where it was turned back, and who settled it and when — without any decision controls on
the screen. If the connection drops mid-review, a notice says so and stays there, everything
already fetched stays readable, and anything that would change data disappears until the connection
is back. A file that is fully settled explains that rather than offering buttons that would do
nothing.

## Summary

Completes the review surface for the people who are not deciding, and for the moments when nothing
can be decided.

**The read-only view (R24).** `files.view` already grants both roles, so an Importer reaches this
screen. They see the listing, the standings, the user notes, and the acting user and change
timestamp against each settled transaction — the audit record the requirement makes visible to both
roles for ninety days. Those fields come straight off `TransactionRead`'s `LastChangedUser` and
`LastChangedDate`, so no derivation is needed. Every decision control is **absent** rather than
disabled, per the project's established rule.

**The dropped connection (R22).** A persistent notice while connectivity is lost — not a toast that
clears itself, because the condition persists. Transactions already fetched stay on screen and stay
readable; every data-changing control is withdrawn while it lasts and returns when the connection
does. Reuses `received-files`' failed-retrieval and incomplete-listing patterns rather than
inventing a third shape for the same idea.

**The settled file.** A file whose transactions are all settled carries a persistent explanation of
that state instead of controls that cannot act (R11's file-level counterpart, and the visible side
of BR6 — decisions are only ever offered on a file that actually reached the reviewable standing,
resolved through the shared standing function).

## Acceptance criteria

| ID | Criterion | Coverage |
|---|---|---|
| AC-1 | An Importer opening a file for review sees every transaction with its standing, its reason where it has one, and who settled it and when — with no decision controls anywhere on the screen. | vitest |
| AC-2 | The standing, reason, acting person and change time stay readable for ninety days from when the file was received. | none |
| AC-3 | While the connection is down a notice says so and stays visible, and the transactions already fetched remain readable. | vitest |
| AC-4 | While the connection is down every control that would change data is gone from the screen, and it returns when the connection does. | vitest |
| AC-5 | A file whose transactions are all settled explains that it is settled instead of offering controls that cannot act. | vitest |
| AC-6 | Losing and regaining the connection part-way through a review behaves this way in a real browser, without losing the listing. | playwright |

**Plus 2 technical checks the agents verify automatically** — that the acting person and change time
are read from the transaction record rather than inferred from the session; and that a file which
has not reached the reviewable standing offers no decisions at all, resolved through the shared
standing function rather than a second rule (BR6).

## Resolved design choices

- **Nothing is built for data older than ninety days.** The brief is explicit that no "aged out"
  state was designed beyond the ordinary empty listing, so the window is honoured by simply not
  showing older records — no new UI, no invented message. The accuracy of ninety days is a business
  confirmation, not a build decision, and is already recorded as such.
- **The offline notice persists; it is not a toast.** The design's toasts clear themselves after a
  few seconds. R22 requires the statement to persist while the condition does, so this uses the
  banner pattern, not the toast pattern.

## Manual test checklist

- Sign in as an Importer and open a settled file for review → you can read every transaction, its standing and its reason
- Look at a transaction that was settled → it names who settled it and when
- Look for `Approve`, `Reject`, `Approve all` or `Reject all` as an Importer → none of them are on the screen at all
- Open a file for review, then disconnect the network → a notice appears saying the connection is lost and it stays there
- While disconnected, look at the transactions already listed → they are still there and still readable
- While disconnected, look for the decision controls as an Approver → they are gone
- Reconnect → the notice clears and the decision controls come back
- Open a file where every transaction has been settled → the screen explains it is settled rather than showing buttons that do nothing
