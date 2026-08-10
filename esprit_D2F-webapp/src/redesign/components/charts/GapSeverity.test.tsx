import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import GapSeverity from '@/redesign/components/charts/GapSeverity';
import type { GapHeatmapCell } from '@/models/analyse';

function cell(avg_gap: number): GapHeatmapCell {
  return {
    departement: 'Info',
    competence_id: 1,
    competence_nom: 'Python',
    avg_gap,
    enseignants_count: 5,
  } as GapHeatmapCell;
}

describe('GapSeverity', () => {
  it('affiche le skeleton en loading sans données', () => {
    const { container } = render(<GapSeverity cells={[]} loading />);
    expect(container.querySelector('.rd-skel-block')).toBeInTheDocument();
  });
  it('affiche un message vide sans cellules', () => {
    render(<GapSeverity cells={[]} loading={false} />);
    expect(screen.getByText('Aucun écart calculé')).toBeInTheDocument();
  });
  it('compte les buckets et affiche le total', () => {
    render(<GapSeverity cells={[cell(2.5), cell(1.2), cell(0.6), cell(0.1)]} loading={false} />);
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('Critique')).toBeInTheDocument();
    expect(screen.getByText('Élevé')).toBeInTheDocument();
    expect(screen.getByText('Modéré')).toBeInTheDocument();
    expect(screen.getByText('Faible')).toBeInTheDocument();
  });
});
