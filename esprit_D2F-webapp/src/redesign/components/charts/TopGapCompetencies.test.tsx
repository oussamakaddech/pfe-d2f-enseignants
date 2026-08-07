import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TopGapCompetencies from '@/redesign/components/charts/TopGapCompetencies';
import type { HeatmapCell } from '@/redesign/contract';

const cells: HeatmapCell[] = [
  { department: 'Info', competenceId: 1, competenceName: 'Python', avgGap: 2.5, teachersCount: 30 },
  { department: 'Info', competenceId: 2, competenceName: 'SQL', avgGap: 1.0, teachersCount: 12 },
  { department: 'Math', competenceId: 3, competenceName: 'Analyse', avgGap: 0.5, teachersCount: 8 },
];

describe('TopGapCompetencies', () => {
  it('affiche le skeleton en loading sans données', () => {
    const { container } = render(<TopGapCompetencies cells={[]} loading />);
    expect(container.querySelector('.rd-skel-block')).toBeInTheDocument();
  });
  it('affiche un message vide sans cellules', () => {
    render(<TopGapCompetencies cells={[]} loading={false} />);
    expect(screen.getByText('Aucun écart de compétence calculé')).toBeInTheDocument();
  });
  it('trie par écart décroissant', () => {
    render(<TopGapCompetencies cells={cells} loading={false} />);
    const rows = screen.getAllByText(/Python|SQL|Analyse/);
    expect(rows[0].textContent).toBe('Python');
  });
  it('filtre par département via le select', () => {
    render(<TopGapCompetencies cells={cells} loading={false} />);
    fireEvent.change(screen.getByLabelText(/Département/), { target: { value: 'Math' } });
    expect(screen.getByText('Analyse')).toBeInTheDocument();
    expect(screen.queryByText('Python')).not.toBeInTheDocument();
  });
});
