# Journal — Sign in and session

Plain-language record of what was built and why, story by story.

## Story 1 — Sign in

- Sign in is built and wired to the real authentication service. The browser now talks to the
  app's own address only — Next.js quietly forwards `/v1/auth/...` to the auth service on port
  10010 and `/transactions-api/...` to port 10005. That removes the cross-origin question that was
  left open at intake: nothing needs to change on either backend, and the sign-in cookie is
  treated as the app's own. Proved it against the running service: a deliberately wrong password
  comes back refused, exactly as the screen expects.
- The stale template setting that pointed the app at port 8042 is gone from both `.env.local` and
  `.env.example`, replaced by the two real backend addresses. They are deliberately server-side
  only, so no backend address ends up in the code the browser downloads.
- Account lockout is counted in the browser for now: five refusals in a row against the same email
  address produces "This account is locked… Try again after 09:45". The sign-in service has no way
  to tell us an account is locked yet — it answers the same way for a wrong password as for a
  locked account — so this presents the rule rather than enforcing it. The real protection stays
  on the server.
- Built the "why am I back here" banner on sign-in now rather than leaving it for the
  session-timeout story: `/sign-in?reason=idle-timeout` and `?reason=session-expired` each show
  their own explanation. Story 3 only has to send people here with the reason attached.
- This screen also lays the styling foundation for the whole application: the brand palette (light
  and dark), the Montserrat/Inter typefaces served from our own site rather than Google's CDN, and
  one reusable outcome banner that later screens will use for their own success and failure
  messages.
- Raised the test time limit from 5 to 20 seconds. Filling the sign-in form five times over (what
  the lockout test needs) takes about four and a half seconds of simulated typing, which was
  tripping the old limit and failing an otherwise passing test.

## Story 2 — Signed-in shell

- The template's Next.js welcome page is gone. The address `/` now takes a signed-in person
  straight to their files, and a signed-out one to sign in — there is no longer a page saying
  "Replace this with your feature implementation".
- If signing out fails — the service never confirms the session ended — the button stops, stays
  where it is and says "You are still signed in." rather than sending you to sign in anyway. Being
  told is better than looking signed out while the session is actually still alive on the server.
- If we can't reach the service to check your session at all (as opposed to being told you're
  signed out), you get an explanation and a "Try again" button instead of being bounced to sign in
  for something that may just be a blip.
- When the session check comes back "not signed in", you land on the plain sign-in screen with no
  explanation. That's deliberate: at that moment the application genuinely cannot tell "you were
  never signed in" from "your session ended", and guessing would put wrong wording on the screen.
  The explanation banners belong to the idle/expiry story, which does know why.
- Choosing the dark theme is remembered, but on a full page reload you may see one light frame
  before it applies. The remembered choice lives in the browser and can only be read once the page
  is running; reading it earlier would break the way Next.js hands the page over.
- The project's test setup needed a repair before any of this could be tested: on Node 25 the
  browser storage that remembers your theme choice is missing its methods entirely under our test
  runner, so every storage test failed before reaching the application. Fixed once in
  `web/vitest.setup.ts` and reported as a template bug.
- Dropped the old `NEXT_PUBLIC_`-prefixed backend address fallback from `next.config.ts` now that
  project.md records the correct server-side names — one way to configure the backends instead of
  two.
- The lint gate flagged the session hook for setting state directly inside an effect, which React
  warns causes an extra wasted render. Reworked it so the "still checking" state is worked out as
  the screen renders rather than being pushed in afterwards. The same problem existed in the
  light/dark hook (hidden by truncated gate output), so that now reads the remembered choice from
  browser storage the way React intends — which also means changing the theme in one tab now
  updates any other tab you have open.
