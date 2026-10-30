import { describe, it, expect } from 'vitest';
import {
  ROLES,
  normalizeRole,
  isAdmin,
  extractRoles,
  resolvePrimaryRole,
  hasAnyRole,
} from './roles';

describe('roles constants', () => {
  it('exposes expected role values', () => {
    expect(ROLES.ADMIN).toBe('admin');
    expect(ROLES.CUP).toBe('CUP');
    expect(ROLES.ENSEIGNANT).toBe('Enseignant');
    expect(ROLES.RESPONSABLE_DOSSIER).toBe('ResponsableDossier');
  });

  describe('normalizeRole', () => {
    it('lowercases the role', () => {
      expect(normalizeRole('ADMIN')).toBe('admin');
    });
    it('strips ROLE_ prefix', () => {
      expect(normalizeRole('ROLE_ADMIN')).toBe('admin');
      expect(normalizeRole('role_admin')).toBe('admin');
    });
    it('removes spaces, underscores and dashes', () => {
      expect(normalizeRole('CHEF_DEPARTEMENT')).toBe('chefdepartement');
      expect(normalizeRole('Responsable-Dossier')).toBe('responsabledossier');
      expect(normalizeRole('  Chef Departement ')).toBe('chefdepartement');
    });
    it('handles null/undefined/non-string', () => {
      expect(normalizeRole(null)).toBe('');
      expect(normalizeRole(undefined)).toBe('');
      expect(normalizeRole(123 as unknown as string)).toBe('');
    });
  });

  describe('isAdmin', () => {
    it('returns true for admin variations', () => {
      expect(isAdmin('admin')).toBe(true);
      expect(isAdmin('ROLE_ADMIN')).toBe(true);
      expect(isAdmin('Admin')).toBe(true);
    });
    it('returns true when admin is part of a compound scope', () => {
      expect(isAdmin('ROLE_ADMIN ROLE_CUP')).toBe(true);
    });
    it('returns false for non-admin roles', () => {
      expect(isAdmin('Enseignant')).toBe(false);
      expect(isAdmin('ROLE_D2F ROLE_RESPONSABLE_DOSSIER')).toBe(false);
      expect(isAdmin(null)).toBe(false);
      expect(isAdmin('')).toBe(false);
    });
  });

  describe('extractRoles (compound JWT scope)', () => {
    it('splits a compound scope into normalized roles', () => {
      expect(extractRoles('ROLE_D2F ROLE_RESPONSABLE_DOSSIER')).toEqual([
        'd2f',
        'responsabledossier',
      ]);
    });
    it('handles single role and separators', () => {
      expect(extractRoles('ROLE_RESPONSABLE_DOSSIER')).toEqual(['responsabledossier']);
      expect(extractRoles('ROLE_CUP, ROLE_ADMIN')).toEqual(['cup', 'admin']);
    });
    it('handles null/undefined/empty', () => {
      expect(extractRoles(null)).toEqual([]);
      expect(extractRoles(undefined)).toEqual([]);
      expect(extractRoles('')).toEqual([]);
    });
  });

  describe('resolvePrimaryRole', () => {
    const knownRoles = [
      'admin',
      'cup',
      'enseignant',
      'animateur',
      'responsabledossier',
      'chefdepartement',
    ];
    it('picks the first known role of a compound scope', () => {
      expect(resolvePrimaryRole('ROLE_D2F ROLE_RESPONSABLE_DOSSIER', knownRoles)).toBe(
        'responsabledossier',
      );
    });
    it('prefers the first token even when all are known', () => {
      expect(resolvePrimaryRole('ROLE_ADMIN ROLE_CUP', knownRoles)).toBe('admin');
    });
    it('falls back to the first token when none is known', () => {
      expect(resolvePrimaryRole('ROLE_D2F', knownRoles)).toBe('d2f');
    });
    it('handles null/undefined', () => {
      expect(resolvePrimaryRole(null, knownRoles)).toBe('');
      expect(resolvePrimaryRole(undefined, knownRoles)).toBe('');
    });
  });

  describe('hasAnyRole', () => {
    it('matches a single role against allowed roles', () => {
      expect(hasAnyRole('ROLE_RESPONSABLE_DOSSIER', ['ResponsableDossier', 'CUP'])).toBe(true);
      expect(hasAnyRole('ROLE_ENSEIGNANT', ['ResponsableDossier', 'CUP'])).toBe(false);
    });
    it('matches when one token of a compound scope is allowed', () => {
      expect(hasAnyRole('ROLE_D2F ROLE_RESPONSABLE_DOSSIER', ['CUP', 'ResponsableDossier'])).toBe(
        true,
      );
      expect(hasAnyRole('ROLE_D2F ROLE_RESPONSABLE_DOSSIER', ['CUP', 'Animateur'])).toBe(false);
    });
    it('handles empty user role or empty required roles', () => {
      expect(hasAnyRole(null, ['admin'])).toBe(false);
      expect(hasAnyRole('ROLE_ADMIN', [])).toBe(false);
      expect(hasAnyRole('ROLE_ADMIN', undefined)).toBe(false);
    });
  });
});
