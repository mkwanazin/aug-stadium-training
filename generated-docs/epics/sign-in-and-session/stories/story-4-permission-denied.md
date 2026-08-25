# Story 4 — Permission denied, explained in place

**Slug:** `story-4-permission-denied`
**Route:** `/files`
**Target file:** `web/src/app/(app)/files/page.tsx`
**Page action:** `modify_existing`
**Roles:** Importer, Approver, Other roles held (e.g. Viewer)
**Requirement IDs:** R11, R12, R20, BR3
**Infrastructure only:** false

## Plain summary

If your roles do not allow a screen, you see a padlock and a plain explanation of the permission
you are missing and what it would let you do — inside the app, with the menu still there — plus a
way to request the role, rather than a bare error page.

## Summary

Delivers the permission-denied panel from the states reference sheet (padlock icon, "You do not
hold the Approver role" heading, explanation of what the role permits, primary "Request the
Approver role" action) and the route-level role guard the later feature epics consume. The guard
renders the panel in place of the content region inside the shell, so navigation and sign out
remain available. The check is evaluated against the roles the account holds — a role outside
Importer/Approver (the auth API's own example is `Viewer`) is denied with the same explanation
rather than silently permitted.

## Acceptance criteria

| ID | Criterion | Coverage |
|---|---|---|
| AC-1 | A signed-in person whose roles do not permit the surface sees, in place of the content, a padlock and an explanation naming the role they lack and what it would let them do. | vitest |
| AC-2 | The explanation offers a request-access action, and taking it confirms to the person that the request was raised. | vitest |
| AC-3 | The permission check follows the roles the account actually holds, so an account holding a role outside the permitted set is refused with the same explanation rather than let through. | vitest |
| AC-4 | Reaching an unpermitted surface by typing its address shows the same in-place explanation with the menu and Sign out still working — not a blank failure page. | playwright |

## Resolved design choices

- **Request access sends an email to a named administrator, and confirms on screen.** Taking the
  "Request the Approver role" action emails a configured administrator address and then confirms
  in place, e.g. *"Your request for the Approver role has been sent to admin@…"*. The
  administrator address is configuration, not a hard-coded literal. This resolves a genuine spec
  gap — the button was drawn in the design but no destination was defined anywhere in the source
  material. Note that *provisioning* the role after the request is still out of scope for this
  epic (see the epic's Out of Scope).

## Manual test checklist

- Sign in with an account whose roles do not allow the files surface → you see a padlock and an explanation instead of the listing
- Read the explanation → it names the role you are missing and what holding it would let you do
- Click "Request the Approver role" → you get a confirmation that the request was raised, naming where it was sent
- Look at the sidebar while the explanation is showing → your name, the menu and Sign out are all still there and still work
- Type the address directly rather than clicking through → you see the same explanation, not a 404 or a blank error page
