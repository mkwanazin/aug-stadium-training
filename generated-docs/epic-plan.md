# Epic Plan — Transaction File Importer

Every epic in this project, what it delivers, and what it builds on. Live status
(not started / in flight / done) is shown by `/status` and the dashboard.

> Plan only — edited during planning on `main`, never on an epic branch.

## Epics

| # | Epic | Delivers | Builds on |
|---|---|---|---|
| 1 | Sign in and session (`sign-in-and-session`) | A person signs in with the email address and password they already hold, sees their own name and roles, is warned before an idle session ends, is returned to sign-in when it does, and never sees an action their role does not allow. | — |
| 2 | Upload a file (`upload-a-file`) | An Importer registers a new delimited file against a chosen file setting and is told plainly whether it was accepted or refused, with the chosen setting kept for a second attempt. | Sign in and session (`sign-in-and-session`) |
| 3 | Received files (`received-files`) | The landing screen after signing in lists every received file with its standing, record count and last activity — searchable, sortable, filterable to files still in play, with a per-row action that follows the file's standing. | Upload a file (`upload-a-file`) |
| 4 | File review and decisions (`file-review-and-decisions`) | An Approver works through a file's transactions with account numbers masked and times in South African time, then approves or rejects one transaction or the whole file, giving a reason on every rejection, with the person behind each decision on the record. | Received files (`received-files`) |
| 5 | Faulted file diagnosis (`faulted-file-diagnosis`) | When a run faults, the Importer sees the step that failed and the recorded message, inspects each failing record with the values that caused it, downloads the error file when one exists, and cancels the run before anything is committed. | Received files (`received-files`) |
| 6 | Processing history (`processing-history`) | Anyone accountable follows a file's processing run step by step, with timings, outcomes and notes, and retrieves the data and the original file kept for it. | File review and decisions (`file-review-and-decisions`) |
| 7 | Import activity and export (`import-activity-and-export`) | The Importer and the Approver see how many files were imported, approved and rejected over a chosen period and by file setting, and the Approver hands approved transactions to finance as a download. | File review and decisions (`file-review-and-decisions`) |
| 8 | File settings administration (`file-settings-administration`) | The Approver keeps the rules that decide which files are accepted current — the settings, their locations and their bulk-load parameters — without waiting on a release, and can see what changed and who changed it. | Sign in and session (`sign-in-and-session`), Upload a file (`upload-a-file`) |

Epic 1 is the only dependency-free root — the build starts there. Epics 4 and 5 share a
dependency on epic 3 and can be built concurrently; so can epics 6 and 7 off epic 4.
Epic 8 depends on epic 2 because epic 2 is where the shared in-app application shell
(sidebar, brand lockup, nav group, signed-in block, sign out) is built once and inherited.

## Coverage

Everything in the spec is assigned to an epic:

| What you asked for | Epic |
|---|---|
| Sign in with email and password (R1) | Sign in and session |
| Refused sign-in does not say which field was wrong (R2) | Sign in and session |
| Incomplete sign-in reported separately from refused credentials (R3) | Sign in and session |
| Sign out waits for the session to end (R4) | Sign in and session |
| Session checked whenever a protected screen loads (R5) | Sign in and session |
| Signed-in name and roles shown (R6) | Sign in and session |
| Choose the file setting an upload belongs to (R7) | Upload a file |
| Upload a transaction file (R8) | Upload a file |
| Only the agreed delimited format is accepted (R9) | Upload a file |
| See received files and their standing (R10) | Received files |
| Narrow the listing to files still active (R11) | Received files |
| See the transactions a file carries (R12) | File review and decisions |
| Each transaction shows its own standing (R13) | File review and decisions |
| Sensitive values hidden in imported data (R14) | File review and decisions |
| Imported times read as South African time (R15) | File review and decisions |
| Approve one transaction (R16) | File review and decisions |
| Reject one transaction with a recorded reason (R17) | File review and decisions |
| Approve a whole file in one action (R18) | File review and decisions |
| Reject a whole file in one action with a reason (R19) | File review and decisions |
| Every decision and change carries the person who made it (R20) | File review and decisions |
| The recorded fault for a failed run is shown (R21) | Faulted file diagnosis |
| See the individual records that failed validation (R22) | Faulted file diagnosis |
| Failed records shown using the file's own field definitions (R23) | Faulted file diagnosis |
| Download the bulk error file (R24) | Faulted file diagnosis |
| Cancel a file before it is committed (R25) | Faulted file diagnosis |
| See a file's processing steps in order (R26) | Processing history |
| A file's standing and last activity are shown (R27) | Received files |
| Download the data file kept for a file (R28) | Processing history |
| Download the original stored file (R29) | Processing history |
| Export approved transactions for finance (R30) | Import activity and export |
| Counts of files imported, approved and rejected (R31) | Import activity and export |
| See every file setting (R32) | File settings administration |
| Amend a file setting (R33) | File settings administration |
| See the file locations of a setting (R34) | File settings administration |
| Amend a file location (R35) | File settings administration |
| See the bulk-load settings of a setting (R36) | File settings administration |
| Amend a bulk-load setting (R37) | File settings administration |
| See the configuration values a setting is built from (R38) | File settings administration |
| See the available process definitions (R39) | File settings administration |
| A rejection stores its reason against the transaction (R46) | File review and decisions |
| A registered file is duplicate-checked before import (R47) | Upload a file |
| Nothing is committed before validation passes (R48) | Faulted file diagnosis |
| One correction attempt is available after a validation failure (R49) | Faulted file diagnosis |
| A successful correction resumes at transform, not re-read (R50) | Faulted file diagnosis |
| A file failing validation is not imported and is logged as a fault (R51) | Faulted file diagnosis |
| Uncorrectable data is not committed and is logged as a fault (R52) | Faulted file diagnosis |
| Refused credentials never reveal the wrong field (R53) | Sign in and session |
| Only an agreed delimited file is accepted for import (R54) | Upload a file |
| Imported timestamps are presented at GMT+2 (R55) | File review and decisions |
| Sensitive transaction fields are obfuscated on screen (R56) | File review and decisions |
| A protected screen requires a valid session (R57) | Sign in and session |
| The acting person is recorded on every decision and change (R58) | File review and decisions |
| A decision only applies to an imported transaction (R59) | File review and decisions |
| A file can only be cancelled before it is committed (R60) | Faulted file diagnosis |
| Commitment requires validation and human review (R61) | File review and decisions |
| The actions offered follow the person's roles (R62) | Sign in and session |
| Sign-out waits for invalidation before navigating (R63) | Sign in and session |
| A failed run leaves a durable, retrievable record (R64) | Faulted file diagnosis |
| The received file is retained so the run can be repeated (R65) | Processing history |
| Duplicate checking compares the file's recorded content hash (R66) | Upload a file |
| A validation failure applies to the whole file (R67) | Faulted file diagnosis |
| Email address required at sign-in (R68) | Sign in and session |
| Password required at sign-in (R69) | Sign in and session |
| A rejection reason is required (R70) | File review and decisions |
| The chosen file must be the agreed delimited format (R71) | Upload a file |
| Transaction date must be readable, at GMT+2 (R72) | File review and decisions |
| Amount must be a number with at most two decimals (R73) | File review and decisions |
| Transaction type must be a known credit/debit indicator (R74) | File review and decisions |
| Currency must be a known three-letter code (R75) | File review and decisions |
| Account number must match the accepted pattern and stays obfuscated (R76) | File review and decisions |
| Every transaction carries a reference (R77) | File review and decisions |
| A file setting must be named (R81) | File settings administration |
| A file setting must name its staging table (R82) | File settings administration |
| A file location must name its folder (R83) | File settings administration |
| A bulk-load setting must state its field terminator (R84) | File settings administration |
| A file setting must be chosen before uploading (R85) | Upload a file |
| A file must be chosen before uploading (R86) | Upload a file |
| Required fields are marked with one legend line (R87) | Sign in and session |
| The first editable field takes focus when a form opens (R88) | File settings administration |
| Validation reports on leaving a field or on submit, never while typing (R89) | Sign in and session |
| Every listing has paging and a page-size selector (R90) | Received files |
| Every listed field can be sorted, one at a time (R91) | Received files |
| Waiting shows nothing under 300ms, then a placeholder, then a still-working message (R92) | Received files |
| Empty states name what is absent and offer the action that ends it (R93) | Received files |
| A listing emptied by a filter differs from one with no data (R94) | Received files |
| Confirmations clear themselves; state needing acknowledgement persists (R95) | Upload a file |
| Counts show exact to 99, then 99+, and are absent at zero (R96) | Received files |
| Standing indicators follow one colour-and-text mapping (R97) | Received files |
| Icon-only controls carry a label and accessible name (R98) | Received files |
| Irreversible actions confirm and name the affected object (R99) | File review and decisions |
| Actions a role may not take are absent, not refused (R100) | Sign in and session |
| Reaching a screen without permission explains in place (R101) | Sign in and session |
| Settled or cancelled objects lose their changing actions with an explanation (R102) | File review and decisions |
| Long forms are grouped into sections or stages (R103) | File settings administration |
| Choose the file setting before submitting (R104) | Upload a file |
| Submit a file and be told the outcome (R105) | Upload a file |
| The listing shows standing, record count and last activity (R106) | Received files |
| Restrict the listing to active files (R107) | Received files |
| See a file's transactions, each with its standing (R108) | File review and decisions |
| Sensitive values obfuscated wherever a transaction appears (R109) | File review and decisions |
| Imported timestamps presented as South African time (R110) | File review and decisions |
| Approve or reject a single transaction (R111) | File review and decisions |
| Approve or reject a whole file in one action (R112) | File review and decisions |
| A rejection asks for a reason and cannot proceed without one (R113) | File review and decisions |
| See the failing step and the recorded fault message (R114) | Faulted file diagnosis |
| See each failing record with the values that caused it (R115) | Faulted file diagnosis |
| Failing records follow the field definitions returned for that file (R116) | Faulted file diagnosis |
| Retrieve the bulk error file when one exists (R117) | Faulted file diagnosis |
| Cancel a file that has not been committed (R118) | Faulted file diagnosis |
| See a file's processing steps in order (R119) | Processing history |
| Retrieve the data held for a processed file (R120) | Processing history |
| Export approved transaction data (R121) | Import activity and export |
| See counts of files imported, approved and rejected (R122) | Import activity and export |
| Maintain file settings, locations and bulk-load settings (R123) | File settings administration |
| Signed-in identity and roles shown while the session is valid (R125) | Sign in and session |
| No files received yet (R126) | Received files |
| Only part of the listing could be retrieved (R127) | Received files |
| A file carries no transactions (R128) | File review and decisions |
| The transactions could not be retrieved (R129) | File review and decisions |
| A refused upload keeps the chosen setting for a second try (R130) | Upload a file |
| A faulted run states the failing step and offers the next moves (R131) | Faulted file diagnosis |
| A fault with no failing records still explains itself (R132) | Faulted file diagnosis |
| No bulk error file means no download offered (R133) | Faulted file diagnosis |
| A decision that could not be recorded says so (R134) | File review and decisions |
| A rejection without a reason keeps what was typed (R135) | File review and decisions |
| Nothing approved in the chosen scope means no export (R136) | Import activity and export |
| An activity report with no files at all (R137) | Import activity and export |
| Permission denied is explained in place (R138) | Sign in and session |
| The listing's loading behaviour follows the timing thresholds (R139) | Received files |
| Losing connectivity while reviewing keeps what is on screen readable (R140) | File review and decisions |
| What an Importer may do (R141) | Sign in and session |
| What an Approver may do (R142) | Sign in and session |
| Idle sessions end after 15 minutes (R143) | Sign in and session |
| A session ends after 8 hours regardless (R144) | Sign in and session |
| A warning 60 seconds before an idle sign-out (R145) | Sign in and session |
| Prove who you are again before a decision (R146) | File review and decisions |
| A locked account is told so, and when it frees up (R147) | Sign in and session |
| No second factor is prompted for (R148) | Sign in and session |
| The app is usable within 2.5 seconds (R149) | Sign in and session |
| The first screen stays under 300 KB (R150) | Sign in and session |
| A thousand transactions render within 400ms (R151) | File review and decisions |
| The first readable listing appears within 1.5 seconds (R152) | Received files |
| Sensitive imported values are obfuscated on screen (R153) | File review and decisions |
| The acting person is displayed against every decision and change (R154) | File review and decisions |
| A retention notice states how long data stays visible (R155) | Received files |
| No consent banner is presented (R156) | Sign in and session |
| New components follow the existing design system's pattern (R157) | Sign in and session |
| Standing is never conveyed by colour alone (R158) | Received files |
| Icon-only controls carry an accessible name (R159) | Received files |
| WCAG 2.2 AA with a complete keyboard-only path (R160) | Sign in and session |
| Where the work stands, by period and file setting (R161) | Import activity and export |
| Approved transactions handed to finance as a download (R162) | Import activity and export |
| Told when a submitted file is accepted and registered (R163) | Upload a file |
| Told when a run faults (R164) | Faulted file diagnosis |
| Told when failing records are available to inspect (R165) | Faulted file diagnosis |
| Told when a decision has been recorded (R166) | File review and decisions |
| Told when a file has been cancelled (R167) | Faulted file diagnosis |
| Told when the session is about to end through inactivity (R168) | Sign in and session |
| A file's history of standing, activity and who changed it (R169) | Processing history |
| A transaction's history of standing, note and who changed it (R170) | File review and decisions |
| A file setting's history of changes and who made them (R172) | File settings administration |
| The application speaks as a careful custodian (R173) | Sign in and session |

_162 requirements, all assigned._

Per-epic totals: Sign in and session 32, Upload a file 14, Received files 20,
File review and decisions 41, Faulted file diagnosis 24, Processing history 7,
Import activity and export 8, File settings administration 16.

## Deliberately not built

**Decision:** leave user and role administration out of this build — ship the file-handling
work only. Access requests are handled outside the application. Recorded here so the
exclusion is visible rather than silently absent. The requirement numbers below are left as
gaps in the coverage table above rather than reused, so an ID always means the same thing.

| What was asked for | Why it is not here |
|---|---|
| See every user and the roles they hold (R40) | User and role administration de-scoped |
| Create a user (R41) | User and role administration de-scoped |
| Open one user (R42) | User and role administration de-scoped |
| Amend a user (R43) | User and role administration de-scoped |
| Remove a user (R44) | User and role administration de-scoped |
| See the available roles (R45) | User and role administration de-scoped |
| A user's email address must be well formed (R78) | Guards a user account; de-scoped with it |
| A new user needs a password (R79) | Guards a user account; de-scoped with it |
| A user needs at least one role (R80) | Guards a user account; de-scoped with it |
| Maintain users and the roles they hold (R124) | User and role administration de-scoped |
| A user account's history of changes and who made them (R171) | User and role administration de-scoped |

### Privacy obligations left unmet by this build

Three of the privacy obligations recorded for this project under South Africa's
personal-information law (POPIA) were pinned to the user-administration screen. With that
screen out of the build they have no home in this application and are **unmet here** — they
will need to be met by whatever process handles user accounts outside it.

- **Unmet** — Telling people why their details are held and getting their agreement. Staff
  email addresses and names are held on their accounts, and the place that was going to say
  so, and ask, was the screen where an administrator creates an account.
- **Unmet** — Deleting a person's details on request. There is no longer any way inside the
  application to remove the email address and name held on someone's account.
- **Unmet** — Showing a privacy-policy link where personal details are captured. No screen in
  this build captures a person's own details, so the link has nowhere to sit.

### What this means in practice

- New staff cannot be given access from inside the application; accounts must be created
  wherever the backend's user administration is reached.
- Roles cannot be changed from inside the application either — the sidebar's
  `Users and roles` destination is simply not built.
- The Approver's create/read/update/delete rights over user accounts (recorded in the
  access-control matrix) go unexercised by this build; every other row of that matrix is
  unaffected.
