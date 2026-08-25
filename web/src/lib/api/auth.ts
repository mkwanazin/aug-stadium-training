import { get, post } from '@/lib/api/client';

import type {
  AuthMessageResponse,
  LoginRequest,
  UserInfoRead,
} from '@/types/auth';

/**
 * Authentication API endpoints (`documentation/Authentication_API.yaml`).
 *
 * Same-origin paths on purpose — `web/next.config.ts` rewrites `/v1/auth/*` on to
 * the Authentication API. The browser therefore never calls the backend
 * cross-origin, the `session` cookie stays first-party, and no CORS headers are
 * needed (project.md NFR-base-6).
 */
export const AUTH_ENDPOINTS = {
  login: '/v1/auth/login',
  logout: '/v1/auth/logout',
  userinfo: '/v1/auth/userinfo',
} as const;

/**
 * `POST /v1/auth/login`.
 *
 * On success the response carries the HttpOnly `session` cookie, which the
 * browser stores and attaches to later requests — the frontend never reads it.
 * On refused credentials the shared client throws an `APIError` with
 * `statusCode: 401` and no body (the spec documents none), so all user-facing
 * refusal copy is frontend-owned.
 */
export function login(credentials: LoginRequest): Promise<AuthMessageResponse> {
  return post<AuthMessageResponse>(AUTH_ENDPOINTS.login, credentials);
}

/**
 * `GET /v1/auth/userinfo` — who the browser's `session` cookie belongs to.
 *
 * This is the session check every protected surface runs on load: a 200 body
 * means the session is live and carries the identity and roles to present; the
 * shared client throws an `APIError` with `statusCode: 401` when it is not
 * (brief R5 / BR2).
 *
 * Called from the BROWSER, never from the server: the credential is an HttpOnly
 * cookie the browser attaches itself, and the answer must reflect the state of
 * the visitor's own session rather than a cached server render.
 */
export function getUserInfo(): Promise<UserInfoRead> {
  return get<UserInfoRead>(AUTH_ENDPOINTS.userinfo);
}

/**
 * `POST /v1/auth/logout` — ends the session server-side and clears the cookie.
 *
 * Callers must AWAIT this before navigating away (brief R4 / BR4): the response
 * is what actually invalidates the session, and navigating optimistically leaves
 * a live session behind if the request fails
 * (.claude/policies/bff-auth-pattern.md Rule 8).
 */
export function logout(): Promise<AuthMessageResponse> {
  return post<AuthMessageResponse>(AUTH_ENDPOINTS.logout);
}
