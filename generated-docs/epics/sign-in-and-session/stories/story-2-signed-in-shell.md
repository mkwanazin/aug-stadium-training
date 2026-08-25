# Story 2 — Signed-in shell — your name, your menu, and sign out

**Slug:** `story-2-signed-in-shell`
**Route:** `/files`
**Target file:** `web/src/app/(app)/layout.tsx`
**Page action:** `create_new`
**Roles:** Importer, Approver
**Requirement IDs:** R4, R5, R6, R11, R13, BR2, BR3, BR4, BR5, BR6
**Infrastructure only:** false

## Plain summary

Once signed in, every screen sits in the same frame — a sidebar carrying your name and the roles
you hold, a menu showing only the destinations your roles allow, and a Sign out button that waits
for the session to actually end before returning you to sign-in. Anyone not signed in is sent to
sign-in, whatever address they type.

## Summary

Creates the authenticated route group and its layout — the 224px sidebar (brandmark, nav group,
signed-in block pinned to the bottom, Sign out) and the content pane — plus the files landing
route this epic redirects to (a placeholder main region that the Received files epic fills in).
Validates the session on protected-surface load via `GET /v1/auth/userinfo`, populating the
identity block from `FirstName`/`LastName` and `Roles`, and redirecting to sign-in on 401. Role
gating is evaluated against the roles the account actually holds rather than a hard-coded two-way
branch, so a role outside Importer/Approver is handled rather than assumed. Sign out awaits
`POST /v1/auth/logout` before navigating, and the previously-viewed page must not be recoverable
from the browser's back cache. Replaces the untouched template root page.

**This story introduces the shared surface every later epic consumes** — the app shell, the
session check and the role-permission helper. Keep the role check a permission test against the
roles held, never a two-way Importer/Approver branch.

## Acceptance criteria

| ID | Criterion | Coverage |
|---|---|---|
| AC-1 | The sidebar shows the signed-in person's name and a badge for each role they hold, and keeps showing them for as long as the session is valid — not only straight after signing in. | vitest |
| AC-2 | The menu offers only the destinations the signed-in person's roles permit — "Upload a file" absent for an Approver, Approver-only items absent for an Importer — and omits the de-scoped "Users and roles" entry entirely. | vitest |
| AC-3 | While signed out, any signed-in URL — including the app root — sends the person to the sign-in screen rather than a welcome page. | playwright |
| AC-4 | Sign out waits for the session to be ended before navigating, and only then returns the person to sign-in. | playwright |
| AC-5 | After signing out, pressing the browser Back button does not reveal the previously-viewed page — the person is returned to sign-in. | playwright |
| AC-6 | The sidebar, its menu and Sign out can be operated with the keyboard alone and the shell passes an accessibility scan. | playwright |

## Resolved design choices

- **Light/dark: give people a switch in the sidebar.** The user chose an explicit, user-settable
  light/dark control in the sidebar over silently following the device setting. It overrides the
  device preference, is remembered per person, and both themes already exist in the design system
  (`documentation/design-system-light.html` / `-dark.html`) so this is a token-level switch, not a
  restyle. This is a **project-wide convention** — the switch lives in the shell built here and
  every later epic's screens inherit it. Recorded in the design digest's Your Decisions.

## Manual test checklist

- Open the app while signed out → you land on the sign-in page, not a welcome page
- Type a signed-in address (for example /files) into the address bar while signed out → you land on sign-in
- Sign in → the bottom of the sidebar shows your name and a badge for each role you hold
- Sign in as an Importer → "Upload a file" is in the menu; sign in as an Approver → it is not there
- Look for "Users and roles" in the menu → it is absent, since user administration is not part of this build
- Click Sign out → the button shows it is working, then you arrive back at sign-in
- Sign in, sign out, then press the browser Back button → you're sent to sign-in, not back into the app
- Switch the sidebar's light/dark control → the whole app changes theme and stays that way when you sign back in
