import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SkillHeatmap from '@/redesign/components/charts/SkillHeatmap';
import type { HeatmapCell } from '@/redesign/contract';

const cells: HeatmapCell[] = [
  { department: 'Info', competenceId: 1, competenceName: 'Python', avgGap: 1.2, teachersCount: 10 },
  { department: 'Info', competenceId: 2, competenceName: 'SQL', avgGap: 0.4, teachersCount: 0 },
  { department: 'Math', competenceId: 1, competenceName: 'Python', avgGap: 0.8, teachersCount: 5 },
];

describe('SkillHeatmap', () => {
  it('affiche le skeleton en loading sans données', () => {
    const { container } = render(
      <SkillHeatmap cells={[]} loading selected={null} onCellClick={vi.fn()} />,
    );
    expect(container.querySelector('.rd-skel-block')).toBeInTheDocument();
  });
  it('affiche un message vide sans cellules', () => {
    render(<SkillHeatmap cells={[]} loading={false} selected={null} onCellClick={vi.fn()} />);
    expect(screen.getByText('Aucun écart de compétence calculé')).toBeInTheDocument();
  });
  it('affiche les départements et compétences', () => {
    render(<SkillHeatmap cells={cells} loading={false} selected={null} onCellClick={vi.fn()} />);
    expect(screen.getByText('Info')).toBeInTheDocument();
    expect(screen.getByText('Math')).toBeInTheDocument();
    expect(screen.getByText('Python')).toBeInTheDocument();
    expect(screen.getByText('SQL')).toBeInTheDocument();
  });
  it('déclenche onCellClick au clic sur une cellule', () => {
    const onCellClick = vi.fn();
    render(
      <SkillHeatmap cells={cells} loading={false} selected={null} onCellClick={onCellClick} />,
    );
    const btn = screen.getByTitle(/Info · Python/);
    fireEvent.click(btn);
    expect(onCellClick).toHaveBeenCalledWith('Info', 1, 'Python');
  });
  it('marque la cellule sélectionnée', () => {
    render(
      <SkillHeatmap
        cells={cells}
        loading={false}
        selected={{ department: 'Info', competenceId: 1 }}
        onCellClick={vi.fn()}
      />,
    );
    expect(screen.getByTitle(/Info · Python/).className).toContain('selected');
  });
});
