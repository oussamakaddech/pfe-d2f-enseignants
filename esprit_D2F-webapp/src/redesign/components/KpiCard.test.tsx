import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import KpiCard from '@/redesign/components/KpiCard';
import CompactKpi from '@/redesign/components/CompactKpi';
import { buildTrend } from '@/redesign/format';

const icon = <span data-testid="icon">i</span>;

describe('KpiCard', () => {
  it("affiche le label, la valeur et l'unité int", () => {
    render(<KpiCard label="Total" value={1234} icon={icon} />);
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('1 234')).toBeInTheDocument();
  });
  it('affiche NA_CALC pour null', () => {
    render(<KpiCard label="Total" value={null} icon={icon} />);
    expect(screen.getByText('Non calculable')).toBeInTheDocument();
  });
  it('affiche un % pour unit pct', () => {
    render(<KpiCard label="Couv" value={42} unit="pct" icon={icon} />);
    expect(screen.getByText('42 %')).toBeInTheDocument();
  });
  it('affiche le skeleton quand loading', () => {
    const { container } = render(<KpiCard label="T" value={1} icon={icon} loading />);
    expect(container.querySelector('.rd-skel')).toBeInTheDocument();
  });
  it('affiche le trend', () => {
    const trend = buildTrend({ current: 60, previous: 40, higherIsBetter: true })!;
    render(<KpiCard label="T" value={60} icon={icon} trend={trend} trendLabel="pts" />);
    expect(screen.getByText(/▲/)).toBeInTheDocument();
    expect(screen.getByText(/20 pts/)).toBeInTheDocument();
  });
  it('affiche le helper', () => {
    render(<KpiCard label="T" value={1} icon={icon} helper="aide" />);
    expect(screen.getByText('aide')).toBeInTheDocument();
  });
});

describe('CompactKpi', () => {
  it('affiche le label et la valeur', () => {
    render(<CompactKpi label="Gain" value={1.84} unit="custom" customText="1,84" icon={icon} />);
    expect(screen.getByText('Gain')).toBeInTheDocument();
    expect(screen.getByText('1,84')).toBeInTheDocument();
  });
  it('affiche NA pour null', () => {
    render(<CompactKpi label="G" value={null} icon={icon} />);
    expect(screen.getByText('Non calculable')).toBeInTheDocument();
  });
  it('affiche le skeleton quand loading', () => {
    const { container } = render(<CompactKpi label="G" value={1} icon={icon} loading />);
    expect(container.querySelector('.rd-skel')).toBeInTheDocument();
  });
  it('affiche la flèche de tendance', () => {
    const trend = buildTrend({ current: 10, previous: 20, higherIsBetter: true })!;
    render(<CompactKpi label="G" value={10} icon={icon} trend={trend} trendLabel="pts" />);
    expect(screen.getByText(/▼/)).toBeInTheDocument();
  });
});
