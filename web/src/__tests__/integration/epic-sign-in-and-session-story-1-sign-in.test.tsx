/**
 * Story Metadata:
 * - Epic: sign-in-and-session (Epic 1) — Sign in and session
 * - Story: 1 — Sign in
 * - Route: /sign-in
 * - Target File: web/src/app/sign-in/page.tsx
 * - Page Action: create_new
 *
 * Covers ONLY the acceptance criteria the planner tagged `vitest` — AC-1 to AC-4.
 * AC-5 (success banner then through to the files landing) and AC-6 (keyboard-only
 * path + accessibility scan) are tagged `playwright` and live in
 * `web/e2e/epic-sign-in-and-session-story-1-sign-in.spec.ts`. They are deliberately
 * NOT duplicated here — one tag, one layer.
 *
 * Mocking strategy (read this BEFORE implementing — the tests are written to it):
 * - `project.md` records `dataSource: existing-api` with `Mock layer required: no`,
 *   so there is no MSW runtime layer. The backend is mocked at the module boundary
 *   in this file: `@/lib/api/client` only. Nothing else is mocked — no placeholder
 *   components, no stubbed form logic.
 * - The sign-in submission must therefore go through the shared API client
 *   (`post` from `@/lib/api/client`, per CLAUDE.md §2 "Use the API Client"),
 *   whether called directly or via an endpoint module such as
 *   `web/src/lib/api/auth.ts`. An endpoint module is exercised for real.
 * - Rejected credentials arrive as the API client's thrown `APIError` object with
 *   `statusCode: 401` — see `web/src/lib/api/client.ts` → `handleErrorResponse`.
 *   `POST /v1/auth/login` documents no body on a 401 (`documentation/Authentication_API.yaml`),
 *   so the user-facing refusal copy is frontend-owned, never echoed from the API.
 * - `web/src/app/sign-in/page.tsx` must default-export a component that renders
 *   synchronously — i.e. the page is a client component, or a synchronous server
 *   component composing a `'use client'` form. An `async` page component cannot be
 *   rendered by React Testing Library.
 * - Lockout (AC-4) is tracked client-side: the brief records that
 *   `Authentication_API.yaml` documents no locked-account status or body, so the
 *   fifth consecutive refusal is inferred by the frontend (an unverified assumption
 *   carried on the epic).
 *
 * Copy is quoted from `generated-docs/design/digest.md` §Screens → Sign in.
 * These tests WILL FAIL until the page is implemented (TDD red).
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Imports the REAL page — fails until Story 1 is implemented (TDD red).
import SignInPage from '@/app/sign-in/page';
import { post } from '@/lib/api/client';
// Project-wide identity source shared with the Playwright layer — never re-declare
// an account shape in a test file.
import { IMPORTER_ROLE, userInfoFor } from '@/mocks/data/identity';

import type { APIError } from '@/types/api';
import type { UserEvent } from '@testing-library/user-event';

vi.mock('@/lib/api/client', () => ({
  post: vi.fn(),
  get: vi.fn(),
}));

// The page navigates on success (AC-5, Playwright's to prove); jsdom has no App
// Router, so the navigation hooks are stubbed to keep the render honest.
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/sign-in',
  useSearchParams: () => new URLSearchParams(),
}));

const mockPost = vi.mocked(post);

/** A real address from the shared identity fixture, not an invented one. */
const IMPORTER_EMAIL = String(userInfoFor(IMPORTER_ROLE).Email);

/**
 * Form-fill value only. Authentication is mocked at the module boundary, so this
 * is never a real credential and never reaches a backend.
 */
const ANY_PASSWORD = 'mock-password-value';

/**
 * The exact object `@/lib/api/client` throws on a 401 (client.ts →
 * `handleErrorResponse`, case 401). Reproduced so the page is tested against the
 * error shape it will really receive, not a convenient `new Error()`.
 */
const rejectedCredentialsError = (): APIError => ({
  message: 'Unauthorized: Please log in to continue',
  statusCode: 401,
  details: ['Your session may have expired. Please log in again.'],
  endpoint: '/v1/auth/login',
});

const emailField = () => screen.getByLabelText(/email address/i);
const passwordField = () => screen.getByLabelText(/password/i);
const signInButton = () => screen.getByRole('button', { name: /^sign in$/i });

/** Fill both fields from scratch and submit — usable repeatedly in one render. */
async function submitCredentials(
  user: UserEvent,
  email: string,
  password: string,
): Promise<void> {
  await user.clear(emailField());
  await user.type(emailField(), email);
  await user.clear(passwordField());
  await user.type(passwordField(), password);
  await user.click(signInButton());
}

describe('Epic 1, Story 1: Sign in', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // AC-1
  it('presents the brand panel and the two required credential fields, and offers no reset, self-registration or second-factor path', () => {
    render(<SignInPage />);

    // Brand panel (digest §Sign in → Copy)
    expect(screen.getByText(/pim capital group/i)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /sign in/i }),
    ).toBeInTheDocument();

    // Both credentials are collected and marked required (R7/R8/R9)
    expect(emailField()).toBeRequired();
    expect(passwordField()).toBeRequired();
    expect(screen.getByText(/\*\s*required/i)).toBeInTheDocument();
    expect(signInButton()).toBeInTheDocument();

    // No "Forgot password?", no "Create account" (digest §Sign in → Navigation)
    expect(
      screen.queryByRole('link', {
        name: /forgot|reset|create account|sign up|register/i,
      }),
    ).not.toBeInTheDocument();

    // Exactly one factor is ever collected (R18)
    expect(
      screen.queryByLabelText(
        /one-time|verification code|authentication code|passcode/i,
      ),
    ).not.toBeInTheDocument();
  });

  // AC-2
  it('reports an incomplete submission at the field and in the banner without attempting authentication', async () => {
    const user = userEvent.setup();
    render(<SignInPage />);

    // Nothing is reported while the user is still typing (R10 / UI-03)
    await user.type(emailField(), 'thandi');
    expect(
      screen.queryByText(/an email address is required\./i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/username and password are required\./i),
    ).not.toBeInTheDocument();

    // Leaving an emptied field reports at the field (R7)
    await user.clear(emailField());
    await user.tab();
    expect(
      await screen.findByText(/an email address is required\./i),
    ).toBeInTheDocument();

    // Submitting with both empty reports the combined banner (R3) and both fields
    await user.click(signInButton());
    expect(
      await screen.findByText(/username and password are required\./i),
    ).toBeInTheDocument();
    expect(screen.getByText(/a password is required\./i)).toBeInTheDocument();

    // …and no authentication is attempted (R3 — the distinguishing behaviour)
    expect(mockPost).not.toHaveBeenCalled();
  });

  // AC-3
  it('refuses rejected credentials with a generic banner and flags neither field', async () => {
    mockPost.mockRejectedValue(rejectedCredentialsError());
    const user = userEvent.setup();
    render(<SignInPage />);

    await submitCredentials(user, IMPORTER_EMAIL, ANY_PASSWORD);

    expect(
      await screen.findByText(/those credentials were not accepted\./i),
    ).toBeInTheDocument();

    // Neither submitted field is named as the culprit (R2 / BR1)
    expect(
      screen.queryByText(/an email address is required\./i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/a password is required\./i),
    ).not.toBeInTheDocument();
    expect(emailField()).not.toBeInvalid();
    expect(passwordField()).not.toBeInvalid();
  });

  // AC-4
  it('locks the account on the fifth consecutive refusal and names when it is available again', async () => {
    mockPost.mockRejectedValue(rejectedCredentialsError());
    const user = userEvent.setup();
    render(<SignInPage />);

    // Four refusals against the same email keep the ordinary refusal message
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      await submitCredentials(user, IMPORTER_EMAIL, ANY_PASSWORD);
      expect(
        await screen.findByText(/those credentials were not accepted\./i),
      ).toBeInTheDocument();
    }

    // The fifth changes the message to the lockout (R17)
    await submitCredentials(user, IMPORTER_EMAIL, ANY_PASSWORD);
    expect(
      await screen.findByText(/this account is locked\./i),
    ).toBeInTheDocument();

    // …naming the time it becomes available again (resolved design choice)
    expect(
      screen.getByText(/try again after \d{1,2}:\d{2}/i),
    ).toBeInTheDocument();

    // …without confirming or denying that the account exists (R17): the message
    // neither says so nor repeats the submitted address back to the user.
    expect(
      screen.queryByText(
        /no account|does not exist|not registered|unknown user|no such user/i,
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(IMPORTER_EMAIL, { exact: false }),
    ).not.toBeInTheDocument();
  });
});
