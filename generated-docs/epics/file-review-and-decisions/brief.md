# Epic: File review and decisions

Inherits roles, auth, data source, compliance, and styling from project.md.

This is epic 4 of 8; it depends on `received-files`. It is the largest epic (41 requirements) — expect the story list to be at the upper end.

---

## Goal

An Approver works through a file's transactions with account numbers masked and times in South African time, then approves or rejects one transaction or the whole file, giving a reason on every rejection, with the person behind each decision on the record.

---

## Data Model

Scoped to what this epic reads, writes or displays. Field names below follow `documentation/Transaction_Management_API.yaml`; the digest's Data Shapes section confirms the artboards' field names line up with the spec closely enough to treat it as corroboration.

- **TransactionRead** (returned by `GET /v1/transactions`) — `Id`, `FileLogId`, `FileName`, `Reference`, `TransactionDate`, `AccountNumber`, `Description`, `Amount`, `TransactionType`, `Currency`, `Status`, `UserNote`, `LastChangedUser`, `LastChangedDate`. This epic's transaction listing, decision history and audit view (R21) all read from this shape. **The endpoint returns every transaction across every file with no file-scoping query parameter** — the frontend must filter the response by `FileLogId` to build one file's listing (see Notes & Caveats).
- **TransactionRejectWrite** (submitted to `POST /v1/transactions/reject`) — `UserNote` (the rejection reason; stored verbatim as the transaction's user note per BR1).
- **Decision endpoints** — `POST /v1/transactions/approve?TransactionId={id}` and `POST /v1/transactions/reject?TransactionId={id}` each take the acting user via a required `LastChangedUser` header, not a body field. **Both are single-transaction operations; no file-level bulk endpoint exists** — "Approve all" / "Reject all" (R7/R8) must be client-orchestrated (see Notes & Caveats).
- **Status** — the enumeration this epic exercises: `Imported` (awaiting a decision), `Approved`, `Rejected`. A decision may only be recorded while `Status` is `Imported` (BR5).
- **TransactionType** — stored as `Credit`/`Debit` per the API's own example, but the sample import file carries `C`/`D` and the design displays `Credit`/`Debit`. Treat the stored/API value as authoritative for what this epic reads back and displays; the mapping from a raw imported code to the stored value belongs to the import pipeline, not this epic.
- **Currency** — a three-letter code (`ZAR` in every example and sample seen); this epic's display and validation treat it as a code, not a hard-coded ZAR literal.
- **AccountNumber** — a formatted string (`nnnn-nnnn-nnnn` in the raw import, `6083 0114 4821`-style grouping on screen); this epic never presents the full value — see BR2/BR7 and Notes & Caveats on the reveal mechanism.
- **File-level context this epic reads (not writes)** — `FileLog.CurrentFileName`, `CurrentStatus`, `RecordCount`, from the file this transaction listing belongs to (populated by the `received-files` epic this depends on); this epic uses these to render the file name/standing in dialog copy and to gate whether the Transactions tab is reachable (`Validated` standing → reviewable).

---

## Functional Requirements

1. **R1** — The user can see the transactions a file carries. *(F-12)*
2. **R2** — The application presents each transaction's current standing. *(F-13)*
3. **R3** — The application obfuscates sensitive values carried in imported data. *(F-14)*
4. **R4** — The application reads every timestamp carried in a received file as South African time. *(F-15)*
5. **R5** — The user can approve one transaction. *(F-16)*
6. **R6** — The user can reject one transaction, supplying a reason that is recorded against it. *(F-17)*
7. **R7** — The user can approve every transaction on a file in one action. *(F-18)*
8. **R8** — The user can reject every transaction on a file in one action, supplying a reason. *(F-19)*
9. **R9** — The application records the acting user against every decision and every change. *(F-20)*
10. **R10** — Irreversible actions (approve-all, reject-all) are gated by an explicit confirmation that names the affected object, with the non-destructive choice holding focus by default. *(UI-13)*
11. **R11** — On a transaction in a settled (approved/rejected) state, changing actions are absent and a persistent explanation states the state and what, if anything, restores editability. *(UI-16)*
12. **R12** — The user can see the transactions a file carries, each with its own standing. *(UI-22)*
13. **R13** — Values designated sensitive are obfuscated wherever a transaction is presented. *(UI-23)*
14. **R14** — Timestamps carried in a received file are presented as South African time. *(UI-24)*
15. **R15** — The user can approve or reject a single transaction. *(UI-25)*
16. **R16** — The user can approve or reject every transaction on a file in one action. *(UI-26)*
17. **R17** — A rejection requests a reason and cannot be recorded without one. *(UI-27)*
18. **R18** — A file with no transactions names the file and states that it carries no transactions. *(§6.4.5 transaction listing / empty)*
19. **R19** — A failure to retrieve a file's transactions is stated, and the file's own standing is still presented. *(§6.4.5 transaction listing / error)*
20. **R20** — A decision that could not be recorded states so explicitly, and the transaction's standing is presented unchanged. *(§6.4.5 Decide on a single transaction / error)*
21. **R21** — A rejection attempted without a reason states that a reason is required and retains anything already typed. *(§6.4.5 rejection reason / error)*
22. **R22** — Loss of connectivity while reviewing is stated persistently; already-retrieved transactions stay readable; actions that would change data are absent while it persists. *(§6.4.5 Review flow / offline)*
23. **R23** — The Approver is told in-app when an approve or reject action completes. *(NT-04)*
24. **R24** — A transaction's standing, user note, acting user and change timestamp are visible for the last 90 days, to Importer and Approver. *(§6.9 Transaction)*

---

## Business Rules

1. **BR1** — When a rejection is recorded, a reason must have been supplied and is stored against the transaction as its user note. *(BR-01)*
2. **BR2** — When a timestamp carried in a received file is presented, it is read as South African time at GMT+2. *(BR-10)*
3. **BR3** — When a transaction field designated sensitive is presented, its value is obfuscated. *(BR-11)*
4. **BR4** — When any decision or configuration change is performed, the name of the user performing the action is recorded against it. *(BR-13)*
5. **BR5** — When a decision is recorded on a transaction, that transaction's standing must be imported (i.e. still awaiting a decision). *(BR-14)*
6. **BR6** — When a file is committed to the permanent record, its data must have passed validation and its transactions must have been made available for review. *(BR-16)*
7. **BR7** — A reason must be supplied before a rejection is recorded. *(§6.3 Transaction.UserNote)*
8. **BR8** — A transaction date must be a date and time, read at GMT+2. *(§6.3 Transaction.TransactionDate)*
9. **BR9** — An amount must be a number with at most two decimal places. *(§6.3 Transaction.Amount)*
10. **BR10** — A transaction type must be one of the accepted credit or debit indicators. *(§6.3 Transaction.TransactionType)*
11. **BR11** — A currency must be one of the accepted three-letter currency codes. *(§6.3 Transaction.Currency)*
12. **BR12** — An account number must match the accepted grouped-digit pattern, and is obfuscated wherever it is presented. *(§6.3 Transaction.AccountNumber)*
13. **BR13** — A transaction reference must be present on every record. *(§6.3 Transaction.Reference)*

---

## Key Workflows

1. **Open a file for review** — Approver opens a file whose standing is `Validated` (from `received-files`) → the Transactions tab lists every transaction the file carries (R1/R12), each with its standing (R2), masked account number (R3/R13), and its transaction date read as SAST (R4/R14).
2. **Approve a single transaction** — Approver selects `Approve` on a transaction still awaiting a decision → `POST /v1/transactions/approve` is called with the acting user in `LastChangedUser` → on success the transaction's standing becomes `Approved`, the acting user and timestamp are recorded (BR4/R9), the row's actions are replaced by "who settled it and when" (R11), and an in-app notice confirms the decision (R23). On failure, the failure is stated and the transaction's standing is presented unchanged (R20).
3. **Reject a single transaction** — Approver selects `Reject` → a dialog requests a reason → confirming with an empty or whitespace-only reason reports "A reason is required before a rejection can be recorded." and records nothing, retaining what was typed (R17/R21/BR1/BR7) → confirming with a reason calls `POST /v1/transactions/reject` with the reason as `UserNote` and the acting user in `LastChangedUser` → on success the standing becomes `Rejected`, the reason is shown against the transaction prefixed "Reason: ", and a notice confirms the decision (R23).
4. **Approve a whole file** — Approver selects `Approve all` → a confirmation names the file and the count of transactions affected, excluding any already settled, with the non-destructive choice (`Cancel`) holding focus by default (R10) → confirming applies the approve decision to every transaction on the file still in `Imported` status (R7/R16), recording the acting user against each (R9/BR4), respecting BR5 (decisions only apply to transactions still awaiting one).
5. **Reject a whole file** — Approver selects `Reject all` → a confirmation requests a reason, names the file and the count affected, same focus default as above (R10) → an empty reason blocks the action the same way as the single-transaction path (R17/BR1/BR7) → confirming with a reason rejects every transaction still in `Imported` status, recording the reason and acting user against each (R8/R16/R9/BR4).
6. **Reveal a masked account number** — a per-row toggle reveals one account number; a header-level toggle reveals all of them on the current page; both are recorded against the acting user per project.md's compliance policy (inherited, not a new requirement of this epic, but implemented alongside R3/R13/BR3/BR12).
7. **Re-authenticate before a decision** — before any approve or reject action (single or bulk) completes, the application requires the user to re-authenticate, per project.md's inherited session-UX baseline (NFR-base-7) and FNFR1 below.
8. **Empty and error states** — a file with zero transactions states that plainly and names the file (R18); a listing that fails to load states the failure while still showing the file's own standing (R19); a lost connection while reviewing keeps already-fetched transactions readable and hides all decision actions until it clears (R22).
9. **90-day audit view** — for any transaction, its standing, user note, acting user and last-changed timestamp remain visible to both Importer and Approver for 90 days (R24).

---

## Feature NFRs

Baseline NFRs (accessibility, performance, responsive breakpoints, browser support, error UX, CORS, session-timeout policy) are inherited from project.md NFR-base-1 through NFR-base-7 and are not repeated here. This epic is where NFR-base-7's re-authentication clause is actually exercised.

- **FNFR1** — Re-authentication is required before an approve-class action completes: approving or rejecting a whole file, and approving or rejecting a single transaction. *(§6.6.1)* No re-auth interaction pattern exists anywhere in the design — see Notes & Caveats.
- **FNFR2** — The transaction listing renders within a p95 budget of ≤ 400 ms at 10³ records. *(§6.6.2)*
- **FNFR3** — Values designated sensitive in imported transaction data are obfuscated on screen wherever a transaction is presented — stated here as the system-wide compliance guarantee behind R3/R13/BR3, not merely a one-off UI behaviour. *(§6.6.4)*
- **FNFR4** — The acting user is recorded and displayed against every decision and configuration change, so an action can be attributed to a person after the fact — the compliance-level guarantee behind R9/BR4. *(§6.6.4)*

---

## Out of Scope

- **Processing history tab and Failed records tab.** The design bundles these onto the same File review screen alongside the Transactions tab, but none of this epic's assigned requirements touch them — they belong to a separate epic (processing/diagnosis work).
- **File diagnosis for a faulted file, retry-validation, and `Cancel run`/`Cancel file`.** The header's `Cancel file` control renders on this same screen in the design but is not wired by this epic.
- **`Download data`.** The header button has no described behaviour anywhere in the design (flagged in the digest's Uncertainties) — not built here pending clarification.
- **File upload and the received-files listing.** Delivered by the `received-files` epic this one depends on; this epic assumes a file already exists at `Validated` standing.
- **Import activity reporting, file-setting administration, and user/role administration.** Later epics' scope; the Approver-only nav items for `File settings` and `Users and roles` are not built here.
- **The re-authentication UI mechanism's design.** FNFR1 requires re-auth before decisions, but no re-auth screen or modal exists in any of the eight artboards — this epic implements the requirement but must design the interaction itself (see Notes & Caveats).
- **The account-lock duration and locked-account state** (an open Uncertainty inherited from the design digest) — out of scope for this epic; sign-in and account-lockout mechanics belong to `sign-in-and-session`.

---

## Notes & Caveats

- **No file-level bulk decision endpoint exists.** `POST /v1/transactions/approve` and `POST /v1/transactions/reject` both take a single `TransactionId` query parameter — there is no "approve/reject all transactions on file N" operation in `Transaction_Management_API.yaml`. "Approve all" (R7) and "Reject all" (R8) must be client-orchestrated: enumerate the transactions on the file that are still `Imported`, call the single-transaction endpoint once per transaction (each carrying the acting user's `LastChangedUser` header, and the reason for a bulk reject), and report the applied/excluded counts in line with the confirmation copy ("`<n>` transactions are already settled and are excluded from this action.").
- **The transaction list endpoint is not file-scoped.** `GET /v1/transactions` returns every transaction in the system, not one file's transactions. The frontend must filter the response by `FileLogId` client-side to build the Transactions tab's listing (R1/R12) — confirm with the backend team whether a scoped or paginated variant exists before assuming this filter happens over the full dataset on every load.
- **The design's reject-all silently skips already-settled transactions by checking local component state** (per the digest's Translate, Don't Copy) — the built app must derive "already settled" from each transaction's real `Status` field, not client-side bookkeeping, and must state the excluded count as the design's copy does.
- **The design's account masking is a client-side string slice over a full number already present in fixture data** (per Translate, Don't Copy) — build masking against the real `AccountNumber` value returned by the API, and the reveal mechanism (per-row and header-level, Approver-only) as a genuine, recorded action rather than a purely visual toggle over data already fully present on the client. Confirm with the backend/security stance whether the full account number should even be sent to the client pre-mask, or masked server-side with reveal as a separate authenticated call.
- **No re-authentication pattern was designed.** None of the eight artboards show a step-up/re-auth prompt before Approve/Reject act; FNFR1's requirement (re-auth before every approve-class action) has no UI reference to draw from. BUILD needs to design this interaction (e.g., a password-confirmation modal inserted before the approve/reject dialogs commit) consistent with the existing design system's modal pattern.
- **`TransactionType` is displayed and stored inconsistently across sources** (screens show `Credit`/`Debit`; the sample import file carries `C`/`D`; the API's own example is `Debit`) — this epic reads and displays the API's stored value as authoritative; the `C`/`D` → `Credit`/`Debit` mapping (if it happens at all on the way in) is the import pipeline's concern, not this epic's.
- **Placeholder decision handlers must not carry forward.** The design's Approve/Reject actions write directly into local component state (e.g. "You · 08:41") and its "Download data"/"Cancel file" controls are inert — every decision in this epic must call the real approve/reject endpoints and reflect the actual response, including a failed decision (R20).
- **Currency is ZAR in every example seen**, but §6.3's Currency rule is stated generically ("one of the accepted three-letter currency codes") — build against the code as data rather than hard-coding ZAR, while flagging to the user (an open Uncertainty in the digest) whether ZAR-only is the real intent.
- **The 90-day retention window (R24/§6.9)** governs how far back standing/note/acting-user/timestamp history is visible; no "aged out" state was designed beyond the plain empty-listing copy already covered by R18 — do not invent additional UI for data older than 90 days beyond simply not showing it.

### Added at plan time (2026-08-25) — verified against the specs and the parked epics

- **There is no re-authentication endpoint.** `documentation/Authentication_API.yaml` exposes
  exactly four operations — `/v1/auth/login`, `/v1/auth/logout`, `/v1/auth/userinfo` and
  `/v1/health`. Nothing verifies a password without also establishing a session. FNFR1 (and
  `project.md`'s NFR-base-7, project-wide) therefore has no backend operation behind it, not
  merely no designed UI — the caveat above flags the missing *pattern*, which understates the
  problem. Story 3 confirms by re-submitting the password to `login`, accepting the session
  re-mint as a side effect; if a verify endpoint is added later, only that module changes.
- **`GET /v1/transactions` accepts no query parameters at all** — verified: the path has no
  `parameters` block whatsoever, not merely no file-scoping one. So the client fetches every
  transaction in the system on every load and filters by `FileLogId`. This sits directly against
  **FNFR2** (p95 ≤ 400 ms at 10³ records), whose budget is for *rendering* a thousand records,
  not for fetching and sifting the whole table first. A scoped or paginated variant, or an
  explicit acceptance of the cost, is needed before this scales.
- **No operation records an account-number reveal.** The design's toast promises the reveal "is
  recorded against your name" and POPIA is an active domain on this project, but the Transaction
  Management API has nothing to record it against. The notice is built; the recording cannot be.
  Either an endpoint closes it or the copy is making a promise the system does not keep.
- **Partial failure on a bulk decision was undefined and is now resolved.** With no bulk
  endpoint, `Approve all`/`Reject all` is N single calls, any of which can fail alone. The brief
  requires the applied count in the confirmation copy but says nothing about failures: the run
  continues through the remainder and the outcome names both numbers (story 5).
- **`Uploaded by` is resolved here, not inherited.** `received-files` dropped the listing column
  for want of a backing field, but its recorded decision states in terms that "the review screen's
  meta-grid entry is unaffected" — so it deliberately left this cell open rather than settling it.
  This epic settles it the same way and for the same reason, which is a data fact rather than a
  preference: `FileLog` carries no property naming who uploaded a file and no lookup endpoint
  supplies one, so there is nothing to render. The cell is omitted rather than shown empty or
  filled with a placeholder, overriding the design's cell order, which places it third for the
  Approver. Recorded in the digest's Your Decisions under this epic's name.
- **The file's standing is not the value the service returns.** `received-files` established
  `web/src/lib/file-logs/standing.ts` as the single resolution function: `CurrentStatus` carries
  workflow-engine statuses (`Idle`/`Running`/`Finished`/`Suspended`/`Faulted`/`Cancelled`) and
  `Validated` is derived from `LastExecutedActivityName`. This epic's "reviewable standing" gate
  must call that function — reading `CurrentStatus` directly would mean the review surface never
  opens, because `Validated` is never a status the service reports.
- **The design's three tabs are three routes.** `faulted-file-diagnosis` is parked at
  `/files/[logId]/diagnose` rather than as a tab on this screen, and `processing-history` will be
  another route. So `Transactions` / `Processing history` / `Failed records` are built as a
  link-styled tab bar across sibling routes, not a tab panel. This epic's route is
  `/files/[logId]/review`, symmetrical with the parked diagnosis route; neither `received-files`
  nor `faulted-file-diagnosis` had fixed that name.
- **Build on `received-files`' shared components, do not rebuild them.** That epic's story 3
  builds its sortable column header and pager as deliberately listing-agnostic "for File review's
  tabs, Processing history and Import activity to reuse", and its stories 1 and 4 add the standing
  badge, the loading ladder, the empty-state pattern and the failed-retrieval pattern. This epic
  needs only `dialog` and `textarea` as new Shadcn primitives.
- **`RoleGuard` is a hard prerequisite and does not exist yet.** Stories 2, 4, 5 and 6 all gate
  Approver-only controls through it. It is `sign-in-and-session` story 4, still pending. This epic
  cannot be built until that epic completes — over and above the `received-files` dependency
  already recorded.
