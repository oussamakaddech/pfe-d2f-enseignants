import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AlertsTrendChart from '@/redesign/components/charts/AlertsTrendChart';
import type { AlertTrendPoint } from '@/models/analyse/predictive';

const data: AlertTrendPoint[] = [
  { date: '2024-01-01', total: 10, critiques: 3 },
  { date: '2024-01-02', total: 15, critiques: 5 },
];

describe('AlertsTrendChart', () => {
  it('affiche le skeleton en loading sans données', () => {
    const { container } = render(<AlertsTrendChart data={[]} loading />);
    expect(container.querySelector('.rd-skel-block')).toBeInTheDocument();
  });
  it('affiche un message vide sans données', () => {
    render(<AlertsTrendChart data={[]} loading={false} />);
    expect(screen.getByText("Pas d'historique d'alertes")).toBeInTheDocument();
  });
  it('affiche le svg avec une légende', () => {
    const { container } = render(<AlertsTrendChart data={data} loading={false} />);
    expect(
      container.querySelector("svg[aria-label='Tendance des alertes sur 30 jours']"),
    ).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('Critiques')).toBeInTheDocument();
  });
  it('affiche le tooltip au survol', () => {
    const { container } = render(<AlertsTrendChart data={data} loading={false} />);
    const svg = container.querySelector('svg')!;
    svg.getBoundingClientRect = () =>
      ({
        width: 600,
        height: 232,
        top: 0,
        left: 0,
        right: 600,
        bottom: 232,
        x: 0,
        y: 0,
        toJSON: () => {},
      }) as DOMRect;
    fireEvent.mouseMove(svg, { clientX: 600 });
    expect(container.querySelector('.rd-chart-tip')).toBeInTheDocument();
    expect(container.textContent).toContain('15');
  });
});
