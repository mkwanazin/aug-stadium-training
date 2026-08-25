/**
 * Story Metadata:
 * - Route: /files
 * - Target File: web/src/app/(app)/files/page.tsx
 * - Page Action: modify_existing
 *
 * Mocking strategy:
 * - Backend calls are ALWAYS mocked - this spec never contacts a live backend
 *   (see testing-policy.md "Playwright runs against mocks, never live"), even
 *   though project.md records `dataSource: existing-api` with both APIs running
 *   locally. Interception is via `page.route()`; there is no MSW layer in this
 *   project (`Mock layer required: no`) and none should be added.
 * - Implementation pattern this assumes:
 *   - The session check on a protected surface (`GET /v1/auth/userinfo`, brief
 *     workflow 5) must be issued FROM THE BROWSER - a fetch in a client
 *     component or a client-side session provider. `page.route()` cannot
 *     intercept a fetch made Node-side inside a Server Component or behind a
 *     Next.js rewrite proxy, so a server-rendered session check would make this
 *     spec unpassable regardless of whether the feature works.
 *   - The URL glob for userinfo matches both the direct backend origin
 *     (`http://localhost:10010/v1/auth/userinfo`) and a same-origin proxied
 *     path, so either wiring is intercepted.
 *   - Session state: the app treats the browser-managed `session` cookie as
 *     opaque (project.md, Authentication - the frontend never reads its value)
 *     and decides "signed in" from the userinfo response. This spec seeds that
 *     cookie so any cookie-presence middleware passes, and drives the actual
 *     authorisation outcome through the mocked userinfo body.
 *   - The permission-denied panel renders IN PLACE, inside the signed-in shell,
 *     at the requested URL - it does not redirect, and it does not call
 *     `notFound()` (which would answer 404).
 * - If the implementation diverges from these assumptions, this spec will not pass.
 *
 * E2E spec for Epic "Sign in and session", Story 4: Permission denied, explained
 * in place (R11, R12, R20, BR3).
 *
 * Covers AC-4 only - reaching an unpermitted surface by TYPING ITS ADDRESS shows
 * the same in-place explanation, with the menu and Sign out still working, rather
 * than a blank failure page or a 404. AC-1 to AC-3 are covered by the Vitest layer.
 *
 * playwright.config.ts's webServer block boots the FRONTEND only; every backend
 * response is mocked below, so no live backend is contacted and no real
 * credentials are used.
 *
 * These tests WILL FAIL until implemented (TDD red) - the permission-denied panel
 * and the route-level role guard do not exist yet.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
// The userinfo body and the session-cookie name come from the ONE project-wide
// source both test layers share - never inline a userinfo body in a spec.
// Relative import (not `@/`) so Playwright's runtime resolves it without alias
// plumbing.
import {
  SESSION_COOKIE_NAME,
  UNRECOGNISED_ROLE,
  displayNameFor,
  logoutSuccessResponse,
  userInfoFor,
} from '../src/mocks/data/identity';

import type { Page } from '@playwright/test';

/** The surface this story's guard refuses for an account outside the permitted role set. */
const UNPERMITTED_ROUTE = '/files';

/**
 * Opaque stand-in for the `HttpOnly` session cookie the auth API would mint.
 * The frontend never reads its value (project.md, Authentication), so any
 * non-empty string is a faithful stand-in; what matters is that the cookie is
 * PRESENT, so a cookie-presence guard treats the visitor as signed in and the
 * request reaches the role check rather than the sign-in redirect.
 */
const OPAQUE_SESSION_VALUE = 'mock-session-token';

/** The account used throughout: signed in, but holding a role outside Importer/Approver. */
const deniedUserInfo = userInfoFor(UNRECOGNISED_ROLE);
const deniedUserName = displayNameFor(deniedUserInfo);

/**
 * Put the browser in the state AC-4 describes: a valid session belonging to an
 * account whose roles do not permit the surface. Install before navigating.
 *
 * Sign-out is mocked statefully - once `POST /v1/auth/logout` has been honoured,
 * the seeded cookie is gone and the next session check answers 401, exactly as
 * the real pair of endpoints would behave.
 */
async function signedInWithoutPermission(page: Page): Promise<void> {
  // Cookies are not port-scoped, so this covers both the dev server (:3000) and
  // the epic-end production run (:3100).
  await page.context().addCookies([
    {
      name: SESSION_COOKIE_NAME,
      value: OPAQUE_SESSION_VALUE,
      domain: 'localhost',
      path: '/',
    },
  ]);

  let sessionEnded = false;

  await page.route('**/auth/userinfo', (route) =>
    sessionEnded
      ? route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: '{}',
        })
      : route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(deniedUserInfo),
        }),
  );

  await page.route('**/auth/logout', async (route) => {
    sessionEnded = true;
    // The real API clears the cookie with `Set-Cookie: ...; Max-Age=0`. That
    // header would be scoped to the backend origin, so clear the seeded cookie
    // directly to reproduce the post-logout browser state.
    await page.context().clearCookies({ name: SESSION_COOKIE_NAME });
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(logoutSuccessResponse()),
    });
  });
}

test.describe('Epic "Sign in and session", Story 4: Permission denied, explained in place', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  // AC-4 - typed address (no click-through): the explanation renders in place of
  // the content, inside the shell, and the sidebar chrome stays live.
  test('typing the address of an unpermitted surface explains the refusal in place, with the menu and Sign out still working', async ({
    page,
  }) => {
    await signedInWithoutPermission(page);

    // Direct navigation - the address is typed, not reached by clicking a menu item.
    const response = await page.goto(UNPERMITTED_ROUTE);

    // Answered as a real page, not Next's not-found route: this is the "rather
    // than a 404" half of the criterion, asserted at the protocol level.
    expect(response?.status()).toBe(200);

    // The refusal is explained WHERE THE CONTENT WOULD HAVE BEEN - scoping to the
    // main region is what separates "in place" from "bounced to an error page".
    // The panel's `alert` role is the same identity the Vitest layer asserts, so
    // both layers agree on what the panel is.
    const panel = page.getByRole('main').getByRole('alert');
    await expect(
      panel.getByRole('heading', { name: /you do not hold/i }),
    ).toBeVisible();
    await expect(
      panel.getByRole('button', { name: /^request /i }),
    ).toBeVisible();

    // Still at the address that was typed - no redirect to an error route or to
    // sign-in.
    await expect(page).toHaveURL(new RegExp(`${UNPERMITTED_ROUTE}$`));

    // The shell is intact around the explanation: the menu region and the
    // signed-in person's own name are still there, which a blank failure page
    // would not show.
    await expect(page.getByRole('navigation')).toBeVisible();
    await expect(page.getByText(deniedUserName)).toBeVisible();

    // ...and Sign out is not merely present but STILL WORKS from this state: it
    // ends the session and returns the person to sign-in.
    const signOut = page.getByRole('button', { name: /sign out/i });
    await expect(signOut).toBeEnabled();
    await signOut.click();
    await expect(page).toHaveURL(/\/sign-in/);
  });

  // Accessibility - real-browser axe scan of the state THIS story introduces (the
  // permission-denied panel showing inside the shell), scoped to the WCAG tags
  // matching NFR-base-1 / FNFR3. Axe's defaults also run best-practice rules that
  // fail on issues outside the agreed bar, so the tags are pinned explicitly.
  test('the permission-denied state has no accessibility violations', async ({
    page,
  }) => {
    await signedInWithoutPermission(page);
    await page.goto(UNPERMITTED_ROUTE);

    // Scan only once the state has settled.
    await expect(
      page
        .getByRole('main')
        .getByRole('alert')
        .getByRole('heading', { name: /you do not hold/i }),
    ).toBeVisible();

    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(violations).toEqual([]);
  });
});
