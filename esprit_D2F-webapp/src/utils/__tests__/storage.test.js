import { beforeEach, describe, expect, it } from 'vitest';
import {
  getToken,
  setToken,
  removeToken,
  hasToken,
  getProfile,
  setProfile,
  removeProfile,
  getActiveRole,
  setActiveRole,
  removeActiveRole,
  getPreferredLang,
  setPreferredLang,
  clearSession,
  storage,
} from '../storage';

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('token', () => {
    it('getToken returns null initially', () => {
      expect(getToken()).toBeNull();
    });
    it('setToken stores and getToken retrieves', () => {
      setToken('abc');
      expect(getToken()).toBe('abc');
    });
    it('hasToken returns true/false', () => {
      expect(hasToken()).toBe(false);
      setToken('abc');
      expect(hasToken()).toBe(true);
    });
    it('removeToken removes the token', () => {
      setToken('abc');
      removeToken();
      expect(getToken()).toBeNull();
    });
  });

  describe('profile', () => {
    it('getProfile returns null initially', () => {
      expect(getProfile()).toBeNull();
    });
    it('setProfile stores JSON and getProfile parses', () => {
      const profile = { name: 'John', role: 'admin' };
      setProfile(profile);
      expect(getProfile()).toEqual(profile);
    });
    it('getProfile returns null for invalid JSON', () => {
      localStorage.setItem('userProfile', '{invalid');
      expect(getProfile()).toBeNull();
    });
    it('removeProfile clears profile', () => {
      setProfile({ name: 'John' });
      removeProfile();
      expect(getProfile()).toBeNull();
    });
  });

  describe('activeRole', () => {
    it('getActiveRole returns null initially', () => {
      expect(getActiveRole()).toBeNull();
    });
    it('setActiveRole and getActiveRole round-trip', () => {
      setActiveRole('admin');
      expect(getActiveRole()).toBe('admin');
    });
    it('removeActiveRole clears role', () => {
      setActiveRole('admin');
      removeActiveRole();
      expect(getActiveRole()).toBeNull();
    });
  });

  describe('preferredLang', () => {
    it('returns "fr" as default', () => {
      expect(getPreferredLang()).toBe('fr');
    });
    it('setPreferredLang stores value', () => {
      setPreferredLang('en');
      expect(getPreferredLang()).toBe('en');
    });
  });

  describe('clearSession', () => {
    it('removes token, profile, and activeRole but not lang', () => {
      setToken('abc');
      setProfile({ name: 'John' });
      setActiveRole('admin');
      setPreferredLang('en');
      clearSession();
      expect(getToken()).toBeNull();
      expect(getProfile()).toBeNull();
      expect(getActiveRole()).toBeNull();
      expect(getPreferredLang()).toBe('en');
    });
  });

  describe('storage (object API)', () => {
    it('regroups all methods', () => {
      expect(storage.getToken).toBe(getToken);
      expect(storage.setToken).toBe(setToken);
      expect(storage.hasToken).toBe(hasToken);
      expect(storage.clearSession).toBe(clearSession);
    });
    it('works end-to-end', () => {
      storage.setToken('t');
      expect(storage.getToken()).toBe('t');
      expect(storage.hasToken()).toBe(true);
      storage.clearSession();
      expect(storage.hasToken()).toBe(false);
    });
  });
});
