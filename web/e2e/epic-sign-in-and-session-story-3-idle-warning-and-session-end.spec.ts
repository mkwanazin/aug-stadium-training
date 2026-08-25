/**
 * Story Metadata:
 * - Route: /files
 * - Target File: web/src/app/(app)/layout.tsx
 * - Page Action: modify_existing
 *
 * Mocking strategy:
 * - Backend calls are ALWAYS mocked — a Playwright spec never contacts a live
 *   backend (see testing-policy.md § "Playwright runs against mocks, never live").
 *   Intercepted with `page.route()`; `web/src/mocks/` holds response-body factories
 *   only (project.md records `Mock layer required: no`), so there is no MSW here.
 * - Every response body comes from the ONE project-wide identity source
 *   (`../src/mocks/data/identity`) — no userinfo/login body is inlined below.
 * - Implementation pattern this assumes:
 *   - The sign-in form calls `POST /v1/auth/login` from the BROWSER (a fetch from a
 *     client component via the shared API client), because `page.route()` cannot
 *     intercept a Next.js Server Action's server-side fetch.
 *   - The signed-in shell validates the session from the browser too, via
 *     `GET /v1/auth/userinfo`, and the session is carried by the `session` cookie
 *     the login response sets — the frontend never reads the cookie's value.
 *   - The idle and absolute session timers run IN THE PAGE off `Date` /
 *     `setTimeout` / `setInterval` at their real configured durations
 *     (NFR-base-7: 15-minute idle, 60-second warning, 8-hour absolute). That is
 *     what lets `page.clock` drive them; do NOT add shortened test-only durations,
 *     and do NOT move the timing into a worker or onto the server, which the clock
 *     cannot control.
 *   - The idle warning is an interruptive alert dialog (`role="alertdialog"`, i.e. a
 *     composed Shadcn AlertDialog) containing (a) a live countdown element with
 *     `role="timer"` showing the whole seconds remaining, (b) copy naming what is
 *     about to happen (being signed out), and (c) a "Stay signed in" button.
 *   - Activity that resets the idle window is observed from ordinary document
 *     events — at minimum `keydown` and `mousemove`.
 *   - Session end redirects to the sign-in route carrying a reason:
 *     `/sign-in?reason=idle-timeout` for the idle path and
 *     `/sign-in?reason=session-expired` for the 8-hour absolute cap. The sign-in
 *     screen renders the matching explanation in a polite `role="status"` banner.
 * - If the implementation diverges from these assumptions, this spec will not pass.
 *
 * E2E spec for Epic "Sign in and session", Story 3: Idle warning and session end
 * (R14, R15, R16 / NFR-base-7).
 *
 * Time is driven with Playwright's `page.clock` — the 14-minute, 15-minute and
 * 8-hour windows are advanced instantly against their REAL durations. Nothing here
 * ever waits real time, and `page.waitForTimeout` is never used.
 *
 * playwright.config.ts's webServer block boots the FRONTEND dev server only; every
 * backend response is mocked below, so no live backend is contacted and no real
 * credentials are needed.
 * These tests WILL FAIL until implemented (TDD red).
 */
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

import {
  IMPORTER_ROLE,
  MOCK_SESSION_CLEAR_COOKIE,
  MOCK_SESSION_SET_COOKIE,
  loginSuccessResponse,
  logoutSuccessResponse,
  userInfoFor,
} from '../src/mocks/data/identity';

import type { Page } from '@playwright/test';

const SIGN_IN_ROUTE = '/sign-in';
const PROTECTED_ROUTE = '/files';

/**
 * Mock identity for form-fill only — auth is mocked by `mockAuthChain`, so this is
 * never a real account and the password is not a real credential. The email comes
 * from the shared identity source so both test layers submit the same person.
 */
const IMPORTER_EMAIL = String(userInfoFor(IMPORTER_ROLE).Email);
const MOCK_PASSWORD = 'not-a-real-password';

/* Durations, expressed against the REAL NFR-base-7 windows (mm:ss). */
/** Just short of the 14-minute mark, where the warning is still not due. */
const ALMOST_IDLE_WARNING = '13:00';
/** Carries 13:00 over the 14-minute mark, where the warning is due. */
const INTO_IDLE_WARNING = '01:00';
/** The 60-second warning window itself — crossing it ends the session at 15:00. */
const IDLE_WARNING_WINDOW = '01:00';
/** A chunk of continuously-active use, comfortably inside the 15-minute idle window. */
const ACTIVE_CHUNK = '10:00';
/** 47 x 10 minutes = 7h50m of active use — still inside the 8-hour absolute cap. */
const ACTIVE_CHUNKS_BEFORE_CAP = 47;
/** 2 more chunks carry 7h50m to 8h10m — past the cap, while still active. */
const ACTIVE_CHUNKS_PAST_CAP = 2;

/**
 * Mock the whole auth chain at the browser boundary: login → 200 + a fake session
 * cookie, userinfo → 200 for the given role, logout → 200 + the clearing cookie.
 * Install before navigating.
 */
async function mockAuthChain(page: Page, roleName: string): Promise<void> {
  await page.route('**/v1/auth/login', (route) =>
    route.fulfill({
      status: 200,
      headers: { 'set-cookie': MOCK_SESSION_SET_COOKIE },
      contentType: 'application/json',
      body: JSON.stringify(loginSuccessResponse()),
    }),
  );
  await page.route('**/v1/auth/userinfo', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(userInfoFor(roleName)),
    }),
  );
  await page.route('**/v1/auth/logout', (route) =>
    route.fulfill({
      status: 200,
      headers: { 'set-cookie': MOCK_SESSION_CLEAR_COOKIE },
      contentType: 'application/json',
      body: JSON.stringify(logoutSuccessResponse()),
    }),
  );
}

/**
 * Sign in for real through the form, so the session — and with it the moment the
 * 8-hour absolute window starts — is established the way the application does it,
 * not by a cookie planted behind its back.
 */
async function signIn(page: Page, roleName: string): Promise<void> {
  await mockAuthChain(page, roleName);
  await page.goto(SIGN_IN_ROUTE);
  await page.getByLabel(/email address/i).fill(IMPORTER_EMAIL);
  // Not `/^password$/i`: the label is the word followed by a required marker
  // (`<span aria-hidden="true">*</span>`), and `getByLabel` matches the label
  // element's TEXT, which `aria-hidden` does not strip — so it reads as
  // "Password *" and nothing end-anchored can ever match it. Leading-anchored,
  // trailing-open, exactly as story 1's spec queries this same form.
  await page.getByLabel(/^\s*password/i).fill(MOCK_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(new RegExp(`${PROTECTED_ROUTE}$`));
}

/** Ordinary user activity: a pointer move and a keypress that changes nothing. */
async function keepActive(page: Page, tick: number): Promise<void> {
  await page.mouse.move(200 + (tick % 40), 300 + (tick % 40));
  await page.keyboard.press('Shift');
}

test.describe('Epic Sign in and session, Story 3: Idle warning and session end', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.clearCookies();
    // Install the fake clock BEFORE the first navigation so every timer the app
    // starts is under test control. The fixed start keeps runs deterministic; SAST
    // (GMT+2) per project.md §Compliance.
    await page.clock.install({ time: new Date('2026-08-25T09:00:00+02:00') });
  });

  // AC-1 (with the accessibility scan of the state this story introduces)
  test('warns after 14 idle minutes, counting down the final 60 seconds and naming the sign-out', async ({
    page,
  }) => {
    await signIn(page, IMPORTER_ROLE);

    const warning = page.getByRole('alertdialog');

    // Thirteen idle minutes in, the person is not interrupted yet.
    await page.clock.fastForward(ALMOST_IDLE_WARNING);
    await expect(warning).toBeHidden();

    // Crossing 14:00 — 60 seconds before the 15-minute idle limit — warns them.
    await page.clock.fastForward(INTO_IDLE_WARNING);
    await expect(warning).toBeVisible();

    // It names what is about to happen, and offers the way out.
    await expect(warning).toContainText(/sign(ed|ing)? out/i);
    await expect(
      warning.getByRole('button', { name: /stay signed in/i }),
    ).toBeVisible();

    // It counts the remaining seconds down, live.
    const countdown = warning.getByRole('timer');
    await expect(countdown).toHaveText(/\b(60|59)\b/);
    await page.clock.runFor(5_000);
    await expect(countdown).toHaveText(/\b5[0-5]\b/);

    // Accessibility of the warning state, scanned in a real browser and scoped to
    // WCAG 2.1 AA (NFR-base-1 / FNFR3) — axe's best-practice defaults would fail on
    // issues outside the agreed bar. Real time is resumed first because axe-core
    // schedules its own work on setTimeout/rAF, which a paused fake clock would
    // never fire; the dialog stays open for the ~55 real seconds still on the
    // countdown, far longer than a scan takes.
    await page.clock.resume();
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(violations).toEqual([]);
  });

  // AC-2
  test('resuming work, or choosing to stay signed in, clears the warning and starts the idle period over', async ({
    page,
  }) => {
    await signIn(page, IMPORTER_ROLE);

    const warning = page.getByRole('alertdialog');

    // Working again before the warning is due restarts the idle period...
    await page.clock.fastForward(ALMOST_IDLE_WARNING);
    await keepActive(page, 1);

    // ...so a second stretch of the same length still raises nothing, where an
    // un-reset window would have warned a minute ago.
    await page.clock.fastForward(ALMOST_IDLE_WARNING);
    await expect(warning).toBeHidden();

    // The warning is now due 14 minutes after that activity, not after sign-in.
    await page.clock.fastForward(INTO_IDLE_WARNING);
    await expect(warning).toBeVisible();

    // Choosing to stay signed in dismisses it and leaves the person where they are.
    await warning.getByRole('button', { name: /stay signed in/i }).click();
    await expect(warning).toBeHidden();
    await expect(page).toHaveURL(new RegExp(`${PROTECTED_ROUTE}$`));

    // And the idle period starts over from that choice.
    await page.clock.fastForward(ALMOST_IDLE_WARNING);
    await expect(warning).toBeHidden();
    await page.clock.fastForward(INTO_IDLE_WARNING);
    await expect(warning).toBeVisible();
  });

  // AC-3
  test('leaving the warning alone ends the session at 15 minutes and explains why on sign-in', async ({
    page,
  }) => {
    await signIn(page, IMPORTER_ROLE);

    const warning = page.getByRole('alertdialog');

    await page.clock.fastForward(ALMOST_IDLE_WARNING);
    await page.clock.fastForward(INTO_IDLE_WARNING);
    await expect(warning).toBeVisible();

    // Nobody answers; the 60 seconds run out at the 15-minute mark.
    await page.clock.fastForward(IDLE_WARNING_WINDOW);

    await expect(page).toHaveURL(/\/sign-in\?.*reason=idle-timeout/);
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole('status')).toContainText(/inactiv/i);
  });

  // AC-4
  test('the session still ends 8 hours after signing in, however active the person has been', async ({
    page,
  }) => {
    await signIn(page, IMPORTER_ROLE);

    const warning = page.getByRole('alertdialog');

    // Nearly eight hours of genuinely busy use: every stretch of time is punctuated
    // by activity, so the idle window never gets near its 15 minutes. That is what
    // separates this from the idle timeout — the person is never idle at all.
    for (let chunk = 0; chunk < ACTIVE_CHUNKS_BEFORE_CAP; chunk += 1) {
      await page.clock.fastForward(ACTIVE_CHUNK);
      await keepActive(page, chunk);
    }
    await expect(page).toHaveURL(new RegExp(`${PROTECTED_ROUTE}$`));
    await expect(warning).toBeHidden();

    // Carrying on working straight through the 8-hour mark does not extend it.
    for (let chunk = 0; chunk < ACTIVE_CHUNKS_PAST_CAP; chunk += 1) {
      await page.clock.fastForward(ACTIVE_CHUNK);
      await keepActive(page, ACTIVE_CHUNKS_BEFORE_CAP + chunk);
    }

    await expect(page).toHaveURL(/\/sign-in\?.*reason=session-expired/);
    await expect(page.getByRole('status')).toContainText(/session/i);

    // The eight-hour-old cookie is refused by the backend from here on, so the next
    // screen they try to open returns them to sign-in rather than letting them back
    // in. (A route added later takes precedence over the one in mockAuthChain.)
    await page.route('**/v1/auth/userinfo', (route) =>
      route.fulfill({ status: 401, body: '' }),
    );
    await page.goto(PROTECTED_ROUTE);
    await expect(page).toHaveURL(/\/sign-in/);
  });
});
