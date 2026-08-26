'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { IdleWarningDialog } from '@/components/session/IdleWarningDialog';
import { logout } from '@/lib/api/auth';
import { SIGN_IN_ROUTE, useSessionContext } from '@/lib/auth/session';
import {
  ABSOLUTE_SESSION_MS,
  IDLE_WARNING_LEAD_MS,
  IDLE_WINDOW_MS,
  anchorSessionStart,
  clearSessionStart,
  markLastActivity,
  readLastActivity,
} from '@/lib/auth/session-lifetime';

import type { ReactNode } from 'react';

/**
 * The session's clock, wrapped around every signed-in surface (brief R14 / R15 /
 * R16, project.md NFR-base-7).
 *
 * Two independent limits run here:
 *
 *  - the **idle window** — 15 minutes without activity ends the session, and the
 *    person is warned for the final 60 seconds of it. Activity restarts it, but
 *    only while the warning is not yet showing. It is measured across EVERY tab
 *    of the session (see `markLastActivity`), because a background tab must not
 *    sign the person out of the one they are working in;
 *  - the **absolute cap** — 8 hours after signing in the session ends however
 *    busy the person has been. Activity does not extend it, which is the whole
 *    point of having it.
 *
 * Both are measured by comparing wall-clock `Date` readings on a one-second
 * tick, rather than by scheduling one long `setTimeout` per deadline. Long
 * timers are the fragile way to do this: browsers throttle them in background
 * tabs and a suspended laptop does not run them at all, so a session that
 * should have ended hours ago would quietly still be open. A clock comparison
 * notices the elapsed time whenever the tab next runs, and the same one-second
 * tick is what the countdown needs anyway.
 *
 * The real NFR-base-7 durations are used as-is (see `session-lifetime.ts`) —
 * there are no timing props, no shortened test-only windows and no env switch.
 */

/** How often the clock is consulted. Also the countdown's resolution. */
const TICK_MS = 1000;

/**
 * How long ending a session waits for `POST /v1/auth/logout` to answer before
 * returning the person to sign in without it.
 *
 * A bound is needed because "the request failed" and "the request never comes
 * back" are different things. A REJECTED logout settles at once and is handled;
 * a PENDING one — a proxy that black-holes the request, a connection left hanging
 * — never settles at all, and with the ticker already stood down for the ending
 * session the person was left sitting on a signed-in screen behind a frozen
 * countdown that never redirected. A few seconds is long enough for a healthy
 * logout to answer and short enough not to strand anybody.
 */
const LOGOUT_WAIT_MS = 5000;

/**
 * How idle the session has to be for the warning to be raised. A warning falling
 * due inside the current tick is raised now rather than on the next one:
 * detection is only ever as fine as the tick, and the person is promised a full
 * 60 seconds' notice rather than 59.
 */
const WARN_AT_IDLE_MS = IDLE_WINDOW_MS - IDLE_WARNING_LEAD_MS - TICK_MS;

/**
 * What counts as the person still being here. Deliberately ordinary events, on
 * `document` in the capture-free bubbling phase: anything they do inside the app
 * passes through here.
 */
const ACTIVITY_EVENTS = [
  'keydown',
  'mousemove',
  'mousedown',
  'wheel',
  'touchstart',
  'focusin',
] as const;

/** Why the session ended — carried to sign in, which explains it there. */
type SessionEndReason = 'idle-timeout' | 'session-expired';

/**
 * Asks the server to drop the session, waiting no longer than `LOGOUT_WAIT_MS`.
 *
 * `true` means the server CONFIRMED the session is gone. Both a refusal and a
 * request that never answers give `false`: in either case the session may still
 * be live server-side, so the caller must treat a timed-out logout exactly as it
 * treats a failed one.
 *
 * The request itself is not cancelled — the shared API client exposes no abort
 * signal, and cancelling would buy nothing anyway: if the logout does eventually
 * land, the session ending is precisely what was asked for. Only the waiting
 * stops. The rejection is handled inside the race rather than after it, so a
 * logout that fails long after we stopped listening cannot surface as an
 * unhandled rejection.
 */
function requestServerLogout(): Promise<boolean> {
  let giveUpTimer: ReturnType<typeof setTimeout> | undefined;

  const answered = logout().then(
    () => true,
    () => false,
  );

  const waitedLongEnough = new Promise<boolean>((resolve) => {
    giveUpTimer = setTimeout(() => resolve(false), LOGOUT_WAIT_MS);
  });

  return Promise.race([answered, waitedLongEnough]).finally(() => {
    if (giveUpTimer !== undefined) clearTimeout(giveUpTimer);
  });
}

export function SessionTimeoutManager({ children }: { children: ReactNode }) {
  const router = useRouter();

  /**
   * The clock must not run before there IS a session: mounted by the
   * authenticated layout, this component is on screen while the session check is
   * still in flight, and while the "we could not confirm that you are signed in"
   * retry screen is showing. Counting a person who is not signed in towards an
   * idle timeout would interrupt that screen with a sign-out warning and then
   * return them to sign in blaming 15 minutes of inactivity.
   *
   * Read through the CONTEXT rather than `useSession`, so standing alone — with no
   * provider above — the clock still runs and this component stays mountable on
   * its own.
   */
  const sharedSession = useSessionContext();
  const awaitingSession =
    sharedSession !== null && sharedSession.status !== 'signed-in';

  /** Whole seconds left on the warning, or `null` while none is showing. */
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const isWarningOpen = useRef(false);
  // Both clocks are read from the browser, so they are stamped when the manager
  // mounts rather than while rendering — a render must not read the time.
  const lastActivityAt = useRef<number | null>(null);
  const startedAt = useRef<number | null>(null);
  const isEnding = useRef(false);
  const routerRef = useRef(router);

  // Held in a ref so the ticker below is set up once, on mount, instead of being
  // torn down and rebuilt every time the router object is re-created.
  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  const endSession = useCallback(async (reason: SessionEndReason) => {
    if (isEnding.current) return;
    isEnding.current = true;

    // Awaited, so the server is asked to drop the session before we navigate
    // (brief R4 / BR4) — but for a bounded few seconds only. Unlike the Sign out
    // button, nothing here is reported back to the person: the session is over as
    // far as this application is concerned however the request went, and the next
    // backend call will be refused. So they are returned to sign in regardless of
    // whether the logout succeeded, failed, or never answered at all.
    const ended = await requestServerLogout();

    // Cleared only once the session is CONFIRMED over — the same order the Sign
    // out button uses, and the reason a timed-out logout has to count as a failed
    // one. Clearing without confirmation would discard the recorded sign-in
    // moment while the session was potentially still live server-side, and
    // `anchorSessionStart` would then re-anchor the eight-hour cap at now: a
    // session this app has already ended would come back with a fresh eight
    // hours the moment the person reopened a signed-in address.
    if (ended) clearSessionStart();

    // `replace`: a screen whose session has ended should not sit in history for
    // the Back button to return to.
    routerRef.current.replace(`${SIGN_IN_ROUTE}?reason=${reason}`);
  }, []);

  useEffect(() => {
    if (awaitingSession) return;

    startedAt.current = anchorSessionStart();
    /*
     * Arriving on a signed-in screen is itself the person being here, so the idle
     * window starts over here on every mount. That means the idle window
     * deliberately does NOT survive a page load: reload after 14 idle minutes and
     * you get the full 15 again, so the shared activity stamp only ever does
     * cross-TAB work, never cross-load work.
     *
     * Reviewed and accepted knowingly by the user on 2026-08-26 — opening the app
     * is a person being present, and the eight-hour absolute cap (which DOES
     * survive a reload, being anchored in shared storage above) is what stops
     * reloading from extending a session indefinitely. Please do not "fix" this.
     */
    lastActivityAt.current = Date.now();
    // The clock is starting over, so no warning is outstanding — otherwise a flag
    // left set from a previous run would go on suppressing activity notes.
    isWarningOpen.current = false;

    const noteActivity = () => {
      // While the warning is showing, ordinary activity is ignored on purpose:
      // only the explicit "Stay signed in" action, or expiry, closes it. A
      // stray keystroke must not silently dismiss a security warning.
      if (isWarningOpen.current) return;
      lastActivityAt.current = Date.now();
    };

    ACTIVITY_EVENTS.forEach((eventName) => {
      document.addEventListener(eventName, noteActivity, { passive: true });
    });

    const ticker = setInterval(() => {
      if (isEnding.current) return;

      const now = Date.now();

      // The absolute cap is checked first, and against the moment of signing in
      // rather than the last activity — it holds however active the person has
      // been (brief R15).
      if (now - (startedAt.current ?? now) >= ABSOLUTE_SESSION_MS) {
        void endSession('session-expired');
        return;
      }

      // The idle window belongs to the SESSION, not to this document. Every tab
      // publishes its own last activity here once a second and reads what the
      // others have published, so a tab left open in the background cannot sign
      // the person out from under the tab they are actually working in. Reading
      // it on the tick is also the throttle: a mousemove does no storage work.
      const shared = readLastActivity();
      const local = lastActivityAt.current;

      if (local !== null && (shared === null || local > shared)) {
        markLastActivity(local);
      }

      const idleFor = now - Math.max(local ?? now, shared ?? 0);

      if (idleFor >= IDLE_WINDOW_MS) {
        void endSession('idle-timeout');
        return;
      }

      if (idleFor >= WARN_AT_IDLE_MS) {
        isWarningOpen.current = true;
        setSecondsLeft(
          Math.min(
            IDLE_WARNING_LEAD_MS / TICK_MS,
            Math.max(0, Math.ceil((IDLE_WINDOW_MS - idleFor) / TICK_MS)),
          ),
        );
        return;
      }

      // Back below the warning threshold with a warning showing means another tab
      // of this session is being used, so the warning is withdrawn. Activity in
      // THIS document still never dismisses it — `noteActivity` above ignores it
      // while it is open, so nothing here can be triggered by a stray keystroke.
      if (isWarningOpen.current) {
        isWarningOpen.current = false;
        setSecondsLeft(null);
      }
    }, TICK_MS);

    return () => {
      clearInterval(ticker);
      ACTIVITY_EVENTS.forEach((eventName) => {
        document.removeEventListener(eventName, noteActivity);
      });
    };
  }, [awaitingSession, endSession]);

  /** They are still here: close the warning and start the idle window over. */
  const staySignedIn = useCallback(() => {
    const now = Date.now();
    isWarningOpen.current = false;
    lastActivityAt.current = now;
    // Published straight away rather than on the next tick, so any other tab
    // showing the same warning withdraws it too.
    markLastActivity(now);
    setSecondsLeft(null);
  }, []);

  return (
    <>
      {/*
        Derived rather than pushed into state by an effect: while there is no
        confirmed session the clock is not running, so there is nothing to warn
        about — a session revoked elsewhere and found by a recheck takes its
        warning with it instead of leaving one over a surface the person is no
        longer entitled to.
      */}
      <IdleWarningDialog
        secondsLeft={awaitingSession ? null : secondsLeft}
        onStaySignedIn={staySignedIn}
      />
      {children}
    </>
  );
}
