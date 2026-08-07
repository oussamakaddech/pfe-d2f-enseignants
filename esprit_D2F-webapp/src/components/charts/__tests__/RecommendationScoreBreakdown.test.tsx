import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import RecommendationScoreBreakdown from '../RecommendationScoreBreakdown';
import type { Recommendation } from '@/models/analyse';

const reco: Recommendation = {
  id: 1,
  formation_id: 10,
  formation_titre: 'Formation Python',
  formation_type: 'INTERNE',
  competence_id: 1,
  score_global: 0.8,
  score_pertinence: 0.9,
  score_reussite: 0.7,
  score_disponibilite: 0.6,
  probabilite_reussite: 0.85,
  rang_dans_parcours: 1,
  justification: 'utile',
  statut: 'PROPOSEE',
  facteurs_score: {
    pertinence: 0.9,
    reussite: 0.7,
    disponibilite: 0.6,
    pairs: 0.4,
    confiance: 0.88,
  },
};

describe('RecommendationScoreBreakdown', () => {
  it('renders the MSAS scoring title', () => {
    render(<RecommendationScoreBreakdown recommendation={reco} />);
    expect(screen.getByText(/Scoring avancé \(MSAS\)/i)).toBeInTheDocument();
  });

  it('renders each factor label with a percentage', () => {
    render(<RecommendationScoreBreakdown recommendation={reco} />);
    expect(screen.getByText('Pertinence')).toBeInTheDocument();
    expect(screen.getByText('Réussite')).toBeInTheDocument();
    expect(screen.getByText('Disponibilité')).toBeInTheDocument();
    expect(screen.getByText('Pairs')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument();
  });

  it('renders confidence when present', () => {
    render(<RecommendationScoreBreakdown recommendation={reco} />);
    expect(screen.getByText(/Confiance du score : 88%/i)).toBeInTheDocument();
  });

  it('shows em dash for null factor values', () => {
    const noFactors: Recommendation = { ...reco, facteurs_score: { pertinence: 0.5 } };
    render(<RecommendationScoreBreakdown recommendation={noFactors} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
