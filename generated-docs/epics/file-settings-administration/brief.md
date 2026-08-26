# Epic: File settings administration

Inherits roles, auth, data source, compliance, and styling from project.md.

This is epic 8 of 8. It depends on `sign-in-and-session` (role-gated nav/session shell), `upload-a-file` (the shared in-app application shell — sidebar, header band, page chrome — this epic inherits rather than re-creates) and `received-files` (the shared listing components — sortable column headers, pager, the 300 ms loading ladder and the empty/partial-retrieval states — which this epic reuses rather than rebuilding). No artboard was designed for this area: the design digest lists `File settings` and `Users and roles` as nav destinations with no screen behind either (digest Uncertainty #1). Per the explicit project scope note, `Users and roles` is not built in this project at all — this epic covers file settings, file locations, bulk-load settings, configuration lookups and process definitions only, built to the established design-system token/component patterns (`documentation/design-system-light.html` / `-dark.html`) and the conventions the earlier epics have already set (sortable tables, tabs, forms with a required-marker legend, save/amend flows), not to a mockup.

---

## Goal

The Approver keeps the rules that decide which files are accepted current — the settings, their locations and their bulk-load parameters — without waiting on a release, and can see what changed and who changed it.

---

## Data Model

Scoped to what this epic reads and writes. Field names follow `documentation/Transaction_Management_API.yaml`; the digest's Data Shapes section corroborates the same fields from the screens the design *does* cover (e.g. the Upload screen's setting summaries).

- **FileSettingRead** (`GET /v1/file-settings` → `FileSettingReadList.FileSettings[]`) — `Id`, `Name`, `SourceId`, `SourceName`, `TypeId`, `TypeName`, `Direction` (`In`/`Out` — see Notes & Caveats), `StagingSchema`, `StagingTable`, `TargetSchema`, `TargetTable`, `ProcessDefinitionId`, `ProcessDefinitionName`, `IsActive`, `LastChangedUser`, `LastChangedDate`. This one shape carries both the listing (F-33) and the audit view (§6.9) — see Notes & Caveats on what "history" means given this shape.
- **FileSettingWrite** (submitted to `PUT /v1/file-settings/{SettingId}`) — `Name`, `SourceId`, `TypeId`, `Direction`, `StagingSchema`, `StagingTable`, `TargetSchema`, `TargetTable`, `ProcessDefinitionId`, `IsActive`. The `LastChangedUser` header (required on the request, not the body) carries the acting user's name — see Notes & Caveats.
- **FileLocationRead** / **FileLocationReadList** (`GET /v1/file-locations?SettingId={id}`) — `Id`, `SettingId`, `SettingName`, `LocationTypeId`, `LocationTypeName`, `FileName`, `Folder`, `LastChangedUser`, `LastChangedDate`.
- **FileLocationWrite** (submitted to `PUT /v1/file-locations/{LocationId}`) — `SettingId`, `LocationTypeId`, `FileName`, `Folder`.
- **BulkFileSettingRead** / **BulkFileSettingReadList** (`GET /v1/bulk-file-settings?SettingId={id}`) — `Id`, `SettingId`, `SettingName`, `BulkSettingDatabaseId`, `BulkSettingDatabaseName`, `SchemaName`, `TableName`, `ErrorFile`, `FormatFile`, `FirstRow`, `RowTerminator`, `FieldTerminator`, `QuotedIdentifier`, `LastChangedUser`, `LastChangedDate`.
- **BulkFileSettingWrite** (submitted to `PUT /v1/bulk-file-settings/{BulkFileSettingId}`) — `SettingId`, `BulkSettingDatabaseId`, `SchemaName`, `TableName`, `ErrorFile`, `FormatFile`, `FirstRow`, `RowTerminator`, `FieldTerminator`, `QuotedIdentifier`.
- **IdNameType** / **IdNameTypeList** — `Id`, `Name`, `LastChangedUser`, `LastChangedDate`. The generic shape returned by all four configuration-lookup list endpoints this epic reads: `GET /v1/file-sources`, `GET /v1/file-types`, `GET /v1/file-location-types`, `GET /v1/bulk-file-setting-databases`. Each is fetched from its own endpoint — nothing in the shape itself names which lookup kind a row belongs to.
- **ProcessDefinitionRead** / **ProcessDefinitionReadList** (`GET /v1/process-definitions`) — `DefinitionId` (string), `Name`.
- **DefaultResponse** — `Id`, `MessageType`, `Messages[]` — the shape of a successful save confirmation from any of the three `PUT` endpoints.

---

## Functional Requirements

1. **R1** — The user can see every file setting, with its source, type, direction, staging and target names, process definition and active state. *(F-33)*
2. **R2** — The user can amend an existing file setting; saving applies the change and records the acting user. *(F-34)*
3. **R3** — The user can see every file location declared for a file setting, with its location type, filename and folder. *(F-35)*
4. **R4** — The user can amend an existing file location; saving applies the change and records the acting user. *(F-36)*
5. **R5** — The user can see every bulk-load setting declared for a file setting, with its database, schema and table names and its record and field terminators. *(F-37)*
6. **R6** — The user can amend an existing bulk-load setting; saving applies the change and records the acting user. *(F-38)*
7. **R7** — When building or amending a file setting, the available file sources, file types, file location types and bulk-load databases are presented to choose from. *(F-39)*
8. **R8** — When building or amending a file setting, the available process definitions are presented to choose from. *(F-40)*
9. **R9** — A file setting must be named; a save without a name is rejected and reported. *(§6.3 FileSetting.Name — "A name is required for this file setting.")*
10. **R10** — A file setting must name the staging table its records are landed into; a save without one is rejected and reported. *(§6.3 FileSetting.StagingTable — "A staging table is required for this file setting.")*
11. **R11** — A file location must name the folder it refers to; a save without one is rejected and reported. *(§6.3 FileLocation.Folder — "A folder is required for this location.")*
12. **R12** — A bulk-load setting must state the field terminator used in the file; a save without one is rejected and reported. *(§6.3 BulkFileSetting.FieldTerminator — "A field terminator is required for this bulk-load setting.")*
13. **R13** — The first editable field takes focus when the file-setting, file-location or bulk-load-setting edit form opens. *(UI-02)*
14. **R14** — The file-setting edit form (10 form-input fields: name, source, type, direction, staging schema/table, target schema/table, process definition, active state) and the bulk-load-setting edit form (9 form-input fields: database, schema, table, error file, format file, first row, row terminator, field terminator, quoted-identifier) are each grouped into titled sections rather than presented as one continuous list. The file-location edit form (3 fields: location type, filename, folder) is short enough to present as one. *(UI-17)*
15. **R15** — The user can maintain file settings, their locations and their bulk-load settings from within the same administration area, addressing a location or bulk-load setting through the file setting it belongs to; a saved change takes effect for subsequent files without a release. *(UI-38)*
16. **R16** — The Approver can see, against a file setting, who last changed it and when, alongside its current source, type, direction, staging and target names, process definition and active state. *(§6.9 File Setting — reduced from "history over the last 90 days" to the last recorded change; see Notes & Caveats)*

---

## Business Rules

1. **BR1** — Only the Approver role may reach the file-settings administration area (viewing or amending a file setting, its locations, or its bulk-load settings); the Importer has no access to it at all, per §6.5 (Importer's row carries no permission on File Location or Bulk File Setting, and the "Flow: Administer file settings" column is Approver-only). This is a build-out of the nav destination sign-in-and-session's role gating already reserves for the Approver.
2. **BR2** — A save is rejected and the missing field reported, without persisting, if any required field is left empty: `FileSetting.Name`, `FileSetting.StagingTable`, `FileLocation.Folder`, or `BulkFileSetting.FieldTerminator`. *(§6.3, and the administer-file-settings flow's exception path)*
3. **BR3** — Every successful save of a file setting, file location, or bulk-load setting records the acting user and a change timestamp against it. *(F-34/F-36/F-38, UI-38)*
4. **BR4** — A file location and a bulk-load setting are each addressed through the file setting they belong to — there is no independent location or bulk-load-setting listing outside a chosen setting. *(the administer-file-settings flow's steps; also reflected in both list endpoints requiring `SettingId`)*
5. **BR5** — A save is confirmed before it is applied, stating the consequence in words: files already registered keep the rules they came in under, and the change applies to files processed from here on. The confirmation names no count — nothing in the API reports which files a setting is currently governing. *(the administer-file-settings flow's exception path; see Notes & Caveats)*

---

## Key Workflows

1. **View file settings** — Approver opens File settings → the listing presents every setting with its source, type, direction, staging and target names, process definition and active state (R1).
2. **Amend a file setting** — Approver opens one setting → the edit form opens with its fields grouped into titled sections and the first editable field focused (R13/R14) → amends a value → saves → a missing `Name` or `StagingTable` blocks the save and is reported inline (R9/R10/BR2); a successful save records the acting user and takes effect for subsequent files (R2/BR3).
3. **View and amend a file setting's locations** — from within an opened setting, the Approver opens its locations → the listing presents location type, filename and folder for each (R3) → amends one → a missing `Folder` blocks the save (R11/BR2); a successful save records the acting user (R4/BR3).
4. **View and amend a file setting's bulk-load settings** — from within an opened setting, the Approver opens its bulk-load settings → the listing presents database, schema and table names and both terminators for each (R5) → amends one → a missing `FieldTerminator` blocks the save (R12/BR2); a successful save records the acting user (R6/BR3).
5. **Choose from configuration lookups while building or amending a setting** — the file-setting form offers the available file sources, file types, file location types and bulk-load databases as selectable options (R7), and the available process definitions as a selectable option (R8).
6. **View a file setting's change history** — the Approver opens a file setting's history and sees, for the last 90 days, its source, type, direction, staging and target names, process definition, active state, and the acting user and timestamp of the last recorded change (R16) — see Notes & Caveats on what "history" resolves to given the API's shape.
7. **Save blocked — setting referenced by in-flight files** — the Approver amends a setting that governs files not yet landed → the save presents a confirmation naming that consequence before applying it (BR5).
8. **Permission denied** — an Importer reaches this area (directly, by URL, or via a nav item that should be hidden) → the permission-denied surface from sign-in-and-session (R12 of that epic) is shown rather than any file-setting content (BR1).

---

## Feature NFRs

Baseline NFRs (accessibility, performance, responsive breakpoints, browser support, error UX, CORS, session-timeout policy) are inherited from project.md NFR-base-1 through NFR-base-7 and are not repeated here.

- **FNFR1** — With no artboard behind this area, every surface (settings list, location list, bulk-load-settings list, edit forms, history view) is built to the established design-system tokens/components (`documentation/design-system-light.html` / `-dark.html`) and the concrete table/form/tab conventions the earlier epics already set (e.g. the Received-files listing's sortable-header pattern, the review screen's tabbed panel, the sign-in form's required-marker legend) — not invented fresh and not drawn from a mockup that does not exist.
- **FNFR2** — This epic's forms follow the same six-state interaction contract (default, hover, focus-visible, active, disabled, loading) and the same required-field marking convention (UI-01, inherited) as every earlier epic's forms, for visual and behavioural consistency across the whole app.
- **FNFR3** — WCAG 2.1 AA (project.md baseline) applies to the settings/location/bulk-load-setting tables and forms, including real `<th>` headers with `aria-sort` on sortable columns and `aria-describedby`/`aria-invalid` on the required-field errors, per the design-system's own accessibility standards.

---

## Out of Scope

- User and role administration in any form — creating, amending, removing or listing users, listing roles, or any `Users and roles` screen. Explicitly de-scoped from the whole build by the user; the sidebar's `Users and roles` destination is not built in this project.
- **Creating new** file settings, file locations, or bulk-load settings, and **deleting** any of them. The API exposes only `GET` (list) and `PUT` (update) for all three resources — no `POST`/`DELETE` operations exist for `file-settings`, `file-locations`, or `bulk-file-settings`. F-34/F-36/F-38 are scoped to amending an *existing* record; this epic builds no create or delete affordance.
- Managing the configuration lookup values themselves (adding/editing/removing file sources, file types, file location types, or bulk-load databases) and managing process definitions themselves. F-39/F-40 are read-only "present the available values to choose from" requirements — the four lookup lists and the process-definition list are consumed, not administered, here.
- Any audit/history view for entities other than File Setting. §6.9 names File Setting as this epic's only audited entity; Import File and Transaction history live in other epics (processing history, file diagnosis), and User history is out of scope entirely per the de-scope above.
- The `Upload a file` setting-selection dropdown, the Received-files listing's `File setting` filter, and any other epic's *consumption* of file-setting data — this epic owns administering file settings, not every place a file setting is read elsewhere in the app.

---

## Notes & Caveats

- **No design reference for this area at all.** The digest's own Uncertainties flag `File settings` and `Users and roles` as undesigned nav destinations. Everything in this epic — layout, table conventions, form grouping, history presentation — is inferred from the design system's shared tokens/components and the concrete patterns the earlier epics already established (sortable-table headers, tabbed panels, dialog-confirmed destructive actions, required-marker form legends), not from any screen mockup.
- **"History" here is a single latest-state row, not a multi-entry log.** §6.9 asks for a file setting's "history of changes... for the last 90 days," but `FileSettingRead` carries exactly one `LastChangedUser`/`LastChangedDate` pair per setting — there is no versioned/multi-entry change-log endpoint in `Transaction_Management_API.yaml`. As specified, the API can only support showing the setting's *current* state plus who last changed it and when (visible for 90 days, i.e. the value doesn't disappear until that long after the change) — not a chronological list of every past change. **Settled at planning:** build the last-recorded-change presentation only, labelled as the last change rather than as a log. A true multi-entry 90-day history is a known unmet gap — no endpoint, no audit table, no temporal table and no trigger exists to supply it, and the `UPDATE` overwrites in place. Revisit if the backend ever exposes a change log.
- **`LastChangedUser` is a request header, not a form field.** All three `PUT` endpoints (`file-settings/{id}`, `file-locations/{id}`, `bulk-file-settings/{id}`) require a `LastChangedUser` header naming the acting user — the frontend must set this from the signed-in user's identity (`UserInfoRead` from sign-in-and-session), never collect or display it as an editable field on the form itself.
- **No single "get everything for a setting" endpoint.** File settings, their locations and their bulk-load settings are three separate list calls — `GET /v1/file-locations?SettingId={id}` and `GET /v1/bulk-file-settings?SettingId={id}` both require the setting's id as a query parameter. Opening one setting means sequencing (or parallelising) these calls on demand, not a single nested fetch.
- **The four configuration lookups share one generic shape (`IdNameType`)** with no field distinguishing which lookup kind a row is — that distinction comes entirely from which endpoint returned it (`file-sources`, `file-types`, `file-location-types`, `bulk-file-setting-databases`). Keep each lookup's results scoped to the form field it populates; don't merge them into one collection.
- **The "referenced by in-flight files" confirmation (BR5) has no specified copy.** Neither the spec nor the design states the exact wording — BUILD should write this confirmation in the careful-custodian voice already established — name the consequence, offer confirm/abandon — matching the register of the confirmation dialogs already built in earlier epics (e.g. the Cancel-file and Reject-all dialogs). **Settled at planning: the confirmation states no count.** No endpoint reports which files a setting is currently governing, so a number would have to be invented or derived from an unverified join; the wording carries the consequence instead.
- **This epic finally builds the nav item sign-in-and-session only gated.** `File settings` under the sidebar's `Administration` heading was reserved as Approver-only nav real estate by the shell epic; this epic is the first to give it a destination. `Users and roles` remains gated-but-nonexistent — no destination is ever built for it in this project.

### Verified against the running service and the backend source

These were checked at planning time against `documentation/Transaction_Management_API.yaml` and the
Linx backend under `DigiTrainingStadium8Backend/Src/`. They correct or extend the shapes above.

- **`Direction` is `In` / `Out`, not `inbound` / `outbound`.** The column is `varchar(3)` under the CHECK constraint `CkSettingDirection` (`UPPER(Direction) IN ('IN','OUT')`) and the seeded row carries `'In'`. The full words are a display concern only — never send them, and never match on them.
- **There is no `GET /v1/file-settings/{SettingId}`.** That path exposes `PUT` alone. A setting's detail view has to select its row from the list response rather than fetch one; the list takes no parameters, so it is a whole-collection read either way.
- **A file setting with no declared location is invisible to the listing.** `GET /v1/file-settings` reads `[File].[VwFileSetting]`, which **INNER JOINs** `File.Location`. `SELECT DISTINCT` hides the row fan-out but not the exclusion — so R1's "every file setting" is "every file setting that has at least one location". Recorded as an unverified assumption for BUILD to confirm against real data.
- **A setting has at most one bulk-load setting.** The unique index `UxBulkFileSetting` is on `SettingId` alone, even though `GET /v1/bulk-file-settings` returns an array. The bulk-load surface should treat "none declared" as a first-class state and one row as the normal case — not build a general-purpose list.
- **A duplicate save comes back as HTTP 500, not 409.** Colliding on the unique index over `SourceId + TypeId + Direction` returns `{"Id":0,"MessageType":"Warning","Messages":["File Setting already exists"]}` with a 500 status, and the backend detects it by testing whether the SQL error text contains `"duplicate"`. Surface it as a conflict against those three fields rather than as a generic failure — and note the detection is a substring test, so the wording is load-bearing.
- **Saving a setting that no longer exists reports success.** All three `PUT` handlers are bare `UPDATE … WHERE Id = @Id` statements with no existence check: zero rows affected still returns `200 {"MessageType":"Success"}`. A stale id therefore produces a confirmation for a change that never happened.
- **Timestamps are inconsistent between endpoints and carry no offset.** `VwFileSetting` formats `LastChangedDate` with a bare `FORMAT(…, 'yyyy-MM-dd HH:mm:ss')` and **no timezone conversion**, while `file-locations`, `bulk-file-settings` and every configuration lookup first do `AT TIME ZONE 'UTC' AT TIME ZONE 'South Africa Standard Time'`. Two timestamps on the same screen can therefore sit about two hours apart, against the project's GMT+2 compliance rule. None of them are ISO-8601 instants — no `Z`, no offset — so they must be parsed as the service's space-separated form, exactly as `received-files` does for `Process date`.
