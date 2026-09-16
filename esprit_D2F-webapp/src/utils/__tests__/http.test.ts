import { describe, expect, it } from 'vitest';
import {
  extractErrorMessage,
  extractStatusCode,
  isUnauthorized,
  isForbidden,
  isNotFound,
  paginationParams,
  extractPageData,
  buildQueryString,
} from "@/utils/helpers/http";

describe('http', () => {
  describe('extractErrorMessage', () => {
    it('returns fallback for falsy error', () => {
      expect(extractErrorMessage(null)).toBe('Une erreur est survenue. Veuillez réessayer.');
    });
    it('returns fallback with custom fallback', () => {
      expect(extractErrorMessage(null, 'custom')).toBe('custom');
    });
    it('extracts from response.data string', () => {
      const err = { response: { data: 'Erreur métier' } };
      expect(extractErrorMessage(err)).toBe('Erreur métier');
    });
    it('extracts from response.data.message', () => {
      const err = { response: { data: { message: 'msg' } } };
      expect(extractErrorMessage(err)).toBe('msg');
    });
    it('extracts from response.data.error', () => {
      const err = { response: { data: { error: 'err' } } };
      expect(extractErrorMessage(err)).toBe('err');
    });
    it('extracts from error.message', () => {
      const err = { message: 'network error' };
      expect(extractErrorMessage(err)).toBe('network error');
    });
    it('prefers data.message over data.error', () => {
      const err = { response: { data: { message: 'msg', error: 'err' } } };
      expect(extractErrorMessage(err)).toBe('msg');
    });
    it('returns fallback when nothing matches', () => {
      const err = { response: { data: { other: 'nope' } } };
      expect(extractErrorMessage(err, 'fb')).toBe('fb');
    });
  });

  describe('extractStatusCode', () => {
    it('returns status code', () => {
      expect(extractStatusCode({ response: { status: 404 } })).toBe(404);
    });
    it('returns null when no response', () => {
      expect(extractStatusCode({})).toBeNull();
    });
  });

  describe('isUnauthorized / isForbidden / isNotFound', () => {
    it('isUnauthorized returns true for 401', () => {
      expect(isUnauthorized({ response: { status: 401 } })).toBe(true);
      expect(isUnauthorized({ response: { status: 403 } })).toBe(false);
    });
    it('isForbidden returns true for 403', () => {
      expect(isForbidden({ response: { status: 403 } })).toBe(true);
    });
    it('isNotFound returns true for 404', () => {
      expect(isNotFound({ response: { status: 404 } })).toBe(true);
    });
  });

  describe('paginationParams', () => {
    it('uses defaults', () => {
      expect(paginationParams()).toEqual({ page: 0, size: 20 });
    });
    it('includes sort when provided', () => {
      expect(paginationParams({ sort: 'nom,asc' })).toEqual({ page: 0, size: 20, sort: 'nom,asc' });
    });
  });

  describe('extractPageData', () => {
    it('returns defaults for null/undefined', () => {
      const def = { content: [], totalElements: 0, totalPages: 0, currentPage: 0, pageSize: 20, isFirst: true, isLast: true };
      expect(extractPageData(null)).toEqual(def);
      expect(extractPageData(undefined)).toEqual(def);
      expect(extractPageData('string')).toEqual(def);
    });
    it('maps page response correctly', () => {
      const resp = { content: [1, 2], totalElements: 10, totalPages: 2, number: 1, size: 5, first: false, last: false };
      expect(extractPageData(resp)).toEqual({
        content: [1, 2],
        totalElements: 10,
        totalPages: 2,
        currentPage: 1,
        pageSize: 5,
        isFirst: false,
        isLast: false,
      });
    });
    it('uses fallback values for missing fields', () => {
      const resp = { content: null };
      const result = extractPageData(resp);
      expect(result.content).toEqual([]);
      expect(result.isFirst).toBe(true);
    });
  });

  describe('buildQueryString', () => {
    it('builds query string from params', () => {
      const qs = buildQueryString({ page: 0, size: 20, sort: 'nom,asc' });
      expect(qs).toContain('page=0');
      expect(qs).toContain('size=20');
      expect(qs).toContain('sort=nom%2Casc');
    });
    it('filters out null, undefined and empty strings', () => {
      const qs = buildQueryString({ a: 1, b: null, c: undefined, d: '' });
      expect(qs).toBe('a=1');
    });
    it('returns empty string for empty params', () => {
      expect(buildQueryString({})).toBe('');
    });
  });
});
