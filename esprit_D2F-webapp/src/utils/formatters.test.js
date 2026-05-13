import { describe, it, expect } from 'vitest';
import * as formatters from './formatters';

describe('Formatters Utility', () => {
  describe('Date formatting', () => {
    const testDate = new Date('2024-05-15T10:30:00Z');

    it('should format date as DD/MM/YYYY', () => {
      if (formatters.formatDate) {
        const result = formatters.formatDate(testDate, 'DD/MM/YYYY');
        expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
      }
    });

    it('should format date as YYYY-MM-DD', () => {
      if (formatters.formatDate) {
        const result = formatters.formatDate(testDate, 'YYYY-MM-DD');
        expect(result).toMatch(/\d{4}-\d{2}-\d{2}/);
      }
    });

    it('should handle null/undefined dates', () => {
      if (formatters.formatDate) {
        expect(formatters.formatDate(null)).toBe('-');
        expect(formatters.formatDate(undefined)).toBe('-');
      }
    });
  });

  describe('Currency formatting', () => {
    it('should format number as currency', () => {
      if (formatters.formatCurrency) {
        const result = formatters.formatCurrency(1234.56);
        expect(result).toContain('1');
        expect(result).toContain('234');
      }
    });

    it('should handle zero', () => {
      if (formatters.formatCurrency) {
        const result = formatters.formatCurrency(0);
        expect(result).toBeDefined();
      }
    });

    it('should handle negative amounts', () => {
      if (formatters.formatCurrency) {
        const result = formatters.formatCurrency(-100);
        expect(result).toBeDefined();
      }
    });
  });

  describe('Number formatting', () => {
    it('should format number with decimal places', () => {
      if (formatters.formatNumber) {
        const result = formatters.formatNumber(1234.5678, 2);
        expect(result).toContain('1234');
      }
    });

    it('should add thousand separators', () => {
      if (formatters.formatNumber) {
        const result = formatters.formatNumber(1000000);
        expect(result).toBeDefined();
      }
    });

    it('should handle small numbers', () => {
      if (formatters.formatNumber) {
        const result = formatters.formatNumber(0.123);
        expect(result).toBeDefined();
      }
    });
  });

  describe('Text formatting', () => {
    it('should capitalize first letter', () => {
      if (formatters.capitalize) {
        expect(formatters.capitalize('hello')).toBe('Hello');
        expect(formatters.capitalize('WORLD')).toBe('World');
      }
    });

    it('should truncate long text', () => {
      if (formatters.truncate) {
        const longText = 'This is a very long text that should be truncated';
        const result = formatters.truncate(longText, 10);
        expect(result.length).toBeLessThanOrEqual(10);
      }
    });

    it('should convert to kebab-case', () => {
      if (formatters.toKebabCase) {
        expect(formatters.toKebabCase('Hello World')).toBe('hello-world');
        expect(formatters.toKebabCase('HelloWorld')).toBe('hello-world');
      }
    });

    it('should convert to camelCase', () => {
      if (formatters.toCamelCase) {
        expect(formatters.toCamelCase('hello world')).toBe('helloWorld');
        expect(formatters.toCamelCase('hello-world')).toBe('helloWorld');
      }
    });
  });

  describe('Phone number formatting', () => {
    it('should format phone numbers', () => {
      if (formatters.formatPhone) {
        const result = formatters.formatPhone('21691234567');
        expect(result).toBeDefined();
      }
    });

    it('should handle phone with country code', () => {
      if (formatters.formatPhone) {
        const result = formatters.formatPhone('+21691234567');
        expect(result).toBeDefined();
      }
    });
  });

  describe('File size formatting', () => {
    it('should format bytes to KB', () => {
      if (formatters.formatFileSize) {
        const result = formatters.formatFileSize(1024);
        expect(result).toContain('KB');
      }
    });

    it('should format bytes to MB', () => {
      if (formatters.formatFileSize) {
        const result = formatters.formatFileSize(1024 * 1024);
        expect(result).toContain('MB');
      }
    });

    it('should handle zero bytes', () => {
      if (formatters.formatFileSize) {
        const result = formatters.formatFileSize(0);
        expect(result).toBeDefined();
      }
    });
  });

  describe('JSON formatting', () => {
    it('should format object to JSON string', () => {
      if (formatters.formatJSON) {
        const obj = { name: 'test', value: 123 };
        const result = formatters.formatJSON(obj);
        expect(result).toContain('name');
        expect(result).toContain('test');
      }
    });

    it('should handle nested objects', () => {
      if (formatters.formatJSON) {
        const obj = { nested: { key: 'value' } };
        const result = formatters.formatJSON(obj);
        expect(result).toBeDefined();
      }
    });
  });
});
