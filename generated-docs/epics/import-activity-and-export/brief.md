> Inherits roles, auth, data source, compliance, and styling from project.md.

# Epic 7 — Import activity and export

## Goal

The Importer and the Approver see how many files were imported, approved and rejected over a chosen period and by file setting, and the Approver hands approved transactions to finance as a download.

This epic depends on `file-review-and-decisions` (transaction Standing values, approve/reject recording, account-number masking) and can be built concurrently with `processing-history` — the two share that same dependency but not each other.

---

## Data Model

Reuses `FileLog` and `TransactionRead` from `documentation/Transaction_Management_API.yaml` (already in play from prior epics) plus two report-only shapes this epic introduces:

- **Import Activity Summary** (derived, not a persisted API resource) — one row per file setting, holding `FileSetting`, `Imported` (count), `Approved` (count), `Rejected` (count), for the chosen period; plus a period-wide total row. Computed by aggregating `FileLog` entries (see below) grouped by `SettingName`/`SettingId`. Matches the digest's "Import activity counts (report)" data shape.
- **Approved Transaction Export Row** — one CSV row per approved transaction: `Reference`, `TransactionDate`, `AccountNumber`, `Description`, `Amount`, `TransactionType`, `Currency` — exactly the seven columns named in RPT-02. Sourced from `TransactionRead` filtered to `Status = Approved`, scoped by the chosen export scope (period-wide, or a single file — see Out of Scope for the third option, dropped at planning).
- **Report filters** — Period chips (`Today` / `This week` / `This month` / `Last 90 days`, default `This month`), File setting (same five options as the Received-files listing filter, plus `All settings`), and an export-only Scope select (`Everything approved in this period` / `Approved on a single file…` — the design's third option was dropped at planning, see Out of Scope). The five setting names are prototype fixtures; the real options come from `GET /v1/file-settings`.

**Backend data-access gap (read before building):** neither list endpoint in `documentation/Transaction_Management_API.yaml` accepts the query parameters this epic's filters imply — `GET /v1/file-logs` accepts only `IsActive`; `GET /v1/transactions` accepts no query parameters at all. Period, file-setting, standing/process-date and currency filtering, and all the count aggregation, must happen client-side over the full file-log and transaction lists returned by those two endpoints. Note `IsActive` is **required**, so per BR7 the file log is fetched twice (`Yes` and `No`) and merged before counting. Coordinate with whatever data-fetching `file-review-and-decisions` already built for the transaction listing to avoid a second full-list fetch path.

---

## Functional Requirements

- **R1** — The user can export approved transaction data for the finance team. *(F-31)*
- **R2** — The application presents counts of files imported, approved and rejected. *(F-32)*
- **R3** — The user can export approved transaction data. *(UI-36)*
- **R4** — The user can see counts of files imported, approved and rejected. *(UI-37)*
- **R5** — Where no approved transactions exist in the chosen scope, the absence names the scope and no export is produced. *(§6.4.5 empty)*
- **R6** — Where no files exist in any standing, the report states the absence and offers the upload action. *(§6.4.5 empty)*
- **R7** — Counts of files imported, approved and rejected are presented for the Importer and the Approver, filterable by file setting, standing and process date. *(RPT-01)*
- **R8** — Approved transaction data is exported for the Approver as CSV on demand, carrying reference, transaction date, account number, description, amount, transaction type and currency, filterable by standing, file, transaction date and currency. *(RPT-02)*

---

## Business Rules

- **BR1** — When the chosen export scope contains no approved transactions, no download is produced; the outcome names the scope that was empty (e.g. "Nothing approved in Salary Payments this week") rather than failing silently.
- **BR2** — When the activity report is opened and no files exist in any standing, the report states the absence and offers the `Upload a file` action in place of the metric tiles and breakdown table.
- **BR3** — When approved transactions are exported, only transactions whose `Status` is `Approved` are included, and the exported columns are exactly `Reference`, `TransactionDate`, `AccountNumber`, `Description`, `Amount`, `TransactionType`, `Currency` — no more, no fewer.
- **BR4** — When file-imported/approved/rejected counts are computed, they are scoped to the chosen period and, when a file setting is chosen, further scoped to that setting; the breakdown table's per-setting rows and the total row must agree.
- **BR5 (confirmed at planning, 2026-08-25)** — The finance CSV export carries account numbers **unmasked**. Inherited BR-11 (project.md) obfuscates sensitive fields "wherever a transaction is shown to a reviewer"; this epic reads the export as data handed to a downstream team to act on, not an on-screen reviewer presentation, so the masking rule does not reach it. The POPIA domain is active on this project, so this reading was put to the user explicitly at the stories approval and confirmed. The produced file is itself sensitive material.
- **BR6 (assumption — confirm before building)** — A file counts toward "Files approved" in the summary only when every transaction on it has reached `Approved`; a file counts toward "Files rejected" when at least one of its transactions is `Rejected`; a file still carrying transactions in `Imported` (awaiting decision) counts only toward "Files imported". Neither `documentation/Transaction_Management_API.yaml`'s `FileLog.CurrentStatus` enum nor the requirements doc defines a per-file approved/rejected standing directly — this bucketing is inferred from the digest's tile sub-lines ("Every transaction settled as kept and committed" / "Turned back with a recorded reason against each") and should be confirmed against real data before the aggregation ships.
- **BR7 (confirmed at planning, 2026-08-25)** — The counts cover **both files still in use and retired ones**. `GET /v1/file-logs` makes `IsActive` a *required* query parameter, so "every file in any standing" cannot be asked for in a single call; the report therefore issues both `IsActive=Yes` and `IsActive=No` and merges the two by `Id` before counting. The user chose completeness over the doubled payload. Both lists are fetched once and re-aggregated in memory on every filter change, so NFR-1's budget still holds.
- **BR8 (confirmed at planning, 2026-08-25)** — An Importer does not see the finance export panel at all — it is withheld, not disabled, matching how the sidebar already withholds destinations a role cannot use, and the breakdown table takes the full width in its place. RPT-01 puts the *report* in front of both roles; RPT-02 makes the *export* Approver-only. The counts export (`Export these counts`) remains available to both.

---

## Key Workflows

1. **View import activity report** — the Importer or the Approver opens Import activity, the default period (`This month`) and `All settings` are applied, and the three metric tiles (`Files imported`, `Files approved`, `Files rejected`) plus the by-file-setting breakdown table render. The user narrows by period chip and/or file setting; the period line and every count update together. Where no files exist in any standing at all, the empty-report state (R6/BR2) renders instead.
2. **Export the period's counts** — the user clicks `Export these counts`; a CSV/summary download of the current tiles-and-breakdown view is produced and a confirmation toast is raised, naming the period covered.
3. **Export approved transactions for finance** — the Approver chooses an export scope (everything approved in the period, or a single file), sees how many approved files are in scope, and clicks `Export approved transactions`. Where the scope is non-empty, a CSV download is produced (columns per BR3) and a confirmation toast names how many files were covered. Where the scope is empty, no file is produced and the outcome names the empty scope (R5/BR1).

---

## Feature NFRs

- **NFR-1 (aggregation performance)** — Because the report's counts and breakdown are computed client-side from full `file-logs`/`transactions` list responses (no server-side filtering available — see Data Model gap above), the aggregation must stay within the baseline transaction-listing render budget (NFR-base-2, p95 ≤ 400ms at 10³ records) when recomputing on a period/file-setting change.
- **NFR-2 (export size)** — CSV generation for the finance export must remain responsive (produce a downloadable file, not a blocking UI freeze) at file-review-and-decisions' expected transaction volumes; if volumes materially exceed what client-side generation can handle smoothly, flag for a follow-up rather than silently degrading.

---

## Out of Scope

- The export aside's third scope option, `Approved and not yet exported` — **dropped at planning (2026-08-25)**. Nothing in the transaction service records export state: no field on `TransactionRead`, and no endpoint that would set one. The user chose to drop the option rather than approximate it in browser storage, which would not survive a different device, browser or session and would give two Approvers different answers. `Scope` therefore offers exactly two options. Reinstate if the backend later carries the flag.
- Clicking through from a report tile or a breakdown-table row to the Files listing — the digest's intro copy references this ("open a file from the Files listing to look at what is behind them") but no link control was designed for it. Confirmed out of scope for this epic; may be picked up later if requested.
- The `File settings` and `Users and roles` administration surfaces referenced in the sidebar `Administration` group — no artboard exists for either and neither is part of this epic's requirement slice.
- Any theme/light-dark toggle on the Import activity screen — the digest confirms this screen is drawn light-only despite inheriting the shared dark tokens (project-level theming question tracked in project.md's Design Source note, not re-litigated here).

---

## Notes & Caveats

- **Translate, don't copy (from the design digest):** the report's tiles, breakdown table and export buttons are fixture-driven and toast-only in the prototype (`Export these counts` / `Export approved transactions` only raise a toast against hard-coded sample values). Both exports must become real file downloads, and the counts/breakdown must reflect the live data store rather than hard-coded numbers.
- **Export "not yet exported" scope — resolved, dropped.** See Out of Scope above. The option is not rendered; `Scope` offers two options, not three.
- **`Download data` on the File review header (a different epic's screen) is a separate, still-undescribed control** per the digest's own Uncertainties — do not conflate it with this epic's finance export; they are drawn on different screens and may turn out to produce different things.
- Account-number masking's reveal-and-record behaviour (BR-11, per-row/header toggles, Approver-only) belongs to `file-review-and-decisions` and is inherited context only — this epic's own masking question is scoped to the export CSV (BR5 above), not the on-screen transaction listing.
