import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import RiskFactorRow from '@/components/analytics/RiskFactorRow';
import type { RiskFactor } from '@/models/analyse/analyticsFeature';

const marwaFactor: RiskFactor = {
  nom: 'Gaps critiques',
  code: 'critical_gaps',
  valeur_brute: 12,
  valeur_normalisee: 1,
  poids: 0.5,
  contribution: 0.5,
  contribution_percent: 50,
  explication: 'expl',
  categorie: 'FACTEUR',
};

describe('RiskFactorRow', () => {
  it('affiche « valeur 12 » et « contribution 50% » pour 12 gaps critiques', () => {
    render(<RiskFactorRow facteur={marwaFactor} />);
    expect(screen.getByText(/valeur 12/)).toBeInTheDocument();
    expect(screen.getByText(/contribution 50%/)).toBeInTheDocument();
  });

  it("n'affiche jamais 300% ni 3.000 (contribution bornée)", () => {
    render(<RiskFactorRow facteur={marwaFactor} />);
    expect(screen.queryByText(/300%/)).not.toBeInTheDocument();
    expect(screen.queryByText(/3\.000/)).not.toBeInTheDocument();
    expect(screen.queryByText(/contribution 0\.5/)).not.toBeInTheDocument();
  });

  it('la barre de progression est bornée à 100%', () => {
    render(<RiskFactorRow facteur={marwaFactor} />);
    const fill = document.querySelector('.at-factor-bar-fill');
    expect(fill).not.toBeNull();
    expect((fill as HTMLElement).style.width).toBe('50%');
  });

  it('affiche une valeur brute décimale arrondie à 2 chiffres', () => {
    render(
      <RiskFactorRow
        facteur={{
          ...marwaFactor,
          code: 'avg_gap_score',
          nom: 'Profondeur moyenne des gaps',
          valeur_brute: 0.83333,
          contribution: 0.3333,
          contribution_percent: 33,
        }}
      />,
    );
    expect(screen.getByText(/valeur 0\.83/)).toBeInTheDocument();
    expect(screen.getByText(/contribution 33%/)).toBeInTheDocument();
  });

  it('affiche le label et le scope séparément (jamais concaténés)', () => {
    render(
      <RiskFactorRow
        facteur={{
          ...marwaFactor,
          nom: 'Gaps critiques',
          scope: 'DEPARTMENT',
          scope_type: 'DEPARTMENT',
          scope_id: 'DEP_RESEAUX',
          scope_label: 'Département Réseaux',
        }}
      />,
    );
    // Le label est TOUJOURS « Gaps critiques » — le scope est séparé.
    expect(screen.getByText('Gaps critiques')).toBeInTheDocument();
    expect(screen.getByText('Périmètre : Département Réseaux')).toBeInTheDocument();
    // Non-régression : jamais de concaténation label+scope ni de « périmètrepérimètre ».
    expect(
      screen.queryByText('Gaps critiques — Périmètre : Département Réseaux'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/périmètrepérimètre/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Gaps critiques du périmètre/)).not.toBeInTheDocument();
  });

  it("n'affiche aucun badge de périmètre si le backend n'en fournit pas", () => {
    render(<RiskFactorRow facteur={marwaFactor} />);
    expect(screen.queryByText(/périmètre :/)).not.toBeInTheDocument();
  });
});
