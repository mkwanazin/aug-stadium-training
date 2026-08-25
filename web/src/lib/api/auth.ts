import { post } from '@/lib/api/client';

import type { AuthMessageResponse, LoginRequest } from '@/types/auth';

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
