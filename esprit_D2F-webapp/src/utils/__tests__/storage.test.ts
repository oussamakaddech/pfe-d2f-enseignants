import { beforeEach, describe, expect, it } from 'vitest';
import {
  getActiveRole,
  setActiveRole,
  removeActiveRole,
  getPreferredLang,
  setPreferredLang,
  clearSession,
} from '../storage';

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear();
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
    it('removes activeRole but not lang', () => {
      setActiveRole('admin');
      setPreferredLang('en');
      clearSession();
      expect(getActiveRole()).toBeNull();
      expect(getPreferredLang()).toBe('en');
    });
  });
});
