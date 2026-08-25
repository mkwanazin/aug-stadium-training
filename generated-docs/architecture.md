# Architecture & Reuse Registry

> One line per durable thing. Edit the line when it changes; delete it when the thing is gone.
> No story narrative, no dates, no rationale.

## Shared utilities & components

| Export | Location | Capability |
|---|---|---|
| `apiClient`, `get`, `post`, `put`, `del`, `getAuthHeader` | `web/src/lib/api/client.ts` | Fetch wrapper for all API calls: same-origin base URL, query-param serialisation, JSON/blob handling, `credentials: 'include'` by default, throws `APIError` on non-2xx |
| `isAPIError`, `isAPIErrorWithStatus` | `web/src/lib/api/errors.ts` | Narrow a caught value to the client's thrown `APIError` (a plain object, never an `Error`) and branch on its status code |
| `AUTH_ENDPOINTS`, `login` | `web/src/lib/api/auth.ts` | Authentication API paths and `POST /v1/auth/login` |
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

## Cross-epic debt

- Account lockout after five refused sign-ins is counted **in the browser** and resets on reload — presentation only, not enforcement. Replace when the Authentication API exposes lockout state (it documents no locked-account response today).
- `project.md` §Data Source records the backend env vars as `NEXT_PUBLIC_AUTH_API_BASE_URL` / `NEXT_PUBLIC_TRANSACTIONS_API_BASE_URL`; the code prefers the non-public `AUTH_API_BASE_URL` / `TRANSACTIONS_API_BASE_URL` and falls back to the recorded names. Drop the fallback once `project.md` is corrected.
