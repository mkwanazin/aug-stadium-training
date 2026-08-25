# Epic: Sign in and session

Inherits roles, auth, data source, compliance, and styling from project.md.

This is epic 1 of 8, the root epic with no dependencies. It introduces the shared application-shell foundations — session handling, role-gated navigation, the signed-in identity block — that every later epic builds on top of.

---

## Goal

A person signs in with the email address and password they already hold, sees their own name and roles, is warned before an idle session ends, is returned to sign-in when it does, and never sees an action their role does not allow.

---

## Data Model

Scoped to what this epic reads, writes or displays. Field names below follow `documentation/Authentication_API.yaml`; screen copy in the design digest uses looser labels ("email address", "name") for the same underlying fields.

- **LoginRequest** (submitted to `POST /v1/auth/login`) — `Username` (the email address the sign-in form collects and labels "Email address"; the API field name is `Username`, not `Email` — see Notes & Caveats), `Password`.
- **Session** — conveyed exclusively via the `HttpOnly`, `Secure`, `SameSite=Strict` cookie named `session` (per project.md §Authentication). The frontend never reads or stores the cookie's value; it only reacts to 200 vs 401 responses from `/v1/auth/login`, `/v1/auth/logout` and `/v1/auth/userinfo`.
- **UserInfoRead** (returned by `GET /v1/auth/userinfo`) — `Id`, `Email`, `FirstName`, `LastName`, `RolesString`, `Roles` (array of `RoleRead`), `LastChangedUser`, `LastChangedDate`. `FirstName`/`LastName` (or a composed display name) and `Roles`/`RolesString` are what the signed-in identity block (F-06 / UI-40) presents.
- **RoleRead** — `Id`, `Name` (values exercised in the design: `Importer`, `Approver`; the auth API's own example is `Viewer` — the role set actually in force is confirmed by project.md's `custom` roles template, currently Importer/Approver only).
- **DefaultResponse** — `Id`, `MessageType`, `Messages[]` — the shape of a successful login/logout confirmation.
- **ErrorResponse** — `Error` (machine code, e.g. `INVALID_REQUEST`), `Message` (human-readable) — returned on `400` for a malformed login body. A `401` on login carries no body per the spec; the deliberately generic rejected-credentials copy (F-02/BR-08) is a frontend-owned string, not something echoed from the API.
- **Locked-account state** — no schema is defined in `Authentication_API.yaml` for this (no distinct status code or body documented for "locked" vs "rejected"). This epic must decide, in BUILD, how a locked account is distinguished from an ordinary `401` — see Notes & Caveats.

---

## Functional Requirements

1. **R1** — The user can sign in by submitting an email address and a password. *(F-01)*
2. **R2** — On rejected credentials the application presents a failure message that does not disclose which submitted field was wrong. *(F-02)*
3. **R3** — The application reports an incomplete sign-in submission distinctly from rejected credentials, without attempting authentication. *(F-03)*
4. **R4** — The user can sign out, and the application waits for the session to be invalidated (the `POST /v1/auth/logout` response) before navigating away. *(F-04)*
5. **R5** — The application verifies session validity when a protected surface loads and returns the user to sign-in if it is not valid. *(F-05)*
6. **R6** — The application presents the signed-in user's identity (name) and the roles they hold. *(F-06)*
7. **R7** — An email address must be supplied before the sign-in submission is sent; the inline message is "Username and password are required." style enforcement at the field level reads "An email address is required." *(§6.3 SignInSubmission.Username)*
8. **R8** — A password must be supplied before the sign-in submission is sent; the inline message is "A password is required." *(§6.3 SignInSubmission.Password)*
9. **R9** — Required fields on the sign-in form are marked with a single legend line for the form ("`* Required`"); this epic's forms are majority-required, so the marker convention is "required", not "optional". *(UI-01)*
10. **R10** — Synchronous field checks (email/password presence) report when the field is left; the combined "both missing" cross-field check reports on submit; nothing reports while the user is still typing. *(UI-03)*
11. **R11** — Actions a user's roles do not permit (e.g. `Upload a file` in the nav for an Approver, or any Approver-only control for an Importer) are absent from that user's view rather than presented and then refused. *(UI-14)*
12. **R12** — Reaching a protected surface directly without the required permission produces an in-place explanation naming the missing permission and offering a request-access path, not a bare failure page. *(UI-15 / §6.4.5)*
13. **R13** — The signed-in identity and the roles held are presented for as long as the session is valid (not just immediately after login). *(UI-40)*
14. **R14** — An idle session ends after 15 minutes of inactivity. *(§6.6.1)*
15. **R15** — A session ends after 8 hours regardless of activity. *(§6.6.1)*
16. **R16** — The user is warned 60 seconds before an idle sign-out occurs. *(§6.6.1 / NT-06)*
17. **R17** — After five consecutive rejected sign-in attempts against the same submitted credential, the message states that the account is temporarily locked and when it will be available again, without revealing whether an account with that email actually exists. *(§6.6.1)*
18. **R18** — Sign-in accepts exactly one factor (email + password); no additional factor is ever prompted for. *(§6.6.1)*
19. **R19** — No consent banner is presented anywhere in this epic's surfaces; there is no third-party tracking and no regional UI variant to gate. *(§6.6.4)*
20. **R20** — All user-facing copy this epic owns — validation messages, the rejected-credentials banner, the lockout message, the idle warning, the permission-denied explanation — uses the "careful custodian" voice: precise, unhurried, accountable, naming the thing and what the user may do next. *(§1.8)*

---

## Business Rules

1. **BR1** — When submitted credentials are rejected, the failure message must not reveal which submitted field was wrong. *(BR-08)*
2. **BR2** — When a protected surface is reached, a valid session must be present or the user is returned to sign-in. *(BR-12)*
3. **BR3** — When a user reaches a surface, the actions offered follow the roles that user holds. *(BR-17)*
4. **BR4** — When the user signs out, the application waits for the session to be invalidated before navigating away. *(BR-18)*
5. **BR5** — An Importer's role-gated nav/actions surface: may run session, upload, review and cancel flows (cancel gated by BR-15 in a later epic); has no access to Users, Roles, File Locations or Bulk File Settings. This epic uses the permission facts to decide what the shared nav shows an Importer — the Upload/Review/Cancel screens themselves are later epics' scope. *(§6.5, Importer)*
6. **BR6** — An Approver's role-gated nav/actions surface: reads Roles; reads Import Files, steps, transactions and summaries; approves transactions (gated by BR-14 in a later epic); reads/updates File Settings, File Locations and Bulk File Settings; may run session, review, decision and administration flows; may not upload. This epic uses the permission facts to decide what the shared nav shows an Approver. The User create/read/update/delete column is **struck out / de-scoped** — this build does not include user administration, so no "Users and roles" administration screen is planned regardless of what the nav lists in the design. *(§6.5, Approver)*

---

## Key Workflows

1. **Sign in (happy path)** — user lands on Sign in → enters email and password → submits → `POST /v1/auth/login` returns 200 and sets the session cookie → success banner ("Signed in. Taking you to your files…") → navigate to the post-sign-in landing surface (Received files, built in a later epic; this epic stops at "authenticated, redirected").
2. **Sign in — incomplete submission** — user submits with one or both fields empty → the missing-field inline errors surface (R7/R8) and, on submit, the combined banner "Username and password are required." → no call to `/v1/auth/login` is made (R3).
3. **Sign in — rejected credentials** — user submits a complete but wrong email/password pair → `POST /v1/auth/login` returns 401 → banner "Those credentials were not accepted. Check the details and try again." → neither field is flagged as the specific culprit (R2/BR1).
4. **Sign in — account locked** — a fifth consecutive rejected attempt against the same email → the application presents a locked-account message naming when the account becomes available again, without confirming or denying the account exists (R17). *(Exact detection/duration mechanism is a BUILD decision — see Notes & Caveats.)*
5. **Session check on protected-page load** — any protected surface mounts → the application calls `GET /v1/auth/userinfo` (or otherwise validates session state) → 200 renders the surface with identity/roles populated (R5/R6/R13); 401 redirects to Sign in (R5/BR2).
6. **Idle warning and idle sign-out** — 14 minutes of inactivity elapse → a 60-second warning is shown (R16) → if no activity resumes, the session is treated as ended at the 15-minute mark and the user is returned to Sign in (R14/BR2).
7. **Absolute timeout** — regardless of activity, 8 hours after sign-in the session ends and the next protected-page load (or the next API call) redirects to Sign in (R15).
8. **Sign out** — user selects Sign out → `POST /v1/auth/logout` is called and awaited → only once that response resolves does the application navigate to Sign in (R4/BR4).
9. **Role-gated navigation** — the shared nav renders only the items the signed-in user's roles permit (e.g. `Upload a file` hidden from an Approver, Approver-only decision affordances hidden from an Importer) per BR3/BR5/BR6/R11 — this epic builds the gating mechanism the later feature epics consume, not the destination screens themselves.
10. **Permission-denied on direct navigation** — a user without the needed role reaches a protected route by URL → an in-place explanation names the missing permission and offers a request-access path (R12) rather than a generic 403/404.

---

## Feature NFRs

Baseline NFRs (accessibility, performance, responsive breakpoints, browser support, error UX, CORS, session-timeout policy) are inherited from project.md NFR-base-1 through NFR-base-7 and are not repeated here. This epic is where NFR-base-7 (session UX) is actually implemented.

- **FNFR1** — Sign in is the application's "first meaningful surface" referenced by project.md NFR-base-2: TTI p95 ≤ 2.5s and initial bundle ≤ 300 KB compressed are measured against this screen specifically, since it is the one every session begins on.
- **FNFR2** — New shell components this epic introduces (idle-warning dialog, signed-in identity block, permission-denied panel, role-gated nav wrapper) follow the established pattern of the existing design system (tokens, composed primitives, six-state interaction contract) rather than introducing a parallel styling approach. *(§6.6.5)*
- **FNFR3** — WCAG 2.2 AA conformance with a complete keyboard-only path is required through this epic's own surfaces (sign-in, the idle-warning dialog, sign-out, permission-denied) at desktop (≥1280px) and tablet (≥768px) widths — a stricter target than project.md's WCAG 2.1 AA baseline for the flows this epic owns. The same target for upload/review/decision/administration is each later epic's own responsibility. *(§6.6.5)*

---

## Out of Scope

- User and role **administration** (create/read/update/delete users, list/manage roles) — explicitly de-scoped from the whole build by the user. No "Users and roles" administration screen is planned in this or any epic, regardless of the nav item shown in the design artboards. The Approver's §6.5 permission row for User CRUD is struck out for this reason.
- Password reset / forgotten-password flow — the design shows none, and the sign-in footer copy states accounts are administrator-created with no self-registration; this epic assumes no reset path exists (flagged as an open question inherited from the digest's Uncertainties, not resolved here).
- Multi-factor authentication — R18 explicitly rules out a second factor; nothing here should be built to accommodate one.
- The destination screens a role-gated nav item points to (Received files, Upload a file, File review, Import activity, File settings) — those are later epics' scope. This epic delivers the gating mechanism and the shell, not those screens' contents.
- Actually granting or provisioning the "Request the Approver role" access request raised on the permission-denied surface (R12) — this epic surfaces the request-access path; what happens after the request is made (workflow, approval, notification) is unspecified in the source material and not built here.

---

## Notes & Caveats

- **Login field name vs. label mismatch.** The sign-in form is labelled and typed as an email address, but `LoginRequest.Username` is the field name the API actually expects (its own example values are inconsistent — one example uses `demo@test.com`, another uses the bare `demo`). Confirm during BUILD whether the value collected from the "Email address" field is sent as `Username` verbatim, and whether the API truly accepts an email string in that field.
- **No locked-account schema.** `Authentication_API.yaml` documents only `200`/`400`/`401`/`500` for `POST /v1/auth/login`, with no distinct status or body for a locked account. The five-attempt lockout and its "when it will be available again" messaging (R17) has no server contract to read from in the current spec — BUILD needs to confirm with the backend team whether lockout state, attempt counts, and unlock time are returned some other way (e.g. inside the generic `401`, or a currently-undocumented response), or whether the frontend must track attempts client-side (weaker, resettable by refresh, and not recommended given this is a security control).
  - **Decided in BUILD (Story 1):** consecutive `401`s against the same submitted address are counted in the browser, and the fifth presents the locked-account message naming an unlock time 15 minutes ahead (the rate-limit default in `.claude/policies/bff-auth-pattern.md` Rule 3). The count resets on page reload, so this presents a limit rather than enforcing one — the backend remains the security control. Replace with the server's own lockout state once the API exposes it.
- **Prototype harness chrome must not carry forward.** Per the design digest's "Translate, Don't Copy": the sign-in artboard's "Any password other than 'letmein' is refused" strip, and every artboard's role-switch ("Viewing as Importer/Approver") and "Reset demo data" control, are prototype scaffolding for viewing the mockup. The real credential check is the auth API; the real role comes from `UserInfoRead.Roles`, never a client-side switch.
- **Role set may exceed two.** The design exercises only `Importer`/`Approver`; the auth API's own `RoleRead` example is `Viewer`. Project.md's roles template is `custom` with only these two roles currently defined. If a third role surfaces later, the role-gating mechanism this epic builds should already generalise (permission checks against `Roles[]`/`RolesString`, not a hard-coded two-way branch) rather than assume exactly two.
- **Fonts and icons are prototype conveniences, not to be copied literally.** Montserrat/Inter are pulled from a Google Fonts CDN in the design; self-host via `next/font/google` per styling-centralisation policy. All icons in the sign-in/shell surfaces (padlock for permission-denied, etc.) are inline SVG in the source artboards — rebuild as icon components, not copy-pasted markup.
- **"Request the Approver role" has no defined destination** (an open Uncertainty in the design digest, carried here because R12/UI-15's request-access path is this epic's to build) — BUILD will need a placeholder action (e.g., a mailto/notification stub) until the real workflow is specified.
- **Careful-custodian voice applies to every string this epic owns** — the exact banner and validation copy quoted in the design digest's Sign in screen section is the reference voice; new strings this epic must invent (lockout message, idle-warning countdown, permission-denied explanation) should match that register rather than generic framework copy.
