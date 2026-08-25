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

## Clarifications added during test generation

- **New environment variable required:** `NEXT_PUBLIC_ACCESS_REQUEST_EMAIL` — the administrator
  address the request-access action mails. It must be added to `web/.env.example` and
  `web/.env.local`, alongside the auth/transactions base-URL fix already recorded in `project.md`
  as known configuration drift. The tests stub it to an address that appears in no brief, design or
  spec, so only code that genuinely reads configuration can render it — a hard-coded literal fails.
- **The deliverable is a reusable guard, not a one-off panel.** `@/components/auth/RoleGuard`, taking
  `requiredRoles: string[]` and a `capability` description, with roles resolved from
  `GET /v1/auth/userinfo`. Later epics attach it to their own routes.
- **A scoping subtlety worth knowing.** The design's permission-denied copy names the **Approver**
  role, but `/files` permits Importer *and* Approver — so at `/files` the only genuinely refused
  account is one holding neither. The tests exercise the guard with `[Approver]` rather than
  assuming `/files` is Approver-only, which satisfies the design copy without hard-wiring a wrong
  assumption into the route.
- **Denial panel shape:** a `role="alert"` region containing a padlock as `role="img"` with a
  lock-naming accessible name, a heading naming the missing role, an explanation naming the
  capability and the role actually held, and the request-access button.

## Manual test checklist

- Sign in with an account whose roles do not allow the files surface → you see a padlock and an explanation instead of the listing
- Read the explanation → it names the role you are missing and what holding it would let you do
- Click "Request the Approver role" → you get a confirmation that the request was raised, naming where it was sent
- Look at the sidebar while the explanation is showing → your name, the menu and Sign out are all still there and still work
- Type the address directly rather than clicking through → you see the same explanation, not a 404 or a blank error page
