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
