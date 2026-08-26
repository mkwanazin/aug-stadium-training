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
 * ===========================================================================
 * REGENERATED 2026-08-26 — two contract corrections. Read both before editing.
 * ===========================================================================
 *
 * 1. ROLE NAMES. The Authentication API spells the importer role `File Importer`,
 *    WITH THE SPACE — verified live against `GET /v1/auth/userinfo` during this
 *    epic's manual test. `requirements-application.md` calls it "Importer", intake
 *    copied that spelling into `project.md`, and the application matched the literal
 *    `Importer` — so every real Importer account matched no role at all and was shown
 *    the permission-denied panel with an empty menu. The previous version of THIS
 *    FILE could not catch it, because it asserted against the same wrong name the
 *    code used.
 *
 *    The fix that keeps it caught: every role name below comes from
 *    `@/mocks/data/identity`, which is now the verified single source both test
 *    layers and the manual-test fixtures read. NEVER write a role name as a bare
 *    string literal in this file, and never import the application's own role
 *    constants (`@/lib/auth/permissions`) here — a test that takes its expectation
 *    from the code under test cannot disagree with it, which is precisely how the
 *    bug shipped. `project.md` §Roles & Permissions carries the verified table.
 *
 * 2. AN IMPORTER MAY SEE `File settings` (user decision, design digest §Your
 *    Decisions, 2026-08-26). The destination was built Approver-only from the
 *    design's `Administration` grouping and §6.5. It is now gated on a *view*
 *    permission BOTH roles hold; the administer actions on that screen stay
 *    Approver-only (out of this story's scope, and not asserted here).
 *
 * These tests WILL FAIL until the shell matches the corrected contract (TDD red).
 *
 * ---------------------------------------------------------------------------
 * Implementation contract these tests pin (read this before changing the layout)
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
 *    renders one badge per entry in `Roles[]`, showing each role name EXACTLY as the
 *    API spelt it — it is shown to a person, so it is never re-worded or re-cased.
 * 4. The menu is a `nav` landmark holding one LINK per permitted destination. The
 *    landmark stands even when nothing is permitted (a sidebar that silently loses
 *    its menu region reads as a broken frame rather than an empty one), so these
 *    tests scope every menu assertion to it — which also keeps the sidebar's
 *    `Skip to content` anchor and the page's own content out of the count.
 *    Destination names: `Received files`, `Upload a file`, `Import activity`,
 *    `File settings`. `Users and roles` must never be rendered for ANY role — user
 *    administration is de-scoped from the whole build (brief §Out of Scope / BR6).
 * 5. Which destinations appear is a PERMISSION check evaluated against the roles the
 *    account actually holds — never a two-way `isApprover ? … : …` branch. The
 *    both-roles and unrecognised-role tests below exist precisely to fail such a
 *    branch (brief §Notes & Caveats "Role set may exceed two"). Post-decision grants:
 *      Received files  → both roles
 *      Upload a file   → Importer only (an Approver may NOT upload)
 *      Import activity → both roles
 *      File settings   → both roles (view); administering it stays Approver-only
 * 6. Sign out is a BUTTON named "Sign out" in the sidebar (its awaited-logout
 *    behaviour is AC-4, asserted in Playwright — here it is only the settle signal).
 * 7. The light/dark control is a `role="switch"` in the sidebar whose accessible name
 *    mentions "dark". Turning it on adds the `dark` class to the document element —
 *    the project's established theming contract (`src/app/globals.css` declares
 *    `@custom-variant dark (&:is(.dark *))`) — and the choice is remembered so it
 *    survives the next load.
 */
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest';
import type { ReactNode } from 'react';

// Production code under test.
import AppLayout from '@/app/(app)/layout';
import { get } from '@/lib/api/client';

// The ONE project-wide source of the userinfo contract — role names included —
// shared with the Playwright layer. Never hand-write a userinfo body or a role name
// in a test: that is how the layers drift, and how the `File Importer` bug survived
// a green suite.
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

/**
 * Text the content slot renders. Deliberately NOT the name of any destination, so a
 * menu assertion can never be satisfied by the page sitting inside the shell.
 */
const PAGE_CONTENT = 'The page inside the shell';

/** The document element carries the applied theme (see contract note 7). */
const documentIsDark = () =>
  document.documentElement.classList.contains('dark');

/**
 * Every destination the signed-in person is actually offered, scoped to the menu
 * landmark and sorted — so the assertion is about WHICH destinations are on offer,
 * not the order the design happens to group them in. Comparing the whole set (rather
 * than probing one name at a time) is what makes "only the destinations their roles
 * permit" falsifiable: an extra entry fails just as loudly as a missing one.
 */
const menuDestinations = (): string[] =>
  within(screen.getByRole('navigation'))
    .queryAllByRole('link')
    .map((link) => link.textContent?.trim() ?? '')
    .sort();

/** Read as a set, so the expectation reads in the design's own order. */
const asSet = (...destinations: string[]): string[] => [...destinations].sort();

/**
 * Render the shell for a signed-in account and wait for the session check to
 * settle. `children` stands in for the page Next.js slots into the layout at
 * runtime — it is the layout's content slot, not a stand-in for the code under test.
 */
const renderShell = async (userInfo: UserInfoRead) => {
  mockGet.mockResolvedValue(userInfo);
  const view = render(
    <AppLayout>
      <h1>{PAGE_CONTENT}</h1>
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
  it('shows the signed-in person and a badge for every role they hold, named as the API names them', async () => {
    // An account holding BOTH roles proves "a badge for each role", which a single
    // role badge driven by `RolesString` would not. The names are the API's own
    // spelling — `File Importer`, not the requirements document's "Importer".
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
        <h1>{PAGE_CONTENT}</h1>
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
  it('offers an Importer every destination their role permits, File settings included', async () => {
    // This is the test the live bug would have failed: the account's role comes back
    // as `File Importer`, so a shell gating on the literal `Importer` grants it
    // nothing and leaves the menu empty.
    await renderShell(userInfoFor(IMPORTER_ROLE));

    expect(menuDestinations()).toEqual(
      asSet(
        'Received files',
        'Upload a file',
        'Import activity',
        // Per the 2026-08-26 decision: seeing this destination is a view permission
        // both roles hold, not the Approver's administer permission.
        'File settings',
      ),
    );
  });

  // AC-2
  it('withholds "Upload a file" from an Approver while offering their own destinations', async () => {
    await renderShell(userInfoFor(APPROVER_ROLE));

    expect(menuDestinations()).toEqual(
      asSet('Received files', 'Import activity', 'File settings'),
    );
    // De-scoped from the whole build, so it is offered to nobody — least of all the
    // Approver, who would otherwise own it. Checked across the WHOLE shell rather
    // than just the menu: it must not appear anywhere.
    expect(screen.queryByText(/users and roles/i)).not.toBeInTheDocument();
  });

  // AC-2
  it('offers an account holding both roles the union of what each permits, not one role branch', async () => {
    // The test that fails a hard-coded `isApprover ? approverNav : importerNav`: for
    // an account holding both, such a branch resolves to the Approver side and drops
    // "Upload a file" — the one destination the two roles do not share.
    await renderShell(userInfoFor([IMPORTER_ROLE, APPROVER_ROLE]));

    expect(menuDestinations()).toEqual(
      asSet(
        'Received files',
        'Upload a file',
        'Import activity',
        'File settings',
      ),
    );
  });

  // AC-2
  it('offers no destination at all to an account whose only role is outside the permitted set', async () => {
    // `Viewer` is a role the auth API can genuinely return but this project grants
    // nothing to. A permission check yields an empty menu; a two-way branch would
    // fall through to the Importer side and hand them the lot.
    const userInfo = userInfoFor(UNRECOGNISED_ROLE);

    await renderShell(userInfo);

    // They are signed in and the role they hold is named honestly...
    expect(screen.getByText(displayNameFor(userInfo))).toBeInTheDocument();
    expect(screen.getByText(UNRECOGNISED_ROLE)).toBeInTheDocument();
    // ...but it unlocks nothing.
    expect(menuDestinations()).toEqual([]);
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
