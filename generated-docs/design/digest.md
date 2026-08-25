# Design Digest — PIM Capital Group — Transaction file importer

A financial-services back-office console for bringing transaction files into a permanent record under human control. A user signs in, uploads a delimited transaction file against a named "file setting", the system registers/duplicate-checks/imports/transforms/validates it, and an Approver then reviews every transaction and approves or rejects it before anything is committed. Faulted files get a diagnosis surface, every file carries a step-by-step processing history, and a reporting surface counts the work over a period and hands approved data to finance.

| Field | Value |
|---|---|
| Read from | `documentation/SignIn-html/SignIn.dc.html`, `documentation/Main-html/Main.dc.html`, `documentation/Upload-html/Upload.dc.html`, `documentation/Review-html/Review.dc.html`, `documentation/Diagnose-html/Diagnose.dc.html`, `documentation/Trace-html/Trace.dc.html`, `documentation/Report-html/Report.dc.html`, `documentation/States-html/States.dc.html`, `documentation/design-system-light.html`, `documentation/design-system-dark.html`, the eight per-folder `README.md` files, and `documentation/example_import_file.csv`. Data shapes cross-checked against `documentation/Transaction_Management_API.yaml`. The `vendor/react*.js` and `support.js` files in each folder are the prototype's rendering runtime and carry no design. |
| Artifact verdict | design — eight readable HTML artboards covering seven product surfaces plus a states catalogue, backed by two design-system token references |
| Interpreter confidence | high — every artboard is plain text markup with an explicit shared token layer; copy, validation text and colour values were read directly rather than inferred |
| Last updated | 2026-08-25T00:00:00Z |

---

## Your Decisions

- **Received files — the Standing column is worked out from the step a file last completed, not from the status the service returns** *(received-files, 2026-08-25)*
  The file service reports the workflow engine's own six statuses (Idle, Running, Finished, Suspended, Faulted, Cancelled), not the eight standings drawn in the design. Standing is derived from the last completed step, named in the design's words, with a faulted or cancelled file overriding that, and anything unrecognised shown plainly on a neutral badge. Overrides the design's implied one-to-one mapping.
- **Received files — the `Uploaded by` column is not built** *(received-files, 2026-08-25)*
  No field in the file service names who uploaded a file, and no lookup endpoint exists that would supply one. The column is left out until the backend exposes it. Overrides the design's Approver-only column and the review screen's meta-grid entry is unaffected.
- **Received files — the 90-day retention footnote is shown as designed** *(received-files, 2026-08-25)*
  Answers the Uncertainty asking whether 90 days is the real retention period.
- **Received files — a row's `Open` action goes to that file's Processing history** *(received-files, 2026-08-25)*
  The design never says where Open leads. Review and Diagnose keep their own destinations; Open becomes the general "show me this file" route.
- **Processing history — both file retrievals live on this screen, as two separately labelled actions** *(processing-history, 2026-08-25)*
  The design places no download control on Processing history at all, and the File review header's `Download data` button carries no described behaviour anywhere. The data file recorded against the file log entry and the file exactly as it was received are offered as two distinct, plainly-named actions here. File review's undescribed `Download data` button is left unused until `file-review-and-decisions` settles it.
- **Processing history — the change timestamp is worked out from the last completed step, and who acted is shown as plainly not recorded** *(processing-history, 2026-08-25)*
  The file service holds neither an acting user nor a change timestamp — the same gap that kept the `Uploaded by` column off Received files. Both stay in the audit-trail summary: the change timestamp is derived from the last completed processing step's end time, and the acting user reads as a stated absence rather than a blank cell, so the row is ready when the backend supplies a value.
- **Processing history — `Back to the file` routes by standing until File review exists** *(processing-history, 2026-08-25)*
  The control is inert in the design, and its intended destination is the File review screen, which belongs to the not-yet-planned `file-review-and-decisions`. A faulted file goes to its diagnosis screen; every other file goes to Received files. When File review is built, only the non-faulted branch changes.

---

## Screens

### Sign in

- **Purpose:** Authenticate an existing user into the importer. There is no self-registration and no reset flow shown.
- **Layout:** Two-column split on a 1200 × 760 canvas. Left column (`minmax(280px, 1fr)`) is a solid brand-primary panel with white text, padded 48px/40px, holding three stacked blocks spaced apart top-to-bottom: an organisation lockup, a large heading, and a reassurance paragraph. Right column (`1.2fr`) centres a form column capped at 360px wide with 16px gaps. A theme prop switches the whole artboard between light and dark.
- **Fields:**
  - Label `Email address` with a required marker ` *` in brand-primary; `type="email"`; placeholder `name@pimcapitalgroup.com`.
  - Label `Password` with a required marker ` *`; `type="password"`; placeholder `••••••••••`.
  - Required-field footnote below the pair: `* Required`.
- **Validation:**
  - Missing email → inline error under the field: `An email address is required.` and the field border turns error-coloured.
  - Missing password → inline error under the field: `A password is required.`
  - An incomplete submission is reported without attempting authentication, and the banner error text is `Username and password are required.`
  - Rejected credentials produce a banner error that does not name which field was wrong: `Those credentials were not accepted.`
  - The error banner renders the error text in bold error colour followed by: `Check the details and try again.` It has a 4px left border in the error colour and a circled-cross icon.
  - Success banner: bold `Signed in. ` followed by `Taking you to your files…` — left border and icon in the success colour.
- **Navigation:** `Sign in` (full-width primary button) → on success the success banner states the user is being taken to their files, i.e. the Received files listing. No "Forgot password?" link, no "Create account" link, no other outbound control on this screen.
- **Copy:**
  - Brand panel: `PIM Capital Group` / `Financial services back-office` / `Transaction file importer` / `Files are checked before anything is committed. Only transaction data that has passed validation and human review reaches the permanent record.`
  - Form heading: `Sign in`; sub-heading `Use the email address and password you already hold.`
  - Button: `Sign in`
  - Footer hint: `Accounts are created by an administrator — there is no self-registration. After five refused attempts the account is locked for a period.`

### Received files

- **Purpose:** The landing surface after sign-in — a searchable, filterable, sortable listing of every transaction file received, with a per-row action that routes to whatever that file now needs.
- **Layout:** 1440 × 900 app frame. A fixed 224px sidebar on the left (surface-coloured, right hairline border) and a fluid content pane on the right. Sidebar stacks: brand lockup, nav group, then a signed-in block pinned to the bottom with `margin-top: auto` above a top hairline. Content pane has a header band (breadcrumb, then title and primary action on one flex row that wraps) above a scrolling main area with 20px gaps. Main holds a wrapping filter row aligned to its baseline, then the data table with its pager, then a retention footnote. A theme prop switches light/dark.
- **Fields:**
  - Label `Search`, `type="search"`, placeholder `File name or setting…` (min-width 240px).
  - Label `Standing` — select, options: `All standings`, `Registered`, `Duplicate-checked`, `Imported`, `Transformed`, `Validated`, `Landed`, `Faulted`, `Cancelled`.
  - Label `File setting` — select, options: `All settings`, `Salary Payments`, `Collections Batch`, `Vendor Payments`, `Debit Orders`, `Adjustments`.
  - A ghost toggle button reading `Active files only`, which becomes `Active files only ✓` and takes an active style when on.
  - Pager rows-per-page select labelled `Rows` with options `5`, `10`, `20`, `50`, defaulting to 20.
- **Validation:** None — this is a read/filter surface with no submission.
- **Navigation:**
  - Sidebar nav (present on every in-app screen): `Received files` (active here), `Upload a file`, `Import activity`, a section heading `Administration`, then `File settings` and `Users and roles`. `Upload a file` is shown only when the viewer may upload.
  - Sidebar `Sign out` button.
  - Header `Upload a file` primary button → Upload a file. Shown only when the viewer may upload.
  - Clicking a table row selects it (selected row takes a tinted background plus a 3px brand-primary inset left rail).
  - Per-row action button label depends on standing: `Faulted` → `Diagnose`; `Validated` → `Review`; anything else → `Open`.
  - Pager controls `‹ Back` and `Next ›`.
- **Table columns:** `File name`, `File setting`, `Uploaded by`, `Process date`, `Records` (right-aligned), `Last activity`, `Standing`, then an unlabelled right-aligned action column. Every column except the action column is sortable by clicking its header; the active header shows `▲`/`▼` and inactive ones show `⇅`. Default sort is Process date, descending.
- **Role difference:** The `Uploaded by` column is present only for the role accountable for the decision (Approver) and absent for the Importer. The design's inline comment for this reads: "The Approver is accountable for the decision, so they see who brought the file in."
- **Copy:**
  - Breadcrumb `Imports`; page title `Received files`.
  - Count line, right-aligned in the filter row: `<n> files · <n> awaiting a decision · <n> faulted`.
  - Pager: `Showing 1–<n> of <n> records`, `‹ Back`, `Page 1 of 1`, `Next ›`, `Rows`.
  - Footnote: `Imported transaction data and its fault records stay visible in the application for 90 days.`
  - Sidebar: brandmark `PIM Capital Group`, sub-line `Transaction file importer`, eyebrow `Signed in`, role badge (`Importer` or `Approver`), button `Sign out`.
  - Standing badges are colour-coded: `Landed` success, `Validated` warning, `Faulted` error, `Registered`/`Duplicate-checked`/`Imported`/`Transformed` info, `Cancelled` neutral.

### Upload a file

- **Purpose:** Register a new delimited transaction file against a chosen file setting. Nothing is committed here — the file is registered, duplicate-checked and imported before review.
- **Layout:** 1440 × 900 app frame with the same sidebar. Main splits into a two-column grid — a fluid form column and a fixed 328px aside — with a 28px gap, both top-aligned. The form column holds an intro paragraph (capped at `62ch`), then a surface-coloured card with 8px radius and a soft shadow containing the setting select (capped 420px), the file drop target, and an action row. Outcome banners appear below the card. The aside stacks a "Recently submitted" mini-table and a numbered "what happens next" card.
- **Fields:**
  - Label `File setting` with required marker ` *` — select whose empty option reads `Choose the setting this file belongs to…`, then `Salary Payments — inbound, delimited`, `Collections Batch — inbound, delimited`, `Vendor Payments — inbound, delimited`, `Debit Orders — inbound, delimited`, `Adjustments — inbound, delimited`.
  - Once a setting is chosen, a hint under the select summarises it, e.g. `Comma-delimited · staged to payroll.stg_salary · process “Inbound Delimited Import”`. The five summaries are: Salary Payments `Comma-delimited · staged to payroll.stg_salary · process “Inbound Delimited Import”`; Collections Batch `Pipe-delimited · staged to collections.stg_batch · process “Inbound Delimited Import”`; Vendor Payments `Comma-delimited · staged to payables.stg_vendor · process “Inbound Delimited Import”`; Debit Orders `Comma-delimited · staged to collections.stg_debord · process “Inbound Delimited Import”`; Adjustments `Comma-delimited · staged to finance.stg_adjust · process “Inbound Delimited Import”`.
  - Label `File` with required marker ` *` — a full-width dashed-border drop target wrapping a visually hidden file input, with an upload arrow icon above two lines of text. Empty: title `Choose a file, or drop one here`, sub-line `Delimited files only, up to 20 MB`. Once a file is chosen: title is the file name, sub-line `Ready to submit — choose again to replace it`, and the border turns brand-primary. Hovering the target turns its border brand-primary over a faintly tinted background.
- **Validation:**
  - No setting chosen on submit → the select border turns error-coloured and an inline error with a warning icon reads: `A file setting must be chosen before the file can be submitted.`
  - No file chosen on submit → the drop target border turns error-coloured and an inline error reads: `Choose the file you want to bring in.`
  - Both are checked together on submit; neither blocks the other from being reported.
  - When both are supplied, the file is accepted only if it is delimited — the design tests the extensions `.csv`, `.txt`, `.dat`, `.psv`, `.tsv` (case-insensitive).
  - Accepted → success banner (success-coloured 3px left border, tinted background, tick icon), bold title `<file name> has been accepted and registered against <setting name>.` and body `The duplicate check has passed and the file is being imported. You will be told when it is ready to review.`
  - Refused → error banner (error-coloured 3px left border, tinted background, warning-triangle icon), bold title `<file name> was not accepted — it is not a delimited file.` and body `Only delimited files of the agreed format are accepted. The file setting you chose has been kept — submit a corrected file.` The chosen setting is deliberately retained.
- **Navigation:** `Submit for import` (primary) stays on this screen and shows the accepted/refused banner. `Clear` (ghost) resets both fields and any banner. Sidebar nav as on Received files, with `Upload a file` active. No control on this screen routes to the new file's review surface.
- **Copy:**
  - Breadcrumb `Imports`; page title `Upload a file`.
  - Intro: `Choose the setting the file belongs to, then the file itself. The setting decides how the file is read and where its records are staged. Nothing is committed at this step — the file is registered and checked before you review it.`
  - Action row: `Submit for import`, `Clear`, and right-aligned `Fields marked * are required`.
  - Aside heading `Recently submitted`; its table headers `File` and `Standing`; each row shows a file name above a muted timestamp, with a colour-coded standing badge.
  - Aside heading `What happens next`, as a numbered list: `The file is registered against your chosen setting.` / `A duplicate check runs against files already received.` / `Records are imported, transformed and validated.` / `You review the transactions before anything is kept.`
- **Role note:** This artboard is drawn for the Importer (`Thabo Dlamini`, badge `Importer`).

### File review — transactions

- **Purpose:** The decision surface. An Approver reads every transaction imported from a validated file and approves or rejects them — individually or in bulk — with rejections requiring a recorded reason. Also exposes the file's processing history and its failed records.
- **Layout:** 1440 × 1040 app frame with the sidebar. The header band carries a breadcrumb, then a row holding the file name plus its standing badge on the left and a wrapping action cluster on the right. Main stacks: an info alert, a hairline meta grid (`repeat(auto-fit, minmax(150px, 1fr))` with 1px gaps over an overlay background, so cells read as a single ruled grid), then a full-width tabbed panel. Modals render over a full-bleed scrim, centred, in a 460px dialog. A toast is absolutely positioned bottom-right, capped at 440px. A theme prop switches light/dark.
- **Fields:**
  - Reject dialog: label `Reason` with required marker ` *` — a textarea, min-height 78px, vertically resizable, placeholder `State why this data is being turned back.`, with hint `The reason is recorded as the transaction's user note, against your name.`
  - Pager rows-per-page select labelled `Rows`, options `5`/`10`/`20`/`50`, defaulting to 20.
- **Validation:**
  - Empty or whitespace-only reason on confirming a rejection → the textarea border turns error-coloured and an inline error with a warning icon reads: `A reason is required before a rejection can be recorded.` The rejection is not recorded.
  - Approving requires no reason.
- **Navigation:**
  - Header actions: `Reject all` (secondary-styled, circled-cross icon) → reject-all dialog; `Approve all` (primary, tick icon) → approve-all dialog; `Download data` (ghost); `Cancel file` (destructive, bin icon). `Reject all` and `Approve all` appear only for the Approver.
  - Tabs: `Transactions`, `Processing history`, `Failed records`.
  - Per-row `Reject` (ghost) → reject-one dialog; per-row `Approve` (primary) → approves immediately, no dialog. Both appear only for the Approver, and only while that transaction is still awaiting a decision.
  - Reject dialog buttons: `Cancel` (ghost, carrying a visible focus ring in the design) and `Record rejection` (destructive).
  - Approve-all dialog buttons: `Cancel` (ghost, focus ring) and `Approve all` (primary).
  - Toasts carry a dismiss control labelled `Dismiss` rendering as `×`.
  - Breadcrumb `Imports` is a link, followed by ` / File`.
- **Meta grid:** Labelled cells, in order — `File setting`, `Process date`, then `Uploaded by` inserted third for the Approver only, then `Records`, `Last activity`, `Direction`, `Log identifier`. Values shown in the artboard: `Salary Payments`, `25 Aug 2026, 08:14 SAST`, `Thabo Dlamini · Importer`, `20`, `Await decision`, `Inbound`, `40812`. Numeric/date values use tabular numerals.
- **Transactions tab:** Columns `Reference`, `Transaction date`, `Account number`, `Description`, `Amount` (right-aligned), `Type`, `Standing`, `Decision` (right-aligned actions column). All but the actions column sort on header click with the same `▲`/`▼`/`⇅` marks; default sort is Reference ascending. Amounts render as `R ` followed by a space-grouped value (e.g. `R 18 450.00`). A rejected transaction shows its reason beneath the description, prefixed `Reason: `. Once settled, the actions cell is replaced by muted text naming who settled it and when (e.g. `You · 08:31`). Transaction standings seen: `Imported` (awaiting, warning-coloured), `Approved` (success), `Rejected` (error).
- **Account-number masking:** Account numbers are masked by default as `•••••• ` followed by the last four digits, rendered muted and letter-spaced. A per-row eye/eye-slash icon button toggles one number, and a header-level `Reveal account numbers` / `Mask account numbers` ghost button toggles all of them. Both controls exist only for the Approver. Revealing raises a toast stating the reveal is recorded against the user's name. The reject-one dialog repeats the masked account in a tinted strip with an eyebrow label `Account number` and its own `Reveal` / `Mask` button.
- **Processing history tab:** Table with columns `Activity`, `Decision`, `Started`, `Ended`, `Duration` (right-aligned). Decision values render as badges — `Yes` in success colour, `—` and `No` in neutral. Steps shown: `Register`, `Duplicate check`, `Import`, `Transform`, `Validate`, `Await decision` (the last still running, end date `—`, duration `running`). Pager footer reads `Showing 1–6 of 6 records` on the left and `All recorded steps, in order` on the right.
- **Failed records tab (no failures):** A success alert — bold `All 20 records passed validation. ` followed by `No failing records were produced for this file, and no bulk error file exists — so its retrieval is not offered.`
- **Copy:**
  - Info alert: bold `Ready to review. ` followed by `Salary run April.csv is ready to review — 20 transactions imported.`
  - Above the table, left: `<n> approved · <n> rejected · <n> awaiting a decision`. Right: `Times in South African time (GMT+2)`.
  - Pager: `Showing 1–12 of 20 records`, `‹ Back`, `Page 1 of 2`, `Next ›`, `Rows`.
  - Reject-one dialog title: `Reject transaction <Reference>?` (falling back to `Reject transaction?`); body is the transaction's description and amount, `<Description> · R <Amount>`.
  - Reject-all dialog title: `Reject all <n> transactions on Salary run April.csv?`; body: `Rejected transactions are turned back and do not reach the permanent record. This cannot be undone.`
  - Approve-all dialog title: `Approve all <n> transactions on Salary run April.csv?`; body: `Approved transactions are committed to the permanent record. This cannot be undone.`; then either `<n> transactions are already settled and are excluded from this action.` or `Every transaction on this file is awaiting a decision.`
  - Toasts: `<Reference> is approved and committed to the permanent record.` / `Rejection recorded. The reason is held as the transaction note.` / `Rejection recorded against <n> transactions on Salary run April.csv.` / `Account numbers revealed for this review. The reveal is recorded against your name.`

### File diagnosis — faulted file

- **Purpose:** Explain why a file faulted and let the user inspect the individual records that failed validation, retrieve the bulk error file, or cancel the run.
- **Layout:** 1440 × 940 app frame with the sidebar. The header band carries the breadcrumb, then the file name with a `Faulted` badge to its right. Main stacks: a full-width error banner (tinted background, 3px error-coloured left border, warning-triangle icon), a surface card holding a five-column meta grid on the left and a small action cluster on the right, then a section heading row with a right-aligned count, then the failing-records table, then a selected-record detail panel with a 3px brand-primary left border.
- **Fields:** None — read-only inspection surface.
- **Validation:** No form validation. The screen exists to report validation failures already recorded by the import.
- **Navigation:** `Processing history` (small ghost) → Processing history; `Bulk error file` (small ghost, download icon) → retrieves the error file; `Cancel run` (small destructive) → cancel confirmation dialog. Clicking a failing row selects it and populates the detail panel below (selected row takes a tinted background and a 3px brand-primary inset left rail). Breadcrumb `Imports` is a link, followed by ` / File`.
- **Meta:** `File setting` = `Collections Batch`; `Process date` = `25 Aug 2026, 07:52 SAST`; `Records` = `486`; `Failing step` = `Validate` (rendered bold in the error colour); `Bulk error file` = `PAYCOL_20260825_01.err`.
- **Failing-records table:** Columns are driven by returned field definitions rather than a fixed set — the design supplies name, header text and cell alignment per column: `Row` (right), `Change type` (left), `Reference` (left), `Amount` (right), `Account number` (left), `What failed` (left), `Staged at` (left). The "what failed" cell renders bold in the error colour. Change type renders as a muted-background badge. Account numbers appear already masked in the form `•••••• 6602`.
- **Detail panel:** Heading `Staged record <row key>`, with `Produced by <producer>` right-aligned (e.g. `Collections Batch import`). Below, a four-column grid of eyebrow-labelled values covering every field the record carried — the design's set is `Reference`, `Transaction date`, `Account number`, `Description`, `Amount`, `Transaction type`, `Currency`, `Source row`. Offending values render in the error colour (e.g. `4210.005`, `(empty)`, `(not supplied)`). A closing line states the fault in the error colour, e.g. `Amount 4210.005 exceeds the two-decimal limit for a transaction amount.`, `Reference is required on every record and the field was supplied empty.`, `The row terminator was reached before the Amount field — the row carries 8 fields where 9 are expected.`
- **Copy:**
  - Page title `PAYCOL_20260825_01.csv`, badge `Faulted`.
  - Error banner: `Validation failed at the Validate step. 3 of 486 records could not be read.` / `You can review the failed records below or retrieve the bulk error file. The file has not reached the permanent record.` / `Recorded fault · FieldTerminator mismatch on row group 3 — expected 9 fields, found 8. Logged 25 Aug 2026, 07:52 SAST.`
  - Section heading `Records that failed validation`; sub-line `Columns, labels and alignment come from the field definitions returned for this file — not from a fixed set. Select a row to see every field it carried.`; right-aligned count `3 failing records`.
  - Cancel dialog: title `Cancel PAYCOL_20260825_01.csv?`; body `The file is deactivated and removed from staging. It leaves the active listing and its staging record ends, so the failed records will no longer be listable here.` then `Nothing from this file has reached the permanent record. This cannot be undone.`; buttons `Keep the file` (ghost, carrying a visible focus ring) and `Cancel the file` (destructive).
- **Role note:** This artboard is drawn for the Importer.

### Processing history

- **Purpose:** Show every recorded step of a file's import run, in order, with timings, decisions and notes — plus the run's identifiers.
- **Layout:** 1440 × 880 app frame with the sidebar. Header band carries the breadcrumb and the title with a ghost `Back to the file` button on the right. Main opens with a single control row (file picker, standing badge, and a right-aligned summary line), then a two-column grid — a fluid vertical timeline and a fixed 340px aside — with a 28px gap, top-aligned. Each timeline step is a 26px rail column beside a card: a filled 26px circular node carrying the step number, a 2px thread running down to the next node (transparent on the last step), and a card with a 3px left border matching the node colour.
- **Fields:** Label `File` — select of runs, each option formatted `<file name> — <file setting>`, min-width 320px. Options in the artboard: `Salary run April.csv — Salary Payments` and `PAYCOL_20260825_01.csv — Collections Batch`.
- **Validation:** None.
- **Navigation:** `Back to the file` (ghost) → the file's review/diagnosis surface. The `File` select swaps which run the timeline shows. Breadcrumb `Imports` is a link, followed by ` / File`. Sidebar nav shows `Received files` as active.
- **Step card:** Activity name (14px, semibold) with the duration right-aligned in tabular numerals; beneath, a muted row reading `Started <time>` and `Ended <time>`, plus an optional decision badge reading `Decision: <Yes|No>` (success-coloured for `Yes`, muted otherwise); then an optional note line. Node and left-border colour encode the step's outcome — success for a completed step, warning for one still running, error for one that faulted. Note text turns error-coloured on a faulted step.
- **Aside:** File name as a heading, then eyebrow-labelled values: `Log identifier`, `Process definition` (fixed value `Inbound Delimited Import`), `Process instance`, `Last executed activity`, `Records`. Closing footnote above a hairline.
- **Copy:**
  - Page title `Processing history`; button `Back to the file`.
  - Summary line, right-aligned in the control row: e.g. `6 recorded steps · 25 Aug 2026, 08:14:02 – 08:15:22 SAST` and `5 recorded steps · 25 Aug 2026, 07:52:11 – 07:53:48 SAST`.
  - Step notes in the artboard: `No earlier file carries this content hash.` / `20 records staged.` / `All 20 records passed validation.` / `Waiting for an Approver to settle the file.` / `486 records staged.` / `FieldTerminator mismatch on row group 3 — expected 9 fields, found 8. 3 of 486 records could not be read.`
  - Footnote: `All times are South African time (GMT+2). Processing history stays visible for 90 days.`

### Import activity

- **Purpose:** Report on how much work moved through the importer over a chosen period — counts only, broken down by file setting — and hand approved transaction data to the finance team as a delimited export.
- **Layout:** 1440 × 900 app frame with the sidebar. Header band carries the breadcrumb and title. Main opens with an intro paragraph (capped `66ch`) and a right-aligned export button, then a wrapping filter row of period chips, a thin vertical divider, a file-setting select, and a right-aligned period line. Below, three equal metric tiles in a `repeat(3, minmax(0, 1fr))` grid with 16px gaps. Below that, a two-column grid — a fluid breakdown table and a fixed 360px aside — with a 24px gap, top-aligned. A toast sits bottom-right.
- **Fields:**
  - Period chips (pill buttons, the active one taking a tinted brand-primary treatment): `Today`, `This week`, `This month`, `Last 90 days`. Default is `This month`.
  - Label `File setting` — select, options `All settings`, `Salary Payments`, `Collections Batch`, `Vendor Payments`, `Debit Orders`, `Adjustments`.
  - Aside label `Scope` — select, options `Everything approved in this period`, `Approved on a single file…`, `Approved and not yet exported`.
- **Validation:** None. When the chosen scope contains nothing approved, the export is not produced and the outcome says so rather than failing.
- **Navigation:** `Export these counts` (ghost, download icon) produces the summary download and raises a toast. `Export approved transactions` (full-width primary in the aside) produces the finance export and raises a toast. Sidebar nav shows `Import activity` as active. The intro directs the user to the Files listing to see what sits behind the counts, but there is no link control doing so on this screen.
- **Metric tiles:** Each tile shows a coloured dot beside a label, a very large heading-font number in tabular numerals, and a muted sub-line. In order: `Files imported` (info dot) / `Registered, read and staged over the period.`; `Files approved` (success dot) / `Every transaction settled as kept and committed.`; `Files rejected` (error dot) / `Turned back with a recorded reason against each.`
- **Breakdown table:** Heading `By file setting`. Columns `File setting`, then `Imported`, `Approved`, `Rejected` — the three count columns right-aligned and fixed at 120px, in tabular numerals. A footer row labelled `Total` repeats the three headline counts.
- **Copy:**
  - Breadcrumb `Reporting`; page title `Import activity`.
  - Intro: `Where the work stands over the chosen period. Counts only — open a file from the Files listing to look at what is behind them.`
  - Button `Export these counts`.
  - Period line, right-aligned: e.g. `25 Aug 2026, 00:00 – 23:59 SAST`, `24 – 25 Aug 2026 SAST`, `1 – 25 Aug 2026 SAST`, `28 May – 25 Aug 2026 SAST`.
  - Aside heading `Hand approved data to finance`; body `Produces a delimited file of approved transactions only — reference, transaction date, account number, description, amount, type and currency.`; button `Export approved transactions`.
  - Aside scope line: `<n> approved files are in scope for this export.` or, when none, `No approved files in this scope — widen the period, or settle more transactions.`
  - Toasts: `Import activity for <period line> has been produced. Your download is ready.` / `Approved transactions across <n> files have been exported for the finance team.` / `No approved transactions in this scope, so no export was produced.`
- **Role note:** This artboard is drawn for the Approver (`Naledi Mokoena`, badge `Approver`).

### Edge, empty and error states (reference sheet)

- **Purpose:** Not a routable screen — a 1440 × 1900 specification sheet cataloguing twelve non-happy-path states across the other surfaces. Each panel is captioned with the surface it belongs to and the condition it covers.
- **Layout:** A padded sheet with a titled header above a hairline, then a two-column grid of bordered panels with 20px gaps. Each panel has a caption bar (surface name on the left, a condition pill on the right, colour-coded by severity) over a body with a 168px minimum height. Empty states are centre-aligned with an optional outline icon above a heading, a muted explanation, and one or two actions. A closing footnote sits above a hairline at the bottom.
- **Fields:** None.
- **Validation:** None.
- **Navigation:** Each panel names its own recovery action, listed below.
- **The twelve states, verbatim:**
  1. **File listing — Empty.** Heading `No files have been uploaded yet`; body `Upload a transaction file to begin.`; action `Upload a file` (primary). Document-outline icon.
  2. **File listing — Emptied by a restriction.** Shows the active restriction chips (`Active files only`, `Faulted`, `Adjustments`) in brand-primary above heading `No files match the three restrictions in place`; body `The listing is not empty — the restrictions above are hiding everything in it.`; action `Clear all restrictions` (ghost).
  3. **File listing — Loading, past 3 s.** Three rows of shimmering skeleton bars in a `2fr 1.4fr 1.2fr 0.7fr 1fr` grid, then `Still fetching the file listing. Nothing has gone wrong — this is taking longer than usual.` and, smaller, `Nothing is shown below 300 ms; the placeholder appears from 300 ms; this message joins it past 3 s.`
  4. **File listing — Partial load.** Warning note `Showing 6 of the files received — the rest could not be fetched. This is an incomplete listing, not the whole picture.` above a short list of fetched file names (the last at reduced opacity), then action `Request the listing again` (ghost).
  5. **Transaction listing — Empty.** Heading `Salary run April.csv carries no transactions`; body `The file was read successfully but held no records. Check the source file, or cancel this one.`; actions `Back to files` and `Cancel the file` (the latter ghost but tinted error-coloured).
  6. **Transaction listing — Retrieval failed.** File name with its `Validated` badge, then an error note `The transactions on this file could not be retrieved. The file's own standing is unchanged and nothing has been committed.`; action `Request the transactions again` (ghost).
  7. **Any protected surface — Permission denied.** Padlock icon, heading `You do not hold the Approver role`; body `Deciding on a whole file needs the Approver role. Your account holds Importer only, so this surface stays closed to you.`; action `Request the Approver role` (primary).
  8. **Settled transaction — No longer changeable.** Reference `SAL-2604-0003` with an `Approved` badge and `Naledi Mokoena · 25 Aug 2026, 08:31 SAST`, then a neutral note `This transaction is settled and committed to the permanent record. Decision actions are no longer offered on it, and nothing here restores them — a correction is made by importing an adjusting record.`
  9. **Failing-record listing — Faulted with no records.** Bold line `No failing records were produced for this run.`, then an error note `The run faulted at the Import step before any record was staged. Recorded fault: the file could not be opened at /staging/collections/in.` (the path in monospace), then `No bulk error file was produced either, so its retrieval action is absent rather than offered and failing.`
  10. **Review surface — Offline.** Warning note `You are offline. The transactions already fetched stay readable, but no decision can be recorded until the connection is back.`, then a dimmed transaction row (`SAL-2604-0009 · R 24 300.00`, badge `Imported`) with the caption `Approve and Reject are absent while this persists`.
  11. **Export approved data — Empty scope.** Heading `Nothing approved in Salary Payments this week`; body `No export was produced. Widen the period, or settle more transactions first.`; actions `Widen to this month` and `Go to files awaiting a decision`.
  12. **Import activity report — Empty.** Bar-chart outline icon, heading `No files exist in any standing`; body `There is nothing to count yet. Upload a transaction file to begin.`; action `Upload a file` (primary).
- **Copy:**
  - Sheet title `Edge, empty and error states`; intro `What the user meets when the happy path does not hold. Each panel names the surface and the condition. Copy follows the careful-custodian voice: name the thing that is absent or that failed, say what it means for the permanent record, and offer the one action that ends it.`
  - Closing footnote: `A completed action confirms itself transiently and clears after four to eight seconds. A state the user must acknowledge — a lost connection, a missing permission — persists until it is dismissed or resolved.`

---

## Palette & Typography

The eight artboards share one byte-for-byte identical token layer (a `:root` block plus a `[data-theme="dark"]` override), and the two design-system reference documents publish the same values with provenance markers. Where the two disagree, they do not — every value below appears identically in both.

| Token | Value (light) | Value (dark) | Where found |
|---|---|---|---|
| Primary | `#A22921` | `#D25D56` | `--brand-primary` in the shared `:root`/dark blocks in every `*.dc.html`; `design-system-light.html`/`-dark.html` mark light as `extracted-from-url` (`--nectar-accent-color`, 35 hits, from `https://www.pimcapitalgroup.com/za/`) |
| Accent / secondary | `#98C8E8` (secondary) | `#ABCDE3` | `--brand-secondary`; `extracted-from-url` (`--nectar-extra-color-gradient-1` stop 1) |
| Accent | `#FFAC66` | `#FBA760` | `--brand-accent`; `extracted-from-url` (`--nectar-extra-color-gradient-1` stop 2) |
| Background (light) | `#FFFFFF` | — | `--color-background`; `extracted-from-url` (body background / `--nectar-bg-color`) |
| Background (dark) | — | `#1B1818` | `--color-background` under `[data-theme="dark"]`; design-system dark variant |
| Surface | `#FAF7F6` | `#302C2C` | `--color-surface`; design-system marks this `inferred-from-domain` |
| Text | `#191614` | `#EEEDED` | `--color-text`; light `extracted-from-url` (body colour / `--nectar-font-color`) |
| Text muted | `#6B625E` | `#B1ABAA` | `--color-text-muted`; `inferred-from-domain` |
| Success | `#15803D` | `#61D18B` | `--color-success`; `inferred-from-domain` |
| Warning | `#CA8A04` | `#F5BD47` | `--color-warning`; `inferred-from-domain` |
| Error | `#DC2626` | `#EB7070` | `--color-error`; `inferred-from-domain` |
| Info | `#0369A1` | `#4CAFE6` | `--color-info`; `inferred-from-domain` |
| Text on brand | `#FAF7F6` (= surface) | `#302C2C` | `--text-on-brand` |
| Scrim (modal veil) | `rgba(25,22,20,0.42)` | `rgba(12,10,10,0.58)` | `--scrim` |
| Overlays 4/8/12/20 | `rgba(0,0,0,…)` at .04/.08/.12/.20 | `rgba(255,255,255,…)` at the same steps | `--overlay-4` … `--overlay-20`; the dark block flips black to white |
| Focus ring | brand primary | brand primary | `--focus-ring: var(--brand-primary)` |
| Selected row | `color-mix(in srgb, var(--brand-primary) 10%, transparent)` | same | `--selected-row` |

- **Font (headings):** `Montserrat, 'Helvetica Neue', Arial, sans-serif` at weight 400. The design-system marks the family `extracted-from-url` with the fallback chain added because the source site declares none. Used for the brandmark, page titles, section headings and the large report numbers.
- **Font (body):** `Inter, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif` at weight 400, with 500 and 600 in use. `extracted-from-url`.
- **Font loading in the design:** the artboards `@import` Montserrat (400, 500) and Inter (400, 500, 600) from `https://fonts.googleapis.com/css2`.
- **Theme:** both. One shared dark override exists for every artboard. Three artboards (Sign in, Received files, File review) additionally expose a `theme` prop with options `light`/`dark`, default `light`; the other five are drawn light-only despite inheriting the same dark tokens.
- **Type scale (from the design-system doc; the artboards use a subset):** `text-xs` 0.75rem, `text-sm` 0.875rem, `text-base` 1rem, `text-lg` 1.125rem, `text-xl` 1.25rem, `text-2xl` 1.5rem, `text-3xl` 2.6719rem, `text-4xl` 3.75rem. Line heights: tight `1.0`, base `1.625`, loose `1.8`.
- **Composed type roles used across the artboards:** `--type-h1` `400 2.6719rem/1` heading; `--type-h2` `400 1.5rem/1.2` heading; `--type-h3` `400 1.125rem/1.3` heading; `--type-control` `600 13px/1.4` body; `--type-ui` `400 13px/1.5` body; `--type-label` `600 12px/1.4` body; `--type-hint` `400 11px/1.4` body; `--type-eyebrow` `600 11px/1.6` body with `0.04em` tracking. Badge tracking `0.02em`.
- **Spacing / sizing:** `--space-3` 6px, `--space-5` 10px, `--gap-inline` 8px, `--pad-control` `8px 16px`, `--pad-cell` `10px 12px`, `--pad-card` 16px, `--control-height` 34px.
- **Radii:** `xs` 3px, `sm` 4px, `md` 6px, `lg` 8px, `pill` 999px. Controls use `sm`, panels use `md`.
- **Shadows:** `sm` `0 1px 2px 0 rgba(25,22,20,0.06)` (dark: `…0.12`), `md` `0 0 6px rgba(0,0,0,0.2)` (dark: `0.35`), `lg` `0 6px 28px rgba(0,0,0,0.08)` (dark: `0.16`), and a selected-row rail `inset 3px 0 0 var(--brand-primary)`.
- **Motion:** easing `cubic-bezier(0.25, 1, 0.33, 1)`; durations fast 150ms, base 200ms, slow 300ms. Hover brightness filter `0.92`, press `0.82`, disabled opacity `0.5`.
- **Design-system standards accompanying the tokens:** the two reference documents also publish component minimum-feature contracts, an animation policy (subtle by default, honour `prefers-reduced-motion`, no decorative motion on data surfaces), interaction standards (all six states — default, hover, focus-visible, active, disabled, loading; keyboard parity; destructive actions name what they change), accessibility standards (WCAG 2.1 AA baseline, real `<th>` headers with `aria-sort`, errors linked via `aria-describedby` with `aria-invalid`, no placeholder-as-label, 44 × 44 px touch targets, live regions for async feedback), microcopy guidelines (sentence case, verb-led buttons, errors state what happened and what to do, thousands separators, right-aligned numeric columns, no blank tables), and pattern-usage rules (modal for irreversible confirmations, table over card grid for data management, toast for ephemeral confirmation, filters for known dimensions and search for known values).

---

## Data Shapes

Inferred from what the screens display and collect. Field names in the artboards match the schema names in `documentation/Transaction_Management_API.yaml` closely enough to treat the spec as corroboration rather than a separate model; noted below where they line up.

- **File log (a received file)** — `Id`, `CurrentFileName`, `SettingId`, `SettingName`, `ProcessDate`, `RecordCount`, `CurrentStatus`, `LastExecutedActivityName`, `IsActive`, `UploadedBy`, `Direction`, `ProcessInstanceId`, `ProcessDefinitionId`/`ProcessName`, `CurrentFolder`, `FileHash`, `BulkErrorFile`, `HasBulkErrorFile`. The listing's "Log identifier" is this record's id (e.g. `40812`). Matches the spec's `FileLog` schema; `UploadedBy` is shown on screen but is **not** a property of the spec's `FileLog` — flagged below.
- **File standing (`CurrentStatus`)** — an enumeration; the Standing filter offers exactly `Registered`, `Duplicate-checked`, `Imported`, `Transformed`, `Validated`, `Landed`, `Faulted`, `Cancelled`.
- **Transaction** — `Id`, `FileLogId`, `FileName`, `Reference`, `TransactionDate`, `AccountNumber`, `Description`, `Amount`, `TransactionType`, `Currency`, `Status`, `UserNote`, `LastChangedUser`, `LastChangedDate`. Matches the spec's `TransactionRead`. On screen, `TransactionType` displays as `Credit`/`Debit` while the sample import file carries `C`/`D`; `Status` takes `Imported` (awaiting), `Approved`, `Rejected`; `UserNote` holds the rejection reason and is shown prefixed `Reason: `.
- **File process log (a processing step)** — `FileName`, `ActivityName`, `DecisionResult`, `LastExecutedActivityName`, `StartDate`, `EndDate`, plus a duration the screens display. Matches the spec's `FileProcessLog`; duration is not a spec property and appears to be derived from start/end. Activity names seen: `Register`, `Duplicate check`, `Import`, `Transform`, `Validate`, `Await decision`, `Land`, `Cancel`.
- **Column definition** — `Name`, `HeaderText`, `CellAlignment` (and, in the spec, `Visible`, `CellDisplay`, `Classes`). Drives the failing-records table's columns, headers and alignment. Matches the spec's `ColumnDefinition`.
- **Failing record (staged record that failed validation)** — a primary key value, `ChangeType` (e.g. `Insert`), the record's own fields keyed by the column definitions above, a "what failed" summary, a staged-at timestamp, a producer (`ChangedBy`, e.g. `Collections Batch import`), and a long-form fault description. Individual field values can be flagged as the offending one.
- **File setting** — an id and `Name` (`Salary Payments`, `Collections Batch`, `Vendor Payments`, `Debit Orders`, `Adjustments`), plus enough configuration to describe itself in one line: delimiter (comma or pipe), direction (`inbound`), staging target (e.g. `payroll.stg_salary`), and process definition name (`Inbound Delimited Import`). Corroborated by the spec's `FileSettingRead`/`BulkFileSettingRead`.
- **User** — name, email, and one or more roles. Shown in the sidebar as name over email with a role badge. Corroborated by the spec's `UserRead`/`RoleRead`.
- **Role** — the artboards exercise exactly two: `Importer` and `Approver`. Approver-only affordances: the `Uploaded by` column, the file-level `Approve all` / `Reject all`, the per-row `Approve` / `Reject`, and account-number reveal. Importer-only affordance: `Upload a file` (both the nav item and the header button are hidden from the Approver).
- **Import activity counts (report)** — per period and per file setting: `imported`, `approved`, `rejected` counts, plus a period label. Periods offered: today, this week, this month, last 90 days.
- **Incoming file record (from `example_import_file.csv`)** — header row `Reference,TransactionDate,AccountNumber,Description,Amount,TransactionType,Currency`; sample values `TXN-20260415-0001`, `2026/04/15 08:12`, `1001-2034-5567`, `Salary deposit - April`, `15750`, `C`, `ZAR`. Note the file's date format (`YYYY/MM/DD HH:mm`) and account format (`nnnn-nnnn-nnnn`) differ from the display formats the artboards use (`25 Aug 2026, 08:14`; `6083 0114 4821`).

---

## Assets

- **No image, logo, icon or font files were supplied.** `documentation/` contains no `.svg`, `.png`, `.jpg`, `.woff`, `.ttf` or similar file.
- **Branding is text-only in the design:** the sidebar brandmark renders the string `PIM Capital Group` in the heading font at 17px in brand-primary, with the sub-line `Transaction file importer` in muted 11px. The sign-in panel renders the same name at 22px with `Financial services back-office` beneath it.
- **All icons are inline SVG paths written directly into each artboard** — circled tick, circled cross, circled info, warning triangle, bin, download arrow, upload arrow, eye / eye-with-slash, padlock, document outline, bar chart, and a wifi-with-slash. They are drawn at 13–34px, use `currentColor` or a token colour, and carry `aria-hidden="true"` where decorative.
- **Fonts are fetched from a remote CDN** by the artboards (Google Fonts `css2` for Montserrat and Inter). No local font files accompany the design.
- **`documentation/example_import_file.csv`** — a 7-column sample of the delimited transaction file the Upload screen accepts.
- **Per-folder `README.md` files** — eight identical-in-shape notes stating each artboard is a reference mockup from a visual design tool, that the values to replicate live in the inline `style="…"` attributes and the `<helmet><style>` block, and that `support.js` and `vendor/react*.js` are the browser runtime and "not part of the design".

---

## Translate, Don't Copy

- **Placeholder / fake data → real data.** Every artboard is explicitly labelled a prototype over fixture data. The nine files in the listing, the twelve transactions, the six processing steps, the three failing records, the two selectable runs, and every count in the report are hard-coded sample values inside each artboard's logic class. They stand in for records that must come from the configured data source.
- **Prototype harness chrome is not product.** Each in-app artboard opens with a top strip reading `Prototype harness — fixture data, no server`, and most carry a `Viewing as` role switch (`Importer` / `Approver`) and a `Reset demo data` button. The sign-in artboard's strip adds `Any password other than “letmein” is refused`. This strip, the role switch, the reset control and the hard-coded `letmein` credential are scaffolding for viewing the mockup — the real role comes from the signed-in user and the real credential check from authentication.
- **Placeholder handlers → real handlers.** Actions in the design mutate local component state and stop there: submitting a file only sets an outcome flag, approving a transaction only writes `You · 08:41` into local state, exports only raise a toast, and `Download data`, `Bulk error file`, `Sign out`, `Back to files` and the nav items are inert. Each needs a real action behind it.
- **Templating bindings mark where data belongs.** The artboards are littered with `{{ … }}` interpolations, `<sc-if value="{{ … }}">` conditionals and `<sc-for list="{{ … }}">` repeaters (with `hint-placeholder-count` / `hint-placeholder-val` attributes so the static file previews sensibly). These are the prototype tool's own syntax marking a value, a conditional region or a repeated row — they describe *where* data and branching belong, and none of that syntax belongs in the built app.
- **Remote CDN fonts → locally served assets.** The design pulls Montserrat and Inter over an `@import` from Google Fonts. Fetching brand typography from a third-party CDN at render time is a prototype convenience.
- **Inline SVG paths → icon components.** Every icon is a raw `<svg><path d="…">` pasted inline, repeated verbatim across artboards (the circled tick and warning triangle each appear in four or more files). They are visual intent, not markup to duplicate.
- **Inline styles + hand-rolled CSS classes → design tokens and composed primitives.** The artboards carry a large hand-written stylesheet (`.btn`, `.ctl`, `.field`, `.dt`, `.badge`, `.alert`, `.card`, `.tab`, `.dlg`, `.pager`, `.veil`, `.metagrid`, `.tile`, `.chip`, `.sk`, `.step`) alongside heavy `style="…"` attributes for layout. The token block between `/*TOKENS*/` and `/*END-TOKENS*/` is the design's own values layer and is what carries forward; the class implementations and inline layout are one tool's rendering of that intent, to be re-expressed through tokens and composed primitives.
- **Fixed pixel canvases → responsive layout.** Every artboard is drawn at a fixed size (`width: 1200px; height: 760px` for sign-in; `1440px` wide by 880–1900px for the rest). Those are artboard dimensions, not viewport constraints. The internal layout does carry real responsive intent worth keeping — `minmax()` grid tracks, `flex-wrap: wrap` on the header, filter and action rows, `repeat(auto-fit, minmax(150px, 1fr))` on the meta grid, and `ch`-based measure caps on prose.
- **The design's own prototype-only reveals.** The reject-all flow in the design silently skips already-settled transactions by checking local state, and account masking is done client-side by slicing the last four characters off a full number already present in the fixture. Both are prototype shortcuts standing in for whatever the real data and permission model provide.

---

## Uncertainties

- **Two nav destinations have no artboard.** Every in-app sidebar lists `File settings` and `Users and roles` under an `Administration` heading, but neither surface was designed. Are they in scope, and what should they show?
- **The `Download data` button on the file review header has no described behaviour.** What does it produce — the raw uploaded file, the imported transactions, or something else?
- **`Cancel file` on the review header vs. `Cancel run` on the diagnosis screen.** Two differently-labelled destructive controls that look like the same operation, and only the diagnosis one has a confirmation dialog designed. Are they the same action, and should the review one confirm the same way?
- **No retry affordance was designed for a faulted file.** The diagnosis screen offers `Processing history`, `Bulk error file` and `Cancel run`, but nothing to re-run validation — even though the API spec exposes a retry-validation operation. Should a faulted file be retryable from this screen?
- **The account-lock rule is stated without a duration.** Sign-in copy reads "After five refused attempts the account is locked for a period." How long is that period, and what should the user see when they hit it? No locked-account state was designed.
- **No password-reset or forgotten-password path exists anywhere in the design**, and sign-in states accounts are administrator-created with no self-registration. Confirm there is genuinely no reset flow for a user to reach.
- **Account-number reveal is Approver-only and self-audited in the design** — revealing raises a toast saying "the reveal is recorded against your name". Confirm reveals must be recorded, whether an Importer should ever be able to reveal, and whether the recording needs to be visible anywhere.
- **The role set may be larger than two.** The artboards exercise only `Importer` and `Approver`, but the API spec's role example is `Viewer`. What is the full role set, and what may each role do?
- **Page size is inconsistent between two listings.** The file listing shows `Page 1 of 1` for 9 rows with the `Rows` select defaulting to 20; the transaction listing shows `Showing 1–12 of 20 records` / `Page 1 of 2` with the same select also defaulting to 20. One of the two disagrees with its own selector. What is the default page size?
- **Dark mode is only half-committed.** All eight artboards share the same dark token override, but only Sign in, Received files and File review expose a light/dark switch, and the other five are drawn light-only. Should dark mode be available everywhere, and is there a user-facing theme control at all? (The switch in the artboards is a design-tool prop, not an on-screen control.)
- **Time zone handling.** Copy states `Times in South African time (GMT+2)` and every timestamp is rendered in SAST. Should times always render in SAST regardless of where the viewer is, or in the viewer's local zone?
- **The 90-day retention statement appears twice as user-facing copy** ("Imported transaction data and its fault records stay visible in the application for 90 days", "Processing history stays visible for 90 days"). Is 90 days the actual retention, and should anything be shown when a record ages out?
- **Currency.** Amounts render as `R ` plus a space-grouped value and the sample import carries `Currency: ZAR` on every row, yet currency is a per-transaction field. Is this ZAR-only, or must other currencies display correctly?
- **`TransactionType` is displayed and stored differently.** The screens show `Credit` / `Debit`; the sample import file carries `C` / `D`; the API example is `Debit`. Which representation is authoritative, and where does the mapping happen?
- **`Uploaded by` is displayed but not in the file-log schema.** The listing and the review meta grid both show who uploaded a file (Approver only), but the spec's `FileLog` has no such property. Where does that value come from?
- **The `Request the Approver role` button in the permission-denied state has no destination.** Where does that request go, and what does the user see afterwards?
- **No logo or image asset was supplied** — branding is the literal text `PIM Capital Group`. Is there a logo file to use instead, and if so where?
- **Seven of the eleven palette values are marked `inferred-from-domain` rather than extracted from the brand site**: surface, text-muted, and all four status colours (success, warning, error, info), plus the whole dark variant which is derived from the light hues rather than sourced. Only primary, secondary, accent, background and text were actually read from `pimcapitalgroup.com`. Please confirm the inferred values are the ones you want, particularly the status colours.
- **Confirm Montserrat and Inter are the intended families** — the design-system doc notes the source site declares no fallback chain, so the fallbacks (`'Helvetica Neue', Arial` and `'Segoe UI', Roboto, 'Helvetica Neue', Arial`) were added by the design tool rather than chosen.
- **The failing-records table is specified as dynamically-columned** — "Columns, labels and alignment come from the field definitions returned for this file — not from a fixed set." Confirm that table must render from returned column definitions rather than a known set of columns.
- **The states sheet specifies timing thresholds that no other artboard shows**: skeletons appear from 300 ms, a "taking longer" message joins past 3 s, and transient confirmations clear after four to eight seconds. Confirm those thresholds, since they are the only place they are stated.
- **The `Import activity` intro tells the user to "open a file from the Files listing", but there is no link doing so** on that screen. Should the report's counts or breakdown rows be clickable through to the listing?
- **The Upload screen never routes the user onward.** After a file is accepted, the copy says "You will be told when it is ready to review" — but no notification surface was designed and no control leads to the new file. How is the user told?
- **`documentation/requirements-application.md` (134 KB) and the two OpenAPI specs were not read as design.** They are a requirements document and API contracts rather than screens, so they are intake's and the build's inputs, not this digest's — beyond the schema cross-check noted under Data Shapes. Flagging it so nothing is assumed to have been silently folded in here.
