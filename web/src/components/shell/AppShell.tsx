'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { StatusBanner } from '@/components/feedback/StatusBanner';
import { SidebarNav } from '@/components/shell/SidebarNav';
import { SignOutButton } from '@/components/shell/SignOutButton';
import { SignedInBlock } from '@/components/shell/SignedInBlock';
import { ThemeSwitch } from '@/components/theme/ThemeSwitch';
import { Button } from '@/components/ui/button';
import { SIGN_IN_ROUTE, useSession } from '@/lib/auth/session';

import type { SessionStatus } from '@/lib/auth/session';
import type { ReactNode } from 'react';

const MAIN_CONTENT_ID = 'main-content';

/** Copy this shell owns. Voice: careful custodian (brief R20). */
const COPY = {
  brandName: 'PIM Capital Group',
  brandSubLine: 'Transaction file importer',
  skipToContent: 'Skip to content',
  checking: 'Checking that you are still signed in…',
  returningToSignIn: 'Taking you back to sign in…',
  unavailableLead: 'We could not confirm that you are signed in.',
  unavailableFollowUp:
    'The service did not answer. Nothing has changed — try the check again.',
  retry: 'Try again',
} as const;

/**
 * The frame every signed-in screen sits in: a 224px sidebar carrying the
 * brandmark, the role-gated menu, the light/dark switch, who is signed in and Sign
 * out; and a content pane the page fills (design digest §Received files → Layout).
 *
 * A client component on purpose — the session check is a BROWSER call carrying the
 * HttpOnly `session` cookie, and it has to reflect the state of this visitor's own
 * session rather than a server render that may be cached or shared. The
 * complementary server-side gate is the cookie-presence check in
 * `web/src/middleware.ts`.
 *
 * The page's own content is not rendered until the session is confirmed, so no
 * screen inside the shell can start loading a person's data before we know there
 * is a person.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { status, session, recheck } = useSession();

  useEffect(() => {
    if (status === 'signed-out') {
      // `replace`, not `push`: a surface they were never entitled to see should
      // not sit in history for the Back button to return to.
      router.replace(SIGN_IN_ROUTE);
    }
  }, [status, router]);

  if (status !== 'signed-in' || !session) {
    return <SessionCheckState status={status} onRetry={recheck} />;
  }

  return (
    <div className="bg-background flex min-h-screen">
      <a
        href={`#${MAIN_CONTENT_ID}`}
        className="bg-background text-foreground focus:ring-ring sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:not-sr-only focus:rounded-sm focus:px-3 focus:py-2 focus:ring-2"
      >
        {COPY.skipToContent}
      </a>

      <aside className="bg-sidebar text-sidebar-foreground border-sidebar-border flex w-56 shrink-0 flex-col gap-6 border-r px-4 py-5">
        <div className="flex flex-col gap-0.5">
          <p className="text-primary font-heading text-base">
            {COPY.brandName}
          </p>
          <p className="text-muted-foreground text-xs">{COPY.brandSubLine}</p>
        </div>

        <SidebarNav session={session} />

        <div className="border-sidebar-border mt-auto flex flex-col gap-4 border-t pt-4">
          <ThemeSwitch />
          <SignedInBlock session={session} />
          <SignOutButton />
        </div>
      </aside>

      <main id={MAIN_CONTENT_ID} className="min-w-0 flex-1">
        {children}
      </main>
    </div>
  );
}

/**
 * What the person sees while the session check runs, and what they see when it
 * cannot be completed — an explanation with a way to try again rather than a blank
 * screen or a silent bounce (NFR-base-5).
 */
function SessionCheckState({
  status,
  onRetry,
}: {
  status: SessionStatus;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="flex w-full max-w-[420px] flex-col items-center gap-4">
        {status === 'unavailable' ? (
          <>
            <StatusBanner tone="error" lead={COPY.unavailableLead}>
              {COPY.unavailableFollowUp}
            </StatusBanner>
            <Button type="button" onClick={onRetry}>
              {COPY.retry}
            </Button>
          </>
        ) : (
          <p role="status" className="text-muted-foreground text-sm">
            {status === 'signed-out' ? COPY.returningToSignIn : COPY.checking}
          </p>
        )}
      </div>
    </div>
  );
}
