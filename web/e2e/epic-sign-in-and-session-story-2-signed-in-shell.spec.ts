/**
 * Story Metadata:
 * - Route: /files
 * - Target File: web/src/app/(app)/layout.tsx
 * - Page Action: create_new
 *
 * Mocking strategy:
 * - Backend calls are ALWAYS mocked. This spec never contacts the live auth API
 *   on :10010 (see testing-policy.md "Playwright runs against mocks, never live").
 *   Interception layer: page.route() — web/src/mocks/ carries data factories only
 *   (project.md records `Mock layer required: no`), so there is no MSW to use.
 * - Response bodies AND role names come from the one project-wide identity source,
 *   ../src/mocks/data/identity. No userinfo/logout body and no role name is written
 *   as a literal here — writing one as a literal is exactly how this epic's manual
 *   test came to fail (see "Role names" below).
 * - Implementation pattern this spec assumes:
 *   - The session check on a protected surface must be a BROWSER-side call to
 *     `GET /v1/auth/userinfo` (a fetch from a client component through
 *     `@/lib/api/client` with credentials included). page.route() cannot intercept
 *     a fetch made from Node — a Server Component or Server Action doing the
 *     userinfo call would bypass these mocks entirely.
 *   - Whatever origin that call is sent to, its path must end in
 *     `/v1/auth/userinfo` / `/v1/auth/logout` — the globs below match both a direct
 *     call to the auth API origin and a same-origin call through the Next.js
 *     rewrite proxy (next.config.ts / project.md NFR-base-6).
 *   - Session state is carried by the `session` cookie the browser manages. These
 *     specs plant that cookie for the signed-in case and clear it for the
 *     signed-out case, so the server-side cookie check in `web/src/middleware.ts`
 *     sees the same state the mocked userinfo response reports.
 *   - Sign out must call `POST /v1/auth/logout`, keep the Sign out control MOUNTED
 *     and disabled while that request is in flight, and navigate to `/sign-in` only
 *     once the response resolves (brief R4 / BR4). AC-4 holds the logout response
 *     open, so an implementation that navigates optimistically fails (its control
 *     detaches) and one that never awaits the response fails too.
 *   - Sidebar accessible names this spec pins: the nav destination `Received files`
 *     (a link, revealed by the view permission both project roles hold) and the
 *     `Sign out` button (a busy label such as `Signing out…` is accepted while the
 *     request is in flight).
 * - If the implementation diverges from these assumptions, this spec will not pass.
 *
 * Role names — WHY THIS SPEC WAS REGENERATED (2026-08-26):
 *   The Authentication API returns the importer role as `File Importer`, WITH THE
 *   SPACE. `documentation/requirements-application.md` calls it "Importer", and
 *   both the application and the fixtures copied that literal, so a real Importer
 *   account matched no role, was shown the permission-denied panel and got an empty
 *   menu — and the tests could not see it, because they asserted against the same
 *   wrong name the code used. `web/src/mocks/data/identity.ts` now carries the
 *   verified names and is the only place they appear.
 *   Consequence for this file: every signed-in test below waits, as a precondition,
 *   for the shell to have rendered a real menu destination — not merely the person's
 *   name, which renders whether or not their role was recognised. A role-name
 *   regression therefore fails these tests instead of passing them silently.
 *
 * E2E spec for Epic "Sign in and session", Story 2: the signed-in shell.
 * Covers only the acceptance criteria tagged `playwright` (AC-3, AC-4, AC-5, AC-6);
 * AC-1 (the identity block) and AC-2 (which menu entries each role gets) belong to
 * the Vitest layer.
 * playwright.config.ts's webServer block boots the FRONTEND only — every backend
 * response below is mocked, so no live backend and no real credentials are needed.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import {
  IMPORTER_ROLE,
  MOCK_SESSION_CLEAR_COOKIE,
  SESSION_COOKIE_NAME,
  displayNameFor,
  logoutSuccessResponse,
  userInfoFor,
} from '../src/mocks/data/identity';

import type { Locator, Page } from '@playwright/test';

/** Matches the auth calls whether they go direct to the auth API or via a same-origin rewrite. */
const USERINFO_ROUTE = '**/v1/auth/userinfo';
const LOGOUT_ROUTE = '**/v1/auth/logout';

/** The sign-in surface this shell sends people to (Story 1's route). */
const SIGN_IN_URL = /\/sign-in/;

/**
 * The Sign out control. Deliberately tolerant of a busy label ("Signing out…"), so
 * the test measures behaviour rather than pinning the in-flight copy.
 */
const SIGN_OUT_NAME = /sign(ing)?\s*out/i;

/**
 * A menu destination the view permission BOTH project roles hold reveals, so it is
 * the one entry every signed-in case here can rely on. Used as the "the shell
 * really came up for this account" precondition. WHICH entries each role does and
 * does not get is AC-2's question and is asserted in the Vitest layer — including
 * the 2026-08-26 decision that an Importer now sees `File settings` too.
 */
const MENU_DESTINATION_NAME = /received files/i;

/** The identity the signed-in cases run as, and the name the sidebar must present. */
const SIGNED_IN_USER = userInfoFor(IMPORTER_ROLE);
const SIGNED_IN_NAME = displayNameFor(SIGNED_IN_USER);

/** The WCAG bar this epic owns (brief FNFR3 — 2.2 AA, stricter than NFR-base-1's 2.1 AA). */
const WCAG_22_AA_TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22a',
  'wcag22aa',
];

/**
 * No valid session: no `session` cookie, and `GET /v1/auth/userinfo` answers 401
 * (the auth spec documents no body on a 401).
 */
async function mockSignedOut(page: Page): Promise<void> {
  await page.context().clearCookies();
  await page.route(USERINFO_ROUTE, (route) =>
    route.fulfill({ status: 401, body: '' }),
  );
}

/**
 * A valid session for `roles`, ended by `POST /v1/auth/logout`.
 *
 * After logout resolves, userinfo flips to 401 and the session cookie is cleared
 * via the logout response's Set-Cookie — so anything that re-enters the shell
 * afterwards (including a Back-button restore) meets a genuinely dead session.
 *
 * `logoutGate`, when supplied, holds the logout response open until it resolves;
 * this is what makes AC-4's "waits before navigating" assertion non-vacuous.
 */
async function mockSignedInSession(
  page: Page,
  roles: string | readonly string[],
  logoutGate?: Promise<void>,
): Promise<void> {
  let sessionValid = true;

  await page.context().addCookies([
    {
      name: SESSION_COOKIE_NAME,
      value: 'mock-session-token',
      domain: 'localhost',
      path: '/',
    },
  ]);

  await page.route(USERINFO_ROUTE, (route) =>
    sessionValid
      ? route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(userInfoFor(roles)),
        })
      : route.fulfill({ status: 401, body: '' }),
  );

  await page.route(LOGOUT_ROUTE, async (route) => {
    if (logoutGate) {
      await logoutGate;
    }
    sessionValid = false;
    await route.fulfill({
      status: 200,
      headers: { 'set-cookie': MOCK_SESSION_CLEAR_COOKIE },
      contentType: 'application/json',
      body: JSON.stringify(logoutSuccessResponse()),
    });
  });
}

/**
 * Land inside the shell and wait for it to have actually come up for this account.
 *
 * Both halves matter. The name proves the session check resolved; the menu
 * destination proves the account's roles were RECOGNISED. Waiting on the name alone
 * is what let the `Importer` / `File Importer` mismatch through — the identity block
 * renders either way, so the shell looked healthy while the menu was empty and the
 * page underneath was refusing the person.
 */
async function enterShell(page: Page): Promise<void> {
  await page.goto('/files');
  await expect(page.getByText(SIGNED_IN_NAME)).toBeVisible();
  await expect(
    page.getByRole('link', { name: MENU_DESTINATION_NAME }),
  ).toBeVisible();
}

/**
 * Presses Tab until `target` holds focus. Proves the control is reachable with the
 * keyboard alone — `locator.focus()` would move focus programmatically and prove
 * nothing about tab order.
 */
async function tabUntilFocused(
  page: Page,
  target: Locator,
  maxPresses = 30,
): Promise<boolean> {
  for (let index = 0; index < maxPresses; index += 1) {
    await page.keyboard.press('Tab');
    const focused = await target.evaluate(
      (element) => element === document.activeElement,
    );
    if (focused) {
      return true;
    }
  }
  return false;
}

/**
 * Real-browser axe scan of whatever is on screen, scoped to the agreed WCAG bar —
 * axe's defaults also run best-practice rules that sit outside it.
 */
async function expectNoAccessibilityViolations(page: Page): Promise<void> {
  const { violations } = await new AxeBuilder({ page })
    .withTags(WCAG_22_AA_TAGS)
    .analyze();
  expect(violations).toEqual([]);
}

test.describe('Epic Sign in and session, Story 2: Signed-in shell', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  // AC-3
  test('while signed out, the app root and a deep signed-in URL both land on sign-in', async ({
    page,
  }) => {
    await mockSignedOut(page);

    // The app root: reaching sign-in from `/` is what proves the template's
    // untouched welcome page no longer owns this route.
    await page.goto('/');
    await expect(page).toHaveURL(SIGN_IN_URL);
    await expect(page.getByLabel(/password/i)).toBeVisible();

    // A signed-in URL typed straight into the address bar.
    await page.goto('/files');
    await expect(page).toHaveURL(SIGN_IN_URL);
    await expect(page.getByLabel(/password/i)).toBeVisible();

    // Nothing from the signed-in shell came along with the redirect.
    await expect(
      page.getByRole('button', { name: SIGN_OUT_NAME }),
    ).toBeHidden();
    await expect(
      page.getByRole('link', { name: MENU_DESTINATION_NAME }),
    ).toBeHidden();
  });

  // AC-4
  test('Sign out stays put until the logout response resolves, then returns to sign-in', async ({
    page,
  }) => {
    let releaseLogout: () => void = () => {};
    const logoutGate = new Promise<void>((resolve) => {
      releaseLogout = resolve;
    });

    await mockSignedInSession(page, IMPORTER_ROLE, logoutGate);
    await enterShell(page);

    const signOut = page.getByRole('button', { name: SIGN_OUT_NAME });
    const logoutRequest = page.waitForRequest(
      (request) =>
        request.url().includes('/v1/auth/logout') &&
        request.method() === 'POST',
    );

    await signOut.click();
    await logoutRequest;

    // The logout response is still held open here. The Sign out control must still
    // be on screen and busy — if the app had navigated on click, this locator would
    // be gone and the assertion would fail.
    await expect(signOut).toBeDisabled();
    await expect(page).toHaveURL(/\/files/);

    // Only now does the session actually end.
    releaseLogout();
    await expect(page).toHaveURL(SIGN_IN_URL);
  });

  // AC-5
  test('after signing out, the browser Back button does not reveal the signed-in page', async ({
    page,
  }) => {
    await mockSignedInSession(page, IMPORTER_ROLE);
    await enterShell(page);

    await page.getByRole('button', { name: SIGN_OUT_NAME }).click();
    await expect(page).toHaveURL(SIGN_IN_URL);

    await page.goBack();

    // A back/forward-cache restore of the signed-in page would show the identity
    // block and the menu again at /files; the person must be on sign-in instead.
    await expect(page).toHaveURL(SIGN_IN_URL);
    await expect(page.getByText(SIGNED_IN_NAME)).toBeHidden();
    await expect(
      page.getByRole('link', { name: MENU_DESTINATION_NAME }),
    ).toBeHidden();
  });

  // AC-6
  test('the shell is keyboard-operable and passes an accessibility scan', async ({
    page,
  }) => {
    // Sign out is gated so its busy state can be scanned too — the second distinct
    // state this story introduces into the shell, and one a single settled-page scan
    // would never see.
    let releaseLogout: () => void = () => {};
    const logoutGate = new Promise<void>((resolve) => {
      releaseLogout = resolve;
    });

    await mockSignedInSession(page, IMPORTER_ROLE, logoutGate);
    await enterShell(page);

    // State 1 — the settled signed-in shell.
    await expectNoAccessibilityViolations(page);

    // Keyboard alone: tab order must reach a menu destination, then Sign out, and
    // Enter must operate Sign out with no pointer involved.
    const navDestination = page.getByRole('link', {
      name: MENU_DESTINATION_NAME,
    });
    expect(await tabUntilFocused(page, navDestination)).toBe(true);

    const signOut = page.getByRole('button', { name: SIGN_OUT_NAME });
    expect(await tabUntilFocused(page, signOut)).toBe(true);

    await page.keyboard.press('Enter');

    // State 2 — Sign out busy, the logout request still in flight.
    await expect(signOut).toBeDisabled();
    await expectNoAccessibilityViolations(page);

    releaseLogout();
    await expect(page).toHaveURL(SIGN_IN_URL);
  });
});
