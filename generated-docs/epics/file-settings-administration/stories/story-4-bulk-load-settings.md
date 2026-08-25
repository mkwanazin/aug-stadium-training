# Story 4 — A setting's bulk-load settings

**Slug:** `story-4-bulk-load-settings`
**Route:** `/file-settings/[settingId]`
**Target file:** `web/src/app/(app)/file-settings/[settingId]/page.tsx`
**Page action:** `modify_existing`
**Roles:** Approver
**Requirement IDs:** R5, R6, R12, R13, R14, R15, BR1, BR2, BR3, BR4, FNFR2, FNFR3
**Infrastructure only:** false

## Plain summary

From inside an open file setting, the Approver reaches the parameters that govern how that setting's
records are loaded in bulk — which database, schema and table they land in, which error and format
files are used, which row the data starts on, and what separates one record and one field from the
next. Editing them opens a form grouped into titled sections rather than nine fields in a row, with
the cursor already in the first. A field terminator must be stated — leaving it empty stops the save
and says so. A setting with no bulk-load parameters declared says that plainly and offers nothing to
edit.

## Summary

Fills the bulk-load tab of the setting detail screen created in story 2 — no new route. Fetches
`GET /v1/bulk-file-settings?SettingId={id}`, whose `SettingId` query parameter is **required** (BR4).
The response is array-shaped, but the unique index `UxBulkFileSetting` is on `SettingId` alone, so a
setting has **at most one** bulk-load setting: the tab is built around one record and an explicit
"none declared" state, not a general-purpose list. A second row, were one ever to arrive, is surfaced
rather than silently dropped.

Editing opens a form in three titled sections (R14, nine fields): *Destination* (database, schema,
table), *Files* (error file, format file) and *Reading the file* (first row, row terminator, field
terminator, quoted identifier). The database list comes from `GET /v1/bulk-file-setting-databases`,
whose `Name` the service composes from the server and database names; it is kept scoped to this field.
`FieldTerminator` is required (R12, BR2), following the same `reportOnBlur` / `clearFieldError`
convention, `noValidate` form and single `* Required` legend as stories 2 and 3, and the first
editable field takes focus on open (R13).

Saving calls `PUT /v1/bulk-file-settings/{BulkFileSettingId}` with the acting person in the
**`LastChangedUser` request header** (BR3).

## Acceptance criteria

| ID | Criterion | Coverage |
|---|---|---|
| AC-1 | A setting's bulk-load parameters are reached from within the setting itself, showing the database, schema and table they land in, the error and format files, the row the data starts on and what separates one record and one field from the next. | vitest |
| AC-2 | Editing them opens a form grouped into titled sections rather than one continuous list of nine fields, with the first field the Approver can change already focused. | vitest |
| AC-3 | Saving without a field terminator is refused with the omission reported against that field and nothing sent — reported when the field is left and again on submit, never while typing. | vitest |
| AC-4 | A setting with no bulk-load parameters declared names what is absent and offers nothing to edit, rather than showing an empty form or an empty table. | vitest |
| AC-5 | A saved change is recorded against the signed-in person, and the panel then shows the new values and the new last-changed line. | playwright |

**Plus 2 technical checks the agents verify automatically** — that the bulk-load database list is
fetched from its own endpoint and kept separate from the setting form's other lookups, and that a
response carrying more than one bulk-load setting is surfaced rather than silently reduced to the
first row.

## Resolved design choices

- **One bulk-load setting per file setting, not a list.** The endpoint returns an array, but the
  database permits only one row per setting. **Consequence to build to:** build the tab around a
  single record with a first-class "none declared" state; do not give it a table, a pager or an
  ordering affordance, and do not present an "add another" action — the API exposes no way to create
  one.

## Manual test checklist

- Open a setting and go to its bulk-load parameters → you see the database, schema and table, the error and format files, the starting row and both separators
- Read the last-changed line → it names the person who changed it and when
- Edit them → the form opens in titled sections rather than nine fields in a row, and the cursor is already in the first
- Clear the field terminator and move to the next field → the omission is reported against it; type again → the message goes away
- Clear the field terminator and press Save → the save is refused and nothing is sent
- Make a valid change and save → the panel shows the new values, and the last-changed line names you
- Open a setting that has no bulk-load parameters declared → the screen says so plainly and offers nothing to edit
