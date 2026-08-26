# Story 1 — The file settings listing

**Slug:** `story-1-file-settings-listing`
**Route:** `/file-settings`
**Target file:** `web/src/app/(app)/file-settings/page.tsx`
**Page action:** `create_new`
**Roles:** Approver
**Requirement IDs:** R1, R15, BR1, FNFR1, FNFR3
**Infrastructure only:** false

## Plain summary

An Approver opens File settings from the Administration part of the menu and sees every rule the
application uses to decide how a file is read — its name, where the file comes from, what kind of file
it is, which way it travels, where its records are staged and landed, which process handles it, and
whether it is in use. The listing orders and pages the same way Received files does. Opening one takes
the Approver to that setting. Anyone without the Approver role gets the permission explanation in
place rather than a blank screen.

## Summary

Creates the File settings screen at `/file-settings` inside the **inherited** `(app)` route group —
the sidebar, signed-in block, `Sign out`, light/dark switch and idle-session handling all come from
`sign-in-and-session` and are not rebuilt here. This story also gives the sidebar's `File settings`
destination its first real page: the entry already exists in
`web/src/components/shell/navigation.ts` behind the `fileSettings.administer` permission, which
`web/src/lib/auth/permissions.ts` already grants to the Approver alone — **neither file is edited**.
`aria-current` already matches on `/file-settings/*`, so the detail route in story 2 keeps the menu
item highlighted with no further work.

Fetches `GET /v1/file-settings` (no parameters — the endpoint takes none) and renders the column set
through **the shared sortable table, pager, loading ladder and empty/partial states introduced by
`received-files`**, not a second implementation of them. `Direction` arrives as `In`/`Out` and is
presented as `Inbound`/`Outbound`; `IsActive` is presented as a badge pairing colour with the word.
The route is wrapped in the inherited `@/components/auth/RoleGuard` with
`rolesGranting('fileSettings.administer')`, so an Importer gets the in-place padlock panel (BR1).
Adds `web/src/lib/api/file-settings.ts` in the shape of `web/src/lib/api/auth.ts`.

**This story consumes the shared surface; it does not introduce one.** Do not create a `layout.tsx`
or a route group here, and do not rebuild the table, pager or loading states.

## Acceptance criteria

| ID | Criterion | Coverage |
|---|---|---|
| AC-1 | The listing shows every file setting with its name, source, type, direction, staging and target names, process definition and whether it is in use. | vitest |
| AC-2 | Direction reads as a word a person can read rather than the abbreviation the service stores, and whether a setting is in use is shown as a badge pairing a colour with the word, never colour alone. | vitest |
| AC-3 | Any column heading orders the whole listing, one column at a time, and Back, Next and the Rows chooser page through it — behaving exactly as they do on Received files. | playwright |
| AC-4 | An Importer who types the file-settings address straight into the address bar sees the in-place permission explanation, with the menu and Sign out still working. | playwright |
| AC-5 | When no settings come back the screen names what is absent rather than showing an empty table, and when the listing cannot be fetched the failure is stated with an action to try again. | vitest |
| AC-6 | Opening a row takes the Approver to that setting, and the File settings menu item stays marked as the current one while there. | playwright |

**Plus 2 technical checks the agents verify automatically** — that the ordering and paging come from
the shared listing components rather than a second implementation local to this screen, and that the
last-changed timestamp is parsed from the service's space-separated form rather than ordered as a
string.

## Resolved design choices

- **This listing reuses Received files' table rather than inventing one.** No artboard was ever drawn
  for File settings, so there is no mockup to build to. Rather than invent a second table style, the
  user chose to add `received-files` as a dependency of this epic so the sortable header, the pager,
  the 300 ms loading ladder and the empty/partial-retrieval states are inherited whole. **Consequence
  to build to:** this epic cannot be built before `received-files` has landed, and this screen must
  not introduce its own table, pager or loading states — if something is missing from the shared
  components, extend them rather than fork them.
- **Direction is shown in words.** The service stores and returns `In` and `Out`. The screen shows
  `Inbound` and `Outbound`; the stored form is never displayed and never matched on in the UI.

## Manual test checklist

- Sign in as an Approver → File settings appears under Administration in the menu; open it and the settings are listed
- Read a row → you see the name, source, type, direction, where records are staged and landed, the process, and whether it is in use
- Look at the direction column → it reads Inbound or Outbound, not an abbreviation
- Click a column heading → the listing reorders by it; click again → it reverses; click a different one → the first heading's arrow goes back to neutral
- Change Rows and press Next → the listing pages exactly as Received files does
- Sign in as an Importer and type the file-settings address → you see the padlock explanation, and the menu and Sign out still work
- Open a setting from a row → you land on that setting, and File settings stays highlighted in the menu
