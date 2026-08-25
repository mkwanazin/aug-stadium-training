/**
 * Story Metadata:
 * - Route: /files
 * - Target File: web/src/app/(app)/layout.tsx
 * - Page Action: create_new
 *
 * Epic 1 (Sign in and session), Story 2 — Signed-in shell.
 * Covers ONLY the vitest-tagged criteria: AC-1 (identity block) and AC-2 (role-gated
 * menu). AC-3 to AC-6 (signed-out redirect, awaited sign-out, back-button after sign
 * out, keyboard + accessibility) are playwright-tagged and live in
 * `web/e2e/epic-sign-in-and-session-story-2-signed-in-shell.spec.ts`.
 *
 * These tests WILL FAIL until the shell is implemented (TDD red).
 *
 * ---------------------------------------------------------------------------
 * Implementation contract these tests pin (read this before writing the layout)
 * ---------------------------------------------------------------------------
 * 1. `web/src/app/(app)/layout.tsx` default-exports the shell component and takes
 *    `children`. It is a CLIENT component (or immediately renders one): the session
 *    check must happen browser-side so `page.route()` can intercept it in the
 *    Playwright layer, which cannot intercept a Server Component's fetch.
 * 2. The session check goes through the shared API client — `get(...)` from
 *    `@/lib/api/client` — against `GET /v1/auth/userinfo`, never a bare `fetch()`.
 *    That single module boundary is the ONLY thing mocked here (testing-policy
 *    § Mocking strategy). `project.md` records `dataSource: existing-api` with
 *    `Mock layer required: no`, so there is no MSW runtime layer to lean on.
 * 3. The response body is `UserInfoRead` (per `documentation/Authentication_API.yaml`).
 *    The identity block composes the display name from `FirstName` + `LastName` and
 *    renders one badge per entry in `Roles[]`.
 * 4. Nav destinations are LINKS with these accessible names: `Received files`,
 *    `Upload a file`, `Import activity`, `File settings`. `Users and roles` must
 *    never be rendered — user administration is de-scoped from the whole build
 *    (brief §Out of Scope / BR6).
 * 5. Which destinations appear is a PERMISSION check evaluated against the roles the
 *    account actually holds — never a two-way `isApprover ? … : …` branch. The
 *    both-roles and unrecognised-role tests below exist precisely to fail such a
 *    branch (brief §Notes & Caveats "Role set may exceed two").
 *    Permission source: `documentation/requirements-application.md` §6.5 —
 *      Importer  → Upload a file (X), Import activity (X); no administration flows.
 *      Approver  → File settings (X, "Administer file settings"); may NOT upload.
 * 6. Sign out is a BUTTON named "Sign out" in the sidebar (its awaited-logout
 *    behaviour is AC-4, asserted in Playwright — here it is only the settle signal).
 * 7. The light/dark control is a `role="switch"` in the sidebar whose accessible name
 *    mentions "dark". Turning it on adds the `dark` class to the document element —
 *    the project's established theming contract (`src/app/globals.css` declares
 *    `@custom-variant dark (&:is(.dark *))`) — and the choice is remembered so it
 *    survives the next load.
 */
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest';
import type { ReactNode } from 'react';

// Production code under test — will not resolve until the shell exists (TDD red).
import AppLayout from '@/app/(app)/layout';
import { get } from '@/lib/api/client';

// The ONE project-wide source of the userinfo contract, shared with the Playwright
// layer. Never hand-write a userinfo body in a test — that is how the layers drift.
import {
  userInfoFor,
  displayNameFor,
  IMPORTER_ROLE,
  APPROVER_ROLE,
  UNRECOGNISED_ROLE,
  type UserInfoRead,
} from '@/mocks/data/identity';

/* ------------------------------------------------------------------------- *
 * Framework boundaries
 * ------------------------------------------------------------------------- */

// Next's navigation hooks have no App Router context under jsdom.
const nav = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  pathname: '/files',
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: nav.push,
    replace: nav.replace,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(),
}));

// `next/link` requires a mounted App Router; render it as the anchor it becomes so
// the nav still exposes real links with real accessible names.
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// The only application module mocked: the HTTP boundary.
vi.mock('@/lib/api/client', () => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
}));

const mockGet = get as unknown as Mock;

/* ------------------------------------------------------------------------- *
 * Helpers
 * ------------------------------------------------------------------------- */

/** The document element carries the applied theme (see contract note 7). */
const documentIsDark = () =>
  document.documentElement.classList.contains('dark');

/**
 * Render the shell for a signed-in account and wait for the session check to
 * settle. `children` stands in for the page Next.js slots into the layout at
 * runtime — it is the layout's content slot, not a stand-in for the code under test.
 */
const renderShell = async (userInfo: UserInfoRead) => {
  mockGet.mockResolvedValue(userInfo);
  const view = render(
    <AppLayout>
      <h1>Received files</h1>
    </AppLayout>,
  );
  await screen.findByRole('button', { name: /sign out/i });
  return view;
};

describe('Epic 1, Story 2: signed-in shell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nav.pathname = '/files';
    window.localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    cleanup();
  });

  /* ----------------------------------------------------------------------- *
   * AC-1 — the signed-in identity block
   * ----------------------------------------------------------------------- */

  // AC-1
  it('shows the signed-in person and a badge for every role they hold', async () => {
    // An account holding BOTH roles proves "a badge for each role", which a single
    // role badge driven by `RolesString` would not.
    const userInfo = userInfoFor([IMPORTER_ROLE, APPROVER_ROLE]);

    await renderShell(userInfo);

    expect(screen.getByText(displayNameFor(userInfo))).toBeInTheDocument();
    expect(screen.getByText(IMPORTER_ROLE)).toBeInTheDocument();
    expect(screen.getByText(APPROVER_ROLE)).toBeInTheDocument();
  });

  // AC-1
  // Runtime-only aspect: that a *server*-rendered deep link into the route group
  // also carries the identity block is verified during the manual checklist.
  it('keeps presenting the identity on a later surface in the same session, not only straight after signing in', async () => {
    const userInfo = userInfoFor(IMPORTER_ROLE);
    const { rerender } = await renderShell(userInfo);

    // Move to another destination inside the shell — the session is still valid, so
    // the identity must survive the navigation rather than only appear post-login.
    nav.pathname = '/import-activity';
    rerender(
      <AppLayout>
        <h1>Import activity</h1>
      </AppLayout>,
    );

    expect(
      await screen.findByText(displayNameFor(userInfo)),
    ).toBeInTheDocument();
    expect(screen.getByText(IMPORTER_ROLE)).toBeInTheDocument();
  });

  /* ----------------------------------------------------------------------- *
   * AC-2 — the role-gated menu
   * ----------------------------------------------------------------------- */

  // AC-2
  it('offers an Importer the destinations their role permits and withholds the Approver-only ones', async () => {
    await renderShell(userInfoFor(IMPORTER_ROLE));

    expect(
      screen.getByRole('link', { name: 'Upload a file' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Import activity' }),
    ).toBeInTheDocument();
    // Administering file settings is an Approver flow (§6.5).
    expect(screen.queryByText('File settings')).not.toBeInTheDocument();
    // De-scoped from the whole build — never offered to anyone.
    expect(screen.queryByText(/users and roles/i)).not.toBeInTheDocument();
  });

  // AC-2
  it('withholds "Upload a file" from an Approver while offering their own destinations', async () => {
    await renderShell(userInfoFor(APPROVER_ROLE));

    expect(screen.queryByText('Upload a file')).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'File settings' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Import activity' }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/users and roles/i)).not.toBeInTheDocument();
  });

  // AC-2
  it('offers an account holding both roles the destinations of both, not one role branch', async () => {
    // The test that fails a hard-coded `isApprover ? approverNav : importerNav`:
    // a two-way branch can only ever produce one of these two links.
    await renderShell(userInfoFor([IMPORTER_ROLE, APPROVER_ROLE]));

    expect(
      screen.getByRole('link', { name: 'Upload a file' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'File settings' }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/users and roles/i)).not.toBeInTheDocument();
  });

  // AC-2
  it('offers no role-gated destination to an account whose only role is outside the permitted set', async () => {
    // `Viewer` is a role the auth API can genuinely return but this project grants
    // nothing to. A permission check yields an empty set; a two-way branch would
    // fall through to the Importer menu and hand them "Upload a file".
    const userInfo = userInfoFor(UNRECOGNISED_ROLE);

    await renderShell(userInfo);

    // They are signed in and their role is shown honestly...
    expect(screen.getByText(displayNameFor(userInfo))).toBeInTheDocument();
    expect(screen.getByText(UNRECOGNISED_ROLE)).toBeInTheDocument();
    // ...but it unlocks nothing.
    expect(screen.queryByText('Upload a file')).not.toBeInTheDocument();
    expect(screen.queryByText('File settings')).not.toBeInTheDocument();
    expect(screen.queryByText(/users and roles/i)).not.toBeInTheDocument();
  });

  /* ----------------------------------------------------------------------- *
   * Resolved design choice — the sidebar's light/dark switch
   * (design digest §Your Decisions, 2026-08-25; no AC of its own, but it is the
   * shared-surface convention every later epic inherits from this shell)
   * ----------------------------------------------------------------------- */

  it('offers a light/dark switch in the sidebar that changes the theme and is remembered', async () => {
    const user = userEvent.setup();
    await renderShell(userInfoFor(IMPORTER_ROLE));

    const themeSwitch = screen.getByRole('switch', { name: /dark/i });
    expect(themeSwitch).not.toBeChecked();
    expect(documentIsDark()).toBe(false);

    await user.click(themeSwitch);

    expect(screen.getByRole('switch', { name: /dark/i })).toBeChecked();
    expect(documentIsDark()).toBe(true);

    // Simulate the person coming back later: tear the app down and strip the applied
    // theme, leaving only whatever the application itself persisted.
    cleanup();
    document.documentElement.classList.remove('dark');

    await renderShell(userInfoFor(IMPORTER_ROLE));

    expect(screen.getByRole('switch', { name: /dark/i })).toBeChecked();
    expect(documentIsDark()).toBe(true);
  });
});
