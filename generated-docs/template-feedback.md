# Template Feedback

Bugs and rough edges found in the template's own tooling or scaffolding (not in the
application being built). One entry per finding: symptom, cause, workaround.

---

## `window.localStorage` has no methods under Node 25 + Vitest 4 (jsdom)

**Found:** epic `sign-in-and-session`, story 2 (signed-in shell).

**Symptom.** Any Vitest test touching Web Storage fails immediately with
`TypeError: window.localStorage.clear is not a function`. Every run also prints
`Warning: '--localstorage-file' was provided without a valid path`.

**Cause.** Node 25 defines `localStorage` / `sessionStorage` as globals gated behind
`--localstorage-file`. Started without a path, Node leaves a hollow object
(`Object.prototype`, no `getItem` / `setItem` / `clear`) on `globalThis`. Vitest's
jsdom environment does not overwrite globals that already exist, so jsdom's real
`Storage` implementation never lands and the hollow Node object is what tests see.
`web/package.json` declares `"node": ">=22"`, so this is reachable on a supported
Node.

**Workaround applied.** `web/vitest.setup.ts` now installs a small in-memory
`Storage` over `window` / `globalThis` when the existing global has no `getItem`.
It is a no-op on Node versions where jsdom's storage survives.

**Suggested template fix.** Either ship this shim in the template's
`vitest.setup.ts`, or have the Vitest jsdom environment take precedence over Node's
own Web Storage globals (e.g. delete them before the environment installs
jsdom's).

---

## Security validator's RBAC audit silently skips a real gate, and cannot see a redirect through a named constant

**Found:** epic `sign-in-and-session`, epic-end quality check.

**Symptom — two faces of the same bug.**

1. With default configuration the validator printed
   `No protected/authenticated route group found - skipping protected pages check`
   and the whole gate reported **PASSED**. On an authentication epic, the one audit that
   most needed to run did not run, and nothing in the summary said so — the JSON
   `securityValidator.status` was `pass`.
2. Forced to audit the group (`SECURITY_AUTH_ROUTE_GROUPS=app`), it reports 2 critical
   RBAC failures — `web/src/app/(app)/layout.tsx:22` "Protected route group layout
   missing authentication check" and `web/src/app/(app)/files/page.tsx:39` — against an
   app that is, in fact, gated three ways over.

So the default is a false pass and the configured run is a false fail.

**Cause — two independent limitations.**

- `GATED_ROUTE_GROUPS` is `['(protected)', '(authenticated)']`. A project using any other
  group name — `(app)` here — is only picked up by the structural fallback
  `getStructurallyGatedGroupPaths()` → `layoutChainHasSessionGate()`.
- That fallback then fails, because `fileIsSessionGate()` requires the redirect argument
  to be a **quoted string literal**:
  `signInTail = "['\"`]\\/(?:[\\w-]+\\/)*(?:login|signin|sign-in)\\b"`.
  Every gate in this project redirects through a named constant, which is better practice
  than repeating the literal:
  - `AppShell.tsx` — `useSession()` then `router.replace(SIGN_IN_ROUTE)`, where
    `SIGN_IN_ROUTE = '/sign-in'` is exported from `@/lib/auth/session`.
  - `middleware.ts` — `NextResponse.redirect(new URL(SIGN_IN_PATH, request.url))`.

  The `verifiesSession` half matches fine (`useSession(`); only `redirectsToSignIn` fails.
  So the validator penalises the cleaner implementation.

**What is actually in place** (verified by reading, not by the validator): server-side
cookie-presence gating in `middleware.ts` with an exclusion-list matcher, so a route a
later epic adds is gated by default; browser-side liveness revalidation in `AppShell`,
which renders `SessionCheckState` rather than children unless `status === 'signed-in'`;
and `RoleGuard` on `/files`.

**Workaround applied.** None in code — contorting a redirect into an inline literal to
satisfy a regex would make the source worse. Recorded here instead, and reported to the
user rather than presented as a clean pass.

**Suggested template fix.** Two parts:
1. Resolve a same-module `const` to its literal before testing `redirectsToSignIn` (a
   single-file constant lookup covers the common case), or accept an identifier whose name
   matches `/SIGN_?IN/i` in the redirect position.
2. Make the skip loud. If no gated group is found but `web/src/app/` contains route groups
   or a `middleware.ts` exists, that is a configuration mismatch, not a clean bill of
   health — emit a warning that survives into the JSON summary so an orchestrator cannot
   read it as a pass.
