import { RoleGuard } from '@/components/auth/RoleGuard';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { rolesGranting } from '@/lib/auth/permissions';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Received files — Transaction file importer',
  description:
    'Every transaction file received, with what it is waiting for and who may act on it.',
};

/**
 * What holding one of the permitted roles opens here — named in the refusal an
 * account outside that set is given, so the explanation says what it is missing
 * out on rather than only that it is missing something.
 */
const FILES_CAPABILITY = 'Seeing the transaction files received';

/**
 * Received files — where signing in lands, and the shell's first surface.
 *
 * The listing itself belongs to the Received files epic; this story delivers the
 * frame around it (design digest §Received files → Layout: a header band above a
 * scrolling main area). The content region below says plainly that the listing is
 * still to come, rather than showing an empty table that looks broken.
 *
 * Guarded by the roles the grant table says may view files, so an account holding
 * a role this project grants nothing to is refused HERE, in place, with the menu
 * and Sign out still working — rather than shown a listing it may not see or
 * bounced to an error page (brief R11 / R12 / BR3).
 */
export default function ReceivedFilesPage() {
  return (
    <RoleGuard
      requiredRoles={rolesGranting('files.view')}
      capability={FILES_CAPABILITY}
    >
      <div className="flex flex-col gap-5 px-8 py-6">
        <div className="flex flex-col gap-1">
          <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Imports
          </p>
          <h1 className="text-2xl">Received files</h1>
        </div>

        <Card className="max-w-[62ch]">
          <CardHeader>
            <CardTitle>The file listing is still being built</CardTitle>
            <CardDescription>
              This is where every transaction file received will be listed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Signing in, the menu your roles permit and signing out all work
              now. The listing itself — searching, filtering and the per-file
              action — arrives with the Received files work.
            </p>
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
