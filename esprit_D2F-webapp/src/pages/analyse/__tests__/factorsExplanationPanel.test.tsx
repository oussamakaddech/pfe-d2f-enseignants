import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import FactorsExplanationPanel from '@/components/analytics/FactorsExplanationPanel';
import type { RiskFactor } from '@/models/analyse/analyticsFeature';

const baseFactor = (overrides: Partial<RiskFactor> = {}): RiskFactor => ({
  nom: 'Stagnation',
  code: 'stagnation',
  valeur_brute: 1,
  valeur_normalisee: 1,
  poids: 0.4,
  contribution: 0.2,
  contribution_percent: 20,
  explication: 'expl',
  categorie: 'FACTEUR',
  ...overrides,
});

describe('FactorsExplanationPanel', () => {
  it('affiche un message quand aucun facteur', () => {
    render(<FactorsExplanationPanel facteurs={[]} />);
    expect(screen.getByText(/Aucun facteur disponible/i)).toBeInTheDocument();
  });

  it('affiche le nom et le poids de chaque facteur', () => {
    const facteurs: RiskFactor[] = [baseFactor()];
    render(<FactorsExplanationPanel facteurs={facteurs} />);
    expect(screen.getByText('Stagnation')).toBeInTheDocument();
    expect(screen.getByText(/poids 40%/)).toBeInTheDocument();
  });

  it('affiche « valeur X · contribution Y% » (jamais 3.000 ni 300%)', () => {
    const facteurs: RiskFactor[] = [
      baseFactor({
        nom: 'Gaps critiques',
        code: 'critical_gaps',
        valeur_brute: 12,
        valeur_normalisee: 1,
        poids: 0.5,
        contribution: 0.5,
        contribution_percent: 50,
      }),
    ];
    render(<FactorsExplanationPanel facteurs={facteurs} />);
    expect(screen.getByText(/valeur 12 · contribution 50%/)).toBeInTheDocument();
    expect(screen.queryByText(/3\.000/)).not.toBeInTheDocument();
    expect(screen.queryByText(/300%/)).not.toBeInTheDocument();
    expect(screen.queryByText(/contribution 0\.5/)).not.toBeInTheDocument();
  });

  it('sépare les probabilités ML des facteurs du score', () => {
    const facteurs: RiskFactor[] = [
      baseFactor({
        nom: 'Probabilité classe Critique',
        code: 'CRITICAL_proba',
        valeur_brute: 0.73,
        valeur_normalisee: 0.73,
        poids: 0.018,
        contribution: 0.64,
        contribution_percent: 64,
        categorie: 'PROBABILITE_ML',
      }),
      baseFactor(),
    ];
    render(<FactorsExplanationPanel facteurs={facteurs} />);
    expect(screen.getByText('Classifier ML')).toBeInTheDocument();
    expect(screen.getByText('Facteurs du score')).toBeInTheDocument();
    expect(screen.getByText('73% (prob.)')).toBeInTheDocument();
    expect(screen.queryByText('poids 2%')).not.toBeInTheDocument();
    expect(screen.queryByText('Probabilités ML (classifier)')).not.toBeInTheDocument();
  });

  it('affiche la classe ML la plus probable et la note de séparation score métier / classifier', () => {
    const facteurs: RiskFactor[] = [
      baseFactor({
        nom: 'Probabilité classe Critique',
        code: 'CRITICAL_proba',
        valeur_brute: 0.2,
        valeur_normalisee: 0.2,
        poids: 0.018,
        contribution: 0.64,
        contribution_percent: 64,
        categorie: 'PROBABILITE_ML',
      }),
      baseFactor({
        nom: 'Probabilité classe Modérée',
        code: 'MEDIUM_proba',
        valeur_brute: 0.6,
        valeur_normalisee: 0.6,
        poids: 0.018,
        contribution: 0.64,
        contribution_percent: 64,
        categorie: 'PROBABILITE_ML',
      }),
    ];
    render(<FactorsExplanationPanel facteurs={facteurs} />);
    expect(screen.getByText('Classe ML la plus probable : Modérée')).toBeInTheDocument();
    expect(screen.getByText(/provient du score métier pondéré/)).toBeInTheDocument();
    expect(screen.getByText(/estime uniquement des probabilités de classes/)).toBeInTheDocument();
  });
});
