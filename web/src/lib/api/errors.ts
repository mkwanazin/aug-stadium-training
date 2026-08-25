import type { APIError } from '@/types/api';

/**
 * Narrows an unknown caught value to the shared API client's `APIError`.
 *
 * `client.ts` throws a plain object, NOT an `Error` instance, so
 * `error instanceof Error` never matches an API failure. This guard is the
 * supported way to branch on a status code in a catch block.
 *
 * Lives outside `client.ts` on purpose: tests mock the client module at the
 * boundary, and a guard exported from there would vanish with it.
 */
export function isAPIError(error: unknown): error is APIError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  );
}

/** True when the caught value is an API failure carrying the given status code. */
export function isAPIErrorWithStatus(error: unknown, status: number): boolean {
  return isAPIError(error) && error.statusCode === status;
}
