import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  formatDate,
  formatDateTime,
  formatDateShort,
  formatRelativeTime,
  truncate,
  capitalize,
  toTitleCase,
  normalizeForSearch,
  formatNumber,
  formatPercent,
  formatCode,
  formatNiveauMaitrise,
  formatTypeSavoir,
} from '../formatters';

describe('formatters', () => {
  describe('formatDate', () => {
    it('returns em dash for null/undefined', () => {
      expect(formatDate(null)).toBe('—');
      expect(formatDate(undefined)).toBe('—');
    });
    it('returns em dash for invalid date', () => {
      expect(formatDate('not-a-date')).toBe('—');
    });
    it('formats a valid ISO date in fr-FR', () => {
      const result = formatDate('2025-01-12T00:00:00.000Z');
      expect(result).toContain('2025');
      expect(result).toContain('janv');
    });
    it('accepts a Date object', () => {
      const result = formatDate(new Date('2025-06-15'));
      expect(result).toContain('2025');
      expect(result).toContain('juin');
    });
  });

  describe('formatDateTime', () => {
    it('returns em dash for null', () => {
      expect(formatDateTime(null)).toBe('—');
    });
    it('returns em dash for invalid date', () => {
      expect(formatDateTime('invalid')).toBe('—');
    });
    it('includes time in output', () => {
      const result = formatDateTime('2025-01-12T14:30:00');
      expect(result).toContain('14:30');
    });
  });

  describe('formatDateShort', () => {
    it('returns em dash for null', () => {
      expect(formatDateShort(null)).toBe('—');
    });
    it('returns em dash for invalid', () => {
      expect(formatDateShort('bad')).toBe('—');
    });
    it('returns short fr-FR format', () => {
      const d = new Date('2025-01-12');
      const result = formatDateShort(d);
      expect(result).toContain('01');
    });
  });

  describe('formatRelativeTime', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); });

    it('returns em dash for null', () => {
      expect(formatRelativeTime(null)).toBe('—');
    });
    it('returns em dash for invalid date', () => {
      expect(formatRelativeTime('nope')).toBe('—');
    });
    it('returns "À l\'instant" for < 60s', () => {
      vi.setSystemTime(new Date('2025-01-01T00:01:00'));
      expect(formatRelativeTime(new Date('2025-01-01T00:00:30'))).toBe("À l'instant");
    });
    it('returns minutes for < 60min', () => {
      vi.setSystemTime(new Date('2025-01-01T01:00:00'));
      expect(formatRelativeTime(new Date('2025-01-01T00:55:00'))).toBe('Il y a 5 min');
    });
    it('returns hours for < 24h', () => {
      vi.setSystemTime(new Date('2025-01-01T12:00:00'));
      expect(formatRelativeTime(new Date('2025-01-01T08:00:00'))).toBe('Il y a 4h');
    });
    it('returns days for < 30 days', () => {
      vi.setSystemTime(new Date('2025-01-20T00:00:00'));
      expect(formatRelativeTime(new Date('2025-01-15T00:00:00'))).toBe('Il y a 5 jours');
    });
    it('returns "1 jour" for exactly 1 day', () => {
      vi.setSystemTime(new Date('2025-01-02T00:00:00'));
      expect(formatRelativeTime(new Date('2025-01-01T00:00:00'))).toBe('Il y a 1 jour');
    });
    it('falls back to formatDate for >= 30 days', () => {
      vi.setSystemTime(new Date('2025-03-01T00:00:00'));
      const result = formatRelativeTime(new Date('2025-01-01T00:00:00'));
      expect(result).not.toContain('Il y a');
    });
  });

  describe('truncate', () => {
    it('returns empty string for null', () => {
      expect(truncate(null)).toBe('');
    });
    it('returns text unchanged when under limit', () => {
      expect(truncate('hello', 10)).toBe('hello');
    });
    it('truncates and appends ellipsis when over limit', () => {
      expect(truncate('hello world this is long', 10)).toBe('hello worl…');
    });
    it('defaults to 80 chars', () => {
      const long = 'a'.repeat(100);
      expect(truncate(long)).toBe('a'.repeat(80) + '…');
    });
  });

  describe('capitalize', () => {
    it('returns empty string for null', () => {
      expect(capitalize(null)).toBe('');
    });
    it('capitalizes first letter and lowercases rest', () => {
      expect(capitalize('HELLO')).toBe('Hello');
      expect(capitalize('hELLO WORLD')).toBe('Hello world');
    });
  });

  describe('toTitleCase', () => {
    it('returns empty string for null', () => {
      expect(toTitleCase(null)).toBe('');
    });
    it('capitalizes each word', () => {
      expect(toTitleCase('gestion des compétences')).toBe('Gestion Des Compétences');
    });
  });

  describe('normalizeForSearch', () => {
    it('returns empty string for null', () => {
      expect(normalizeForSearch(null)).toBe('');
    });
    it('lowercases and removes accents', () => {
      expect(normalizeForSearch('Débutant Élévation')).toBe('debutant elevation');
    });
  });

  describe('formatNumber', () => {
    it('returns em dash for null', () => {
      expect(formatNumber(null)).toBe('—');
      expect(formatNumber(undefined)).toBe('—');
    });
    it('formats number with fr-FR locale', () => {
      expect(formatNumber(1234567)).toBe('1\u202f234\u202f567');
    });
  });

  describe('formatPercent', () => {
    it('returns em dash for null', () => {
      expect(formatPercent(null)).toBe('—');
    });
    it('formats with default 1 decimal', () => {
      expect(formatPercent(0.856)).toBe('85,6 %');
    });
    it('formats with custom digits', () => {
      expect(formatPercent(0.856, 2)).toBe('85,60 %');
    });
  });

  describe('formatCode', () => {
    it('returns empty for null', () => {
      expect(formatCode(null)).toBe('');
    });
    it('uppercases and replaces spaces with hyphens', () => {
      expect(formatCode('inf 01')).toBe('INF-01');
    });
  });

  describe('formatNiveauMaitrise', () => {
    it('returns label for known niveau', () => {
      expect(formatNiveauMaitrise('N3_INTERMEDIAIRE')).toBe('N3 — Intermédiaire');
    });
    it('returns raw value for unknown', () => {
      expect(formatNiveauMaitrise('UNKNOWN')).toBe('UNKNOWN');
    });
    it('returns em dash for null', () => {
      expect(formatNiveauMaitrise(null)).toBe('—');
    });
  });

  describe('formatTypeSavoir', () => {
    it('returns label for THEORIQUE', () => {
      expect(formatTypeSavoir('THEORIQUE')).toBe('Théorique');
    });
    it('returns label for PRATIQUE', () => {
      expect(formatTypeSavoir('PRATIQUE')).toBe('Pratique');
    });
    it('returns raw value for unknown', () => {
      expect(formatTypeSavoir('HYBRIDE')).toBe('HYBRIDE');
    });
    it('returns em dash for null', () => {
      expect(formatTypeSavoir(null)).toBe('—');
    });
  });
});
