import { describe, expect, it } from 'vitest';
import {
  getAuthToken,
  optionalAuthHeader,
  requireAuthHeader,
  requireAuthToken,
} from "@/services/auth/authHeaders";

/**
 * authHeaders is deprecated: JWT lives in an HttpOnly cookie and is sent
 * automatically through `withCredentials: true`. These helpers are kept as
 * no-ops for backward compatibility; the tests document that contract.
 */
describe('authHeaders (deprecated cookie-based auth)', () => {
  it('getAuthToken always returns null (token not JS-accessible)', () => {
    expect(getAuthToken()).toBeNull();
  });

  it('requireAuthToken returns empty string (cookie auth, no token in JS)', () => {
    expect(requireAuthToken()).toBe('');
  });

  it('optionalAuthHeader returns empty object', () => {
    expect(optionalAuthHeader()).toEqual({});
  });

  it('requireAuthHeader returns empty object', () => {
    expect(requireAuthHeader()).toEqual({});
  });
});
