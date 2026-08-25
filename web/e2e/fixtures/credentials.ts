/**
 * Mock identities for form-fill in Playwright specs.
 *
 * These are NOT real accounts and these are NOT real passwords — every backend
 * call a spec makes is intercepted with `page.route()`, so nothing here is ever
 * checked against a credential store. Never put a real password in this file.
 *
 * The email addresses are read from the project-wide identity source
 * (`web/src/mocks/data/identity.ts`) rather than re-typed, so the value the form
 * submits as `LoginRequest.Username` and the value `GET /v1/auth/userinfo`
 * returns for the same person cannot drift apart between the two test layers.
 */
import {
  APPROVER_ROLE,
  IMPORTER_ROLE,
  userInfoFor,
} from '../../src/mocks/data/identity';

export interface MockCredential {
  /** Submitted in the "Email address" field; sent as `LoginRequest.Username`. */
  email: string;
  /** Placeholder string — the mocked login route accepts anything. */
  password: string;
}

/**
 * Placeholder secret. Deliberately self-describing, so a screenshot or trace of
 * a failing run can never be mistaken for a leaked credential.
 */
const MOCK_PASSWORD = 'mock-password-not-a-real-secret';

const emailFor = (roleName: string): string => {
  const { Email } = userInfoFor(roleName);
  if (!Email) {
    throw new Error(`Mock identity for role "${roleName}" carries no Email.`);
  }
  return Email;
};

/** Thandi Mokoena — holds the Importer role. */
export const importerUser: MockCredential = {
  email: emailFor(IMPORTER_ROLE),
  password: MOCK_PASSWORD,
};

/** Sipho Ndlovu — holds the Approver role. */
export const approverUser: MockCredential = {
  email: emailFor(APPROVER_ROLE),
  password: MOCK_PASSWORD,
};
