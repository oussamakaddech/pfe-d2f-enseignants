import { describe, it, expect } from 'vitest';
import { API_ENDPOINTS } from './index';

describe('API_ENDPOINTS', () => {
  it('exposes the expected endpoint paths', () => {
    expect(API_ENDPOINTS.FORMATION).toBe('/formation/formations');
    expect(API_ENDPOINTS.COMPETENCE).toBe('/competence');
    expect(API_ENDPOINTS.AUTH).toBe('/auth');
    expect(API_ENDPOINTS.BESOIN).toBe('/besoin-formation');
  });
  it('all endpoints start with a slash', () => {
    Object.values(API_ENDPOINTS).forEach((v) => {
      expect(v.startsWith('/')).toBe(true);
    });
  });
});
