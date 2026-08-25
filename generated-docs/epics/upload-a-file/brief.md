# Epic: Upload a file

Inherits roles, auth, data source, compliance, and styling from project.md.

**Epic slug:** `upload-a-file` · **Epic 2 of 8** · **Depends on:** `sign-in-and-session`

---

## Goal

An Importer registers a new delimited file against a chosen file setting and is told plainly whether it was accepted or refused, with the chosen setting kept for a second attempt.

**Shared surface introduced by this epic:** this is the first epic to build the in-app application shell — the 224px fixed sidebar carrying the brand lockup, the nav group (`Received files`, `Upload a file`, `Import activity`, an `Administration` heading with `File settings` and `Users and roles`), and the signed-in block (role badge + `Sign out`) pinned to the bottom. Every later in-app screen (Received files, File review, Diagnosis, Processing history, Import activity) inherits this shell unchanged — build it as a shared layout, not something re-derived per screen.

---

## Data Model

Scoped to what this epic reads or creates. Roles/auth/session data is inherited from `sign-in-and-session`, not redefined here.

- **File setting (reference data, read-only here)** — `Id`, `Name` (`Salary Payments`, `Collections Batch`, `Vendor Payments`, `Debit Orders`, `Adjustments`), plus enough of `SourceName` / `TypeName` / `Direction` / `StagingSchema` / `StagingTable` / `ProcessDefinitionName` to compose the one-line hint under the select (e.g. `Comma-delimited · staged to payroll.stg_salary · process "Inbound Delimited Import"`). Sourced from `GET /v1/file-settings` (`FileSettingRead` / `FileSettingReadList` in `Transaction_Management_API.yaml`). Populates the `File setting` dropdown only — no create/edit here.
- **Upload submission (client-side, not persisted as its own record)** — `FileSettingId` (required), `FileSettingName`, the chosen `File` (required, must resolve to an accepted delimited extension), `FileName`. Submitted as `POST /v1/files/upload` — `FileSettingId` / `FileSettingName` / `FileName` as query parameters, file body as `application/octet-stream`.
- **Import file / file log (created by a successful submission)** — `Id`, `CurrentFileName`, `SettingId`, `SettingName`, `ProcessDate`, `CurrentStatus`, `RecordCount`, `FileHash` (basis of the duplicate check, BR-21), `CurrentFolder`, `IsActive`, `Direction`, `ProcessDefinitionId`/`ProcessName`. Matches the spec's `FileLog`. `BulkErrorFile`/`HasBulkErrorFile` exist on the schema but are not populated at this stage (they belong to the Diagnosis epic).
- **Upload response (outcome)** — `DefaultResponse { Id, MessageType, Messages[] }` from `POST /v1/files/upload` (200/401/500). Drives the accept/refuse banner text and the NT-01 in-app notice.
- **Recently submitted (aside list)** — a small, most-recent slice of file-log entries (`CurrentFileName`, `CurrentStatus`) shown in the "Recently submitted" mini-table beside the form. Read-only, sourced from the same file-log listing the Received files epic uses in full — see Notes & Caveats for scoping.
- **Incoming file content shape (for manual verification only, not parsed/displayed by this epic)** — `documentation/example_import_file.csv` header: `Reference,TransactionDate,AccountNumber,Description,Amount,TransactionType,Currency`. This epic registers the file; it does not read, transform or display its rows — that is Import/Transform/Validate and the File review epic.

---

## Functional Requirements

1. **R1** `[F-07, UI-18]` The user can choose which file setting an upload belongs to, and the upload cannot be submitted until a file setting has been chosen.
2. **R2** `[§6.3 ImportFile.SettingId]` If no file setting is chosen when submission is attempted, the submission is blocked and the omission is reported inline against the setting field, independently of the file-field check.
3. **R3** `[§6.3 ImportFile.CurrentFolder]` A file must be chosen before an upload is submitted; if none is chosen, the submission is blocked and the omission is reported inline against the file field, independently of the setting-field check.
4. **R4** `[F-08, UI-19]` The user can submit a chosen file for import against the selected file setting and is told the outcome of the submission — either acceptance or the reason for refusal.
5. **R5** `[F-09, §6.3 ImportFile.CurrentFileName]` Only files of the agreed delimited format are accepted for import (extensions `.csv`, `.txt`, `.dat`, `.psv`, `.tsv`, case-insensitive); a non-delimited file is refused with a stated reason and no transaction listing is produced for it.
6. **R6** `[§6.4.5 Upload flow / error]` A refused upload states the reason for refusal, and the file setting the user chose is retained on screen so a second attempt can reuse it without re-selecting.
7. **R7** `[NT-01]` When a submitted file is accepted and registered, the Importer is told via an in-app notice.
8. **R8** `[UI-09]` The acceptance confirmation is a transient message that dismisses itself after four to eight seconds; a refusal — a state the user must act on by correcting and resubmitting — persists on screen until the user dismisses it or submits again.

## Business Rules

1. **BR1** `[BR-02]` When a file is registered, it must pass duplicate validation before its data is imported; failing the check does not import the data and logs the run as a fault.
2. **BR2** `[BR-09]` When a file is submitted for import, only a file of the agreed delimited format is accepted; a non-delimited submission is rejected outright, ahead of any duplicate or import step.
3. **BR3** `[BR-21]` When duplicate validation runs, the basis of comparison against previously received files is the recorded content hash (`FileHash`) of the file; a hash match fails the duplicate check.

---

## Key Workflows

1. The Importer opens **Upload a file** from the shared sidebar nav (the nav item and header action are shown only when the signed-in user may upload).
2. The Importer chooses a file setting from the dropdown; once chosen, a hint appears beneath it summarising delimiter, staging target and process (e.g. `Comma-delimited · staged to payroll.stg_salary · process "Inbound Delimited Import"`).
3. The Importer chooses a delimited file via the drop target (or its file picker fallback); once chosen, the target shows the file name and a "ready to submit" note, and its border switches to the brand-primary "chosen" state.
4. The Importer selects **Submit for import**. Both fields are validated together on submit — a missing setting and a missing file are each reported inline without either blocking the other's own message (R2/R3), and nothing is submitted while either is missing.
5. When both are present, the setting and file are submitted to `POST /v1/files/upload`.
6. **Accepted path:** the backend registers the file (BR1/BR2/BR3 run server-side), and the screen shows a success banner naming the file and the setting it was registered against; the Importer also receives the NT-01 in-app notice that the file was accepted and registered. The banner clears itself after four to eight seconds (R8).
7. **Refused path** (wrong format, duplicate, or any other reason the API reports): the screen shows a persistent error banner stating the reason, and confirms the chosen file setting has been kept — the Importer picks a new file and resubmits without re-selecting the setting (R6). The banner persists until the Importer resubmits or clears the form.
8. **Clear** resets both fields and dismisses any banner, letting the Importer start over from empty.
9. The **Recently submitted** aside reflects the outcome of this and recent past submissions (file name + colour-coded standing badge), so the Importer sees where things stand without leaving the screen.

---

## Feature NFRs

- **FNFR-1:** Accepted file extensions are `.csv`, `.txt`, `.dat`, `.psv`, `.tsv` (case-insensitive); a non-matching extension is refused client-side before any network call is made, in addition to the server-side enforcement of BR2.
- **FNFR-2:** Maximum upload size is 20 MB per the design's drop-target copy ("Delimited files only, up to 20 MB"). No size limit is stated in `Transaction_Management_API.yaml` — confirm the real ceiling against the Transactions API during BUILD before hard-coding 20 MB as an enforced client-side limit.
- **FNFR-3:** The upload submission is a single synchronous round trip to `POST /v1/files/upload`; `Submit for import` shows a busy/disabled state until the response returns, per baseline NFR-base-5 (error UX / retry affordance) — a connection failure or 500 must surface a retryable error, not a silent stall.

---

## Out of Scope

- Viewing, filtering, sorting or acting on the full Received files listing (a separate epic) — this epic's "Recently submitted" aside is a lightweight reflection of recent uploads only, not the full listing.
- Any transaction-level detail, review, or approve/reject action — that begins once a file reaches `Validated` standing, in the File review epic.
- Routing from this screen onward to the newly submitted file's review or diagnosis surface — the design has no such control here; per the digest's Uncertainties, "no notification surface was designed and no control leads to the new file" beyond the NT-01 notice satisfied by R7.
- The `File settings` and `Users and roles` administration surfaces referenced in the shared sidebar nav — no artboard exists for either; the nav items are rendered as part of the shared shell but their destinations are out of scope until a design or spec covers them.
- Any retry/resubmission affordance beyond "the chosen setting is retained" — no explicit retry-the-same-file control was designed.

---

## Notes & Caveats

- **Shared shell, built once.** The 224px sidebar, nav group, signed-in block and `Sign out` button are introduced by this epic and must be built as a shared layout component, not duplicated per screen — every later in-app epic assumes it already exists.
- **Translate, don't copy** (per the design digest): the prototype's fixture "Recently submitted" rows and hard-coded file list must be replaced by real data from the Transactions API; the prototype's placeholder submit handler (which only flips a local outcome flag) must be replaced by the real `POST /v1/files/upload` call, with its `DefaultResponse` mapped into the accept/refuse banners; the sidebar's `Sign out` control must call the real logout flow inherited from `sign-in-and-session`, not an inert prototype nav item; inline SVG icons (upload arrow, tick, warning-triangle) become icon components; the artboard's hand-rolled CSS classes become design tokens and composed Shadcn primitives.
- **`Uploaded by`** is displayed elsewhere in the design (Received files, File review meta grid) but has no property on the spec's `FileLog` schema — flagged in the digest's Uncertainties. Not a concern for this epic (the Upload screen itself never shows `Uploaded by`), but worth carrying forward to the epics that do.
- **"Recently submitted" scoping is undefined.** Neither the design nor the API spec states how many entries or what recency window the aside shows. Recommend the most recent 5 file-log entries by `ProcessDate` descending; confirm with the user during BUILD if a different count or window is wanted.
- **`documentation/example_import_file.csv`** is comma-delimited with header `Reference,TransactionDate,AccountNumber,Description,Amount,TransactionType,Currency` — useful as a manual smoke-test file for this epic's upload flow, but this epic does not parse or display its row contents (that belongs to Import/Transform/Validate and the File review epic). Its `TransactionType` (`C`/`D`) and date format (`YYYY/MM/DD HH:mm`) differ from later display formats — a later epic's concern, not this one's.
- **No confirmed maximum file size exists in the API spec** — the 20 MB figure is design copy only (see FNFR-2); confirm before enforcing it as a hard limit.
