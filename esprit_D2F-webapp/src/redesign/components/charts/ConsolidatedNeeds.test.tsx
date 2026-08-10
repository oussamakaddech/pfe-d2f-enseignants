import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ConsolidatedNeeds from '@/redesign/components/charts/ConsolidatedNeeds';
import type { GapHeatmapCell } from '@/models/analyse';

function cell(departement: string, avg_gap: number): GapHeatmapCell {
  return {
    departement,
    competence_id: 1,
    competence_nom: 'Python',
    avg_gap,
    enseignants_count: 5,
  } as GapHeatmapCell;
}

describe('ConsolidatedNeeds', () => {
  it('affiche le skeleton en loading sans données', () => {
    const { container } = render(<ConsolidatedNeeds cells={[]} loading />);
    expect(container.querySelector('.rd-skel-block')).toBeInTheDocument();
  });
  it('affiche un message vide sans données', () => {
    render(<ConsolidatedNeeds cells={[]} loading={false} />);
    expect(screen.getByText('Aucun besoin consolidé')).toBeInTheDocument();
  });
  it("agrège par département et déduit l'action", () => {
    render(<ConsolidatedNeeds cells={[cell('Info', 2.5), cell('Math', 0.5)]} loading={false} />);
    expect(screen.getByText('Info')).toBeInTheDocument();
    expect(screen.getByText('Math')).toBeInTheDocument();
    expect(screen.getByText('Plan de formation prioritaire')).toBeInTheDocument();
    expect(screen.getByText('Surveillance')).toBeInTheDocument();
  });
});
