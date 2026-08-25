/**
 * Story Metadata:
 * - Route: /sign-in
 * - Target File: web/src/app/sign-in/page.tsx
 * - Page Action: create_new
 *
 * Mocking strategy:
 * - Backend calls are ALWAYS mocked — this spec never contacts the live auth API
 *   on :10010, even though `project.md` records it as running. Interception is via
 *   `page.route()` (there is no MSW here: `project.md` records
 *   `Mock layer required: no`, so `web/src/mocks/` holds test data only, not a
 *   runtime mock layer).
 * - The route globs (see `mockAuthChain` below) end in `auth/login` and
 *   `auth/userinfo` behind a recursive wildcard, so they match the call
 *   whether it goes direct to `http://localhost:10010/v1/auth/...` or through a
 *   Next rewrite proxy (`/api/auth/...`) — see project.md NFR-base-6, which leaves
 *   that choice open to BUILD.
 * - Implementation patterns this spec assumes (if the implementation diverges,
 *   this spec will not pass — read these before writing the page):
 *   - The sign-in form must call `POST /v1/auth/login` from the BROWSER — a fetch
 *     from a client component through the shared API client (`@/lib/api/client`)
 *     with credentials included. `page.route()` cannot intercept a fetch issued
 *     Node-side by a Server Action or a route handler, so a Server-Action login
 *     would escape the mock and hit the real backend.
 *   - The session is carried entirely by the `Set-Cookie` on the login response
 *     (`HttpOnly`, `SameSite=Strict`, name `session`); the page never reads,
 *     writes or inspects the cookie value, and nothing about the session is put
 *     in localStorage.
 *   - Banners are announced live regions: the SUCCESS banner has `role="status"`,
 *     error banners have `role="alert"`. That split is what makes the outcome
 *     perceivable to a screen-reader user (NFR FNFR3) and is how this spec finds
 *     them without coupling to markup.
 *   - On success the banner renders FIRST and the navigation to `/files` is
 *     deferred by a timer, so the person actually sees "Signed in. Taking you to
 *     your files…" before the screen changes. AC-5 below freezes the clock to
 *     assert the banner, then fast-forwards to observe the redirect — no
 *     test-only props or shortened durations are needed in production code.
 * - `/files` is Story 2's surface and does not exist yet. This spec asserts the
 *   URL the user lands on, never the contents of that screen.
 *
 * E2E spec for Epic "Sign in and session", Story 1: Sign in.
 * Covers only the acceptance criteria tagged `playwright` — AC-5 and AC-6.
 * AC-1 to AC-4 (form composition, incomplete-submission validation, refused
 * credentials, locked account) are asserted in the Vitest layer.
 *
 * These tests WILL FAIL until implemented (TDD red) — `/sign-in` does not exist.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import {
  IMPORTER_ROLE,
  MOCK_SESSION_SET_COOKIE,
  loginSuccessResponse,
  userInfoFor,
} from '../src/mocks/data/identity';
// Mock identity for form-fill only — auth is mocked below, so this is never a
// real account and never a real password.
import { importerUser } from './fixtures/credentials';

import type { Locator, Page } from '@playwright/test';

/**
 * WCAG tags the scan is scoped to. `project.md` NFR-base-1 sets a WCAG 2.1 AA
 * baseline and this epic's FNFR3 raises its own surfaces to WCAG 2.2 AA, so the
 * 2.2 AA tag is included here. Scoping matters: axe's defaults also run
 * best-practice rules, which would fail this spec on issues outside the agreed
 * bar.
 */
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/**
 * Mock the auth chain at the browser boundary: `POST /v1/auth/login` → 200 with
 * the spec's confirmation body and a fake session cookie; `GET /v1/auth/userinfo`
 * → 200 with the role's identity from the shared project-wide source. Install
 * before navigating.
 */
async function mockAuthChain(page: Page, roleName: string): Promise<void> {
  await page.route('**/auth/login', (route) =>
    route.fulfill({
      status: 200,
      headers: { 'set-cookie': MOCK_SESSION_SET_COOKIE },
      contentType: 'application/json',
      body: JSON.stringify(loginSuccessResponse()),
    }),
  );
  await page.route('**/auth/userinfo', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(userInfoFor(roleName)),
    }),
  );
}

/**
 * Move focus onto `target` using nothing but the keyboard, pressing `key`
 * (`Tab`, or `Shift+Tab` to travel backwards) until it lands. Proves the control
 * is reachable in the natural focus order without a mouse and without a keyboard
 * trap, while tolerating any additional focusable control the page legitimately
 * places in between. The caller asserts the outcome with `toBeFocused()`.
 */
async function focusByKeyboard(
  page: Page,
  target: Locator,
  key: 'Tab' | 'Shift+Tab' = 'Tab',
  maxPresses = 15,
): Promise<void> {
  for (let press = 0; press < maxPresses; press += 1) {
    const focused = await target.evaluate(
      (el) => el === document.activeElement,
    );
    if (focused) return;
    await page.keyboard.press(key);
  }
}

/** Run an axe scan of the current page state, scoped to the agreed WCAG tags. */
async function wcagViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    .analyze();
  return violations;
}

const emailField = (page: Page): Locator => page.getByLabel(/email address/i);
const passwordField = (page: Page): Locator => page.getByLabel(/^\s*password/i);
const signInButton = (page: Page): Locator =>
  page.getByRole('button', { name: /sign in/i });

test.describe('Epic Sign in and session, Story 1: Sign in', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  // AC-5
  test('a successful sign-in shows the success banner and takes the user through to their files', async ({
    page,
  }) => {
    // Freeze the clock BEFORE navigating so the timer that defers the redirect
    // cannot fire until this test advances it — that is what makes "banner first,
    // then the files screen" observable rather than a race.
    await page.clock.install();
    await mockAuthChain(page, IMPORTER_ROLE);

    await page.goto('/sign-in');

    await emailField(page).fill(importerUser.email);
    await passwordField(page).fill(importerUser.password);
    await signInButton(page).click();

    const successBanner = page.getByRole('status');
    await expect(successBanner).toBeVisible();
    await expect(successBanner).toContainText(/signed in/i);
    await expect(successBanner).toContainText(/taking you to your files/i);
    // The refusal copy must not appear on a successful attempt.
    await expect(page.getByRole('alert')).toHaveCount(0);

    // Let the deferred navigation fire. `/files` is Story 2's surface and is not
    // built yet, so this asserts where the user lands — not what is on it.
    await page.clock.fastForward('00:10');
    await expect(page).toHaveURL(/\/files\/?$/);
  });

  // AC-6
  test('the sign-in form can be completed with the keyboard alone and passes an accessibility scan', async ({
    page,
  }) => {
    await mockAuthChain(page, IMPORTER_ROLE);

    await page.goto('/sign-in');
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();

    // State 1 — the form as first presented.
    expect(await wcagViolations(page)).toEqual([]);

    const email = emailField(page);
    const password = passwordField(page);
    const submit = signInButton(page);

    // Every control is reachable by forward tabbing, in order, from page load.
    await focusByKeyboard(page, email);
    await expect(email).toBeFocused();
    await focusByKeyboard(page, password);
    await expect(password).toBeFocused();
    await focusByKeyboard(page, submit);
    await expect(submit).toBeFocused();

    // The button is operable from the keyboard: submitting empty raises the
    // error state, which is a distinct rendering that has to be scanned in its
    // own right (violations are usually state-specific). What the message SAYS
    // is AC-2's assertion, in the Vitest layer.
    await page.keyboard.press('Enter');
    await expect(page.getByRole('alert')).toBeVisible();

    // State 2 — the form carrying its validation errors.
    expect(await wcagViolations(page)).toEqual([]);

    // Travel back up the form with the keyboard and complete it, mouse-free.
    await focusByKeyboard(page, email, 'Shift+Tab');
    await expect(email).toBeFocused();
    await page.keyboard.type(importerUser.email);

    await focusByKeyboard(page, password);
    await expect(password).toBeFocused();
    await page.keyboard.type(importerUser.password);

    await focusByKeyboard(page, submit);
    await expect(submit).toBeFocused();
    await page.keyboard.press('Enter');

    // Real timers here (no `page.clock` in this test), so allow for the brief
    // banner pause before the navigation the success path defers.
    await expect(page).toHaveURL(/\/files\/?$/, { timeout: 10_000 });
  });
});
