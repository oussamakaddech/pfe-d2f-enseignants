/**
 * authHeaders.ts — DEPRECATED
 *
 * JWT is now stored in HttpOnly cookie and sent automatically via
 * `withCredentials: true` in the axios client.
 *
 * These functions are kept as no-ops for backward compatibility with
 * any remaining callers. They should be removed in a future cleanup.
 */

/** @deprecated Cookie-based auth — token is not accessible from JS. */
export function getAuthToken(): string | null {
  return null;
}

/** @deprecated Cookie-based auth — token is not accessible from JS. */
export function requireAuthToken(): string {
  // Token is in HttpOnly cookie, not accessible from JS.
  // Requests work via withCredentials: true.
  return "";
}

/** @deprecated Cookie-based auth — header is set automatically via cookie. */
export function optionalAuthHeader(): Record<string, string> {
  return {};
}

/** @deprecated Cookie-based auth — header is set automatically via cookie. */
export function requireAuthHeader(): Record<string, string> {
  return {};
}
