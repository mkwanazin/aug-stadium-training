/**
 * How long a session lasts, and when the one in front of us began.
 *
 * The three windows are project.md NFR-base-7 (source spec §6.6.1) and are the
 * REAL production values — there is no shortened test-only variant and no env
 * switch. A build that timed out in seconds under test would prove nothing about
 * what the person meets in production, so both test layers drive these values
 * with a fake clock instead (`page.clock` in Playwright, fake timers in Vitest).
 */

/** Inactivity that ends a session (brief R14). */
export const IDLE_WINDOW_MS = 15 * 60 * 1000;

/** How much notice the person gets before the idle window closes (brief R16). */
export const IDLE_WARNING_LEAD_MS = 60 * 1000;

/** The cap a session cannot outlive, however busy the person is (brief R15). */
export const ABSOLUTE_SESSION_MS = 8 * 60 * 60 * 1000;

/**
 * When this session started, remembered in the browser.
 *
 * The absolute cap has to be measured from the moment of signing in, and the
 * Authentication API tells us nothing about when it issued the session — the
 * `session` cookie is HttpOnly and opaque, and `GET /v1/auth/userinfo` returns
 * no issued-at. So the sign-in that established the session records the moment
 * here, in `localStorage` rather than per-tab storage, so the cap holds across
 * reloads and across every tab of the same session.
 */
const SESSION_START_KEY = 'transaction-file-importer.session-started-at';

/**
 * `localStorage` is not always there to be had — it does not exist during a
 * server render, and a browser may refuse it outright (private mode, blocked
 * site data, quota). Every access goes through here so a refusal degrades to
 * "we do not know" instead of throwing on a signed-in screen.
 */
function withStorage<T>(operation: (store: Storage) => T, fallback: T): T {
  if (typeof window === 'undefined') return fallback;

  try {
    return operation(window.localStorage);
  } catch {
    return fallback;
  }
}

/** Records the moment a session began. Called by the sign-in that created it. */
export function markSessionStart(at: number = Date.now()): void {
  withStorage(
    (store) => store.setItem(SESSION_START_KEY, String(at)),
    undefined,
  );
}

/** When the current session began, or `null` if nothing was recorded. */
export function readSessionStart(): number | null {
  return withStorage((store) => {
    const recorded = Number(store.getItem(SESSION_START_KEY));
    return Number.isFinite(recorded) && recorded > 0 ? recorded : null;
  }, null);
}

/** Forgets the recorded start — every path that ends a session calls this. */
export function clearSessionStart(): void {
  withStorage((store) => store.removeItem(SESSION_START_KEY), undefined);
}

/**
 * The moment the absolute cap is measured from.
 *
 * Normally this is what sign-in recorded. When nothing was recorded — storage
 * was cleared, or the person arrived with a `session` cookie this browser never
 * saw created — the cap is anchored at now and remembered, so it still ends the
 * session rather than never firing at all. That fallback can extend a session
 * beyond eight real hours; it is the closest thing to the truth available until
 * the Authentication API exposes when it issued the session.
 */
export function anchorSessionStart(): number {
  const recorded = readSessionStart();
  if (recorded !== null) return recorded;

  const now = Date.now();
  markSessionStart(now);
  return now;
}
