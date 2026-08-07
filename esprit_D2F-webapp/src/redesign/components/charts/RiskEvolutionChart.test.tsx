import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RiskEvolutionChart from '@/redesign/components/charts/RiskEvolutionChart';
import type { RiskEvolutionPoint } from '@/models/analyse';

const points: RiskEvolutionPoint[] = [
  { month: 'Jan', critical: 3, high: 5 },
  { month: 'Fév', critical: 1, high: 2 },
];

describe('RiskEvolutionChart', () => {
  it('affiche le skeleton en loading sans points', () => {
    const { container } = render(<RiskEvolutionChart points={[]} loading />);
    expect(container.querySelector('.rd-skel-block')).toBeInTheDocument();
  });
  it('affiche un message vide sans points', () => {
    render(<RiskEvolutionChart points={[]} loading={false} />);
    expect(screen.getByText("Aucune donnée d'évolution")).toBeInTheDocument();
  });
  it('affiche le svg et la légende', () => {
    const { container } = render(<RiskEvolutionChart points={points} loading={false} />);
    expect(
      container.querySelector("svg[aria-label='Évolution mensuelle du risque']"),
    ).toBeInTheDocument();
    expect(screen.getByText('Risque critique')).toBeInTheDocument();
    expect(screen.getByText('Risque élevé')).toBeInTheDocument();
  });
  it('affiche le tooltip au survol', () => {
    const { container } = render(<RiskEvolutionChart points={points} loading={false} />);
    const svg = container.querySelector('svg')!;
    svg.getBoundingClientRect = () =>
      ({
        width: 600,
        height: 230,
        top: 0,
        left: 0,
        right: 600,
        bottom: 230,
        x: 0,
        y: 0,
        toJSON: () => {},
      }) as DOMRect;
    fireEvent.mouseMove(svg, { clientX: 40 });
    expect(container.textContent).toContain('3');
  });
});
