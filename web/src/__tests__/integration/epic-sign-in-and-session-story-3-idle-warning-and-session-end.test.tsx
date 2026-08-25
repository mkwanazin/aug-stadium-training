/**
 * Story Metadata:
 * - Epic: sign-in-and-session — Story 3: Idle warning and session end
 * - Route: /files
 * - Target File: web/src/app/(app)/layout.tsx
 * - Page Action: modify_existing
 * - Covers: AC-5 ONLY. AC-1 to AC-4 are tagged `playwright` and are driven in a
 *   real browser with `page.clock` against the real NFR-base-7 durations — do not
 *   re-assert the flow (warning appears / countdown / expiry redirect / 8-hour cap)
 *   here. See .claude/policies/testing-policy.md § Time-dependent behaviour.
 *
 * AC-5 — "The warning takes keyboard focus when it appears, can be answered with
 * the keyboard alone, and returns focus to where the person was."
 *
 * Focus management is the one part of this story jsdom is genuinely the right tool
 * for: where focus lands when the dialog opens, that it cannot fall through to the
 * page underneath, and where it is returned on close. A browser axe scan does not
 * assert any of that.
 *
 * ── Implementation contract this test pins (read before writing code) ──────────
 * 1. `web/src/app/(app)/layout.tsx` mounts a client component `SessionTimeoutManager`
 *    (`@/components/session/SessionTimeoutManager`) AROUND the authenticated
 *    content: `<SessionTimeoutManager>{children}</SessionTimeoutManager>`.
 * 2. It takes no timing props. It owns the real NFR-base-7 values — 15-minute idle
 *    window, 60-second warning, 8-hour absolute cap. Do NOT add shortened
 *    test-only durations or env switches to production: the flow is proven in
 *    Playwright with `page.clock` against the real values.
 * 3. The warning is a composed Shadcn (Radix) AlertDialog — modal,
 *    `role="alertdialog"` — carrying a "Stay signed in" action. `alertdialog`,
 *    not `dialog`: it interrupts and demands an answer, which is also what the
 *    Playwright spec for this story locates (`getByRole('alertdialog')`).
 *    Neither Testing Library nor Playwright resolves ARIA role inheritance, so
 *    the queries below name the role the element actually carries.
 * 4. While the warning is open, ordinary keyboard activity must NOT silently
 *    dismiss it; only the explicit "Stay signed in" action (or expiry) closes it.
 *    AC-2's "simply resuming work" reset applies BEFORE the warning appears.
 *
 * Fake timers are used here only to reach the moment the dialog opens — the
 * last-resort case in testing-policy.md § Time-dependent behaviour. No `axe()` is
 * run in this file (axe defers on setTimeout and hangs under a frozen clock);
 * accessibility is asserted by the Playwright @axe-core/playwright scan.
 *
 * `prefers-reduced-motion` is honoured by the dialog per the story summary, but it
 * is a visual/OS concern jsdom cannot observe — it belongs to the manual checklist,
 * not to this file.
 *
 * These tests WILL FAIL until implemented (TDD red).
 */
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Imports the REAL production component — fails until Story 3 is implemented.
import { SessionTimeoutManager } from '@/components/session/SessionTimeoutManager';

// Only the HTTP boundary is mocked (testing-policy.md § Mocking strategy). The
// manager ends the session against POST /v1/auth/logout on expiry; this test never
// lets the countdown run out, but the module must still resolve.
vi.mock('@/lib/api/client', () => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/files',
  useSearchParams: () => new URLSearchParams(),
}));

/** NFR-base-7: 15-minute idle window, warned 60 seconds before it ends. */
const MINUTE_MS = 60_000;
const IDLE_WINDOW_MS = 15 * MINUTE_MS;
const WARNING_LEAD_MS = MINUTE_MS;
const TIME_UNTIL_WARNING_MS = IDLE_WINDOW_MS - WARNING_LEAD_MS;

/** Bounded so a broken focus trap fails the test instead of spinning forever. */
const MAX_TAB_STOPS = 8;

const activeElement = (): HTMLElement | null =>
  document.activeElement as HTMLElement | null;

describe('Epic sign-in-and-session, Story 3: idle warning keyboard focus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // AC-5
  it('takes focus when the warning appears, can be answered with the keyboard alone, and returns focus to where the person was', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    render(
      <SessionTimeoutManager>
        <button type="button">Continue working</button>
      </SessionTimeoutManager>,
    );

    // The person is working on the page; focus sits on the control they last used.
    const pageControl = screen.getByRole('button', {
      name: 'Continue working',
    });
    await user.click(pageControl);
    expect(pageControl).toHaveFocus();

    // Nothing further happens until the warning is due, 60 seconds before the
    // 15-minute idle window closes.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(TIME_UNTIL_WARNING_MS);
    });

    const warning = await screen.findByRole('alertdialog');

    // The warning takes focus, so a keyboard user is not left stranded on the page
    // behind an alert they cannot see.
    await waitFor(() => {
      expect(warning).toContainElement(activeElement());
    });
    expect(pageControl).not.toHaveFocus();

    // Tabbing keeps focus inside the warning — it cannot fall through to the page
    // underneath — and cycles round to the action that keeps the session alive.
    const staySignedIn = within(warning).getByRole('button', {
      name: /stay signed in/i,
    });

    await user.tab();
    expect(warning).toContainElement(activeElement());

    for (
      let tabStop = 0;
      tabStop < MAX_TAB_STOPS && activeElement() !== staySignedIn;
      tabStop += 1
    ) {
      await user.tab();
      expect(warning).toContainElement(activeElement());
    }
    expect(staySignedIn).toHaveFocus();

    // Answered with the keyboard alone — no pointer used anywhere above.
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    // Focus returns to exactly where the person was, so they carry straight on.
    await waitFor(() => {
      expect(pageControl).toHaveFocus();
    });
  });
});
