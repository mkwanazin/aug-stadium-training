<!--
This template defines project.md for the epic-branch workflow.

Filename contract: generated-docs/project.md (committed to main, stable across epics)

Pure markdown — no YAML front-matter, no machine parsing. Claude reads this
file directly during agent runs to pick up project-level facts. The dashboard
and other automated consumers read state.json instead.

What belongs HERE (project-level, stable across epics):
  - Roles & Permissions
  - Authentication
  - Data Source & Backend Integration
  - Compliance
  - Styling & Branding
  - Baseline NFRs (apply to all features)
  - Design source (if any)

What belongs in per-epic brief.md (not here):
  - Data Model
  - Functional Requirements (R-IDs)
  - Business Rules (BR-IDs)
  - Key Workflows
  - Feature-specific NFRs
  - Out of Scope
  - Notes & Caveats

Project-level edits during BUILD: developer halts, orchestrator opens a
project-change/<slug> PR to main, in-flight epic branches rebase.
Never edit project.md from an epic branch.
See .claude/policies/epic-branch-concurrency.md §6.1.
-->

# Transaction File Importer

A financial-services back-office console for bringing transaction files into a permanent record under human control. Staff bring transaction files into the business, check what those files contain before anything is committed, and decide what is kept — so that only transaction data that has passed validation and human review reaches the permanent record.

| Field | Value |
|---|---|
| Project slug | `transaction-file-importer` |
| Created | 2026-08-25T09:37:36Z |
| Intake source | docs |
| Backend connectivity | verified |

---

## Roles & Permissions

**Template:** `custom`

| Permission | Importer | Approver |
|---|---|---|
| View main dashboard | ✓ | ✓ |

> Permissions extend during BUILD as new stories surface new actions — see [agent-autonomy.md](.claude/shared/agent-autonomy.md). Additions land here via a project-change PR (§6.1 of the epic-branch plan). Permission removals or role-set changes halt for user review.
>
> Note: `documentation/requirements-application.md` §6.5 carries a fuller Importer/Approver × resource RBAC matrix (Import File, Transaction, File Setting, User/Role administration, etc.) — the epic briefs draw on it when a story needs a specific permission distinction. §6.5 highlights worth carrying forward as epics are planned: the Approver alone administers Users & Roles and File Settings; the Importer's access to those areas is read-only or absent; approve/reject actions are gated by BR-14/BR-15.

---

## Authentication

| Field | Value |
|---|---|
| Method | `bff` |
| BFF login endpoint (if BFF) | `POST http://localhost:10010/v1/auth/login` |
| BFF userinfo endpoint (if BFF) | `GET http://localhost:10010/v1/auth/userinfo` |
| BFF logout endpoint (if BFF) | `POST http://localhost:10010/v1/auth/logout` |
| Custom auth notes (if custom) | N/A |

> Auth method is never inferred — the user must confirm explicitly per [authentication-intake.md](.claude/policies/authentication-intake.md).
>
> Session is conveyed exclusively via an `HttpOnly`, `Secure`, `SameSite=Strict` cookie named `session`, set by the auth API on login and cleared (`Max-Age=0`) on logout. The frontend never holds or inspects the credential material — it relies on the browser to attach the cookie automatically. Per `documentation/Authentication_API.yaml`, the frontend SPA and the BFF must share a registrable domain (eTLD+1) for the `SameSite=Strict` cookie to be delivered on same-site requests — see the CORS/proxy note below for the cross-port implication in local development.

---

## Data Source & Backend Integration

| Field | Value |
|---|---|
| Data source | `existing-api` |
| Backend status | `running` |
| Mock layer required | no |

### Backend connectivity — Auth API (BFF)

<!-- Two independent backends share one browser-managed session cookie; a single base URL cannot address both, so each gets its own connectivity row. -->

| Aspect | Value |
|---|---|
| Base URL | `http://localhost:10010` |
| Env var | `NEXT_PUBLIC_AUTH_API_BASE_URL` |
| Auth scheme | cookie (session, browser-managed) |
| Auth header | N/A — no header the frontend sets |
| Auth value format | N/A |
| Credential env vars | none (reachability-only smoke test) |
| Smoke-test endpoint | `GET /v1/health` → HTTP 200 |
| Smoke-test mode | reachability-only |
| Smoke-test status | verified |
| Smoke-test verified at | 2026-08-25T09:37:36Z |
| Smoke-test notes | Re-runnable script: `generated-docs/specs/api-smoke-test-auth.sh` |
| CORS / proxy notes | No `Access-Control-Allow-Origin` observed on an unauthenticated probe (inconclusive — no `Origin` header was sent). Browser calls from `localhost:3000` are cross-origin to this port; re-verify with `-H "Origin: http://localhost:3000"` and confirm `Access-Control-Allow-Credentials: true` before wiring login/userinfo/logout. |

### Backend connectivity — Transactions API

| Aspect | Value |
|---|---|
| Base URL | `http://localhost:10005/transactions-api` |
| Env var | `NEXT_PUBLIC_TRANSACTIONS_API_BASE_URL` |
| Auth scheme | cookie (same `session` cookie, minted by the auth API on a different port) |
| Auth header | N/A — cookie-based |
| Auth value format | N/A |
| Credential env vars | none (reachability-only smoke test) |
| Smoke-test endpoint | `GET /v1/transactions` → HTTP 401 without credentials, scored as reachable (service up, endpoint exists, auth enforced) |
| Smoke-test mode | reachability-only |
| Smoke-test status | verified |
| Smoke-test verified at | 2026-08-25T09:37:36Z |
| Smoke-test notes | Re-runnable script: `generated-docs/specs/api-smoke-test-transactions.sh` |
| CORS / proxy notes | Same caveat as the auth API; additionally confirm the cookie set by `:10010` is delivered on cross-port requests to `:10005` (check `SameSite`/`Domain` on the `Set-Cookie` once login is exercised). |

### Known configuration drift — action item

`web/.env.local` and `web/.env.example` still carry the template default `NEXT_PUBLIC_API_BASE_URL=http://localhost:8042`, which matches neither backend. Both files must be updated to carry `NEXT_PUBLIC_AUTH_API_BASE_URL=http://localhost:10010` and `NEXT_PUBLIC_TRANSACTIONS_API_BASE_URL=http://localhost:10005/transactions-api` in place of the stale default before BUILD wires the API client.

### API specs

| Path | Source |
|---|---|
| `documentation/Authentication_API.yaml` | user-provided |
| `documentation/Transaction_Management_API.yaml` | user-provided |

---

## Compliance

**Applicable domains:** `popia`
**Region (if Personal data applies):** `ZA`

### Compliance Requirements

<!-- One bullet per applicable-domain obligation, expanded from compliance-intake.md §"Per-Domain [INFERRED] Assumptions". -->

- `[INFERRED]` Personal data collection includes a clear purpose statement and user consent mechanism where user accounts are created (accounts are administrator-created — no self-registration — so this applies to the administration flow, not a public sign-up)
- `[INFERRED]` Right to erasure: a mechanism exists for a data subject (a user's email address and name held on their account) to request deletion of their personal data, handled through user administration rather than user self-service
- `[INFERRED]` Personal data encrypted at rest and in transit
- `[INFERRED]` Privacy policy link visible on data-collection surfaces (user administration)
- `[CONFIRMED]` Sensitive-value masking: account numbers carried in imported transaction data are obfuscated by default wherever a transaction is shown to a reviewer, per BR-11 / UI-23 (mask as `•••••• ` + last four digits; per-row and header-level reveal toggles are Approver-only and revealing raises a user-visible, recorded notice)
- `[CONFIRMED]` Audit trail: the acting user is recorded and displayed against every decision (approve/reject) and configuration change, per BR-13, so an action can be attributed to a person after the fact
- `[CONFIRMED]` Imported timestamps are interpreted as South African time (GMT+2 / SAST) throughout the application — per the South African Time Policy and the design's `Times in South African time (GMT+2)` copy
- `[CONFIRMED]` Domain context: SA financial-services back-office — user confirmed the Personal data domain applies to user accounts (email addresses, names) and imported transaction data; region resolved to South Africa (POPIA) from this confirmation

---

## Styling & Branding

| Field | Value |
|---|---|
| Primary brand color | `#A22921` (light) / `#D25D56` (dark) |
| Accent / secondary | `#98C8E8` (light secondary) / `#ABCDE3` (dark); tertiary accent `#FFAC66` (light) / `#FBA760` (dark) |
| Background (light) | `#FFFFFF` |
| Background (dark, if applicable) | `#1B1818` |
| Font family (headings) | Montserrat, `'Helvetica Neue', Arial, sans-serif` |
| Font family (body) | Inter, `'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif` |
| Theme | both — a shared dark token override exists for every screen, but only Sign in, Received files, and File review expose a light/dark switch in the design; flagged as an open question in the design digest's Uncertainties |
| Source | design digest palette (`generated-docs/design/digest.md` §Palette & Typography) |

> Provenance caveat: only primary, secondary, accent, background and text were actually extracted from the brand site (`pimcapitalgroup.com`); surface, text-muted, and all four status colours (success/warning/error/info) are marked `inferred-from-domain` by the interpreter, and the entire dark variant is derived from the light hues rather than sourced. Confirm the inferred values — particularly the status colours — at the INTAKE approval. No logo or image asset was supplied; branding is the literal text "PIM Capital Group".
>
> Component-specific styling (button radii, card shadows, etc.) emerges during BUILD — see [styling-centralisation.md](.claude/policies/styling-centralisation.md).

---

## Baseline NFRs

<!-- Industry-baseline NFRs that apply to all features. Per-epic NFRs live in the epic's brief.md. -->

- **NFR-base-1:** Accessibility — WCAG 2.1 Level AA baseline (the source spec §6.6.5 targets WCAG 2.2 AA with a full keyboard-only path through sign-in, upload, review, decision and administration — carry this stricter target forward at epic planning)
- **NFR-base-2:** Performance — First Contentful Paint < 2.5s on a mid-tier mobile network (the source spec §6.6.2 sets desktop-class budgets: TTI p95 ≤ 2.5s, initial bundle ≤ 300 KB compressed, transaction-listing render p95 ≤ 400ms at 10³ records)
- **NFR-base-3:** Responsive design — mobile (≥360px) / tablet (≥768px) / desktop (≥1280px) breakpoints (the source spec targets desktop-class and tablet-class screens only, from 1280px / 768px respectively — no phone-width requirement was stated)
- **NFR-base-4:** Browser support — latest two versions of Chrome / Edge / Firefox / Safari
- **NFR-base-5:** Error UX — user-visible error states with retry affordance for all async operations
- **NFR-base-6:** CORS / cross-origin — the two backends run on different local ports (`:10010` auth, `:10005` transactions) with no confirmed `Access-Control-Allow-Origin` / `Access-Control-Allow-Credentials` headers observed; a Next.js rewrite proxy or confirmed CORS configuration is required before either is wired into the frontend (see Data Source connectivity notes above)
- **NFR-base-7:** Session UX — 15-minute idle timeout with a 60-second idle warning, 8-hour absolute session timeout, and re-authentication required before approve/reject-class actions (source spec §6.6.1)

---

## Design Source

| Field | Value |
|---|---|
| Digest | `generated-docs/design/digest.md` |
| Palette source | Brand site extraction (`pimcapitalgroup.com`) for primary, secondary, accent, background and text; `inferred-from-domain` for surface, text-muted, and the four status colours; the dark variant is derived rather than sourced |
| Read from | `documentation/SignIn-html/SignIn.dc.html`, `documentation/Main-html/Main.dc.html`, `documentation/Upload-html/Upload.dc.html`, `documentation/Review-html/Review.dc.html`, `documentation/Diagnose-html/Diagnose.dc.html`, `documentation/Trace-html/Trace.dc.html`, `documentation/Report-html/Report.dc.html`, `documentation/States-html/States.dc.html`, `documentation/design-system-light.html`, `documentation/design-system-dark.html` |
| Attached files | None — no `.svg`/`.png`/`.jpg`/`.woff`/`.ttf` supplied; all icons are inline SVG in the artboards and fonts are fetched from Google Fonts (Montserrat, Inter) in the design (to be self-hosted via `next/font/google` at build time, per [styling-centralisation.md](.claude/policies/styling-centralisation.md) Font Delivery) |

### Screens

| Screen | Key details |
|---|---|
| Sign in | Two-column split; email + password sign-in, no self-registration, no reset flow; banner errors for missing fields and rejected credentials |
| Received files | Landing surface after sign-in; searchable/filterable/sortable file listing with per-row action driven by standing; `Uploaded by` column is Approver-only |
| Upload a file | Register a new delimited file against a chosen file setting; setting + file drop target, accept/refuse outcome banners, no routing onward to review |
| File review — transactions | Approver decision surface; per-transaction and bulk approve/reject with mandatory rejection reason; account-number masking with Approver-only reveal; tabs for transactions, processing history, failed records |
| File diagnosis — faulted file | Read-only fault explanation for a faulted file; failing-records table with dynamic columns, record detail panel, bulk error file download, cancel run |
| Processing history | Step-by-step timeline of a file's processing run with timings, decisions and notes, plus run identifiers |
| Import activity | Period-based reporting on files imported/approved/rejected by file setting, plus a finance export of approved transactions |
| Edge, empty and error states (reference sheet) | Non-routable specification sheet cataloguing twelve edge/empty/error conditions across the other surfaces |

> The app is **rebuilt in our stack** (Shadcn + design tokens) to match the design as described in the digest — not copied from any source markup. Prototype constructs that must NOT carry forward to production — placeholder/fake data, remote CDN fonts/icons, placeholder handlers, inline styles, the prototype harness chrome (role switch, reset-demo-data button, hard-coded `letmein` credential) — are listed in the digest's "Translate, Don't Copy" section and flagged in the per-epic brief.md "Notes & Caveats" when an epic touches that screen.
