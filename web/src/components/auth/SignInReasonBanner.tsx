'use client';

import { useSearchParams } from 'next/navigation';

import { StatusBanner } from '@/components/feedback/StatusBanner';

/**
 * Explains why a person is looking at the sign-in screen when they did not ask
 * to be. The session-end paths return here carrying a reason —
 * `/sign-in?reason=idle-timeout` when an idle session ends, and
 * `/sign-in?reason=session-expired` when the absolute cap is reached — and this
 * renders the matching explanation as a polite `status` (nobody needs an
 * interruption for something that already happened).
 *
 * Session end itself belongs to the idle-warning story; the sign-in screen owns
 * the explanation it lands on.
 */
const REASONS: Record<string, { lead: string; detail: string }> = {
  'idle-timeout': {
    lead: 'You were signed out after 15 minutes of inactivity.',
    detail: 'Sign in again to pick up where you left off.',
  },
  'session-expired': {
    lead: 'Your session reached its 8-hour limit and ended.',
    detail: 'Sign in again to continue.',
  },
};

export function SignInReasonBanner() {
  const reason = useSearchParams().get('reason');
  // `Object.hasOwn`, not a bare lookup: the reason comes off the query string, and
  // `?reason=constructor` (or `toString`, `valueOf`, …) resolves off
  // `Object.prototype` — truthy, with no `lead` and no `detail`, which would put
  // an empty banner on the sign-in screen.
  const explanation =
    reason !== null && Object.hasOwn(REASONS, reason)
      ? REASONS[reason]
      : undefined;

  if (!explanation) return null;

  return (
    <StatusBanner tone="info" lead={explanation.lead}>
      {explanation.detail}
    </StatusBanner>
  );
}
