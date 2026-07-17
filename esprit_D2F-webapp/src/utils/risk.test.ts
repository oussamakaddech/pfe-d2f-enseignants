import { describe, it, expect } from 'vitest';
import {
  RISK_LEVELS,
  RISK_THRESHOLDS,
  SIGNAL_LABELS,
  riskLevelFromScore,
  riskStyle,
  decodeSignals,
} from './risk';

describe('risk', () => {
  describe('riskLevelFromScore', () => {
    it('returns FAIBLE below 25%', () => {
      expect(riskLevelFromScore(0)).toBe('FAIBLE');
      expect(riskLevelFromScore(0.24)).toBe('FAIBLE');
    });
    it('returns MODERE between 25% and 49%', () => {
      expect(riskLevelFromScore(0.25)).toBe('MODERE');
      expect(riskLevelFromScore(0.49)).toBe('MODERE');
    });
    it('returns ELEVE between 50% and 74%', () => {
      expect(riskLevelFromScore(0.5)).toBe('ELEVE');
      expect(riskLevelFromScore(0.74)).toBe('ELEVE');
    });
    it('returns CRITIQUE at 75% and above', () => {
      expect(riskLevelFromScore(0.75)).toBe('CRITIQUE');
      expect(riskLevelFromScore(1)).toBe('CRITIQUE');
    });
    it('handles nullish score as FAIBLE', () => {
      expect(riskLevelFromScore(undefined as unknown as number)).toBe('FAIBLE');
      expect(riskLevelFromScore(null as unknown as number)).toBe('FAIBLE');
    });
    it('rounds to nearest percent at boundaries', () => {
      expect(riskLevelFromScore(0.745)).toBe('CRITIQUE');
      expect(riskLevelFromScore(0.744)).toBe('ELEVE');
    });
  });

  describe('riskStyle', () => {
    it('returns the matching style object', () => {
      expect(riskStyle(0.8)).toBe(RISK_LEVELS.CRITIQUE);
      expect(riskStyle(0)).toBe(RISK_LEVELS.FAIBLE);
    });
    it('style has label/color/bg/text', () => {
      const s = riskStyle(0.6);
      expect(s.label).toBe('Élevé');
      expect(s.color).toBe('#f97316');
      expect(s.text).toBe('#ffffff');
    });
  });

  describe('RISK_THRESHOLDS', () => {
    it('is a descriptive string', () => {
      expect(typeof RISK_THRESHOLDS).toBe('string');
      expect(RISK_THRESHOLDS).toContain('Critique');
    });
  });

  describe('decodeSignals', () => {
    it('returns empty array for null/undefined/empty', () => {
      expect(decodeSignals(null)).toEqual([]);
      expect(decodeSignals(undefined)).toEqual([]);
      expect(decodeSignals([])).toEqual([]);
    });
    it('maps known keys to labels', () => {
      expect(decodeSignals(['no_training'])).toEqual([SIGNAL_LABELS.no_training]);
      expect(decodeSignals(['stagnation', 'inactivity'])).toEqual([
        'Stagnation des compétences',
        'Inactivité prolongée',
      ]);
    });
    it('passes through unknown keys unchanged', () => {
      expect(decodeSignals(['already readable'])).toEqual(['already readable']);
    });
    it('mixes known and unknown', () => {
      expect(decodeSignals(['unmet_needs', 'xyz'])).toEqual(['Besoins non couverts', 'xyz']);
    });
  });
});
