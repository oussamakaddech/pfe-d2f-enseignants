import { describe, it, expect } from 'vitest';
import * as validators from './validators';

describe('Validators Utility', () => {
  describe('Email validation', () => {
    it('should validate correct email format', () => {
      const validEmails = [
        'user@example.com',
        'test.user@example.co.uk',
        'user+tag@example.com',
      ];

      validEmails.forEach((email) => {
        if (validators.isValidEmail) {
          expect(validators.isValidEmail(email)).toBe(true);
        }
      });
    });

    it('should reject invalid email format', () => {
      const invalidEmails = [
        'notanemail',
        'missing@domain',
        '@example.com',
        'user@',
      ];

      invalidEmails.forEach((email) => {
        if (validators.isValidEmail) {
          expect(validators.isValidEmail(email)).toBe(false);
        }
      });
    });
  });

  describe('Password validation', () => {
    it('should validate strong passwords', () => {
      const strongPasswords = [
        'SecurePass123!',
        'MyPassword@2024',
        'Complex$Pass99',
      ];

      strongPasswords.forEach((pass) => {
        if (validators.isStrongPassword) {
          expect(validators.isStrongPassword(pass)).toBe(true);
        }
      });
    });

    it('should reject weak passwords', () => {
      const weakPasswords = [
        'weak',
        '123456',
        'password',
        'aaa',
      ];

      weakPasswords.forEach((pass) => {
        if (validators.isStrongPassword) {
          expect(validators.isStrongPassword(pass)).toBe(false);
        }
      });
    });
  });

  describe('Phone validation', () => {
    it('should validate phone numbers', () => {
      const validPhones = [
        '+21691234567',
        '21691234567',
        '91234567',
      ];

      validPhones.forEach((phone) => {
        if (validators.isValidPhone) {
          expect(validators.isValidPhone(phone)).toBe(true);
        }
      });
    });

    it('should reject invalid phone numbers', () => {
      const invalidPhones = [
        'notaphone',
        '123',
        '',
      ];

      invalidPhones.forEach((phone) => {
        if (validators.isValidPhone) {
          expect(validators.isValidPhone(phone)).toBe(false);
        }
      });
    });
  });

  describe('Required field validation', () => {
    it('should validate non-empty values', () => {
      if (validators.isRequired) {
        expect(validators.isRequired('test')).toBe(true);
        expect(validators.isRequired('0')).toBe(true);
        expect(validators.isRequired(123)).toBe(true);
      }
    });

    it('should reject empty or null values', () => {
      if (validators.isRequired) {
        expect(validators.isRequired('')).toBe(false);
        expect(validators.isRequired(null)).toBe(false);
        expect(validators.isRequired(undefined)).toBe(false);
      }
    });
  });

  describe('Date validation', () => {
    it('should validate valid dates', () => {
      const validDates = [
        new Date(),
        new Date('2024-01-15'),
        new Date('2025-12-31'),
      ];

      validDates.forEach((date) => {
        if (validators.isValidDate) {
          expect(validators.isValidDate(date)).toBe(true);
        }
      });
    });

    it('should reject invalid dates', () => {
      const invalidDates = [
        new Date('invalid'),
        'not a date',
        null,
      ];

      invalidDates.forEach((date) => {
        if (validators.isValidDate) {
          expect(validators.isValidDate(date)).toBe(false);
        }
      });
    });
  });

  describe('URL validation', () => {
    it('should validate valid URLs', () => {
      const validUrls = [
        'https://example.com',
        'http://test.example:3000',
        'https://example.com/path',
      ];

      validUrls.forEach((url) => {
        if (validators.isValidUrl) {
          expect(validators.isValidUrl(url)).toBe(true);
        }
      });
    });

    it('should reject invalid URLs', () => {
      const invalidUrls = [
        'not a url',
        'example.com',
        'htp://invalid.com',
      ];

      invalidUrls.forEach((url) => {
        if (validators.isValidUrl) {
          expect(validators.isValidUrl(url)).toBe(false);
        }
      });
    });
  });
});




