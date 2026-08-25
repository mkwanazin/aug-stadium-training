import { Badge } from '@/components/ui/badge';

import type { Session } from '@/lib/auth/session';

/**
 * Who is signed in, pinned to the bottom of the sidebar (design digest §Received
 * files → Layout / Copy): the eyebrow `Signed in`, the person's name over their
 * email address, then one badge per role they hold.
 *
 * One badge PER ROLE, from `Roles[]` — an account holding both roles says so,
 * rather than presenting whichever one a single-role field happened to carry. A
 * role this project grants nothing to is still shown: the person is signed in, and
 * telling them what they hold is honest even when it unlocks nothing.
 */
export function SignedInBlock({ session }: { session: Session }) {
  const { displayName, roles, user } = session;

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        Signed in
      </p>

      <p className="text-sidebar-foreground text-sm font-medium">
        {displayName}
      </p>

      {user.Email ? (
        <p className="text-muted-foreground text-xs break-all">{user.Email}</p>
      ) : null}

      {roles.length > 0 ? (
        <div className="mt-1 flex flex-wrap gap-1">
          {roles.map((role) => (
            <Badge key={role} variant="secondary">
              {role}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
