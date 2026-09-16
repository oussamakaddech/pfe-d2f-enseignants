import { describe, it, expect } from 'vitest';
import {
  acteurFullName,
  buildActeurValue,
  buildActeurOptions,
  serializeActeurs,
  parseActeurs,
} from './acteurs';

describe('acteurs', () => {
  describe('acteurFullName', () => {
    it('joins nom and prenom', () => {
      expect(acteurFullName({ nom: 'Doe', prenom: 'John' })).toBe('Doe John');
    });
    it('handles missing prenom', () => {
      expect(acteurFullName({ nom: 'Doe' })).toBe('Doe');
    });
    it('handles missing nom', () => {
      expect(acteurFullName({ prenom: 'John' })).toBe('John');
    });
    it('returns empty string when both missing', () => {
      expect(acteurFullName({})).toBe('');
    });
  });

  describe('buildActeurValue', () => {
    it('appends email in angle brackets', () => {
      expect(buildActeurValue({ nom: 'Doe', prenom: 'John', mail: 'j@x.com' })).toBe('Doe John <j@x.com>');
    });
    it('returns name only when no mail', () => {
      expect(buildActeurValue({ nom: 'Doe', prenom: 'John' })).toBe('Doe John');
    });
    it('handles empty source', () => {
      expect(buildActeurValue({})).toBe('');
    });
  });

  describe('buildActeurOptions', () => {
    it('builds options with label including mail', () => {
      const opts = buildActeurOptions([{ nom: 'Doe', prenom: 'John', mail: 'j@x.com' }]);
      expect(opts).toEqual([{ value: 'Doe John <j@x.com>', label: 'Doe John · j@x.com' }]);
    });
    it('label without mail', () => {
      const opts = buildActeurOptions([{ nom: 'Doe', prenom: 'John' }]);
      expect(opts[0].label).toBe('Doe John');
    });
    it('filters out empty values', () => {
      const opts = buildActeurOptions([{}, { nom: 'A' }]);
      expect(opts).toHaveLength(1);
      expect(opts[0].value).toBe('A');
    });
    it('handles empty list', () => {
      expect(buildActeurOptions([])).toEqual([]);
    });
  });

  describe('serializeActeurs', () => {
    it('joins array with newlines', () => {
      expect(serializeActeurs(['a', 'b'])).toBe('a\nb');
    });
    it('trims and filters empty entries in array', () => {
      expect(serializeActeurs([' a ', '', '  '])).toBe('a');
    });
    it('returns undefined for empty array', () => {
      expect(serializeActeurs([])).toBeUndefined();
    });
    it('handles string value', () => {
      expect(serializeActeurs('  hello  ')).toBe('hello');
    });
    it('returns undefined for null/undefined/empty string', () => {
      expect(serializeActeurs(null)).toBeUndefined();
      expect(serializeActeurs(undefined)).toBeUndefined();
      expect(serializeActeurs('   ')).toBeUndefined();
    });
  });

  describe('parseActeurs', () => {
    it('returns trimmed array from array input', () => {
      expect(parseActeurs([' a ', 'b', ''])).toEqual(['a', 'b']);
    });
    it('splits string by newlines', () => {
      expect(parseActeurs('a\nb\r\nc')).toEqual(['a', 'b', 'c']);
    });
    it('filters empty lines', () => {
      expect(parseActeurs('a\n\n b ')).toEqual(['a', 'b']);
    });
    it('returns empty array for null/undefined', () => {
      expect(parseActeurs(null)).toEqual([]);
      expect(parseActeurs(undefined)).toEqual([]);
    });
  });
});
