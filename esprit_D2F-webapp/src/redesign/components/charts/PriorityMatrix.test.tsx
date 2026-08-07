import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import PriorityMatrix from '@/redesign/components/charts/PriorityMatrix';

describe('PriorityMatrix', () => {
  it('affiche un message vide sans items', () => {
    render(<PriorityMatrix items={[]} />);
    expect(screen.getByText('Aucun besoin à prioriser')).toBeInTheDocument();
  });
  it('affiche la légende des quadrants et le svg', () => {
    const { container } = render(
      <PriorityMatrix items={[{ id: 1, label: 'Python', urgency: 4, impact: 4, count: 12 }]} />,
    );
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(screen.getByText('Action immédiate')).toBeInTheDocument();
    expect(screen.getByText('Planifier')).toBeInTheDocument();
    expect(screen.getByText('Surveiller')).toBeInTheDocument();
    expect(screen.getByText('Réalisable')).toBeInTheDocument();
  });
  it('affiche la valeur count dans la bulle', () => {
    render(
      <PriorityMatrix items={[{ id: 1, label: 'Python', urgency: 4, impact: 4, count: 12 }]} />,
    );
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it("rend plusieurs items et les titres d'axes", () => {
    const { container } = render(
      <PriorityMatrix
        items={[
          { id: 1, label: 'A', urgency: 1, impact: 1, count: 2 },
          { id: 2, label: 'B', urgency: 5, impact: 5, count: 20 },
          { id: 3, label: 'C', urgency: 3, impact: 2, count: 8 },
        ]}
      />,
    );
    expect(screen.getByText('URGENCE →')).toBeInTheDocument();
    expect(screen.getByText('IMPACT →')).toBeInTheDocument();
    expect(container.querySelectorAll('circle')).toHaveLength(3);
  });

  it("affiche le label de l'item dans la tooltip", () => {
    const { container } = render(
      <PriorityMatrix items={[{ id: 1, label: 'MonItem', urgency: 4, impact: 4 }]} />,
    );
    const group = container.querySelector('circle')?.closest('g') as SVGGElement;
    fireEvent.mouseEnter(group);
    expect(screen.getByText('MonItem')).toBeInTheDocument();
  });

  it('utilise la couleur par défaut du quadrant selon urgence/impact', () => {
    const { container } = render(
      <PriorityMatrix
        items={[
          { id: 1, label: 'HH', urgency: 5, impact: 5 },
          { id: 2, label: 'HL', urgency: 5, impact: 1 },
          { id: 3, label: 'LH', urgency: 1, impact: 5 },
          { id: 4, label: 'LL', urgency: 1, impact: 1 },
        ]}
      />,
    );
    const circles = container.querySelectorAll('circle');
    expect(circles).toHaveLength(4);
    const fills = Array.from(circles).map((c) => c.getAttribute('fill'));
    expect(fills).toContain('#ef4444');
    expect(fills).toContain('#f59e0b');
    expect(fills).toContain('#3b82f6');
    expect(fills).toContain('#10b981');
  });

  it('utilise la couleur personnalisée fournie', () => {
    const { container } = render(
      <PriorityMatrix items={[{ id: 1, label: 'X', urgency: 4, impact: 4, color: '#123456' }]} />,
    );
    expect(container.querySelector('circle')?.getAttribute('fill')).toBe('#123456');
  });

  it("affiche la tooltip au survol et l'enlève au départ", () => {
    const { container } = render(
      <PriorityMatrix items={[{ id: 1, label: 'Python', urgency: 4, impact: 4, count: 12 }]} />,
    );
    const group = container.querySelector('circle')?.closest('g') as SVGGElement;
    fireEvent.mouseEnter(group);
    expect(
      screen.getByText((c) => c.includes('U:Haute') && c.includes('I:Important')),
    ).toBeInTheDocument();
    fireEvent.mouseLeave(group);
    expect(screen.queryByText((c) => c.includes('I:Important'))).toBeNull();
  });

  it('agrandit la bulle au survol via le props hovered', () => {
    const { container } = render(
      <PriorityMatrix items={[{ id: 1, label: 'Python', urgency: 4, impact: 4, count: 12 }]} />,
    );
    const circle = container.querySelector('circle') as SVGCircleElement;
    expect(circle.getAttribute('stroke-width')).toBe('1.5');
    const group = container.querySelector('circle')?.closest('g') as SVGGElement;
    fireEvent.mouseEnter(group);
    expect(container.querySelector('circle')?.getAttribute('stroke-width')).toBe('3');
  });

  it("affiche des libellés d'urgence/impact faibles quand <=2", () => {
    const { container } = render(
      <PriorityMatrix items={[{ id: 1, label: 'Low', urgency: 1, impact: 1 }]} />,
    );
    const group = container.querySelector('circle')?.closest('g') as SVGGElement;
    fireEvent.mouseEnter(group);
    expect(screen.getByText('U:Très faible · I:Très faible')).toBeInTheDocument();
  });

  it("n'affiche pas de count quand non fourni", () => {
    const { container } = render(
      <PriorityMatrix items={[{ id: 1, label: 'NoCount', urgency: 3, impact: 3 }]} />,
    );
    const texts = Array.from(container.querySelectorAll('text')).map((t) => t.textContent);
    texts.forEach((t) => expect(t).not.toBe('undefined'));
  });
});
