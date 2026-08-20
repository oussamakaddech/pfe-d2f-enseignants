import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import RiskScoreCard from '@/components/analytics/RiskScoreCard';
import type { RiskScore } from '@/models/analyse/analyticsFeature';

const base: RiskScore = {
  enseignant_id: 'T1',
  enseignant_nom: 'Test Teacher',
  score: 0.82,
  score_percent: 82,
  niveau: 'CRITIQUE',
  level_label: 'Critique',
  facteurs: [],
  tendance: 'DEGRADATION',
  precedent_score: 0.7,
  computed_at: new Date().toISOString(),
};

describe('RiskScoreCard', () => {
  it('affiche le niveau de risque fourni par le backend', () => {
    render(<RiskScoreCard risk={base} />);
    expect(screen.getByText('Critique')).toBeTruthy();
  });

  it('affiche le score en pourcentage (contractuel : 76 % + Modéré)', () => {
    render(
      <RiskScoreCard
        risk={{
          ...base,
          score: 0.76,
          score_percent: 76,
          niveau: 'MODERE',
          level_label: 'Modéré',
        }}
      />,
    );
    expect(screen.getByText('76%')).toBeTruthy();
    expect(screen.getByText('Modéré')).toBeTruthy();
  });

  it("gère l'absence de données sans planter", () => {
    render(<RiskScoreCard risk={undefined} />);
    expect(screen.getByText('Faible')).toBeTruthy();
  });
});
