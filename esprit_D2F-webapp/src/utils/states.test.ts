import { describe, it, expect } from 'vitest';
import { NA_CALC, NA_AVAIL, NA_DATA, LOADING } from './states';

describe('states', () => {
  it('exposes distinct human-readable labels', () => {
    expect(NA_CALC).toBe('Non calculable');
    expect(NA_AVAIL).toBe('Non disponible');
    expect(NA_DATA).toBe('Données insuffisantes');
    expect(LOADING).toBe('…');
  });
  it('all labels are unique', () => {
    const all = [NA_CALC, NA_AVAIL, NA_DATA, LOADING];
    expect(new Set(all).size).toBe(all.length);
  });
});
