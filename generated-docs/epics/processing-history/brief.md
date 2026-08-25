# Epic: Processing history

Inherits roles, auth, data source, compliance, and styling from project.md.

This is epic 6 of 8. It depends on `file-review-and-decisions`. It is a small epic (7 requirements).

---

## Goal

Anyone accountable follows a file's processing run step by step, with timings, outcomes and notes, and retrieves the data and the original file kept for it.

---

## Data Model

Scoped to what this epic reads, retrieves or streams. Field names follow `documentation/Transaction_Management_API.yaml`; the design digest's Processing history screen (`documentation/Trace-html/Trace.dc.html`) uses the same field values under looser display labels.

- **File process log (a processing step)** — `FileName`, `ActivityName`, `DecisionResult`, `LastExecutedActivityName`, `StartDate`, `EndDate`. Retrieved via `GET /v1/file-process-logs/{LogId}` → `FileProcessLogList`, whose array property is (confusingly) also named `FileLog` — see Notes & Caveats. No `Duration` property exists on the schema; the timeline's per-step duration, and the "still running" state for a step with no `EndDate`, are derived, not returned. Activity names seen in the design: `Register`, `Duplicate check`, `Import`, `Transform`, `Validate`, `Await decision`, plus `Land` and `Cancel` implied by the file standing enumeration.
- **File log entry (existing entity, read-only here)** — `Id` (the "Log identifier" shown in the design), `CurrentFileName`, `SettingName`, `ProcessDate`, `RecordCount`, `CurrentStatus`, `LastExecutedActivityName`, `ProcessInstanceId`, `ProcessDefinitionId`/`ProcessName`, `Direction`. This epic reads it to drive R6's audit-trail summary and uses its `Id` as the key for both downloads. `UploadedBy` (shown on screen to the Approver) and any "acting user" / "change timestamp" property for §6.9 are **not** on the spec's `FileLog` schema — flagged in Notes & Caveats.
- **Data file download** — `GET /v1/file-logs/data?LogId=<id>` → `application/octet-stream` stream (the data file recorded against the file log entry — R2/R5).
- **Original stored file download** — `GET /v1/files/download?FileLogId=<id>` → `application/octet-stream` stream (the file as originally received, retained per BR1 so the run can be repeated — R3).

---

## Functional Requirements

1. **R1** — The user can see the recorded processing steps of a file in order. *(F-27)*
2. **R2** — The user can download the data file recorded against a file log entry. *(F-29)*
3. **R3** — The user can download the stored file held for a file log entry. *(F-30)*
4. **R4** — The user can see a file's recorded processing steps in order, with each step presenting the activity that ran, its decision outcome, and its start and end times. *(UI-34)*
5. **R5** — The user can retrieve the data held for a processed file. *(UI-35)*
6. **R6** — A file's current standing, last executed activity, process date, record count, acting user and change timestamp are visible to both Importer and Approver for the last 90 days. *(§6.9)*

---

## Business Rules

1. **BR1** — When a file has been processed, the received file is retained so the run can be repeated from the original. *(BR-20)*

---

## Key Workflows

1. **Open a file's processing history** — the user opens the Processing history screen (or tab) for a specific file log entry → `GET /v1/file-process-logs/{LogId}` returns the recorded steps → rendered as an ordered timeline (`Register` → `Duplicate check` → `Import` → `Transform` → `Validate` → `Await decision`/`Land`/`Cancel`), each step showing activity, decision (`Yes`/`No`/`—`), started time, ended time and duration; a step with no `EndDate` renders as still running; a faulted step's note renders in the error colour (R1/R4).
2. **Switch which run is shown** — the `File` selector on the Processing history screen swaps the timeline to a different file log entry's steps without leaving the screen.
3. **See a file's audit-trail summary** — current standing, last executed activity, process date, record count, acting user and change timestamp are shown to both Importer and Approver, drawn from the file log entry, and remain retrievable for 90 days from when the file was received (R6).
4. **Download the data file** — the user requests the data file recorded against a file log entry → `GET /v1/file-logs/data?LogId=<id>` streams the file to the browser (R2/R5).
5. **Download the original stored file** — the user requests the file exactly as it was received, so the run can be repeated from that original → `GET /v1/files/download?FileLogId=<id>` streams the file to the browser (R3/BR1).

---

## Feature NFRs

Baseline NFRs (accessibility, performance, responsive breakpoints, browser support, error UX, CORS, session-timeout policy) are inherited from project.md NFR-base-1 through NFR-base-7 and are not repeated here.

- **FNFR1** — Both download operations stream files as large as the upload ceiling stated elsewhere in the design (up to 20 MB) and present a user-visible error with a retry affordance on failure (per NFR-base-5), rather than a silent or generic failure.
- **FNFR2** — The processing-history timeline and the file's audit-trail summary remain retrievable for 90 days from receipt (per the digest's retention footnotes and §6.9); no behaviour was captured for what is shown once a record ages out past that window — see Notes & Caveats.
- **FNFR3** — Every timestamp in the timeline and the audit-trail summary renders in South African time (GMT+2/SAST), per project.md's confirmed compliance note.

---

## Out of Scope

- **Retry-validation of a faulted run.** The API spec exposes a retry-validation operation, and the design digest flags that no retry affordance was designed for a faulted file. Resolving that is diagnosis-surface scope, not this epic's.
- **The bulk error file download.** That control lives on the File diagnosis screen and belongs to the diagnosis/review scope this epic depends on — not to F-29/F-30's data-file and stored-file downloads.
- **Cancel-file / Cancel-run actions.** Cancellation is decided and built elsewhere; this epic only displays the standing that results from it, and never triggers a cancellation itself.
- **Defining or editing the processing pipeline.** This epic reads the recorded steps of a run; it does not add, remove or reconfigure the activities a file passes through.

---

## Notes & Caveats

- **The design has no download control on the Processing history screen.** The digest's Processing history screen (`Trace.dc.html`) exposes only a `File` run-selector and a `Back to the file` button — no control for retrieving the data file (R2/R5) or the original stored file (R3) is described anywhere on it. The File review header's `Download data` button is an open Uncertainty in the digest with no described behaviour. BUILD needs an explicit affordance — on Processing history, File review, or both — for these two distinct downloads, since neither screen's design places one for certain.
- **"Acting user" and "change timestamp" (§6.9) are not on the `FileLog` schema.** `documentation/Transaction_Management_API.yaml`'s `FileLog` carries no such properties — the same gap the design digest already flags for `UploadedBy` (shown on screen to the Approver but absent from the schema). Confirm with the backend where these values actually come from (e.g., derived from the latest `FileProcessLog` entry's actor and end time, or a property missing from the published spec).
- **`FileProcessLogList`'s array property is confusingly also named `FileLog`.** `GET /v1/file-process-logs/{LogId}` returns `FileProcessLogList.FileLog: FileProcessLog[]` — the same property name as the unrelated `FileLogList.FileLog: FileLog[]` wrapper used elsewhere. Do not conflate the two schemas when wiring the API client.
- **Duration is derived, not returned.** `FileProcessLog` carries only `StartDate`/`EndDate`; the per-step duration and the "still running" state shown in the timeline for a step with no `EndDate` must be computed client-side (or the backend needs to add it).
- **Placeholder handlers → real handlers.** Per the digest's "Translate, Don't Copy": the Processing history screen's `Back to the file` control is inert in the design (mutates local state only) and must be wired to real navigation to the file's review/diagnosis surface.
- **No "aged out" behaviour is defined for the 90-day window.** The digest's Uncertainties flag that the retention copy ("Processing history stays visible for 90 days") never describes what a user sees once a record passes that window. Not resolved here — flag for a product decision if it surfaces during BUILD.
