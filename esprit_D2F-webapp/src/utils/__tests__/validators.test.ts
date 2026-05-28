import { describe, expect, it, vi } from 'vitest';
import {
  isNotEmpty,
  isValidEmail,
  minLength,
  maxLength,
  isPositiveNumber,
  isNonNegativeInteger,
  isValidCode,
  requiredRule,
  emailRule,
  minLengthRule,
  maxLengthRule,
  positiveNumberRule,
  codeFormatRule,
  rangeRule,
  noLeadingTrailingSpacesRule,
  confirmPasswordRule,
  nomRules,
  codeRules,
  descriptionRules,
  emailRules,
} from '../validators';

describe('validators — pure functions', () => {
  describe('isNotEmpty', () => {
    it('returns true for non-empty strings', () => {
      expect(isNotEmpty('hello')).toBe(true);
    });
    it('returns false for null/undefined', () => {
      expect(isNotEmpty(null)).toBe(false);
      expect(isNotEmpty(undefined)).toBe(false);
    });
    it('returns false for whitespace-only', () => {
      expect(isNotEmpty('   ')).toBe(false);
    });
  });

  describe('isValidEmail', () => {
    it('returns true for valid emails', () => {
      expect(isValidEmail('test@esprit.tn')).toBe(true);
      expect(isValidEmail('a.b@c.co')).toBe(true);
    });
    it('returns false for invalid emails', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('not-email')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
    });
  });

  describe('minLength', () => {
    it('returns true when >= min', () => {
      expect(minLength('abc', 2)).toBe(true);
      expect(minLength('abc', 3)).toBe(true);
    });
    it('returns false when < min', () => {
      expect(minLength('a', 2)).toBe(false);
    });
    it('handles null', () => {
      expect(minLength(null, 1)).toBe(false);
    });
  });

  describe('maxLength', () => {
    it('returns true when <= max', () => {
      expect(maxLength('abc', 5)).toBe(true);
      expect(maxLength('abc', 3)).toBe(true);
    });
    it('returns false when > max', () => {
      expect(maxLength('abcde', 3)).toBe(false);
    });
  });

  describe('isPositiveNumber', () => {
    it('returns true for positive numbers', () => {
      expect(isPositiveNumber(5)).toBe(true);
      expect(isPositiveNumber('3')).toBe(true);
    });
    it('returns false for zero, negative, non-numeric', () => {
      expect(isPositiveNumber(0)).toBe(false);
      expect(isPositiveNumber(-1)).toBe(false);
      expect(isPositiveNumber('abc')).toBe(false);
    });
  });

  describe('isNonNegativeInteger', () => {
    it('returns true for 0 and positive integers', () => {
      expect(isNonNegativeInteger(0)).toBe(true);
      expect(isNonNegativeInteger(5)).toBe(true);
    });
    it('returns false for negative, floats, non-numeric', () => {
      expect(isNonNegativeInteger(-1)).toBe(false);
      expect(isNonNegativeInteger(1.5)).toBe(false);
      expect(isNonNegativeInteger('abc')).toBe(false);
    });
  });

  describe('isValidCode', () => {
    it('returns true for valid codes', () => {
      expect(isValidCode('INF-01')).toBe(true);
      expect(isValidCode('GC_SC_02')).toBe(true);
    });
    it('returns false for invalid codes', () => {
      expect(isValidCode('')).toBe(false);
      expect(isValidCode('code with spaces')).toBe(false);
      expect(isValidCode('a'.repeat(51))).toBe(false);
    });
  });
});

describe('validators — Ant Design rules', () => {
  describe('requiredRule', () => {
    it('returns object with required:true and default message', () => {
      expect(requiredRule()).toEqual({ required: true, message: 'Ce champ est obligatoire' });
    });
    it('accepts custom message', () => {
      expect(requiredRule('Custom')).toEqual({ required: true, message: 'Custom' });
    });
  });

  describe('emailRule', () => {
    it('returns type email rule', () => {
      expect(emailRule()).toEqual({ type: 'email', message: 'Adresse email invalide' });
    });
  });

  describe('minLengthRule / maxLengthRule', () => {
    it('minLengthRule returns min constraint', () => {
      expect(minLengthRule(2)).toEqual({ min: 2, message: 'Minimum 2 caractère(s) requis' });
    });
    it('maxLengthRule returns max constraint', () => {
      expect(maxLengthRule(100)).toEqual({ max: 100, message: 'Maximum 100 caractère(s) autorisés' });
    });
  });

  describe('positiveNumberRule', () => {
    it('resolves for valid positive number', async () => {
      const rule = positiveNumberRule();
      await expect((rule as any).validator(null, 5)).resolves.toBeUndefined();
    });
    it('resolves for empty value', async () => {
      const rule = positiveNumberRule();
      await expect((rule as any).validator(null, undefined)).resolves.toBeUndefined();
    });
    it('resolves for empty value like null', async () => {
      const rule = positiveNumberRule();
      await expect((rule as any).validator(null, null)).resolves.toBeUndefined();
    });
    it('treats zero as empty (falsy) and resolves', async () => {
      const rule = positiveNumberRule();
      await expect((rule as any).validator(null, 0)).resolves.toBeUndefined();
    });
    it('rejects for negative number', async () => {
      const rule = positiveNumberRule();
      await expect((rule as any).validator(null, -5)).rejects.toThrow('La valeur doit être un nombre positif');
    });
  });

  describe('codeFormatRule', () => {
    it('resolves for empty value', async () => {
      await expect((codeFormatRule() as any).validator(null, '')).resolves.toBeUndefined();
    });
    it('resolves for valid code', async () => {
      await expect((codeFormatRule() as any).validator(null, 'INF-01')).resolves.toBeUndefined();
    });
    it('rejects for invalid code', async () => {
      await expect((codeFormatRule('msg') as any).validator(null, 'bad code!')).rejects.toThrow('msg');
    });
  });

  describe('rangeRule', () => {
    it('resolves for value in range', async () => {
      await expect((rangeRule(1, 10) as any).validator(null, 5)).resolves.toBeUndefined();
    });
    it('resolves for empty value', async () => {
      await expect((rangeRule(1, 10) as any).validator(null, '')).resolves.toBeUndefined();
    });
    it('rejects for out of range', async () => {
      await expect((rangeRule(1, 10, 'msg') as any).validator(null, 20)).rejects.toThrow('msg');
    });
  });

  describe('noLeadingTrailingSpacesRule', () => {
    it('resolves for trimmed string', async () => {
      await expect((noLeadingTrailingSpacesRule() as any).validator(null, 'hello')).resolves.toBeUndefined();
    });
    it('rejects for leading space', async () => {
      await expect((noLeadingTrailingSpacesRule('msg') as any).validator(null, ' hello')).rejects.toThrow('msg');
    });
  });

  describe('confirmPasswordRule', () => {
    it('resolves when passwords match', async () => {
      const getFieldValue = vi.fn(() => 'pass');
      await expect((confirmPasswordRule(getFieldValue) as any).validator(null, 'pass')).resolves.toBeUndefined();
    });
    it('resolves for empty value', async () => {
      const getFieldValue = vi.fn(() => 'pass');
      await expect((confirmPasswordRule(getFieldValue) as any).validator(null, '')).resolves.toBeUndefined();
    });
    it('rejects when passwords differ', async () => {
      const getFieldValue = vi.fn(() => 'pass');
      await expect((confirmPasswordRule(getFieldValue, 'password', 'msg') as any).validator(null, 'diff')).rejects.toThrow('msg');
      expect(getFieldValue).toHaveBeenCalledWith('password');
    });
  });
});

describe('validators — combined rules', () => {
  describe('nomRules', () => {
    it('returns array of 4 rules', () => {
      const rules = nomRules();
      expect(rules).toHaveLength(4);
      expect(rules[0]).toMatchObject({ required: true });
    });
  });

  describe('codeRules', () => {
    it('returns array of 3 rules', () => {
      const rules = codeRules();
      expect(rules).toHaveLength(3);
    });
  });

  describe('descriptionRules', () => {
    it('returns array with maxLength rule', () => {
      const rules = descriptionRules();
      expect(rules).toHaveLength(1);
      expect((rules[0] as any).max).toBe(500);
    });
  });

  describe('emailRules', () => {
    it('returns array of 2 rules', () => {
      const rules = emailRules();
      expect(rules).toHaveLength(2);
      expect(rules[0]).toMatchObject({ required: true });
      expect(rules[1]).toMatchObject({ type: 'email' });
    });
  });
});




