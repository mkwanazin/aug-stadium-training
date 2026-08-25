import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Received files — Transaction file importer',
  description:
    'Every transaction file received, with what it is waiting for and who may act on it.',
};

/**
 * Received files — where signing in lands, and the shell's first surface.
 *
 * The listing itself belongs to the Received files epic; this story delivers the
 * frame around it (design digest §Received files → Layout: a header band above a
 * scrolling main area). The content region below says plainly that the listing is
 * still to come, rather than showing an empty table that looks broken.
 */
export default function ReceivedFilesPage() {
  return (
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
            Signing in, the menu your roles permit and signing out all work now.
            The listing itself — searching, filtering and the per-file action —
            arrives with the Received files work.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
