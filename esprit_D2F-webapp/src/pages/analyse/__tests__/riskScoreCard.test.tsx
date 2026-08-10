import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import RiskScoreCard from '@/components/analytics/RiskScoreCard';
import { scoreToRiskLevel } from '@/utils/analytics/format';
import type { RiskScore } from '@/models/analyse/analyticsFeature';

describe('scoreToRiskLevel', () => {
  it('catégorise correctement un score nul', () => {
    expect(scoreToRiskLevel(0)).toBe('FAIBLE');
  });
  it('catégorise un score critique', () => {
    expect(scoreToRiskLevel(0.8)).toBe('CRITIQUE');
  });
  it('catégorise un score élevé', () => {
    expect(scoreToRiskLevel(0.6)).toBe('ELEVE');
  });
  it('catégorise un score modéré', () => {
    expect(scoreToRiskLevel(0.3)).toBe('MODERE');
  });
});

describe('RiskScoreCard', () => {
  const base: RiskScore = {
    enseignant_id: 'T1',
    enseignant_nom: 'Test Teacher',
    score: 0.82,
    niveau: 'CRITIQUE',
    facteurs: [],
    tendance: 'DEGRADATION',
    precedent_score: 0.7,
    computed_at: new Date().toISOString(),
  };

  it('affiche le niveau de risque', () => {
    render(<RiskScoreCard risk={base} />);
    expect(screen.getByText('Critique')).toBeTruthy();
  });

  it('affiche le score en pourcentage', () => {
    render(<RiskScoreCard risk={base} />);
    expect(screen.getByText('82%')).toBeTruthy();
  });

  it("gère l'absence de données sans planter", () => {
    render(<RiskScoreCard risk={undefined} />);
    expect(screen.getByText('Faible')).toBeTruthy();
  });
});
