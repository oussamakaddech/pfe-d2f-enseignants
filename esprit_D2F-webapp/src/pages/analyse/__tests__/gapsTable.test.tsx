import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import GapsTable from '@/components/analytics/GapsTable';
import type { SkillGap } from '@/models/analyse/analyticsFeature';

const gap: SkillGap = {
  id: 1,
  competence_id: 10,
  competence_code: 'C1',
  competence_nom: 'Python',
  domaine_nom: 'DEV',
  observed_result: 2,
  knowledge_difficulty_level: 4,
  gap_score: 0.5,
  priorite_score: 1,
  niveau_urgence: 'HAUTE',
  mois_stagnation: 3,
  en_regression: true,
  nb_besoins_exprimes: 2,
  justification: null,
  computed_at: '2024-01-01',
};

describe('GapsTable', () => {
  it('affiche un message vide sans gaps', () => {
    render(<GapsTable gaps={[]} />);
    expect(screen.getByText(/Aucun gap détecté/i)).toBeInTheDocument();
  });

  it('affiche les gaps avec compétence et urgence', () => {
    render(<GapsTable gaps={[gap]} />);
    expect(screen.getByText('Python')).toBeInTheDocument();
    expect(screen.getByText('HAUTE')).toBeInTheDocument();
  });

  it("n'affiche pas le niveau de compétence du référentiel", () => {
    render(<GapsTable gaps={[gap]} />);
    expect(screen.queryByText('Niveau actuel')).not.toBeInTheDocument();
    expect(screen.queryByText('Niveau requis')).not.toBeInTheDocument();
    expect(screen.queryByText('2 / 4')).not.toBeInTheDocument();
  });

  it("n'affiche pas le libellé Manquante, même avec observed_result = 0", () => {
    render(<GapsTable gaps={[{ ...gap, observed_result: 0 }]} />);
    expect(screen.queryByText('Manquante')).not.toBeInTheDocument();
    expect(screen.queryByText('Python')).toBeInTheDocument();
  });

  it('appelle onRowClick au clic', () => {
    const onClick = vi.fn();
    render(<GapsTable gaps={[gap]} onRowClick={onClick} />);
    screen.getByText('Python').click();
    expect(onClick).toHaveBeenCalledWith(gap);
  });
});
