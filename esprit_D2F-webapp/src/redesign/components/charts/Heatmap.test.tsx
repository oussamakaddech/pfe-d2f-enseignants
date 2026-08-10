import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import Heatmap, { gapSeverityColor, gapSeverityLabel } from '@/redesign/components/charts/Heatmap';
import type { GapHeatmapCell } from '@/models/analyse';

function cell(
  departement: string,
  competence_id: number,
  competence_nom: string,
  avg_gap: number,
): GapHeatmapCell {
  return {
    departement,
    competence_id,
    competence_nom,
    avg_gap,
    enseignants_count: 5,
  } as GapHeatmapCell;
}

const cells = [
  cell('Info', 1, 'Python', 2.1),
  cell('Info', 2, 'SQL', 0.5),
  cell('Math', 1, 'Python', 1.0),
];

describe('Heatmap', () => {
  it('affiche le skeleton en loading sans données', () => {
    const { container } = render(<Heatmap cells={[]} loading />);
    expect(container.querySelector('.rd-skel-block')).toBeInTheDocument();
  });
  it('affiche un message vide sans cellules', () => {
    render(<Heatmap cells={[]} loading={false} />);
    expect(screen.getByText('Aucun écart de compétence calculé')).toBeInTheDocument();
  });
  it('affiche les départements et compétences', () => {
    render(<Heatmap cells={cells} loading={false} />);
    expect(screen.getByText('Info')).toBeInTheDocument();
    expect(screen.getByText('Math')).toBeInTheDocument();
    expect(screen.getByText('Python')).toBeInTheDocument();
    expect(screen.getByText('SQL')).toBeInTheDocument();
  });
  it('déclenche onSelectDept au clic sur un département', () => {
    const onSelectDept = vi.fn();
    render(<Heatmap cells={cells} loading={false} onSelectDept={onSelectDept} />);
    fireEvent.click(screen.getByText('Info'));
    expect(onSelectDept).toHaveBeenCalledWith('Info');
  });
  it('dimme les autres départements quand highlightDept fourni', () => {
    render(<Heatmap cells={cells} loading={false} highlightDept="Math" onSelectDept={vi.fn()} />);
    expect(screen.getByText('Info').className).toContain('dim');
    expect(screen.getByText('Math').className).not.toContain('dim');
  });

  it("rend les cellules avec la valeur d'écart et la couleur de sévérité", () => {
    const { container } = render(<Heatmap cells={cells} loading={false} />);
    expect(screen.getByText('2.1')).toBeInTheDocument();
    expect(screen.getByText('1.0')).toBeInTheDocument();
    expect(screen.getByText('0.5')).toBeInTheDocument();
    const cellsEls = container.querySelectorAll('.rd-heat-cell:not(.empty)');
    expect(cellsEls).toHaveLength(3);
    expect(cellsEls[0].getAttribute('style')).toContain('rgb(239, 68, 68)');
    expect(cellsEls[1].getAttribute('style')).toContain('rgb(245, 158, 11)');
    expect(cellsEls[2].getAttribute('style')).toContain('rgb(249, 115, 22)');
  });

  it('affiche une cellule vide quand la compétence est absente pour un département', () => {
    render(<Heatmap cells={cells} loading={false} />);
    expect(document.querySelectorAll('.rd-heat-cell.empty').length).toBeGreaterThan(0);
  });

  it("affiche le titre au survol d'une cellule", () => {
    render(<Heatmap cells={cells} loading={false} />);
    const cellEl = screen.getByText('2.1').closest('.rd-heat-cell') as HTMLElement;
    expect(cellEl.getAttribute('title')).toContain('Info · Python');
    expect(cellEl.getAttribute('title')).toContain('Écart moyen: 2.10');
  });

  it('ne fournit pas de callback de filtre au bouton département sans onSelectDept', () => {
    render(<Heatmap cells={cells} loading={false} />);
    const btn = screen.getByText('Info') as HTMLButtonElement;
    expect(btn.getAttribute('title')).toBeNull();
    fireEvent.click(btn);
    expect(btn.className).not.toContain('dim');
  });

  it("affiche l'échelle de couleur", () => {
    render(<Heatmap cells={cells} loading={false} />);
    expect(screen.getByText('Écart faible')).toBeInTheDocument();
    expect(screen.getByText('Écart critique')).toBeInTheDocument();
  });

  it('gapSeverityColor et gapSeverityLabel couvrent les seuils', () => {
    expect(gapSeverityColor(3)).toBe('#ef4444');
    expect(gapSeverityColor(1.5)).toBe('#f97316');
    expect(gapSeverityColor(0.7)).toBe('#f59e0b');
    expect(gapSeverityColor(0.3)).toBe('#84cc16');
    expect(gapSeverityColor(0.1)).toBe('#10b981');
    expect(gapSeverityLabel(2.5)).toBe('Critique');
    expect(gapSeverityLabel(1.2)).toBe('Élevé');
    expect(gapSeverityLabel(0.6)).toBe('Modéré');
    expect(gapSeverityLabel(0.1)).toBe('Faible');
  });
});
