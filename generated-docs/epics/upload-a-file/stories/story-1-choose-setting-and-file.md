# Story 1 — Choose a setting and a file, and submit it for import

**Slug:** `story-1-choose-setting-and-file`
**Route:** `/upload`
**Target file:** `web/src/app/(app)/upload/page.tsx`
**Page action:** `create_new`
**Roles:** Importer
**Requirement IDs:** R1, R2, R3, R5, BR2, FNFR-1
**Infrastructure only:** false

## Plain summary

An Importer opens Upload a file, chooses the file setting the file belongs to — seeing a plain
summary of how that setting reads the file and where its records are staged — then chooses a
delimited file by dropping it or picking it, and submits. If the setting or the file is missing,
each omission is reported against its own field and nothing is sent. An Approver who reaches the
screen sees the permission explanation instead.

## Summary

Creates the Upload a file screen inside the **inherited** `(app)` route group — the sidebar, nav
group, signed-in block, `Sign out` and light/dark switch all come from `sign-in-and-session` story
2 and are not rebuilt here. Renders the two-column layout from the design (fluid form column, fixed
328px aside), the file-setting select populated from `GET /v1/file-settings` filtered to active
settings, the composed hint line beneath it, and the dashed-border drop target wrapping a visually
hidden file input. Both fields are validated together on submit — each omission reports inline
against its own field without suppressing the other — and a non-delimited extension is refused
client-side before any network call. The route is wrapped in the inherited
`@/components/auth/RoleGuard` so an Approver gets the in-place padlock panel rather than a refusal
or a blank page.

**This story consumes the shared surface; it does not introduce one.** Do not create a `layout.tsx`
or a route group here.

## Acceptance criteria

| ID | Criterion | Coverage |
|---|---|---|
| AC-1 | The file-setting list offers only settings that are in use, and choosing one shows a plain summary beneath it of how the file will be read, where its records are staged, and which process handles it. | vitest |
| AC-2 | A file can be chosen either by dropping it on the target or through the file picker, and the target then shows the file's name and that it is ready to submit. | playwright |
| AC-3 | Submitting with the setting missing, the file missing, or both reports each omission inline against its own field without either suppressing the other, and nothing is submitted. | vitest |
| AC-4 | A file that is not one of the agreed delimited formats is refused with a stated reason before anything is sent. | vitest |
| AC-5 | Clear returns both fields to empty and removes any outcome message, so the Importer can start again from nothing. | vitest |
| AC-6 | An Approver who types the upload address directly sees the in-place permission explanation, with the menu and Sign out still working. | playwright |

**Plus 2 technical checks the agents verify automatically** — that the active-settings filter is
applied to the response rather than assumed, and that the extension check is genuinely
case-insensitive across all five accepted forms.

## Resolved design choices

- **No client-side file-size limit.** The user chose **not** to enforce the design's
  "up to 20 MB" figure. That number appears only as drawn copy; `Transaction_Management_API.yaml`
  declares no size limit anywhere, so enforcing 20 MB risked turning away files the service would
  have accepted. The file is sent and whatever the service reports is surfaced verbatim through the
  refusal banner (story 2). **Consequence to build to:** the drop target's sub-line must not promise
  a 20 MB ceiling the screen does not enforce — drop the size clause, or replace it with wording
  that does not state a number. This overrides the design's drop-target copy and the brief's
  FNFR-2, which assumed the opposite default.

## Manual test checklist

- Sign in as an Importer and open Upload a file from the menu → you see the setting dropdown, the drop target and Submit for import
- Choose a file setting → a line appears under it summarising how the file is read and where its records go
- Drag a .csv file onto the drop target → the target shows the file name and says it is ready to submit
- Press Submit for import with nothing chosen → both the setting and the file are flagged, each with its own message
- Choose a .pdf and submit → it is refused with a stated reason and nothing is sent
- Press Clear → both fields go back to empty and any message disappears
- Sign in as an Approver and type the upload address → you see the padlock explanation, and the menu and Sign out still work
