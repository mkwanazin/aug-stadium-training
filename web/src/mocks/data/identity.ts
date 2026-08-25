/**
 * Project-wide identity mock data — the SINGLE source of truth for the
 * authenticated-user shape both test layers assert against.
 *
 * Consumed by:
 *  - Vitest integration tests  (`@/mocks/data/identity`)
 *  - Playwright E2E specs      (`../src/mocks/data/identity` — relative, no `@/`
 *                               alias, so Playwright's runtime resolves it
 *                               without extra plumbing)
 *
 * Never inline a userinfo body in a spec — that is how the two layers drift.
 *
 * Contract source: `documentation/Authentication_API.yaml` (OpenAPI 3.0.3),
 * schemas `UserInfoRead`, `RoleRead`, `DefaultResponse`, `ErrorResponse`.
 * Every property name below is taken verbatim from that spec (PascalCase).
 *
 * NOT a runtime mock layer: `project.md` records `dataSource: existing-api`
 * with `Mock layer required: no`. There is no MSW here and none should be
 * added — these factories build response bodies for tests only.
 */

/* ------------------------------------------------------------------------ *
 * Types — mirrored from Authentication_API.yaml
 *
 * `web/src/types/api-generated.ts` does not exist yet, so the spec's schemas
 * are mirrored here (per testing-policy § Mock data: fall back to the brief's
 * Data Model). When generated types land, re-point these aliases at them
 * rather than maintaining two copies.
 *
 * Every property is optional because the spec declares no `required` list on
 * any of these schemas — a 200 body may legitimately omit fields (the spec's
 * own `/v1/auth/userinfo` example returns `Username` only, a field that is not
 * even declared on `UserInfoRead`; see the drift note at the bottom of file).
 * ------------------------------------------------------------------------ */

/** `components.schemas.RoleRead` */
export interface RoleRead {
  Id?: number;
  Name?: string;
  LastChangedUser?: string;
  /** Spec example format: `2025-04-30 15:00:00` (SAST / GMT+2 per project.md §Compliance). */
  LastChangedDate?: string;
}

/** `components.schemas.UserInfoRead` — returned by `GET /v1/auth/userinfo`. */
export interface UserInfoRead {
  Id?: number;
  Email?: string;
  FirstName?: string;
  LastName?: string;
  RolesString?: string;
  Roles?: RoleRead[];
  LastChangedUser?: string;
  LastChangedDate?: string;
}

/** `components.schemas.DefaultResponse` — login/logout confirmation body. */
export interface DefaultResponse {
  Id?: number;
  MessageType?: string;
  Messages?: string[];
}

/** `components.schemas.ErrorResponse` — 400 on a malformed login body. */
export interface ErrorResponse {
  Error?: string;
  Message?: string;
}

/* ------------------------------------------------------------------------ *
 * Role names
 * ------------------------------------------------------------------------ */

/**
 * Role names the project actually grants (`project.md` §Roles & Permissions,
 * template `custom`). Exported for spec readability only — the application
 * owns the real permitted-role decision; tests must assert the app's gating
 * behaviour, never re-derive it from this list.
 */
export const IMPORTER_ROLE = 'Importer';
export const APPROVER_ROLE = 'Approver';

/**
 * A role name deliberately OUTSIDE the project's permitted set, for the story
 * that proves an account holding an unrecognised role is refused rather than
 * silently permitted. `Viewer` is the auth API's own `RoleRead` example, so it
 * is a realistic value the backend could genuinely return.
 */
export const UNRECOGNISED_ROLE = 'Viewer';

/**
 * Separator used to join `RolesString` when an account holds several roles.
 *
 * UNDOCUMENTED IN THE SPEC: `Authentication_API.yaml` only ever shows a
 * single-role example (`RolesString: 'Viewer'`) and never states how multiple
 * roles are joined. `', '` is an assumption. If the backend turns out to use a
 * different separator, change it HERE — both test layers pick it up.
 *
 * Because it is unverified, prefer asserting against `Roles[]` (a real array,
 * unambiguously specified) over parsing `RolesString`.
 */
export const ROLES_STRING_SEPARATOR = ', ';

/** Stable ids for the role names we know about; keeps snapshots deterministic. */
const KNOWN_ROLE_IDS: Record<string, number> = {
  [IMPORTER_ROLE]: 1,
  [APPROVER_ROLE]: 2,
  [UNRECOGNISED_ROLE]: 3,
};

/** Ids for role names not in the known set, assigned deterministically by position. */
const UNKNOWN_ROLE_BASE_ID = 900;

/* ------------------------------------------------------------------------ *
 * Canonical identities
 * ------------------------------------------------------------------------ */

/** Audit metadata shared by the canonical fixtures (SAST, per §Compliance). */
const LAST_CHANGED_USER = 'Sarah Petersen';
const LAST_CHANGED_DATE = '2025-04-30 15:00:00';

type IdentityProfile = Pick<
  UserInfoRead,
  'Id' | 'Email' | 'FirstName' | 'LastName'
>;

/**
 * A recognisable person per role, so a failing assertion reads as
 * "expected Thandi Mokoena" rather than "expected John Doe" twice over.
 * The email doubles as the value the sign-in form's "Email address" field
 * submits as `LoginRequest.Username` (see brief §Notes & Caveats).
 */
const ROLE_PROFILES: Record<string, IdentityProfile> = {
  [IMPORTER_ROLE]: {
    Id: 101,
    Email: 'thandi.mokoena@pimcapitalgroup.com',
    FirstName: 'Thandi',
    LastName: 'Mokoena',
  },
  [APPROVER_ROLE]: {
    Id: 102,
    Email: 'sipho.ndlovu@pimcapitalgroup.com',
    FirstName: 'Sipho',
    LastName: 'Ndlovu',
  },
  [UNRECOGNISED_ROLE]: {
    Id: 103,
    Email: 'lerato.dube@pimcapitalgroup.com',
    FirstName: 'Lerato',
    LastName: 'Dube',
  },
};

/** Used when no requested role has a canonical profile. */
const DEFAULT_PROFILE: IdentityProfile = {
  Id: 100,
  Email: 'demo@test.com',
  FirstName: 'John',
  LastName: 'Doe',
};

/* ------------------------------------------------------------------------ *
 * Factories
 * ------------------------------------------------------------------------ */

/** Build a single `RoleRead`. Accepts any name — the role set is not a closed union. */
export const createRole = (
  name: string,
  overrides: Partial<RoleRead> = {},
): RoleRead => ({
  Id: KNOWN_ROLE_IDS[name] ?? UNKNOWN_ROLE_BASE_ID,
  Name: name,
  LastChangedUser: LAST_CHANGED_USER,
  LastChangedDate: LAST_CHANGED_DATE,
  ...overrides,
});

const toRoleNames = (roles: string | readonly string[]): string[] =>
  typeof roles === 'string' ? [roles] : [...roles];

/**
 * Build the `GET /v1/auth/userinfo` 200 body for an account holding one or
 * more roles.
 *
 * The role parameter is an arbitrary string (or array of strings), NOT a
 * closed `Importer | Approver` union — an account may legitimately come back
 * carrying a role the frontend does not recognise, and the application must
 * refuse it rather than silently permit it. A typed union here would make that
 * story impossible to write.
 *
 *   userInfoFor(IMPORTER_ROLE)                      // signed-in Importer
 *   userInfoFor(APPROVER_ROLE)                      // signed-in Approver
 *   userInfoFor([IMPORTER_ROLE, APPROVER_ROLE])     // holds both
 *   userInfoFor(UNRECOGNISED_ROLE)                  // outside the permitted set
 *   userInfoFor([])                                 // holds no roles at all
 *   userInfoFor(APPROVER_ROLE, { FirstName: 'Zanele' })
 */
export const userInfoFor = (
  roles: string | readonly string[],
  overrides: Partial<UserInfoRead> = {},
): UserInfoRead => {
  const roleNames = toRoleNames(roles);
  const profile =
    roleNames.map((name) => ROLE_PROFILES[name]).find(Boolean) ??
    DEFAULT_PROFILE;

  return {
    ...profile,
    RolesString: roleNames.join(ROLES_STRING_SEPARATOR),
    Roles: roleNames.map((name, index) =>
      createRole(name, {
        Id: KNOWN_ROLE_IDS[name] ?? UNKNOWN_ROLE_BASE_ID + index,
      }),
    ),
    LastChangedUser: LAST_CHANGED_USER,
    LastChangedDate: LAST_CHANGED_DATE,
    ...overrides,
  };
};

/** The full name the signed-in identity block is expected to present. */
export const displayNameFor = (userInfo: UserInfoRead): string =>
  [userInfo.FirstName, userInfo.LastName].filter(Boolean).join(' ');

/* ------------------------------------------------------------------------ *
 * Auth response bodies — so no spec ever hand-writes one
 * ------------------------------------------------------------------------ */

/** `POST /v1/auth/login` 200 body (spec example verbatim). */
export const loginSuccessResponse = (
  overrides: Partial<DefaultResponse> = {},
): DefaultResponse => ({
  Messages: ['Login successful'],
  ...overrides,
});

/** `POST /v1/auth/logout` 200 body (spec example verbatim). */
export const logoutSuccessResponse = (
  overrides: Partial<DefaultResponse> = {},
): DefaultResponse => ({
  Messages: ['Logout successful'],
  ...overrides,
});

/**
 * `POST /v1/auth/login` 400 body (spec example verbatim).
 *
 * Note the 401 (rejected credentials) is documented with NO body at all, which
 * is why there is no factory for it — a spec mocking rejected credentials
 * fulfils `status: 401` with an empty body, and the generic user-facing copy
 * (brief R2 / BR1) is frontend-owned, never echoed from the API.
 */
export const invalidLoginRequestResponse = (
  overrides: Partial<ErrorResponse> = {},
): ErrorResponse => ({
  Error: 'INVALID_REQUEST',
  Message: 'Username and password are required.',
  ...overrides,
});

/**
 * Session cookie the backend sets on a successful login, per the spec's
 * `Set-Cookie` response-header example. Used by Playwright `page.route()`
 * fulfilments so every spec fakes the session identically.
 */
export const SESSION_COOKIE_NAME = 'session';
export const MOCK_SESSION_SET_COOKIE =
  'session=mock-session-token; Path=/; HttpOnly; SameSite=Strict';

/**
 * Cookie-clearing directive returned by `POST /v1/auth/logout`
 * (spec example: same name, `Max-Age=0`).
 */
export const MOCK_SESSION_CLEAR_COOKIE =
  'session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0';

/* ------------------------------------------------------------------------ *
 * Spec drift notes (carried here so both layers see them)
 *
 * 1. `UserInfoRead` declares no `Pages[]` property. The app's page-level
 *    gating must be derived from `Roles[]` — do not invent a `Pages` field.
 * 2. The `/v1/auth/userinfo` 200 EXAMPLE in the spec is `{ Username: 'demo' }`,
 *    which does not match its own `UserInfoRead` schema (no `Username`
 *    property is declared). The schema is treated as authoritative here.
 * 3. `Set-Cookie` on a real login also carries `Secure`; it is omitted from
 *    MOCK_SESSION_SET_COOKIE because Playwright drives the dev server over
 *    plain http://localhost, where a Secure cookie would be dropped.
 * ------------------------------------------------------------------------ */
