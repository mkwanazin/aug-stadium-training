> Inherits roles, auth, data source, compliance, and styling from project.md.

# Epic: Faulted file diagnosis

## Goal

When a run faults, the Importer sees the step that failed and the recorded message, inspects each failing record with the values that caused it, downloads the error file when one exists, and cancels the run before anything is committed.

This is the read-only diagnosis surface for a file whose standing is `Faulted` — reached from the Received files listing's per-row `Diagnose` action. Nothing here writes anything except the cancel action, which removes the file from staging.

---

## Data Model

Scoped to what this epic reads and the one thing it deletes.

| Entity | Fields used here | Source |
|---|---|---|
| **File log** (`FileLog`) | `Id` (LogId), `CurrentFileName`, `SettingName`, `ProcessDate`, `RecordCount`, `CurrentStatus` (= `Faulted`), `LastExecutedActivityName` (the failing step), `BulkErrorFile`, `HasBulkErrorFile` | `documentation/Transaction_Management_API.yaml` `FileLog` schema; corroborated by the digest's File log data shape |
| **Column definitions** (`ColumnDefinition[]`) | `Name`, `HeaderText`, `Visible`, `CellAlignment`, `CellDisplay`, `Classes` — drives the failing-records table's columns, headers, alignment and display kind | Spec `GET /v1/files/validation-errors/columns` (`FileValidationErrorColumnGetList`) → `ColumnList` |
| **Failing records** (validation errors) | A JSON array of per-row objects, one per failing record: a primary-key value, `ChangeType` (e.g. `Insert`/`UPDATE`), `ChangedBy` (the producer, e.g. "Collections Batch import"), `ChangedAt`/staged-at timestamp, plus the record's own fields keyed by the column definitions above | Spec `GET /v1/files/validation-errors` (`FileValidationErrorGetList`) → `ValidationErrors.JsonArray` (a JSON-encoded string the client must parse) |
| **File process log** (for the failing step / link to Processing history) | `ActivityName`, `DecisionResult`, `LastExecutedActivityName`, `StartDate`, `EndDate` | Spec `GET /v1/file-process-logs/{LogId}` → `FileProcessLogList` |
| **Bulk error file** | The stream itself, downloaded — no metadata beyond `FileLog.BulkErrorFile` (name) / `HasBulkErrorFile` (presence) | Spec `GET /v1/files/bulk-errors/download?FileLogId=` (octet-stream) |
| **Cancel** | `LogId` (query), `LastChangedUser` (header) | Spec `DELETE /v1/files` (`FilesDelete`) → `DefaultResponse` |

---

## Functional Requirements

R1. The application presents the recorded fault for a run that failed. *(F-21)*
R2. The user can see the individual records of a file that failed validation. *(F-22)*
R3. The application presents failed records using the field definitions returned for that file. *(F-23)*
R4. The user can download the bulk error file produced for a run. *(F-24)*
R5. The user can cancel a file before it has been landed. *(F-26)*
R6. The user can see the step that failed and the recorded fault message for a failed run. *(UI-28)*
R7. The user can see each failing record of a file individually, with the values that caused the failure. *(UI-29)*
R8. Failing records are presented using the field definitions returned for that file, honouring which fields are visible, their labels, their alignment and their display kind. *(UI-30)*
R9. The user can retrieve the bulk error file produced for a run, when one exists. *(UI-31)*
R10. The user can cancel a file that has not been landed. *(UI-33)*
R11. A faulted run states the failing step and the recorded message, and offers the failing-record inspection and the bulk error file. *(§6.4.5 Diagnose flow / error)*
R12. Where a run faulted without producing failing records, the absence is stated and the recorded fault message is presented instead. *(§6.4.5 failing-record listing / empty)*
R13. Where no bulk error file exists for the run, the retrieval action is absent rather than offered and failing. *(§6.4.5 bulk error file retrieval / empty)*
R14. The Importer is told, in-app, when a run is logged as a fault. *(NT-02)*
R15. The Importer is told, in-app, when validation returns failure for a file and failing records are available. *(NT-03)*
R16. The Importer is told, in-app, when a cancellation completes and the file is removed from staging. *(NT-05)*

---

## Business Rules

BR1. When imported data is to be landed, it must first pass validation. *(BR-03)*
BR2. When data fails validation, one remediation attempt is available and the corrected data must pass validation again before landing. *(BR-04)*
BR3. When a remediation attempt succeeds, the run re-enters at the transform step rather than at import, so the source file is not re-read. *(BR-05)*
BR4. When a file fails validation, it is not imported and the run is logged as a fault. *(BR-06)*
BR5. When data cannot be corrected, it is not landed and the run is logged as a fault. *(BR-07)*
BR6. When a file is cancelled, it must not yet have been landed. *(BR-15)*
BR7. When a run fails, a durable record of the failure is written and remains retrievable. *(BR-19)*
BR8. When validation fails for some of a file's records, the disposition applies to the whole file rather than to the individual failing records. *(BR-22)*

> BR2/BR3 (remediation attempt, re-entry at transform) describe the run's own backend behaviour, not a control on this screen — see Notes & Caveats: no retry/remediation affordance was designed here, and none is built in this epic.

---

## Key Workflows

1. **Arrive at diagnosis.** The Importer clicks `Diagnose` on a `Faulted` row in Received files → lands on this file's diagnosis screen. Breadcrumb `Imports / <file name>`, page title the file name, `Faulted` badge.
2. **Read the fault.** An error banner states: validation failed at the failing step, `<n> of <total>` records could not be read (or the fault occurred before any record was staged — see step 5); the recorded fault message with its logged timestamp; that the file has not reached the permanent record. The meta grid shows `File setting`, `Process date`, `Records`, `Failing step` (bold, error-coloured), `Bulk error file` (when one exists).
3. **Inspect failing records.** The failing-records table renders columns from the returned field definitions (name, header text, visibility, alignment, display kind) — never a fixed column set. A count reads `<n> failing records`. Clicking a row selects it (tinted background + inset rail) and populates a detail panel below: every field the record carried, offending values rendered in the error colour, and a closing sentence naming the specific fault (e.g. a decimal-precision violation, a required field supplied empty, a field-count/terminator mismatch).
4. **Retrieve the bulk error file, when one exists.** `Bulk error file` (ghost, download icon) triggers the download. When `HasBulkErrorFile` is false, the control is not rendered at all — never rendered-then-failing.
5. **No failing records were produced.** When the run faulted before any record was staged (e.g. the file could not be opened), the table is replaced by a stated absence ("No failing records were produced for this run") plus the recorded fault message, so the screen still explains itself.
6. **Move to Processing history.** `Processing history` (ghost) navigates to the full step timeline for this run (delivered by a separate epic) — this screen only provides the link.
7. **Cancel the run.** `Cancel run` (destructive) opens a confirmation naming what happens: the file is deactivated and removed from staging, it leaves the active listing, its failing records will no longer be listable, and nothing from it has reached the permanent record. Confirming (`Cancel the file`) calls the cancel endpoint and the file's standing becomes `Cancelled`; declining (`Keep the file`) closes the dialog with no effect. A successful cancel raises an in-app notice (R16/NT-05).
8. **Faulted-run notice.** When a run transitions to `Faulted`, the Importer receives an in-app notice (R14/NT-02); when failing records are available to inspect for that run, a further notice makes that discoverable (R15/NT-03) — both surfaced wherever this project's notification pattern lands (toast/banner), not necessarily authored on this screen alone.

---

## Feature NFRs

- **NFR-diag-1 — Data-driven columns, not hard-coded.** The failing-records table and its detail panel must render entirely from the returned `ColumnDefinition[]` (name, header text, visibility, alignment, display kind) for the specific file being diagnosed — never a column set fixed at build time. Two files under different file settings can legitimately show different columns.
- **NFR-diag-2 — Read-only surface.** This screen issues no write beyond the single cancel action. No inline editing, no correction UI, no retry control (see Out of Scope).
- **NFR-diag-3 — Masking, no reveal, on this surface.** Account numbers appear pre-masked (`•••••• ` + last four digits) with no reveal control here — reveal is an Approver-only affordance delivered by `file-review-and-decisions`, and this screen is drawn for the Importer role only.
- **NFR-diag-4 — Empty-state correctness.** Both empty conditions (no failing records; no bulk error file) must degrade to a stated absence rather than a broken control or a silently-missing button — see §6.4.5 empty-state rows above.

---

## Out of Scope

- **Retrying or re-running validation for a faulted file.** No such control was designed on this screen, even though the spec exposes `POST /v1/files/retry-validation`. Flagged as an open design uncertainty (see Notes & Caveats) — not built in this epic.
- **Editing or correcting a failing record's values.** BR-04/BR-05 describe an automatic backend remediation attempt and re-entry at transform, not a user-facing correction form; no such form was designed.
- **Approver decisioning (approve/reject).** Delivered by `file-review-and-decisions` for `Validated` files — this screen only ever shows `Faulted` files and has no decision affordance.
- **The full processing-history timeline.** This epic only provides the `Processing history` navigation link; the timeline screen itself belongs to a later epic.
- **Reconciling `Cancel run` (this screen) against `Cancel file` (the file-review header).** The design uses two labels for what may be the same operation, and only this screen's version has a designed confirmation. This epic implements `Cancel run` as specified here; reconciling the two is an open design uncertainty, not this epic's to resolve.

---

## Notes & Caveats

- **Prototype harness chrome must not carry forward.** The Diagnose artboard opens with a "Prototype harness — fixture data, no server" strip and (on most screens) a `Viewing as` role switch and `Reset demo data` button. None of this is product — the real role comes from the signed-in user's session.
- **Fixture data → real API calls.** The three failing records and the single faulted file shown in the artboard are hard-coded sample values; they must be replaced by live calls to `FileValidationErrorColumnGetList` (columns) and `FileValidationErrorGetList` (records), scoped by `FileLogId`.
- **Inline SVG → icon components.** The warning-triangle (error banner), download-arrow (`Bulk error file`) and bin (`Cancel run`) icons are pasted inline in the artboard; rebuild as shared icon components per [styling-centralisation.md](../../../.claude/policies/styling-centralisation.md).
- **Data-structure mismatch — the file-level "recorded fault message" has no dedicated schema field.** Neither `FileLog` nor `FileProcessLog` in `Transaction_Management_API.yaml` carries an explicit fault-message property, yet the design shows a specific sentence (e.g. "FieldTerminator mismatch on row group 3 — expected 9 fields, found 8") with a logged timestamp. Confirm with the backend where this text is actually sourced (most likely a note on the failing `FileProcessLog` step, or embedded in the validation-errors payload) before wiring this banner.
- **Data-structure mismatch — the failing-record "what failed" text and offending-value highlighting are not modeled in the spec's example payload.** The sample `ValidationErrors.JsonArray` in the spec (a dinosaur-themed example) carries only the record's own fields plus `ChangeType`/`ChangedBy`/`ChangedAt` — no field flags an offending value or carries a human-readable fault sentence. Confirm whether the real payload includes these (per-field error flags, a fault-summary field) or whether the frontend must derive them by comparing returned values against the column definitions' `CellDisplay` type and the file setting's validation rules.
- **`HasBulkErrorFile` is typed as a string in the spec, not a boolean.** Treat it as a truthy/falsy string when deciding whether to render the `Bulk error file` control (never render-then-fail on an empty/`"false"`-type value).
- **No notification surface was designed for NT-02/NT-03/NT-05.** The only confirmed in-app feedback in the artboards for this screen is the on-page error banner and the cancel-confirmation dialog; there is no toast/banner design for "a run just faulted" or "failing records are now available" arriving asynchronously, nor an explicit confirmation toast for a completed cancel (contrast with the toasts designed for the review screen). Implement via whatever project-wide notification pattern this build settles on; flag any resulting screen as a placeholder if none exists yet when this epic builds.
- **Two nav destinations referenced by every sidebar (`File settings`, `Users and roles`) have no artboard** and are out of scope here — inherited caveat from the design digest, not specific to this epic.
