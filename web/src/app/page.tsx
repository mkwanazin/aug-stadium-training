import { redirect } from 'next/navigation';

/**
 * The application root owns no screen of its own.
 *
 * A signed-in person is sent to their files; a signed-out one never reaches this
 * far, because `web/src/middleware.ts` turns an address with no session straight
 * back to sign in. Either way there is no welcome page — the template's one is
 * replaced rather than wrapped (CLAUDE.md rule 6).
 */
export default function RootPage() {
  redirect('/files');
}
