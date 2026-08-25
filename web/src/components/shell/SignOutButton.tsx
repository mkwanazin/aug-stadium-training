'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { StatusBanner } from '@/components/feedback/StatusBanner';
import { Button } from '@/components/ui/button';
import { logout } from '@/lib/api/auth';
import { SIGN_IN_ROUTE } from '@/lib/auth/session';

/** Copy this control owns. Voice: careful custodian (brief R20). */
const COPY = {
  signOut: 'Sign out',
  signingOut: 'Signing out…',
  failedLead: 'You are still signed in.',
  failedFollowUp:
    'The service did not confirm that your session was ended. Try signing out again.',
} as const;

/**
 * Sign out — and WAIT for the session to actually be over before going anywhere
 * (brief R4 / BR4).
 *
 * The button stays on screen and disabled while `POST /v1/auth/logout` is in
 * flight, and navigates only once that response resolves. Navigating on the click
 * instead would look identical to the person while leaving a live session behind
 * on the server if the request failed
 * (.claude/policies/bff-auth-pattern.md Rule 8) — so a failure is said out loud
 * here rather than hidden behind a redirect.
 */
export function SignOutButton() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    setHasFailed(false);

    try {
      await logout();
    } catch {
      // The session was NOT confirmed ended — stay put and say so.
      setIsSigningOut(false);
      setHasFailed(true);
      return;
    }

    // Only now is the session over. `push`, not `replace`: the signed-in page
    // stays in history, and pressing Back finds a dead session and is returned
    // here — rather than the history entry vanishing (brief AC-5).
    router.push(SIGN_IN_ROUTE);
  };

  return (
    <div className="flex flex-col gap-2">
      {hasFailed ? (
        <StatusBanner tone="error" lead={COPY.failedLead}>
          {COPY.failedFollowUp}
        </StatusBanner>
      ) : null}

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleSignOut}
        disabled={isSigningOut}
        aria-busy={isSigningOut}
      >
        {isSigningOut ? COPY.signingOut : COPY.signOut}
      </Button>
    </div>
  );
}
