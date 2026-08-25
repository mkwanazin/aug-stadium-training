'use client';

import { SessionTimeoutManager } from '@/components/session/SessionTimeoutManager';
import { AppShell } from '@/components/shell/AppShell';
import { SessionProvider } from '@/lib/auth/session';

import type { ReactNode } from 'react';

/**
 * Every signed-in surface lives under this layout, so every one of them gets the
 * same session check, the same session lifetime — the idle warning and the
 * absolute cap — and the same frame: the sidebar with the person's name, the
 * roles they hold, the menu their roles permit, and Sign out.
 *
 * A client component on purpose. The session check has to run in the BROWSER: the
 * credential is an HttpOnly cookie the browser attaches itself, and the answer
 * must be about this visitor's session rather than a server render that could be
 * cached or shared. The server-side half of the gate — a cookie-presence check
 * that turns an unauthenticated address bar straight back to sign in, before any
 * of this is sent — is `web/src/middleware.ts`.
 */
export default function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <SessionProvider>
      {/*
        The timeout manager sits OUTSIDE the shell so the warning it raises is
        not dependent on what the page underneath is doing, and so the idle and
        absolute windows are measured once for the whole signed-in area rather
        than restarting on every navigation within it.
      */}
      <SessionTimeoutManager>
        <AppShell>{children}</AppShell>
      </SessionTimeoutManager>
    </SessionProvider>
  );
}
