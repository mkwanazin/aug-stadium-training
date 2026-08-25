'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { getUserInfo } from '@/lib/api/auth';
import { isAPIErrorWithStatus } from '@/lib/api/errors';
import {
  hasPermission,
  holdsAnyRole,
  roleNamesOf,
} from '@/lib/auth/permissions';

import type { Permission } from '@/lib/auth/permissions';
import type { UserInfoRead } from '@/types/auth';
import type { ReactNode } from 'react';

/**
 * The signed-in session — read from `GET /v1/auth/userinfo` in the BROWSER.
 *
 * Browser-side on purpose: the credential is an HttpOnly `session` cookie the
 * browser attaches itself, and the answer must reflect this visitor's own session
 * rather than a cached server render. A cookie-presence gate runs ahead of it in
 * `web/src/middleware.ts` (the server-side half required by
 * .claude/policies/bff-auth-pattern.md §Next.js Integration Pattern); this is the
 * liveness half, and it is what notices a session that has been ended elsewhere.
 */

/** Where a person without a live session is sent (brief R5 / BR2). */
export const SIGN_IN_ROUTE = '/sign-in';

export interface Session {
  /** The `UserInfoRead` body verbatim, for anything not surfaced below. */
  user: UserInfoRead;
  /** Role names exactly as the API spelt them — these are shown to the person. */
  roles: string[];
  /** `FirstName LastName`, falling back to the email address. */
  displayName: string;
  /** May this account do that? (see `@/lib/auth/permissions`) */
  can: (permission: Permission) => boolean;
  /** Does this account hold one of these roles? For route-level role guards. */
  holdsAnyOf: (roles: readonly string[]) => boolean;
}

export type SessionStatus =
  /** The check is in flight — nothing about the person is known yet. */
  | 'checking'
  /** A live session, `session` populated. */
  | 'signed-in'
  /** `userinfo` answered 401 — there is no session to show anything for. */
  | 'signed-out'
  /** The check could not be completed (the service did not answer). */
  | 'unavailable';

export interface SessionSnapshot {
  status: SessionStatus;
  session: Session | null;
  /** Runs the check again — the retry affordance for `unavailable` (NFR-base-5). */
  recheck: () => void;
}

function toSession(user: UserInfoRead): Session {
  const roles = roleNamesOf(user);
  const fullName = [user.FirstName, user.LastName]
    .filter((part) => Boolean(part?.trim()))
    .join(' ')
    .trim();

  return {
    user,
    roles,
    displayName: fullName || (user.Email ?? ''),
    can: (permission) => hasPermission(roles, permission),
    holdsAnyOf: (permitted) => holdsAnyRole(roles, permitted),
  };
}

/** What one completed check found, stamped with the attempt that produced it. */
interface SessionOutcome {
  attempt: number;
  status: Exclude<SessionStatus, 'checking'>;
  session: Session | null;
}

/** Runs the session check and reports what it found. */
function useSessionQuery(enabled: boolean): SessionSnapshot {
  const [attempt, setAttempt] = useState(0);
  const [outcome, setOutcome] = useState<SessionOutcome | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    getUserInfo().then(
      (user) => {
        if (cancelled) return;
        setOutcome({ attempt, status: 'signed-in', session: toSession(user) });
      },
      (error: unknown) => {
        if (cancelled) return;
        // A 401 is the documented "no live session" answer; anything else means
        // the check itself did not complete, which is a different thing to say.
        setOutcome({
          attempt,
          status: isAPIErrorWithStatus(error, 401)
            ? 'signed-out'
            : 'unavailable',
          session: null,
        });
      },
    );

    return () => {
      cancelled = true;
    };
  }, [enabled, attempt]);

  // Derived during render rather than pushed into state by the effect: an outcome
  // left over from an earlier attempt is stale, so asking for a recheck reads as
  // 'checking' from that same render onwards. Setting 'checking' inside the effect
  // body instead would render the stale answer first and then cascade a second
  // render to correct it.
  const settled =
    outcome !== null && outcome.attempt === attempt ? outcome : null;
  const status: SessionStatus = settled?.status ?? 'checking';
  const session = settled?.session ?? null;

  const recheck = useCallback(() => setAttempt((count) => count + 1), []);

  return useMemo(
    () => ({ status, session, recheck }),
    [status, session, recheck],
  );
}

const SessionContext = createContext<SessionSnapshot | null>(null);

/**
 * Shares ONE session check with everything below it. Mounted by the authenticated
 * layout so a page load costs a single `GET /v1/auth/userinfo` however many
 * components ask who is signed in.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const snapshot = useSessionQuery(true);

  return (
    <SessionContext.Provider value={snapshot}>
      {children}
    </SessionContext.Provider>
  );
}

/**
 * The SHARED session check, or `null` when there is no `SessionProvider` above.
 *
 * Unlike `useSession` this never starts a check of its own. It is for components
 * that want to defer to a session gate when one is present — the session clock,
 * which must not run before there is a confirmed session — without becoming
 * unmountable outside the authenticated layout.
 */
export function useSessionContext(): SessionSnapshot | null {
  return useContext(SessionContext);
}

/**
 * Who is signed in, and what they may do.
 *
 * Works with or without a `SessionProvider` above it: inside the authenticated
 * layout it reads the shared check, and standing alone it runs its own. That
 * matters because guards built on this (the role guard later epics wrap content
 * in) must be mountable on their own — requiring a provider would push session
 * plumbing into every consuming component's tests.
 */
export function useSession(): SessionSnapshot {
  const shared = useContext(SessionContext);
  const own = useSessionQuery(shared === null);

  return shared ?? own;
}
