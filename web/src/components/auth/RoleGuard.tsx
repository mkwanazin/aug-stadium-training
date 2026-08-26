'use client';

import { Lock } from 'lucide-react';
import { useState } from 'react';

import { StatusBanner } from '@/components/feedback/StatusBanner';
import { Button } from '@/components/ui/button';
import { useSession } from '@/lib/auth/session';

import type { Session } from '@/lib/auth/session';
import type { ReactNode } from 'react';

/**
 * The route-level role guard: it renders a surface's content to an account whose
 * roles permit it, and explains the refusal IN PLACE to one whose roles do not
 * (design digest §Edge, empty and error states → panel 7; brief R11 / R12 / BR3).
 *
 * It sits INSIDE the shell, around a page's content region, so a refused person
 * keeps the sidebar, the menu their roles do permit, and Sign out. Nothing is
 * redirected and nothing 404s — the address they asked for answers, and says why
 * it is closed.
 *
 * The decision is a PERMISSION CHECK against the roles the account actually holds
 * (`session.holdsAnyOf`, the one grant table in `@/lib/auth/permissions`), never a
 * two-way Importer/Approver branch: the role set is not closed at two, so an
 * account carrying a role this project grants nothing to must be refused rather
 * than fall through to whichever side the branch happens to end on.
 */
interface RoleGuardProps {
  /**
   * The roles that open this surface — holding ANY of them is enough. Take them
   * from `rolesGranting(<permission>)` so the guard and the menu entry that leads
   * here read the same grant table.
   */
  requiredRoles: readonly string[];
  /** What holding the role would let the person do, named in the explanation. */
  capability: string;
  children: ReactNode;
}

export function RoleGuard({
  requiredRoles,
  capability,
  children,
}: RoleGuardProps) {
  const { status, session } = useSession();

  // Nothing is decided until the session check has answered — and the two states
  // either side of "signed in" belong to the shell, which explains a check that
  // could not complete (with a retry) and returns a signed-out person to sign in.
  // Repeating either here would put two explanations of one thing on one screen.
  if (status !== 'signed-in' || !session) {
    return null;
  }

  if (session.holdsAnyOf(requiredRoles)) {
    return <>{children}</>;
  }

  return (
    <PermissionDenied
      requiredRoles={requiredRoles}
      capability={capability}
      session={session}
    />
  );
}

/* ------------------------------------------------------------------------ *
 * The permission-denied panel
 * ------------------------------------------------------------------------ */

/** Copy the panel owns. Voice: careful custodian (brief R20). */
const COPY = {
  /** The padlock carries meaning here, so it is named rather than hidden. */
  lockLabel: 'Locked',
  noRoles: 'no roles at all',
  heading: (roles: string) => `You do not hold the ${roles} role`,
  explanation: (capability: string, roles: string, held: string) =>
    `${capability} needs the ${roles} role. Your account holds ${held}, so this surface stays closed to you.`,
  requestAction: (roles: string) => `Request the ${roles} role`,
  requestAddressed: (roles: string, address: string) =>
    `Your request for the ${roles} role is addressed to ${address}.`,
  requestHandoff:
    'Your mail app has opened with it ready to send — the request reaches the administrator once you send it. Granting the role is theirs to do, so this surface stays closed until then.',
  noAddressConfigured:
    'No administrator address is configured for role requests.',
  noAddressFollowUp: (roles: string) =>
    `Ask whoever administers this application for the ${roles} role directly.`,
  mailSubject: (roles: string) => `Access request: the ${roles} role`,
  emailNotRecorded: 'not recorded',
} as const;

/**
 * The administrator address a role request is addressed to.
 *
 * Configuration (`NEXT_PUBLIC_ACCESS_REQUEST_EMAIL`), never a literal — the
 * address differs per deployment, and it is a mailto destination the BROWSER
 * needs, which is why this one is legitimately `NEXT_PUBLIC_` where the backend
 * origins deliberately are not (project.md §Data Source → Configuration drift).
 */
const accessRequestAddress = (): string =>
  process.env.NEXT_PUBLIC_ACCESS_REQUEST_EMAIL?.trim() ?? '';

/** `Approver` / `Importer or Approver` — role names exactly as the API spelt them. */
function joinNames(
  names: readonly string[],
  conjunction: 'and' | 'or',
): string {
  if (names.length <= 1) {
    return names[0] ?? '';
  }

  return `${names.slice(0, -1).join(', ')} ${conjunction} ${names[names.length - 1]}`;
}

/** What the account holds, said plainly: `Importer only`, `Importer and Viewer`. */
function describeHeld(roles: readonly string[]): string {
  if (roles.length === 0) {
    return COPY.noRoles;
  }

  if (roles.length === 1) {
    return `${roles[0]} only`;
  }

  return joinNames(roles, 'and');
}

/**
 * Hands the request to the person's own mail app, pre-addressed and pre-written.
 *
 * A browser cannot send mail itself and the Authentication API documents no
 * role-request endpoint, so this is the honest mechanism for the resolved design
 * choice ("request access emails a named administrator"): `assign` on a `mailto:`
 * hands off to the mail client without navigating the page away.
 */
function openMailDraft(
  address: string,
  requiredPhrase: string,
  capability: string,
  session: Session,
): void {
  const body = [
    `${session.displayName} is asking for the ${requiredPhrase} role.`,
    '',
    `Account: ${session.user.Email ?? COPY.emailNotRecorded}`,
    `Roles currently held: ${describeHeld(session.roles)}`,
    `What the role would open: ${capability}`,
  ].join('\n');

  // Percent-encoded rather than built with `URLSearchParams`, which encodes a
  // space as `+` — mail clients show that as a literal plus in the subject line.
  const query = [
    `subject=${encodeURIComponent(COPY.mailSubject(requiredPhrase))}`,
    `body=${encodeURIComponent(body)}`,
  ].join('&');

  window.location.assign(`mailto:${address}?${query}`);
}

function PermissionDenied({
  requiredRoles,
  capability,
  session,
}: {
  requiredRoles: readonly string[];
  capability: string;
  session: Session;
}) {
  const [requestRaised, setRequestRaised] = useState(false);

  const requiredPhrase = joinNames(requiredRoles, 'or');
  const heldPhrase = describeHeld(session.roles);
  const address = accessRequestAddress();

  const raiseRequest = () => {
    if (address) {
      openMailDraft(address, requiredPhrase, capability, session);
    }

    setRequestRaised(true);
  };

  return (
    <div className="flex flex-col items-center gap-4 px-8 py-16">
      {/*
        The whole panel is the live region: a missing permission is a state the
        person must act on, and it persists until it is resolved rather than
        clearing itself (digest states-sheet footnote).
      */}
      <div
        role="alert"
        className="bg-card border-border flex w-full max-w-[62ch] flex-col items-center gap-3 rounded-lg border px-8 py-10 text-center"
      >
        <Lock
          role="img"
          aria-label={COPY.lockLabel}
          className="text-muted-foreground size-8"
        />

        <h1 className="text-xl">{COPY.heading(requiredPhrase)}</h1>

        <p className="text-muted-foreground text-sm leading-relaxed">
          {COPY.explanation(capability, requiredPhrase, heldPhrase)}
        </p>

        <Button type="button" onClick={raiseRequest}>
          {COPY.requestAction(requiredPhrase)}
        </Button>
      </div>

      {/*
        The confirmation sits OUTSIDE the alert region on purpose: adding it
        inside would re-announce the whole refusal alongside it. Its own polite
        live region says the one new thing.
      */}
      {requestRaised ? (
        address ? (
          <StatusBanner
            tone="success"
            lead={COPY.requestAddressed(requiredPhrase, address)}
            className="w-full max-w-[62ch]"
          >
            {COPY.requestHandoff}
          </StatusBanner>
        ) : (
          <StatusBanner
            tone="info"
            lead={COPY.noAddressConfigured}
            className="w-full max-w-[62ch]"
          >
            {COPY.noAddressFollowUp(requiredPhrase)}
          </StatusBanner>
        )
      ) : null}
    </div>
  );
}
