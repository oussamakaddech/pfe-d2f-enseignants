import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getAuthToken,
  optionalAuthHeader,
  requireAuthHeader,
  requireAuthToken,
} from '../authHeaders';

describe('authHeaders', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('reads auth token from localStorage', () => {
    localStorage.setItem('authToken', 'abc');
    expect(getAuthToken()).toBe('abc');
  });

  it('returns empty optional header when token is missing', () => {
    expect(optionalAuthHeader()).toEqual({});
  });

  it('returns bearer header when token exists', () => {
    localStorage.setItem('authToken', 'abc');
    expect(optionalAuthHeader()).toEqual({ Authorization: 'Bearer abc' });
    expect(requireAuthHeader()).toEqual({ Authorization: 'Bearer abc' });
  });

  it('throws when requiring a missing token', () => {
    expect(() => requireAuthToken()).toThrow('Authentication token is missing.');
  });
});
