import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import RiskCompass from '@/redesign/components/charts/RiskCompass';
import type { RiskDistribution } from '@/redesign/contract';

const dist: RiskDistribution = {
  total: 100,
  byLevel: { CRITIQUE: 5, ELEVE: 10, MODERE: 20, FAIBLE: 65 },
  byDepartment: [],
};

describe('RiskCompass', () => {
  it('affiche le skeleton en loading sans données', () => {
    const { container } = render(<RiskCompass data={null} loading />);
    expect(container.querySelector('.rd-skel-block')).toBeInTheDocument();
  });
  it('affiche un message vide si total=0', () => {
    render(
      <RiskCompass
        data={{
          total: 0,
          byLevel: { CRITIQUE: 0, ELEVE: 0, MODERE: 0, FAIBLE: 0 },
          byDepartment: [],
        }}
        loading={false}
      />,
    );
    expect(screen.getByText('Aucun enseignant classé')).toBeInTheDocument();
  });
  it('affiche le total et les libellés de niveaux', () => {
    render(<RiskCompass data={dist} loading={false} />);
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('Critique')).toBeInTheDocument();
    expect(screen.getByText('Faible')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });
});
