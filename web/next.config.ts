import type { NextConfig } from 'next';

/**
 * Backend origins. Server-side only — deliberately NOT `NEXT_PUBLIC_*`.
 *
 * The browser never calls either backend directly: it calls same-origin paths
 * that the rewrites below proxy on to the real services. That is what makes the
 * `session` cookie (HttpOnly, SameSite=Strict, set by the auth API) a first-party
 * cookie for the app's own origin, and it removes the cross-origin CORS
 * requirement flagged in project.md NFR-base-6 — no `Access-Control-Allow-*`
 * header is needed on either backend.
 *
 * These are the variable names project.md §Data Source records, and they are read
 * server-side in this file only — never referenced from browser code
 * (see .claude/policies/bff-auth-pattern.md §Next.js Integration Pattern).
 */
const AUTH_API = process.env.AUTH_API_BASE_URL ?? 'http://localhost:10010';

const TRANSACTIONS_API =
  process.env.TRANSACTIONS_API_BASE_URL ??
  'http://localhost:10005/transactions-api';

const nextConfig: NextConfig = {
  // Emit a minimal, self-contained server bundle in `.next/standalone`
  // so the Docker runtime image only needs Node + the traced dependencies.
  output: 'standalone',

  async rewrites() {
    return [
      // Authentication API (:10010) — login, logout, userinfo, health.
      { source: '/v1/auth/:path*', destination: `${AUTH_API}/v1/auth/:path*` },
      // Transaction Management API (:10005/transactions-api).
      {
        source: '/transactions-api/:path*',
        destination: `${TRANSACTIONS_API}/:path*`,
      },
    ];
  },
};

export default nextConfig;
