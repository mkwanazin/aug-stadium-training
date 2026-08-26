/**
 * Story Metadata:
 * - Route: /files
 * - Target File: web/src/app/(app)/files/page.tsx
 * - Page Action: modify_existing
 *
 * Epic "Sign in and session", Story 4 — Permission denied, explained in place.
 * Covers the vitest-tagged criteria only (AC-1, AC-2, AC-3). AC-4 (reaching an
 * unpermitted surface by typing its address, with the menu and Sign out still
 * working) is playwright-tagged and lives in the story's e2e spec — not here.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FILE WAS REWRITTEN — the regression it now locks down
 * ---------------------------------------------------------------------------
 * The epic reached its manual test and failed here. A real Importer account
 * signed in and was shown THIS story's permission-denied panel instead of the
 * files surface. The Authentication API returns the importer role as
 * `File Importer` — with a space — and every layer (application and tests alike)
 * matched the literal `Importer` copied out of the requirements prose, so a
 * genuine Importer matched no permitted role and was refused. The tests could
 * not catch it because they asserted against the same wrong name the code used.
 *
 * Two things follow, and both are structural rather than cosmetic:
 *
 * 1. Role names are NEVER written as bare string literals in this file. They come
 *    from `@/mocks/data/identity` (`IMPORTER_ROLE`, `APPROVER_ROLE`,
 *    `UNRECOGNISED_ROLE`), which carries the names verified live against
 *    `GET /v1/auth/userinfo` and is the one source both test layers read. The
 *    verified table also lives in `project.md` §Roles & Permissions.
 * 2. AC-3 now asserts a PAIR, at the real `/files` surface: an account holding the
 *    real importer role name is LET THROUGH, and an account holding a role outside
 *    the permitted set (`Viewer`, the auth API's own `RoleRead` example) is REFUSED
 *    with the same explanation. Either half alone can be satisfied by a broken
 *    check — a name mismatch refuses everyone, a missing check admits everyone.
 *    Only the pair makes both mistakes impossible.
 *
 * These tests FAIL until the panel and the guard are implemented (TDD red).
 *
 * ---------------------------------------------------------------------------
 * Contract these tests pin (read this first — implement to it)
 * ---------------------------------------------------------------------------
 * `web/src/components/auth/RoleGuard.tsx` exports `RoleGuard`, the route-level
 * role guard the later feature epics consume. It is wired into
 * `web/src/app/(app)/files/page.tsx` around the content region, so the shell
 * (nav, signed-in block, Sign out) stays mounted around it — brief R12 / BR3.
 *
 *   <RoleGuard requiredRoles={[APPROVER_ROLE]} capability="Deciding on a whole file">
 *     …the protected content…
 *   </RoleGuard>
 *
 * - `requiredRoles: string[]` — the roles that permit this surface. An ARRAY,
 *   and the check is "does the account hold one of these", never a two-way
 *   Importer/Approver branch: the role set may grow past two (brief §Notes &
 *   Caveats, "Role set may exceed two") and an account carrying a role the
 *   frontend does not recognise must be REFUSED, not silently let through.
 * - A route passes the roles that hold the surface's permission, read from the
 *   ONE grant table in `@/lib/auth/permissions` — so a surface's guard and the
 *   menu entry leading to it can never disagree about who is admitted, and a
 *   corrected role name takes effect everywhere at once. `/files` admits the
 *   roles that may view files, which is BOTH roles — it is not Approver-only.
 * - `capability: string` — what holding the role would let the person do,
 *   named in the explanation (design digest, states sheet panel 7).
 * - The roles held are resolved from `GET /v1/auth/userinfo` (`UserInfoRead.Roles[].Name`)
 *   through `@/lib/api/client` — the only module these tests mock. The guard
 *   must render standalone with just that module mocked: whatever session
 *   hook/module it reads, no provider wrapper may be REQUIRED for it to work,
 *   or every consuming story's tests inherit provider plumbing.
 *
 * When access is refused, the guard renders the permission-denied panel from
 * the design digest's edge/empty/error states sheet, in place of the children:
 * - the panel is the page's `role="alert"` region (a state the person must act
 *   on, which persists until resolved — digest states-sheet footnote);
 * - a padlock icon exposed to assistive tech as `role="img"` with an accessible
 *   name naming the locked state (it carries meaning here, so it is NOT
 *   `aria-hidden` decorative chrome);
 * - a heading naming the role that is missing;
 * - an explanation naming the capability and the roles the account actually
 *   holds, spelt exactly as the API spelt them (they are shown to the person,
 *   so they are never re-cased or re-worded);
 * - a primary button offering to request the missing role.
 *
 * Taking the request-access action confirms in place via a `role="status"`
 * region naming the role requested and the CONFIGURED administrator address
 * (`process.env.NEXT_PUBLIC_ACCESS_REQUEST_EMAIL`, matching the project's
 * `NEXT_PUBLIC_*` convention in project.md §Data Source). The address is
 * configuration, never a literal in the component — these tests stub the env
 * var to an address that appears nowhere in the source material, so a
 * hard-coded destination cannot pass. Provisioning the role after the request
 * is out of scope for this epic.
 *
 * One decision this guard must not contradict (project.md §Roles & Permissions,
 * user decision 2026-08-26): `File settings` is gated on a VIEW permission both
 * roles hold, so an Importer reaching it must be admitted by this guard — only
 * the administer actions on that screen stay Approver-only. Nothing here may be
 * read as "administration surfaces are Approver-only at the route".
 *
 * Runtime-only: that the panel renders INSIDE the shell (nav + Sign out still
 * present) on a direct URL visit is jsdom-blind — AC-4's Playwright spec and
 * the manual checklist cover it.
 * Data-contract: `@/lib/api/client` is mocked here, so the real client →
 * `/v1/auth/userinfo` wiring is verified in Playwright and at manual test.
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterAll } from 'vitest';

// The administrator address the request-access action sends to. Stubbed BEFORE
// the module graph is imported (vi.hoisted runs ahead of imports) so it is in
// place whether the component reads the env var at render time or captures it
// at module load. Deliberately an address that appears nowhere in the brief,
// the design digest or the API specs: only a component that actually reads
// configuration can produce it.
const { ADMIN_EMAIL } = vi.hoisted(() => {
  const ADMIN_EMAIL = 'role-requests@pimcapitalgroup.example';
  vi.stubEnv('NEXT_PUBLIC_ACCESS_REQUEST_EMAIL', ADMIN_EMAIL);
  return { ADMIN_EMAIL };
});

// Production code under test — will fail to resolve until implemented (TDD red).
import ReceivedFilesPage from '@/app/(app)/files/page';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { get } from '@/lib/api/client';
// Project-wide identity source of truth, shared with the Playwright layer. Never
// inline a userinfo body and never retype a role name — the manual-test failure
// this file now guards against was exactly a role name written out by hand.
import {
  APPROVER_ROLE,
  IMPORTER_ROLE,
  UNRECOGNISED_ROLE,
  userInfoFor,
} from '@/mocks/data/identity';

vi.mock('@/lib/api/client', () => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
}));

// Next's navigation hooks have no App Router context under jsdom. The guard
// itself never navigates — it answers in place — but the session boundary it
// reads sits on a protected route, so the hooks are stubbed rather than left to
// throw an invariant.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/files',
  useSearchParams: () => new URLSearchParams(),
}));

const mockGet = get as ReturnType<typeof vi.fn>;

/**
 * Content standing in for whatever the guarded surface offers. It is the guard's
 * `children` — the thing the guard's job is to render or withhold — not a
 * placeholder for the code under test.
 */
const GUARDED_CONTENT = 'The decision controls for this file';

/** The capability the guarded surface offers, per the design digest's panel 7. */
const CAPABILITY = 'Deciding on a whole file';

/** The heading that identifies the real `/files` surface (design digest §Received files). */
const FILES_SURFACE_HEADING = /^received files$/i;

/** Matches a literal string, so `.`, `@` and the like are not read as regex syntax. */
const literally = (value: string): RegExp =>
  new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

/** Signs the account in as the holder of `roles` for the guard's session read. */
function signedInWith(roles: string | readonly string[]): void {
  mockGet.mockResolvedValue(userInfoFor(roles));
}

/**
 * The reusable guard on an Approver-only surface — the case the design's
 * permission-denied copy is written for.
 */
function renderApproverOnlySurface() {
  return render(
    <RoleGuard requiredRoles={[APPROVER_ROLE]} capability={CAPABILITY}>
      <p>{GUARDED_CONTENT}</p>
    </RoleGuard>,
  );
}

/** The real `/files` route, carrying whatever roles it decided permit it. */
function renderFilesSurface() {
  return render(<ReceivedFilesPage />);
}

/** The permission-denied panel, once the guard has resolved the roles held. */
async function findDeniedPanel(): Promise<HTMLElement> {
  return screen.findByRole('alert');
}

describe('Epic sign-in-and-session, Story 4: permission denied, explained in place', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  // AC-1
  it('shows a padlock and an explanation naming the missing role, in place of the content', async () => {
    signedInWith(IMPORTER_ROLE);

    renderApproverOnlySurface();

    const panel = await findDeniedPanel();

    // The padlock, exposed to assistive tech rather than hidden as decoration.
    expect(
      within(panel).getByRole('img', { name: /lock/i }),
    ).toBeInTheDocument();

    // Names the role the person lacks…
    expect(
      within(panel).getByRole('heading', {
        name: literally(`you do not hold the ${APPROVER_ROLE} role`),
      }),
    ).toBeInTheDocument();

    // …what holding it would let them do…
    expect(panel).toHaveTextContent(literally(CAPABILITY));

    // …and the role the account actually holds, spelt as the API spelt it: read
    // from the session, never re-worded into the requirements prose's name.
    expect(panel).toHaveTextContent(literally(IMPORTER_ROLE));

    // The guarded content is replaced by the explanation, not merely hidden behind it.
    expect(screen.queryByText(GUARDED_CONTENT)).not.toBeInTheDocument();
  });

  // AC-2
  it('offers a request-access action that confirms the request was raised, naming the configured destination', async () => {
    const user = userEvent.setup();
    signedInWith(IMPORTER_ROLE);

    renderApproverOnlySurface();

    const panel = await findDeniedPanel();
    await user.click(
      within(panel).getByRole('button', {
        name: literally(`request the ${APPROVER_ROLE} role`),
      }),
    );

    const confirmation = await screen.findByRole('status');
    // Confirms the request was raised, for the role that was missing…
    expect(confirmation).toHaveTextContent(literally(APPROVER_ROLE));
    // …and names where it went. Only reading configuration yields this address:
    // it appears in no brief, design or spec, so a hard-coded literal fails here.
    expect(confirmation).toHaveTextContent(literally(ADMIN_EMAIL));
  });

  // AC-3
  it('decides on the roles the account actually holds — admits a real Importer, refuses a role outside the permitted set', async () => {
    // Exercised against the REAL /files route, so what is under test is the
    // decision an account genuinely meets on signing in — not a role list this
    // test chose. Both halves matter and neither is redundant: a wrong role name
    // refuses everybody (the manual-test failure), a missing check admits
    // everybody, and only asserting the pair rules out both.

    // An account holding the importer role AS THE AUTHENTICATION API SPELLS IT
    // reaches its files. This is the manual-test failure, pinned: a check
    // matching the requirements prose's `Importer` refuses this account and shows
    // it the panel below instead.
    signedInWith(IMPORTER_ROLE);

    const { unmount } = renderFilesSurface();

    expect(
      await screen.findByRole('heading', { name: FILES_SURFACE_HEADING }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    unmount();

    // The same surface refuses an account carrying a role this project grants
    // nothing to (the auth API's own `RoleRead` example), with the explanation
    // AC-1 describes — so the admission above is a permission check rather than
    // an open door.
    signedInWith(UNRECOGNISED_ROLE);

    renderFilesSurface();

    const panel = await findDeniedPanel();
    expect(panel).toHaveTextContent(/you do not hold/i);
    // Names the roles that would open the surface — both of them, since viewing
    // files is not Approver-only…
    expect(panel).toHaveTextContent(literally(IMPORTER_ROLE));
    expect(panel).toHaveTextContent(literally(APPROVER_ROLE));
    // …and the role this account does hold, so the refusal is evidently a check
    // against what the session reported.
    expect(panel).toHaveTextContent(literally(UNRECOGNISED_ROLE));
    expect(
      screen.queryByRole('heading', { name: FILES_SURFACE_HEADING }),
    ).not.toBeInTheDocument();
  });
});
