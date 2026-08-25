# Architecture & Reuse Registry

> One line per durable thing. Edit the line when it changes; delete it when the thing is gone.
> No story narrative, no dates, no rationale.

## Shared utilities & components

| Export | Location | Capability |
|---|---|---|
| `apiClient`, `get`, `post`, `put`, `del`, `getAuthHeader` | `web/src/lib/api/client.ts` | Fetch wrapper for all API calls: same-origin base URL, query-param serialisation, JSON/blob handling, `credentials: 'include'` by default, throws `APIError` on non-2xx |
| `isAPIError`, `isAPIErrorWithStatus` | `web/src/lib/api/errors.ts` | Narrow a caught value to the client's thrown `APIError` (a plain object, never an `Error`) and branch on its status code |
| `AUTH_ENDPOINTS`, `login`, `getUserInfo`, `logout` | `web/src/lib/api/auth.ts` | Authentication API paths and calls: `POST /v1/auth/login`, `GET /v1/auth/userinfo` (the session check), `POST /v1/auth/logout` |
| `RoleRead`, `UserInfoRead` | `web/src/types/auth.ts` | `GET /v1/auth/userinfo` response shape; `RoleRead.Name` is an open string, never a closed role union |
| `Permission`, `hasPermission`, `holdsAnyRole`, `roleNamesOf`, `ROLE_IMPORTER`, `ROLE_APPROVER` | `web/src/lib/auth/permissions.ts` | The single grant table: does an account holding these roles hold this permission. Extend the `Permission` union + grant table per epic; never re-derive the check |
| `SessionProvider`, `useSession`, `SIGN_IN_ROUTE`, `Session`, `SessionStatus` | `web/src/lib/auth/session.tsx` | Browser-side session check (`checking` / `signed-in` / `signed-out` / `unavailable`, with `recheck`), the identity and roles it found, and `session.can(...)` / `session.holdsAnyOf(...)`. `useSession` works with or without a provider above it, so guards built on it mount standalone |
| `AppShell` | `web/src/components/shell/AppShell.tsx` | The signed-in frame: 224px sidebar (brandmark, role-gated menu, theme switch, identity block, Sign out) plus the content pane's `main` landmark, gated on a live session |
| `NAV_GROUPS` | `web/src/components/shell/navigation.ts` | The sidebar's destinations and the `Permission` each one requires — where a later epic registers its screen in the menu |
| `useTheme`, `ThemeApplier`, `ThemeSwitch` | `web/src/lib/theme/`, `web/src/components/theme/` | Light/dark: the person's remembered choice (`localStorage`), applied as a `dark` class on the document element. `ThemeApplier` (root layout) applies it everywhere; `ThemeSwitch` (sidebar) is the only writer |
| `StatusBanner` | `web/src/components/feedback/StatusBanner.tsx` | Outcome banner (success / error / warning / info): bold lead + follow-up, status-coloured left border and icon, live-region role chosen by tone |
| `SignInForm` | `web/src/components/auth/SignInForm.tsx` | Credential form: blur-level and submit-level validation, refusal / lockout / unavailable / success outcomes, deferred redirect after the success banner |
| `SignInReasonBanner` | `web/src/components/auth/SignInReasonBanner.tsx` | Renders the explanation for `/sign-in?reason=idle-timeout` and `?reason=session-expired` |
| `formatClockTime`, `SAST_TIME_ZONE` | `web/src/lib/format/datetime.ts` | Wall-clock time in South African time (`09:45`) — the fixed zone every timestamp is presented in |

## Conventions

- The browser calls **same-origin paths only** (`/v1/auth/*`, `/transactions-api/*`); `web/next.config.ts` rewrites them on to the backends. Backend origins are server-side env vars (`AUTH_API_BASE_URL`, `TRANSACTIONS_API_BASE_URL`), never `NEXT_PUBLIC_*`, and `API_BASE_URL` is empty by default.
- Session is an HttpOnly `session` cookie the browser attaches itself — no token is ever read, stored or sent by frontend code.
- Colours, fonts and radii come from the tokens in `web/src/app/globals.css` (`:root` + `.dark`, raw hex from the design digest). Components use the semantic helpers (`bg-primary`, `text-destructive`, `border-l-success`); no hex literals outside that file.
- Brand fonts load through `next/font/google` in `web/src/app/layout.tsx` (`--font-inter` body, `--font-montserrat` headings) — never a runtime CDN request.
- Error banners take `role="alert"`; confirmations take `role="status"`. Field-level messages are plain text linked by `aria-describedby` — never a second live region.
- Forms validate on blur and on submit, never while typing; required fields carry an `aria-hidden` `*` marker plus one `* Required` legend per form.
- Signed-in screens live under `web/src/app/(app)/` and inherit `AppShell` from that route group's layout. A page renders its own content region only — the sidebar and session check are the layout's.
- Session gating is two-sided: `web/src/middleware.ts` redirects any request without a `session` cookie to `/sign-in`, and the `(app)` layout revalidates liveness in the browser. The matcher is an *exclusion* list (`sign-in`, `v1/auth`, `transactions-api`, `_next`, `favicon.ico`), so a route a later epic adds is protected by default.
- Visibility is decided by `session.can(<permission>)`, never by a role equality test or an Importer/Approver ternary — an account may hold both roles, or one the project grants nothing to.
- Each route owns exactly one `<main>` landmark; the root layout is a plain wrapper.
- Sign out and any other session-ending action awaits its API response before navigating, and says so if the response never confirms.

## Cross-epic debt

- Account lockout after five refused sign-ins is counted **in the browser** and resets on reload — presentation only, not enforcement. Replace when the Authentication API exposes lockout state (it documents no locked-account response today).
- The sidebar menu offers `Upload a file`, `Import activity` and `File settings` before those screens exist; each 404s until its epic builds it. Remove a destination from `NAV_GROUPS` if its epic is dropped.
- A person who chose the dark theme sees one light frame on a full page load: the hydrating render must use the default the server rendered, so the remembered choice only takes effect once hydration completes. Fix with a pre-paint theme script if it becomes objectionable.
- `roleNamesOf` falls back to splitting `RolesString` on `,` when `Roles[]` is absent; the Authentication API never documents how it joins several roles. Drop the fallback once the multi-role shape is confirmed.
