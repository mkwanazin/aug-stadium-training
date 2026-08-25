'use client';

import { AppShell } from '@/components/shell/AppShell';
import { SessionProvider } from '@/lib/auth/session';

import type { ReactNode } from 'react';

/**
 * Every signed-in surface lives under this layout, so every one of them gets the
 * same session check and the same frame — the sidebar with the person's name, the
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
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}
