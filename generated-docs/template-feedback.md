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
