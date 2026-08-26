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
 * - Every response body AND every role name comes from the ONE project-wide
 *   identity source, `../src/mocks/data/identity`. No userinfo body and no role
 *   name is written as a literal here - see the regression note below for what
 *   happens when a spec hard-codes a role name the API does not actually use.
 * - Implementation pattern this assumes:
 *   - The session check on a protected surface (`GET /v1/auth/userinfo`, brief
 *     workflow 5) must be issued FROM THE BROWSER - a fetch in a client
 *     component or a client-side session provider. `page.route()` cannot
 *     intercept a fetch made Node-side inside a Server Component or behind a
 *     Next.js rewrite proxy, so a server-rendered session check would make this
 *     spec unpassable regardless of whether the feature works.
 *   - The URL globs below match both the direct backend origin
 *     (`http://localhost:10010/v1/auth/...`) and a same-origin proxied path, so
 *     either wiring is intercepted.
 *   - Session state: the app treats the browser-managed `session` cookie as
 *     opaque (project.md, Authentication - the frontend never reads its value)
 *     and decides "signed in" from the userinfo response. This spec seeds that
 *     cookie so the middleware's cookie-presence check passes, and drives the
 *     actual authorisation outcome through the mocked userinfo body.
 *   - The permission-denied panel renders IN PLACE, inside the signed-in shell,
 *     at the requested URL - it does not redirect, and it does not call
 *     `notFound()` (which would answer 404).
 *   - Role names are matched against `UserInfoRead.Roles[].Name` EXACTLY as the
 *     Authentication API spells them.
 * - If the implementation diverges from these assumptions, this spec will not pass.
 *
 * E2E spec for Epic "Sign in and session", Story 4: Permission denied, explained
 * in place (R11, R12, R20, BR3).
 *
 * Covers AC-4 - reaching an unpermitted surface by TYPING ITS ADDRESS shows the
 * in-place explanation, with the menu and Sign out still working, rather than a
 * blank failure page or a 404. AC-1 to AC-3 are covered by the Vitest layer.
 *
 * REGRESSION LOCK (added after this epic failed its manual test, 2026-08-26).
 * The refusal test alone passed while the feature was broken: the app and the
 * mocks both spelt the importer role `Importer`, but the Authentication API
 * returns `File Importer` (verified live against `GET /v1/auth/userinfo`). Every
 * real importer therefore matched no role at all and was shown THIS story's
 * refusal panel on the surface they are entitled to. So both directions are now
 * tested as a pair:
 *   - an account whose roles genuinely do not permit `/files` is REFUSED, and
 *   - an account holding the real importer role name is LET THROUGH.
 * Both role names come from `../src/mocks/data/identity`, the single place the
 * verified spellings live - a spec that types a role name inline is exactly how
 * this defect survived a green suite.
 *
 * playwright.config.ts's webServer block boots the FRONTEND only; every backend
 * response is mocked below, so no live backend is contacted and no real
 * credentials are used. Also green against the production build (`E2E_PROD=1`,
 * `next start` on :3100) - nothing here depends on dev-server behaviour, and the
 * seeded cookie is not port-scoped.
 *
 * These tests WILL FAIL until the role names the application matches on are
 * corrected (TDD red): `web/src/lib/auth/permissions.ts` still carries the
 * unverified `Importer`.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Role names, userinfo bodies and the session-cookie name come from the ONE
// project-wide source both test layers share. Relative import (not `@/`) so
// Playwright's runtime resolves it without alias plumbing.
import {
  APPROVER_ROLE,
  IMPORTER_ROLE,
  SESSION_COOKIE_NAME,
  UNRECOGNISED_ROLE,
  displayNameFor,
  logoutSuccessResponse,
  userInfoFor,
} from '../src/mocks/data/identity';

import type { Page } from '@playwright/test';

/** The surface under test: refused for a role outside the permitted set, open to the rest. */
const FILES_ROUTE = '/files';

/** Matches the auth calls whether they go direct to the auth API or via a same-origin rewrite. */
const USERINFO_ROUTE = '**/v1/auth/userinfo';
const LOGOUT_ROUTE = '**/v1/auth/logout';

/** The sign-in surface a sign-out returns to (Story 1's route). */
const SIGN_IN_URL = /\/sign-in/;

/**
 * Opaque stand-in for the `HttpOnly` session cookie the auth API would mint.
 * The frontend never reads its value (project.md, Authentication), so any
 * non-empty string is a faithful stand-in; what matters is that the cookie is
 * PRESENT, so the middleware's cookie-presence check treats the visitor as
 * signed in and the request reaches the role check rather than the sign-in
 * redirect.
 */
const OPAQUE_SESSION_VALUE = 'mock-session-token';

/**
 * Put the browser in a signed-in state for `roles`: the session cookie planted,
 * `GET /v1/auth/userinfo` answering 200 with that account's body. Install before
 * navigating.
 *
 * Sign-out is mocked statefully - once `POST /v1/auth/logout` has been honoured
 * the seeded cookie is gone and the next session check answers 401, exactly as
 * the real pair of endpoints behaves.
 */
async function signedInAs(
  page: Page,
  roles: string | readonly string[],
): Promise<void> {
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

  await page.route(USERINFO_ROUTE, (route) =>
    sessionEnded
      ? route.fulfill({ status: 401, body: '' })
      : route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(userInfoFor(roles)),
        }),
  );

  await page.route(LOGOUT_ROUTE, async (route) => {
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

/** The refusal panel, scoped to the content region so "in place" is what is measured. */
const deniedPanel = (page: Page) => page.getByRole('main').getByRole('alert');

test.describe('Epic "Sign in and session", Story 4: Permission denied, explained in place', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  // AC-4 - typed address (no click-through): the explanation renders in place of
  // the content, inside the shell, and the sidebar chrome stays live.
  test('typing the address of an unpermitted surface explains the refusal in place, with the menu and Sign out still working', async ({
    page,
  }) => {
    const deniedUser = userInfoFor(UNRECOGNISED_ROLE);
    await signedInAs(page, UNRECOGNISED_ROLE);

    // Direct navigation - the address is typed, not reached by clicking a menu item.
    const response = await page.goto(FILES_ROUTE);

    // Answered as a real page, not Next's not-found route: this is the "rather
    // than a 404" half of the criterion, asserted at the protocol level.
    expect(response?.status()).toBe(200);

    // The refusal is explained WHERE THE CONTENT WOULD HAVE BEEN - scoping to the
    // main region is what separates "in place" from "bounced to an error page".
    // The panel's `alert` role is the same identity the Vitest layer asserts, so
    // both layers agree on what the panel is.
    const panel = deniedPanel(page);
    await expect(
      panel.getByRole('heading', { name: /you do not hold/i }),
    ).toBeVisible();

    // It names a role that WOULD open the surface, and offers the request-access
    // action for it - the design's "Request the Approver role". The role name comes
    // from the shared constant, never typed inline.
    await expect(panel).toContainText(APPROVER_ROLE);
    await expect(
      panel.getByRole('button', { name: /^request /i }),
    ).toBeVisible();

    // ...and it names what this account actually holds, so the person can see why
    // they were refused rather than only that they were.
    await expect(panel).toContainText(UNRECOGNISED_ROLE);

    // Still at the address that was typed - no redirect to an error route or to
    // sign-in.
    await expect(page).toHaveURL(new RegExp(`${FILES_ROUTE}$`));

    // The shell is intact around the explanation: the menu region and the
    // signed-in person's own name are still there, which a blank failure page
    // would not show.
    const sidebar = page.getByRole('complementary');
    await expect(page.getByRole('navigation')).toBeVisible();
    await expect(sidebar.getByText(displayNameFor(deniedUser))).toBeVisible();

    // ...and Sign out is not merely present but STILL WORKS from this state: it
    // ends the session and returns the person to sign-in.
    const signOut = sidebar.getByRole('button', { name: /sign out/i });
    await expect(signOut).toBeEnabled();
    await signOut.click();
    await expect(page).toHaveURL(SIGN_IN_URL);
  });

  // AC-4, mirror case (regression lock - see the REGRESSION LOCK note in the file
  // header). The same typed-address entry, made by an account holding the importer
  // role name the Authentication API actually returns, must be LET THROUGH to the
  // files surface. Without this half, the refusal test above passes just as happily
  // when the app refuses everybody.
  test('typing the same address as a person holding the real importer role lets them through to their files', async ({
    page,
  }) => {
    const importerUser = userInfoFor(IMPORTER_ROLE);
    await signedInAs(page, IMPORTER_ROLE);

    const response = await page.goto(FILES_ROUTE);
    expect(response?.status()).toBe(200);

    // The surface's own content is what renders - not the refusal panel.
    await expect(
      page.getByRole('main').getByRole('heading', { name: 'Received files' }),
    ).toBeVisible();
    await expect(deniedPanel(page)).toHaveCount(0);
    await expect(page).toHaveURL(new RegExp(`${FILES_ROUTE}$`));

    // The role was recognised across the whole shell, not only by the route guard:
    // the sidebar presents the role held as the API spelt it, and offers the
    // destinations that role permits.
    const sidebar = page.getByRole('complementary');
    await expect(sidebar.getByText(displayNameFor(importerUser))).toBeVisible();
    await expect(
      sidebar.getByText(IMPORTER_ROLE, { exact: true }),
    ).toBeVisible();
    await expect(
      page
        .getByRole('navigation')
        .getByRole('link', { name: 'Received files' }),
    ).toBeVisible();
  });

  // Accessibility - real-browser axe scan of the state THIS story introduces (the
  // permission-denied panel showing inside the shell), scoped to the WCAG tags
  // matching NFR-base-1 / FNFR3. Axe's defaults also run best-practice rules that
  // fail on issues outside the agreed bar, so the tags are pinned explicitly.
  test('the permission-denied state has no accessibility violations', async ({
    page,
  }) => {
    await signedInAs(page, UNRECOGNISED_ROLE);
    await page.goto(FILES_ROUTE);

    // Scan only once the state has settled.
    await expect(
      deniedPanel(page).getByRole('heading', { name: /you do not hold/i }),
    ).toBeVisible();

    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(violations).toEqual([]);
  });
});
