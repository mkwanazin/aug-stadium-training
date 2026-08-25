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
