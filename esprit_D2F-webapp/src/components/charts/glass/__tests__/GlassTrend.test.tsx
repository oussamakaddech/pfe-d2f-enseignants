import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import GlassTrend from '../GlassTrend';
import type { RiskEvolutionPoint } from '@/models/analyse';

const data: RiskEvolutionPoint[] = [
  { month: 'Jan', critical: 3, high: 5 },
  { month: 'Fév', critical: 4, high: 6 },
  { month: 'Mar', critical: 2, high: 7 },
];

describe('GlassTrend', () => {
  it('renders empty state when no data', () => {
    render(<GlassTrend data={[]} />);
    expect(screen.getByText(/Pas d'historique de risque disponible/i)).toBeInTheDocument();
  });

  it('renders an svg chart with axis label and month labels', () => {
    render(<GlassTrend data={data} />);
    const svg = screen.getByRole('img', { name: /Évolution du risque/i });
    expect(svg).toBeInTheDocument();
    expect(screen.getByText('Jan')).toBeInTheDocument();
    expect(screen.getByText('Fév')).toBeInTheDocument();
    expect(screen.getByText('Mar')).toBeInTheDocument();
  });

  it('renders the legend for critical and high', () => {
    render(<GlassTrend data={data} />);
    expect(screen.getByText('Critique')).toBeInTheDocument();
    expect(screen.getByText('Élevé')).toBeInTheDocument();
  });
});
