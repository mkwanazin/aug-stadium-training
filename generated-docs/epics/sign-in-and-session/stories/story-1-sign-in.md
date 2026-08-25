# Story 1 — Sign in

**Slug:** `story-1-sign-in`
**Route:** `/sign-in`
**Target file:** `web/src/app/sign-in/page.tsx`
**Page action:** `create_new`
**Roles:** All Roles
**Requirement IDs:** R1, R2, R3, R7, R8, R9, R10, R17, R18, R19, R20, BR1
**Infrastructure only:** false

## Plain summary

A person signs in with the email address and password they already hold. If something is
missing the form says which field, if the details are refused it says so without revealing
which one was wrong, and after five refusals it says the account is locked and when it frees up.

## Summary

Builds the two-column Sign in screen (brand panel + 360px form column) with Email address and
Password fields, per-field required markers and the "* Required" legend. Wires
`POST /v1/auth/login` through the shared API client with credentials included, and owns the four
outcome states — incomplete submission (validated client-side, no authentication attempted),
rejected credentials (generic banner, neither field flagged), locked account after five
consecutive refusals, and success (banner then redirect to the files landing). No reset,
self-registration or second-factor path exists; the prototype's "letmein" harness strip does not
carry forward.

## Acceptance criteria

| ID | Criterion | Coverage |
|---|---|---|
| AC-1 | The Sign in screen presents the brand panel, the Email address and Password fields with their required markers and the "* Required" legend, and offers no reset link, no self-registration link and no second-factor prompt. | vitest |
| AC-2 | Incomplete submissions are validated per the brief's rules — a field-level message when a field is left empty, the combined banner on submit, nothing reported while the user is still typing, and no sign-in attempt made. | vitest |
| AC-3 | Refused credentials show the generic refusal banner with neither field flagged as the culprit. | vitest |
| AC-4 | A fifth consecutive refused attempt against the same email shows the locked-account message naming when the account is available again, without confirming or denying that the account exists. | vitest |
| AC-5 | A successful sign-in shows the success banner and takes the user through to their files. | playwright |
| AC-6 | The whole sign-in form can be completed with the keyboard alone and the screen passes an accessibility scan. | playwright |

## Resolved design choices

- **Locked-account message — name a fixed period and when the account frees up.** The message
  states that the account is locked and gives the time it becomes available again, e.g.
  *"This account is locked. Too many attempts were refused. Try again after 09:45."* It must not
  confirm or deny that the account exists. The sign-in service documents no locked-account
  response, so the lock is inferred client-side and the "available again" time is a rule this
  application sets — see the unverified assumption recorded on the epic.

## Manual test checklist

- Open the sign-in page → you see the PIM Capital Group panel on the left, Email address and Password on the right, each marked required, with a "* Required" line beneath
- Click into Email address and click away without typing → "An email address is required." appears under the field
- Start typing in a field → no message interrupts you while you are still typing
- Press Sign in with both fields empty → the banner reads "Username and password are required." and nothing is sent
- Sign in with a wrong password → the banner refuses the attempt without saying which of the two was wrong
- Get it wrong five times in a row → the message says the account is locked and when it becomes available again
- Sign in with your real details → you see "Signed in. Taking you to your files…" and land on your files
