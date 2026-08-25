/**
 * Application Constants Template
 *
 * Define your application-specific constants here
 * Examples include API configuration, UI settings, and business logic constants
 */

/**
 * API base URL prefixed to every request the shared API client makes.
 *
 * Empty by default, and that is deliberate: the browser calls SAME-ORIGIN paths
 * (`/v1/auth/...` for the Authentication API, `/transactions-api/...` for the
 * Transaction Management API) which `web/next.config.ts` rewrites on to the real
 * backends. Keeping requests same-origin means the HttpOnly `session` cookie is
 * first-party and neither backend needs CORS headers (project.md NFR-base-6).
 *
 * Set NEXT_PUBLIC_API_BASE_URL only to point the client at an absolute origin
 * (e.g. a deployed environment that does not front the APIs with rewrites).
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

/**
 * Default pagination settings
 * Customize based on your application's needs
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 25,
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100],
} as const;

/**
 * Toast notification settings
 */
export const TOAST_SETTINGS = {
  DEFAULT_DURATION: 5000, // 5 seconds
  SUCCESS_DURATION: 3000, // 3 seconds
  ERROR_DURATION: 7000, // 7 seconds
  MAX_TOASTS: 3,
} as const;

/**
 * Modal settings
 */
export const MODAL_SETTINGS = {
  ANIMATION_DURATION: 150, // 150ms for enter/exit animations
} as const;

// Add your application-specific constants below
// Example:
// export const DATE_FORMATS = {
//   DISPLAY: 'dd MMM yyyy',
//   API: 'yyyy-MM-dd',
// } as const;
