# Story 2 — Amend a file setting

**Slug:** `story-2-amend-a-file-setting`
**Route:** `/file-settings/[settingId]`
**Target file:** `web/src/app/(app)/file-settings/[settingId]/page.tsx`
**Page action:** `create_new`
**Roles:** Approver
**Requirement IDs:** R2, R7, R8, R9, R10, R13, R14, R15, R16, BR1, BR2, BR3, BR5, FNFR2, FNFR3
**Infrastructure only:** false

## Plain summary

An Approver opens one file setting and sees its values laid out in titled sections rather than as one
long list, with the cursor already in the first field they can change. Sources, types and processes
are offered as lists to choose from rather than typed. A setting must keep a name and a staging table
— leaving either empty stops the save and says which one is missing, reported when the field is left
and again on submit, but never while typing. Saving asks for confirmation first, explaining that files
already registered keep the rules they came in under and the change applies to files handled from
here on. Once saved, the screen shows who last changed the setting and when.

## Summary

Creates the setting detail screen and the tabbed panel that stories 3 and 4 fill, inside the
**inherited** `(app)` route group. There is **no `GET /v1/file-settings/{SettingId}`** — the endpoint
exposes `PUT` only — so the setting is selected from the `GET /v1/file-settings` collection by id
rather than fetched singly; a setting the collection does not carry is an explicit not-found state,
not a blank form.

The form is grouped into three titled sections (R14): *Identity* (name, source, type, direction,
in-use), *Staging and target* (staging schema and table, target schema and table) and *Processing*
(process definition). Options come from `GET /v1/file-sources`, `GET /v1/file-types` and
`GET /v1/process-definitions`, each kept scoped to the field it populates — the four lookups share one
generic shape and must not be merged into one collection. `Name` and `StagingTable` are required
(R9/R10, BR2), validated with the `reportOnBlur` / `clearFieldError` convention and the single
`* Required` legend already established in `web/src/components/auth/SignInForm.tsx`, on a `noValidate`
form. The first editable field takes focus on open (R13) — a pattern this epic introduces, as nothing
in the codebase focuses a field today.

Saving goes through the BR5 confirmation, then `PUT /v1/file-settings/{SettingId}` with the acting
person carried in the **`LastChangedUser` request header** — the API client's positional third
argument — never as a form field. A collision on source, type and direction comes back as **HTTP 500**
carrying `MessageType: "Warning"` and `"File Setting already exists"`, and is surfaced as a conflict
against those three fields rather than as an unexplained failure.

**This story consumes the shared surface; it does not introduce one.** Do not create a `layout.tsx` or
a route group here.

## Acceptance criteria

| ID | Criterion | Coverage |
|---|---|---|
| AC-1 | Opening a setting shows its current values grouped into titled sections rather than one continuous list, with the first field the Approver can change already focused. | vitest |
| AC-2 | The source, the type and the process are each chosen from the values the service offers, and each list stays confined to its own field. | vitest |
| AC-3 | Saving without a name, or without a staging table, is refused with the omission reported against its own field and nothing sent — reported when the field is left and again on submit, never while typing. | vitest |
| AC-4 | Saving asks for confirmation first, stating that files already registered keep the rules they came in under and that the change applies to files handled from here on; abandoning the confirmation leaves the setting untouched. | playwright |
| AC-5 | A confirmed save is recorded against the signed-in person, and the screen then shows who last changed the setting and when, described as the last recorded change rather than as a history. | vitest |
| AC-6 | A save that collides with an existing setting on the same source, type and direction is reported as that collision against those fields, not as an unexplained failure. | vitest |

**Plus 3 technical checks the agents verify automatically** — that the acting person travels as a
request header and never appears as a form field or in the body; that the setting is selected from the
collection the service returns rather than fetched singly; and that the last-changed timestamp is
parsed from the service's space-separated form rather than assumed to be an ISO-8601 instant.

## Resolved design choices

- **"History" is the last recorded change, not a log.** §6.9 asks for a file setting's change history
  over the last 90 days, but `File.Setting` is updated in place — there is no audit table, no temporal
  table, no trigger and no history endpoint, and the row carries exactly one `LastChangedUser` /
  `LastChangedDate` pair. **The user chose:** present who last changed the setting and when, labelled
  plainly as the last recorded change. **Consequences to build to:** (i) never present it as a list or
  a timeline, and never imply earlier changes are retrievable; (ii) the 90-day multi-entry history is
  a known unmet gap recorded against this epic, to be revisited only if the backend exposes a change
  log.
- **The save confirmation names no count.** BR5 asks for the consequence to be stated before a save is
  applied. Nothing in the API reports which files a setting is currently governing, so a number would
  have to be invented or derived from an unverified join. **The user chose:** confirm every save and
  carry the consequence in words instead. **Consequence to build to:** the dialog names no file count
  and makes no claim about specific files — it states the rule, in the careful-custodian register of
  the Cancel-file and Reject-all dialogs.

## Manual test checklist

- Open a setting from the listing → its values appear in titled sections, and the cursor is already in the first field you can change
- Open the source, type and process lists → each offers the values the service holds, and none of them is a free-text box
- Clear the name and move to the next field → the omission is reported against the name; start typing again → the message goes away
- Clear the staging table and press Save → the save is refused and the staging table is flagged, with nothing sent
- Press Save on a valid change → you are asked to confirm, and the message explains that files already registered keep the rules they came in under
- Abandon the confirmation → nothing is saved and the setting is as it was
- Confirm the save → the change is recorded, and the screen shows who last changed the setting and when
