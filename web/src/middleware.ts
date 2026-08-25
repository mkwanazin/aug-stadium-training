import { NextResponse } from 'next/server';

import type { NextRequest } from 'next/server';

/**
 * The server-side half of the session gate.
 *
 * An address typed while signed out never reaches a signed-in screen: there is no
 * `session` cookie on the request, so the response is a redirect to sign in before
 * any of the application is sent. That is the server-side gating
 * .claude/policies/bff-auth-pattern.md §Next.js Integration Pattern requires — the
 * lighter cookie-presence form, because the cookie's LIVENESS is revalidated in
 * the browser by the authenticated layout's `GET /v1/auth/userinfo` check, and
 * doing both here would cost a backend round-trip on every navigation.
 *
 * The cookie's value is never read or interpreted — it is `HttpOnly` and opaque,
 * and only the Authentication API can say whether it is still good. Presence alone
 * is what is checked.
 */

const SESSION_COOKIE = 'session';
const SIGN_IN_PATH = '/sign-in';

export function middleware(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL(SIGN_IN_PATH, request.url));
}

/**
 * Everything is gated except the surfaces that must work without a session.
 *
 * Stated as an exclusion so a route added by a later epic is protected by default
 * — the safe direction to be wrong in. The exclusions:
 *  - `sign-in` — the one screen a signed-out person is entitled to;
 *  - `v1/auth` and `transactions-api` — the same-origin backend paths
 *    `next.config.ts` rewrites; redirecting these would break signing in itself;
 *  - `_next` and `favicon.ico` — framework and browser asset requests.
 */
export const config = {
  matcher: ['/((?!sign-in|v1/auth|transactions-api|_next|favicon.ico).*)'],
};
