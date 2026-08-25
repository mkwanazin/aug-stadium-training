'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { NAV_GROUPS } from '@/components/shell/navigation';
import { cn } from '@/lib/utils';

import type { NavGroup } from '@/components/shell/navigation';
import type { Session } from '@/lib/auth/session';

const groupLabelId = (heading: string) =>
  `nav-group-${heading.toLowerCase().replace(/\s+/g, '-')}`;

/**
 * The sidebar menu. An action a person's roles do not permit is ABSENT rather than
 * shown and then refused (brief R11 / UI-14), and a group whose every destination
 * is withheld does not leave its heading behind.
 *
 * An account whose roles permit nothing gets no destinations at all — which is the
 * honest answer, and the one a permission check gives where a two-way role branch
 * would quietly hand it the Importer's menu. The menu itself still stands, saying
 * plainly that it is empty: a sidebar that silently loses its menu region reads as
 * a broken frame rather than an empty one.
 */

/** The one thing this menu says when it has nothing to offer. */
const NOTHING_PERMITTED = 'No sections are open to the roles you hold.';

export function SidebarNav({ session }: { session: Session }) {
  const pathname = usePathname();

  const permitted: NavGroup[] = NAV_GROUPS.map((group) => ({
    ...group,
    destinations: group.destinations.filter((destination) =>
      session.can(destination.permission),
    ),
  })).filter((group) => group.destinations.length > 0);

  const isCurrent = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav aria-label="Sections" className="flex flex-col gap-5">
      {permitted.length === 0 ? (
        <p className="text-muted-foreground px-2 text-xs leading-relaxed">
          {NOTHING_PERMITTED}
        </p>
      ) : null}

      {permitted.map((group) => (
        <div
          key={group.heading ?? 'primary'}
          className="flex flex-col gap-0.5"
          role={group.heading ? 'group' : undefined}
          aria-labelledby={
            group.heading ? groupLabelId(group.heading) : undefined
          }
        >
          {group.heading ? (
            // A named group rather than a heading: the sidebar sits above the
            // page's own <h1> in the document, so a heading here would land out
            // of order in the outline it does not belong to.
            <p
              id={groupLabelId(group.heading)}
              className="text-muted-foreground px-2 pt-1 text-xs font-semibold tracking-wide uppercase"
            >
              {group.heading}
            </p>
          ) : null}

          {group.destinations.map((destination) => {
            const current = isCurrent(destination.href);

            return (
              <Link
                key={destination.href}
                href={destination.href}
                aria-current={current ? 'page' : undefined}
                className={cn(
                  // The design marks the current destination with a brand-coloured
                  // rail rather than brand-coloured text: the rail carries the
                  // emphasis while the label keeps a text colour that holds its
                  // contrast in both themes.
                  'rounded-sm border-l-2 border-l-transparent px-2 py-1.5 text-sm',
                  'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
                  current
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground border-l-primary font-semibold'
                    : 'text-sidebar-foreground',
                )}
              >
                {destination.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
