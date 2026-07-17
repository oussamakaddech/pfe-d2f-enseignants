import { describe, it, expect } from 'vitest';
import {
  TYPE_SAVOIR_OPTIONS,
  NIVEAU_SAVOIR_OPTIONS,
  NIVEAU_LABELS,
  NIVEAU_OPTIONS,
} from './competenceOptions';

describe('competenceOptions', () => {
  it('exposes type savoir options', () => {
    expect(TYPE_SAVOIR_OPTIONS).toEqual(['THEORIQUE', 'PRATIQUE']);
  });

  it('has five niveau options with value/label/color', () => {
    expect(NIVEAU_SAVOIR_OPTIONS).toHaveLength(5);
    NIVEAU_SAVOIR_OPTIONS.forEach((o) => {
      expect(o).toHaveProperty('value');
      expect(o).toHaveProperty('label');
      expect(o).toHaveProperty('color');
    });
  });

  it('NIVEAU_LABELS maps each level to label and hex color', () => {
    expect(NIVEAU_LABELS.N1_DEBUTANT.label).toBe('N1 – Débutant');
    expect(NIVEAU_LABELS.N5_EXPERT.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(Object.keys(NIVEAU_LABELS)).toHaveLength(5);
  });

  it('NIVEAU_OPTIONS is the same reference as NIVEAU_SAVOIR_OPTIONS', () => {
    expect(NIVEAU_OPTIONS).toBe(NIVEAU_SAVOIR_OPTIONS);
  });
});
