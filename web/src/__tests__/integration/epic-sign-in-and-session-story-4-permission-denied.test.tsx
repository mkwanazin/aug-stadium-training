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
 * - `capability: string` — what holding the role would let the person do,
 *   named in the explanation (design digest, states sheet panel 7).
 * - The roles held are resolved from `GET /v1/auth/userinfo` (`UserInfoRead.Roles[].Name`)
 *   through `@/lib/api/client` — the only module these tests mock. The guard
 *   must render standalone with just that module mocked: whatever session
 *   hook/module it reads, no provider wrapper may be REQUIRED for it to work,
 *   or every consuming story's tests inherit provider plumbing. This is the
 *   same session boundary Story 2's shell pins, and the role-permission helper
 *   it introduces is the one to reuse here — not a second copy of the check.
 *
 * When access is refused, the guard renders the permission-denied panel from
 * the design digest's edge/empty/error states sheet, in place of the children:
 * - the panel is the page's `role="alert"` region (a state the person must act
 *   on, which persists until resolved — digest states-sheet footnote);
 * - a padlock icon exposed to assistive tech as `role="img"` with an accessible
 *   name naming the locked state (it carries meaning here, so it is NOT
 *   `aria-hidden` decorative chrome);
 * - a heading naming the role that is missing — `You do not hold the Approver role`;
 * - an explanation naming the capability and the roles the account actually
 *   holds — `Deciding on a whole file needs the Approver role. Your account
 *   holds Importer only, so this surface stays closed to you.`;
 * - a primary button `Request the Approver role`.
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
import { RoleGuard } from '@/components/auth/RoleGuard';
import { get, post } from '@/lib/api/client';
// Project-wide identity source of truth, shared with the Playwright layer.
// Never inline a userinfo body — that is how the two layers drift.
import {
  APPROVER_ROLE,
  IMPORTER_ROLE,
  UNRECOGNISED_ROLE,
  userInfoFor,
} from '@/mocks/data/identity';

vi.mock('@/lib/api/client', () => ({ get: vi.fn(), post: vi.fn() }));

// The guard sits on a protected route; the shell may navigate on an invalid
// session, so the navigation hooks it could reach for are stubbed.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/files',
  useSearchParams: () => new URLSearchParams(),
}));

const mockGet = get as ReturnType<typeof vi.fn>;
const mockPost = post as ReturnType<typeof vi.fn>;

/** What the surface under guard shows once access is permitted. */
const PROTECTED_CONTENT = 'Received files listing';

/** The capability the guarded surface offers, per the design digest's panel 7. */
const CAPABILITY = 'Deciding on a whole file';

/** Escaped so the address's `.` and `@` are matched literally. */
const ADMIN_EMAIL_PATTERN = new RegExp(
  ADMIN_EMAIL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
  'i',
);

/** Signs the account in as the holder of `roles` for the guard's session read. */
function signedInWith(roles: string | readonly string[]): void {
  mockGet.mockResolvedValue(userInfoFor(roles));
}

function renderGuard() {
  return render(
    <RoleGuard requiredRoles={[APPROVER_ROLE]} capability={CAPABILITY}>
      <p>{PROTECTED_CONTENT}</p>
    </RoleGuard>,
  );
}

/** The permission-denied panel, once the guard has resolved the roles held. */
async function findDeniedPanel(): Promise<HTMLElement> {
  return screen.findByRole('alert');
}

describe('Epic sign-in-and-session, Story 4: permission denied, explained in place', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPost.mockResolvedValue({ Messages: ['Request sent'] });
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  // AC-1
  it('shows a padlock and an explanation naming the missing role, in place of the content', async () => {
    signedInWith(IMPORTER_ROLE);

    renderGuard();

    const panel = await findDeniedPanel();

    // The padlock, exposed to assistive tech rather than hidden as decoration.
    expect(
      within(panel).getByRole('img', { name: /lock/i }),
    ).toBeInTheDocument();

    // Names the role the person lacks…
    expect(
      within(panel).getByRole('heading', {
        name: /you do not hold the Approver role/i,
      }),
    ).toBeInTheDocument();

    // …what holding it would let them do…
    expect(panel).toHaveTextContent(new RegExp(CAPABILITY, 'i'));

    // …and the role the account actually holds, read from the session, not assumed.
    expect(panel).toHaveTextContent(/holds (the )?Importer/i);

    // The guarded content is replaced by the explanation, not merely hidden behind it.
    expect(screen.queryByText(PROTECTED_CONTENT)).not.toBeInTheDocument();
  });

  // AC-2
  it('offers a request-access action that confirms the request was raised, naming the configured destination', async () => {
    const user = userEvent.setup();
    signedInWith(IMPORTER_ROLE);

    renderGuard();

    const panel = await findDeniedPanel();
    await user.click(
      within(panel).getByRole('button', { name: /request the Approver role/i }),
    );

    const confirmation = await screen.findByRole('status');
    // Confirms the request was raised, for the role that was missing…
    expect(confirmation).toHaveTextContent(/Approver/);
    // …and names where it went. Only reading configuration yields this address:
    // it appears in no brief, design or spec, so a hard-coded literal fails here.
    expect(confirmation).toHaveTextContent(ADMIN_EMAIL_PATTERN);
  });

  // AC-3
  it('decides on the roles the account actually holds — refuses an unrecognised role, admits the permitted one', async () => {
    // An account carrying a role outside the permitted set (the auth API's own
    // `RoleRead` example) must be refused with the SAME explanation — not
    // waved through by a two-way Importer/Approver branch.
    signedInWith(UNRECOGNISED_ROLE);

    const { unmount } = renderGuard();

    const panel = await findDeniedPanel();
    expect(
      within(panel).getByRole('heading', {
        name: /you do not hold the Approver role/i,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText(PROTECTED_CONTENT)).not.toBeInTheDocument();

    unmount();

    // …and the same guard admits the account that does hold the required role,
    // so the refusal above is a permission check, not a blanket denial.
    signedInWith(APPROVER_ROLE);

    renderGuard();

    expect(await screen.findByText(PROTECTED_CONTENT)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });
});
