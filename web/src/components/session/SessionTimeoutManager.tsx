'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { IdleWarningDialog } from '@/components/session/IdleWarningDialog';
import { logout } from '@/lib/api/auth';
import { SIGN_IN_ROUTE } from '@/lib/auth/session';
import {
  ABSOLUTE_SESSION_MS,
  IDLE_WARNING_LEAD_MS,
  IDLE_WINDOW_MS,
  anchorSessionStart,
  clearSessionStart,
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
 *    only while the warning is not yet showing;
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

export function SessionTimeoutManager({ children }: { children: ReactNode }) {
  const router = useRouter();

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

    clearSessionStart();

    // Awaited, so the server is asked to drop the session before we navigate
    // (brief R4 / BR4). Unlike the Sign out button, a failure here cannot leave
    // the person sitting on a signed-in screen: the session is over as far as
    // this application is concerned either way, and the next backend call will
    // be refused. So we report nothing and return them to sign in regardless.
    await logout().catch(() => undefined);

    // `replace`: a screen whose session has ended should not sit in history for
    // the Back button to return to.
    routerRef.current.replace(`${SIGN_IN_ROUTE}?reason=${reason}`);
  }, []);

  useEffect(() => {
    startedAt.current = anchorSessionStart();
    // Arriving on a signed-in screen is itself the person being here.
    lastActivityAt.current = Date.now();

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

      const idleFor = now - (lastActivityAt.current ?? now);

      if (idleFor >= IDLE_WINDOW_MS) {
        void endSession('idle-timeout');
        return;
      }

      // A warning falling due inside the current tick is raised now, not on the
      // next one: detection is only ever as fine as the tick, and the person is
      // promised a full 60 seconds' notice rather than 59.
      if (idleFor >= IDLE_WINDOW_MS - IDLE_WARNING_LEAD_MS - TICK_MS) {
        isWarningOpen.current = true;
        setSecondsLeft(
          Math.min(
            IDLE_WARNING_LEAD_MS / TICK_MS,
            Math.max(0, Math.ceil((IDLE_WINDOW_MS - idleFor) / TICK_MS)),
          ),
        );
      }
    }, TICK_MS);

    return () => {
      clearInterval(ticker);
      ACTIVITY_EVENTS.forEach((eventName) => {
        document.removeEventListener(eventName, noteActivity);
      });
    };
  }, [endSession]);

  /** They are still here: close the warning and start the idle window over. */
  const staySignedIn = useCallback(() => {
    isWarningOpen.current = false;
    lastActivityAt.current = Date.now();
    setSecondsLeft(null);
  }, []);

  return (
    <>
      <IdleWarningDialog
        secondsLeft={secondsLeft}
        onStaySignedIn={staySignedIn}
      />
      {children}
    </>
  );
}
