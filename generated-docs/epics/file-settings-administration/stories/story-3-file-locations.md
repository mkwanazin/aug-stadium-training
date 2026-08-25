# Story 3 — A setting's file locations

**Slug:** `story-3-file-locations`
**Route:** `/file-settings/[settingId]`
**Target file:** `web/src/app/(app)/file-settings/[settingId]/page.tsx`
**Page action:** `modify_existing`
**Roles:** Approver
**Requirement IDs:** R3, R4, R11, R13, R14, R15, BR1, BR2, BR3, BR4, FNFR2, FNFR3
**Infrastructure only:** false

## Plain summary

From inside an open file setting, the Approver reaches the folders that setting reads from and writes
to. Each one shows what kind of location it is, the file name it expects and the folder it points at,
along with who last changed it and when. Editing one opens a short form of three fields with the
cursor already in the first. A location must name a folder — leaving it empty stops the save and says
so. A setting with no folders declared says that plainly rather than showing an empty table.

## Summary

Fills the locations tab of the setting detail screen created in story 2 — no new route. Fetches
`GET /v1/file-locations?SettingId={id}`, whose `SettingId` query parameter is **required**; there is
no independent location listing outside a chosen setting (BR4), and no single call returns a setting
together with its locations, so this is a separate fetch made when the tab is opened.

Editing opens a single-section form of three fields — location type, file name, folder — which R14
explicitly leaves ungrouped as it is short enough to read whole. Location types come from
`GET /v1/file-location-types`, kept scoped to this field and not merged with story 2's lookups even
though they share the same generic shape. `Folder` is required (R11, BR2), following the same
`reportOnBlur` / `clearFieldError` convention, `noValidate` form and single `* Required` legend as
story 2, and the first editable field takes focus on open (R13).

Saving calls `PUT /v1/file-locations/{LocationId}` with the acting person in the **`LastChangedUser`
request header** (BR3). Note this endpoint's timestamps are converted to South African time by the
service while the file setting's own are not — the two-hour skew between them is a recorded caveat,
not something this story corrects.

## Acceptance criteria

| ID | Criterion | Coverage |
|---|---|---|
| AC-1 | A setting's locations are reached from within the setting itself, and each shows its location type, file name and folder, with who last changed it and when. | vitest |
| AC-2 | Editing a location opens a short form of three fields presented whole rather than split into sections, with the first field the Approver can change already focused. | vitest |
| AC-3 | Saving a location without a folder is refused with the omission reported against the folder and nothing sent — reported when the field is left and again on submit, never while typing. | vitest |
| AC-4 | A saved change is recorded against the signed-in person, and the list then shows the new values and the new last-changed line. | playwright |
| AC-5 | A setting with no locations declared names what is absent rather than showing an empty table, and a locations list that cannot be fetched states the failure with an action to try again. | vitest |

**Plus 2 technical checks the agents verify automatically** — that the location-type list is fetched
from its own endpoint and kept separate from the setting form's other lookups, and that the acting
person travels as a request header rather than in the body.

## Resolved design choices

- **Locations are only ever reached through their setting.** Both the list endpoint and the business
  rule require it: `SettingId` is a required query parameter and BR4 states there is no independent
  location listing. **Consequence to build to:** no `/file-locations` route is created, and no menu
  entry points at one.

## Manual test checklist

- Open a setting and go to its locations → each folder is listed with its kind, the file name it expects and the folder it points at
- Read a row's last-changed line → it names the person who changed it and when
- Edit a location → a short form opens with three fields, all visible at once, and the cursor is already in the first
- Clear the folder and move to the next field → the omission is reported against the folder; type again → the message goes away
- Clear the folder and press Save → the save is refused and nothing is sent
- Make a valid change and save → the list shows the new values, and the last-changed line names you
- Open a setting that has no locations declared → the screen says so plainly instead of showing an empty table
