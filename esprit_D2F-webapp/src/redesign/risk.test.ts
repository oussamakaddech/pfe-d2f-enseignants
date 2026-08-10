import { describe, it, expect } from 'vitest';
import {
  getRiskScore,
  riskPct,
  riskLevel,
  riskStyleFor,
  RISK_LABELS,
  RISK_COLORS,
  RISK_ORDER,
  riskSeverityScore,
  toCoveragePercent,
  decodeSignals,
} from '@/redesign/risk';

describe('getRiskScore', () => {
  it('lit attrition_risk_score normalisé 0-1', () => {
    expect(getRiskScore({ attrition_risk_score: 0.72 })).toBe(0.72);
  });
  it('lit score_risque 0-100 et normalise en 0-1', () => {
    expect(getRiskScore({ score_risque: 72 })).toBeCloseTo(0.72);
  });
  it('lit riskScore', () => {
    expect(getRiskScore({ riskScore: 0.4 })).toBe(0.4);
  });
  it('priorité à attrition_risk_score', () => {
    expect(getRiskScore({ attrition_risk_score: 0.1, score_risque: 50 })).toBe(0.1);
  });
  it('retourne null pour null/undefined', () => {
    expect(getRiskScore({})).toBeNull();
    expect(getRiskScore({ score_risque: null })).toBeNull();
  });
  it('retourne null pour NaN', () => {
    expect(getRiskScore({ score_risque: Number.NaN })).toBeNull();
  });
  it('borne un score hors [0,1]', () => {
    expect(getRiskScore({ score_risque: 250 })).toBe(1);
    expect(getRiskScore({ score_risque: -3 })).toBe(0);
  });
});

describe('riskPct', () => {
  it('convertit 0-1 en pourcentage arrondi', () => {
    expect(riskPct(0.7234)).toBe(72);
  });
  it('gère null comme 0', () => {
    expect(riskPct(null as unknown as number)).toBe(0);
  });
});

describe('riskLevel', () => {
  it('classifie les niveaux', () => {
    expect(riskLevel(0.2)).toBe('FAIBLE');
    expect(riskLevel(0.39)).toBe('MODERE');
    expect(riskLevel(0.4)).toBe('MODERE');
    expect(riskLevel(0.5)).toBe('ELEVE');
    expect(riskLevel(0.59)).toBe('ELEVE');
    expect(riskLevel(0.6)).toBe('ELEVE');
    expect(riskLevel(0.74)).toBe('ELEVE');
    expect(riskLevel(0.79)).toBe('CRITIQUE');
    expect(riskLevel(0.8)).toBe('CRITIQUE');
  });
});

describe('riskStyleFor', () => {
  it('retourne un style avec label et couleur', () => {
    const s = riskStyleFor(0.9);
    expect(s.color).toBe('#ef4444');
    expect(s.label).toBe('Critique');
  });
});

describe('RISK_LABELS / RISK_COLORS / RISK_ORDER', () => {
  it('mappe les clés', () => {
    expect(RISK_LABELS.CRITIQUE).toBe('Critique');
    expect(RISK_COLORS.FAIBLE).toBe('#10b981');
    expect(RISK_ORDER).toEqual(['CRITIQUE', 'ELEVE', 'MODERE', 'FAIBLE']);
  });
});

describe('riskSeverityScore', () => {
  it('retourne -1 pour null', () => {
    expect(riskSeverityScore(null)).toBe(-1);
  });
  it('retourne le pourcentage', () => {
    expect(riskSeverityScore(0.86)).toBe(86);
  });
});

describe('toCoveragePercent', () => {
  it('convertit 0-1 en pourcentage', () => {
    expect(toCoveragePercent(0.42)).toBe(42);
  });
  it('laisse passer 0-100', () => {
    expect(toCoveragePercent(42)).toBe(42);
  });
  it('retourne null pour null/undefined/NaN', () => {
    expect(toCoveragePercent(null)).toBeNull();
    expect(toCoveragePercent(undefined)).toBeNull();
    expect(toCoveragePercent(Number.NaN)).toBeNull();
  });
  it('borne le résultat', () => {
    expect(toCoveragePercent(250)).toBe(100);
  });
});

describe('decodeSignals', () => {
  it('traduit les clés connues', () => {
    expect(decodeSignals(['stagnation', 'gaps_critiques'])).toEqual([
      'Stagnation des compétences',
      'Écarts critiques',
    ]);
  });
  it('laisse passer un libellé inconnu', () => {
    expect(decodeSignals(['xyz'])).toEqual(['xyz']);
  });
  it('retourne [] pour null/vide', () => {
    expect(decodeSignals(null)).toEqual([]);
    expect(decodeSignals([])).toEqual([]);
  });
});
