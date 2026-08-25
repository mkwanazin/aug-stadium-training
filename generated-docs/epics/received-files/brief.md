Inherits roles, auth, data source, compliance, and styling from project.md.

# Epic: Received files

## Goal

The landing screen after signing in lists every received file with its standing, record count and last activity — searchable, sortable, filterable to files still in play, with a per-row action that follows the file's standing.

This epic also **owns the shared listing conventions** the rest of the product reuses: page navigation + page-size selection, single-field sort with session persistence, the 300ms/3s loading-threshold ladder, the empty-vs-filtered-empty distinction, count-indicator formatting, and the colour-plus-text standing-badge mapping. Later listing surfaces — the File review "Transactions" and "Failed records" tabs, the "Processing history" timeline/table, and the "Import activity" breakdown table — reuse these conventions rather than re-deriving them. Build the paging control, sortable header, skeleton loader, empty-state pattern, and standing badge as components/patterns intended for reuse, not as one-off markup local to this screen.

## Data Model

Scoped to what this epic reads and displays. `FileLog` records themselves are produced by the upload/import pipeline (`upload-a-file` epic and the backend process it kicks off) — this epic only lists and filters them.

**File (`FileLog`)** — matches `documentation/Transaction_Management_API.yaml` `FileLog` schema, retrieved via `GET /v1/file-logs`:

| Field | Type (per spec) | Used for |
|---|---|---|
| `Id` | integer | Row identity; also displayed elsewhere as "Log identifier" (out of scope here — that's the Processing history / File review epics) |
| `CurrentFileName` | string | `File name` column, search target |
| `SettingId` | integer | Join key for the `File setting` filter |
| `SettingName` | string | `File setting` column, search target, filter value |
| `ProcessDate` | string | `Process date` column; default sort field, descending |
| `RecordCount` | string (spec types it as string, not integer) | `Records` column, right-aligned; coerce for display/sort only |
| `CurrentStatus` | string | `Standing` column and filter value; drives the standing badge and the per-row action label |
| `LastExecutedActivityName` | string | `Last activity` column |
| `IsActive` | boolean | Backs the `Active files only` toggle |
| `Direction` | string | Not shown on this screen (surfaces on File review's meta grid instead) |
| `ProcessInstanceId`, `ProcessDefinitionId`, `ProcessName`, `CurrentFolder`, `FileHash`, `BulkErrorFile`, `HasBulkErrorFile` | — | Not used by this screen |

- **`UploadedBy`** — shown in the `Uploaded by` column, **Approver-only** per the digest's role note ("The Approver is accountable for the decision, so they see who brought the file in."). **Not a property of the spec's `FileLog` schema** — flagged as an open question in the design digest's Uncertainties. Until resolved, treat this field as either (a) sourced from a separate lookup keyed by `ProcessInstanceId`/`Id`, or (b) deferred with the column omitted, and confirm with the user/backend team before BUILD wires it.
- **File standing enumeration (`CurrentStatus`)** — exactly: `Registered`, `Duplicate-checked`, `Imported`, `Transformed`, `Validated`, `Landed`, `Faulted`, `Cancelled`. Populates the `Standing` filter's options (prefixed with `All standings`).
- **File setting (lookup)** — id + `Name` only, for the `File setting` filter's options: `All settings`, `Salary Payments`, `Collections Batch`, `Vendor Payments`, `Debit Orders`, `Adjustments`.

**Endpoint:** `GET /v1/file-logs` — **requires** an `IsActive` query parameter (`required: true`, example `'Yes'`); returns `FileLogList { FileLog: FileLog[] }`. **No search, sort, or paging query parameters exist on this endpoint** — see Notes & Caveats.

## Functional Requirements

1. **R1** — The user can see the received files with their current standing.
2. **R2** — The user can restrict the file listing to files that are still active.
3. **R3** — The application presents a file's current standing and its last executed activity.
4. **R4** — Every listing offers page navigation and a page-size selector of 5, 10, 20 and 50 with 20 chosen by default; navigation stays present but inactive when data is smaller than the page size.
5. **R5** — Every listed field can be ordered; ordering is by one field at a time, ascending then descending, and the chosen ordering persists for the session.
6. **R6** — Nothing is shown for waits under 300 ms; a placeholder affordance from 300 ms to 3 s; a placeholder plus a still-working message beyond 3 s.
7. **R7** — Empty-state copy names the thing that is absent and offers the primary action that ends the emptiness.
8. **R8** — A listing emptied by an active restriction shows the active restrictions and a clear-all action and does not offer the creation action; a listing with no data at all does offer it.
9. **R9** — Count indicators show exact counts to 99, show 99+ beyond that, and are absent at zero.
10. **R10** — Standing indicators map by intent — settled/active green, failed/blocked red, awaiting amber, in-progress blue, neutral/cancelled grey — and always pair colour with text or an icon.
11. **R11** — Controls presented as an icon alone carry an on-hover and on-focus label and a matching accessible name, and are never used for a primary destructive action.
12. **R12** — The user can see the received files with each file's current standing, record count and last executed activity.
13. **R13** — The user can restrict the file listing to files that are still active.
14. **R14** — No files received yet: the listing names the absence of received files and offers the upload action.
15. **R15** — Only part of the listing could be retrieved: files already retrieved are presented and the incompleteness is stated rather than implied by a short listing.
16. **R16** — The listing's loading behaviour follows the timing thresholds: waits under 300 ms show nothing; from 300 ms a placeholder affordance; beyond 3 s a still-working message accompanies it.
17. **R17** — The first readable listing appears within 1.5 seconds (p95 time to meaningful content).
18. **R18** — A retention notice states how long imported transaction data and its fault records remain visible in the application, presented where that data is listed.
19. **R19** — Standing is never conveyed by colour alone; every standing indicator pairs its colour with text or an icon.
20. **R20** — Every icon-only control carries an accessible name matching its on-hover and on-focus label.

> R1/R12, R2/R13, and R10/R19, R11/R20 are duplicate statements arriving from different requirement sources (functional, UI-pattern, and NFR catalogues respectively) that all describe the same on-screen behaviour. Implement each pair once — they are not two separate behaviours.

## Business Rules

1. **BR1** (per BR-12) — This is a protected surface: a valid session must be present to reach the Received files listing; without one, the user is returned to sign-in.
2. **BR2** (per BR-17) — Every role-gated element on this screen (the `Uploaded by` column, and any future per-row action reserved to a role) is omitted entirely for a user who does not hold the permitting role — never shown then refused.

## Key Workflows

1. **Land on the listing.** After sign-in, the user arrives at Received files with the default view: sorted by `Process date` descending, page size 20, no filters applied, `Active files only` off.
2. **Search.** Typing in `Search` narrows the listing to files whose name or file setting matches (client-side, case-insensitive substring).
3. **Filter.** Choosing a `Standing`, a `File setting`, and/or toggling `Active files only` narrows the listing further; filters combine (AND). The count line (`<n> files · <n> awaiting a decision · <n> faulted`) reflects the filtered set.
4. **Sort.** Clicking a sortable column header re-sorts the whole (filtered) set by that field, ascending on first click and descending on the next; the previous sort field's indicator reverts to the neutral `⇅` glyph; the chosen field/direction persists for the rest of the session.
5. **Page.** Choosing a `Rows` page size (5/10/20/50) or `‹ Back` / `Next ›` repaginates the current filtered+sorted set; pager stays visible but its controls go inactive when the set is smaller than the page size.
6. **Act on a row.** Clicking anywhere on a row selects it (tinted background, brand-primary inset rail). The row's action button reads `Diagnose` when `CurrentStatus` is `Faulted`, `Review` when `Validated`, and `Open` otherwise, and routes accordingly.
7. **Handle load timing.** A fetch resolving under 300 ms shows the table directly; 300 ms–3 s shows a skeleton in the table's place; beyond 3 s the skeleton is joined by a still-working message. No flash of skeleton for a fast response.
8. **Handle empty results.** No files exist at all → named empty state with the `Upload a file` primary action (shown only to a viewer who may upload, per project.md role rules). Filters/search produce zero rows against a non-empty base set → filtered-empty state showing the active restriction chips and a `Clear all restrictions` action, with no creation action offered.
9. **Handle a partial fetch.** If only some files could be retrieved, the files that did come back are shown, a warning note states the retrieval is incomplete (not implied by a short list), and a retry action is offered.
10. **Read the retention footnote.** The listing carries a footnote stating how long imported data and its fault records remain visible (90 days, per the design; confirm the figure is authoritative — flagged in the digest's Uncertainties).

## Feature NFRs

- **Time to meaningful content:** p95 ≤ 1.5 s to the first readable file listing (R17) — tighter than the project-level general performance baseline (NFR-base-2) and specific to this screen.
- **Reusable listing primitives:** the paging control, sortable header, skeleton/loading ladder, empty vs. filtered-empty pattern, count-indicator formatting, and standing badge built here are the shared surface later listing screens (File review's tabs, Processing history, Import activity breakdown) depend on — build them as reusable components, not screen-local markup.
- Baseline NFRs (accessibility, performance, responsive breakpoints, browser support, error UX, CORS/proxy, session/idle timeout) inherit from project.md and apply unmodified.

## Out of Scope

- The destination screens reached by a row's action button — `File review` (Review), `File diagnosis` (Diagnose), and whatever `Open` resolves to — are built in later epics. This epic implements the routing decision (which label, which route) and the click, not the destination content; a route with no built target yet is expected mid-project, not a defect of this epic.
- Real-time/push notification behaviour for a faulted run or a failed validation (the source spec's NT-02/NT-03) is not part of this epic's requirement set — the listing reflects current standing on load and on an explicit retry, with no push-update mechanism specified here.
- The `File settings` and `Users and roles` administration surfaces under the sidebar's `Administration` heading are undesigned (flagged in the digest's Uncertainties) — no scope here.
- The authenticated app shell (sidebar, header band, sign-out) is assumed to already exist from the epics this depends on (`upload-a-file` and whatever established sign-in); this epic adds the Received files content pane and its own sidebar nav-highlight state, not the shell itself.

## Notes & Caveats

- **`Uploaded by` has no backing field.** Flagged above under Data Model and in the digest's Uncertainties — resolve its data source before wiring the Approver-only column.
- **The backend offers no search, sort, or paging on `GET /v1/file-logs`** — only the required `IsActive` filter. Per `requirements-application.md` §1.7 ("Client-side search / filtering... in-memory index acceptable at the recorded data volume"), implement search, sort and pagination client-side against the fetched set. Revisit if file volumes grow past what an in-memory approach comfortably handles.
- **Default page size is inconsistent in the design itself** (digest Uncertainty: the file listing shows `Page 1 of 1` for 9 rows against a `Rows` selector defaulting to 20, while the transaction listing's own default disagrees with its displayed page). This epic follows R4/UI-04's explicit rule — default 20, pager present-but-inactive under a full page — as the tie-breaker.
- **Standing badge colour mapping**, per the digest: `Landed` → success, `Validated` → warning, `Faulted` → error, `Registered`/`Duplicate-checked`/`Imported`/`Transformed` → info, `Cancelled` → neutral. This satisfies R10/R19's intent-based mapping (settled=green, failed=red, awaiting=amber, in-progress=blue, neutral/cancelled=grey) — note the design calls `Validated` a warning/amber state (awaiting a decision) rather than a settled one.
- **Retention figure (90 days) and the account-lock/permission-request items in the digest's Uncertainties are outside this epic's scope** to resolve — carried here only insofar as the retention footnote's copy is displayed (R18); the figure's accuracy is a business confirmation, not a build decision.
- **Permissions extend, not replace.** `project.md`'s Roles & Permissions table currently holds only a single "View main dashboard" row for both Importer and Approver. This epic needs additional permission distinctions (view the listing, view `Uploaded by`, use the `Active files only` restriction, etc.) — per `agent-autonomy.md`, these are additions and land via the ordinary project-change PR to `project.md`, not a halt.
- **Translate, don't copy** (from the design digest, applicable to this screen): the nine listed files, their standings and counts are prototype fixture data — replace with `GET /v1/file-logs`. The `Prototype harness — fixture data, no server` banner, the `Viewing as` role switch, and `Reset demo data` control are prototype scaffolding, not product — the real role comes from the signed-in session. The `{{ … }}`, `<sc-if>`, `<sc-for>` template syntax in the source artboard marks where data/conditionals/repeats belong and has no equivalent in the built markup. Inline styles and the hand-rolled `.dt`/`.badge`/`.pager`/`.chip` classes are re-expressed through design tokens and composed Shadcn primitives (table, badge, select, pagination).
