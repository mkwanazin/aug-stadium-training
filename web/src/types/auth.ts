/**
 * Authentication types — mirrored from `documentation/Authentication_API.yaml`.
 *
 * Property names are PascalCase because that is what the API declares; do not
 * "tidy" them to camelCase. Every property is optional on response shapes: the
 * spec declares no `required` list on any auth schema.
 */

/** `components.schemas.LoginRequest` — body of `POST /v1/auth/login`. */
export interface LoginRequest {
  /**
   * The account identifier. The sign-in form labels this field "Email address"
   * and submits the address verbatim — the API's own examples are inconsistent
   * (`demo@test.com` in one, `demo` in another), so an email string is sent and
   * the backend decides (brief §Notes & Caveats).
   */
  Username: string;
  Password: string;
}

/**
 * `components.schemas.DefaultResponse` — the confirmation body returned by
 * `POST /v1/auth/login` and `POST /v1/auth/logout`. The session itself arrives
 * as an HttpOnly `Set-Cookie`; nothing in this body is a credential.
 */
export interface AuthMessageResponse {
  Id?: number;
  MessageType?: string;
  Messages?: string[];
}

/** `components.schemas.ErrorResponse` — returned with `400` on a malformed body. */
export interface AuthErrorResponse {
  Error?: string;
  Message?: string;
}

/**
 * `components.schemas.RoleRead` — one role an account holds.
 *
 * `Name` is an open string, NOT a closed union of the role names this project
 * happens to know (`'File Importer' | 'Approver'`): the API's own example is
 * `Viewer`, and an account may legitimately come back carrying a role this
 * frontend grants nothing to (brief §Notes & Caveats, "Role set may exceed two").
 * Closing the union here would make that case unrepresentable.
 *
 * The names themselves are not this file's business — the verified spellings live
 * in `@/lib/auth/permissions` and project.md §Roles & Permissions. An earlier
 * version of this comment used `'Importer'` as its example, which is the prose
 * spelling the backend does not return; naming it even in an example re-seeds the
 * mismatch that refused every importer account.
 */
export interface RoleRead {
  Id?: number;
  Name?: string;
  LastChangedUser?: string;
  /** Spec example format: `2025-04-30 15:00:00` (SAST, per project.md §Compliance). */
  LastChangedDate?: string;
}

/**
 * `components.schemas.UserInfoRead` — body of `GET /v1/auth/userinfo`.
 *
 * `Roles[]` is the authoritative role list. `RolesString` is the same information
 * flattened, but the spec never states how several roles are joined, so it is only
 * a fallback (see `roleNamesOf` in `@/lib/auth/permissions`).
 */
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
