import { describe, it, expect } from 'vitest';
import { secureRandomUnit, secureRandomInt, secureRandomId } from './secureRandom';

describe('secureRandom', () => {
  describe('secureRandomUnit', () => {
    it('returns a number in [0, 1]', () => {
      for (let i = 0; i < 100; i++) {
        const v = secureRandomUnit();
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('secureRandomInt', () => {
    it('returns an integer in [0, maxExclusive)', () => {
      for (let i = 0; i < 100; i++) {
        const v = secureRandomInt(10);
        expect(Number.isInteger(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(10);
      }
    });
    it('returns 0 when maxExclusive is 1', () => {
      expect(secureRandomInt(1)).toBe(0);
    });
  });

  describe('secureRandomId', () => {
    it('returns a non-empty string', () => {
      const id = secureRandomId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });
    it('produces distinct ids across calls', () => {
      const ids = new Set(Array.from({ length: 50 }, () => secureRandomId()));
      expect(ids.size).toBeGreaterThan(1);
    });
  });
});
