import { describe, it, expect } from 'vitest';
import { ROLES, normalizeRole, isAdmin } from './roles';

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
    it('returns false for non-admin roles', () => {
      expect(isAdmin('Enseignant')).toBe(false);
      expect(isAdmin(null)).toBe(false);
      expect(isAdmin('')).toBe(false);
    });
  });
});
