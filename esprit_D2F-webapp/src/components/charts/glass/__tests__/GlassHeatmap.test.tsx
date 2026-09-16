import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import GlassHeatmap from '../GlassHeatmap';
import type { GapHeatmapCell } from '@/models/analyse';

const data: GapHeatmapCell[] = [
  { departement: 'INFO', competence_id: 1, competence_nom: 'Python', avg_gap: 2.5, enseignants_count: 10 },
  { departement: 'INFO', competence_id: 2, competence_nom: 'Java', avg_gap: 0.8, enseignants_count: 5 },
  { departement: 'MATH', competence_id: 1, competence_nom: 'Python', avg_gap: 1.2, enseignants_count: 3 },
];

describe('GlassHeatmap', () => {
  it('renders empty state when no data', () => {
    render(<GlassHeatmap data={[]} />);
    expect(screen.getByText(/Aucune donnée de heatmap/i)).toBeInTheDocument();
  });

  it('renders department rows and competency names', () => {
    render(<GlassHeatmap data={data} />);
    expect(screen.getByText('INFO')).toBeInTheDocument();
    expect(screen.getByText('MATH')).toBeInTheDocument();
    expect(screen.getByText('Python')).toBeInTheDocument();
    expect(screen.getByText('Java')).toBeInTheDocument();
  });

  it('renders gap values as buttons when onCellClick is provided', () => {
    const onClick = vi.fn();
    render(<GlassHeatmap data={data} onCellClick={onClick} />);
    const btn = screen.getByRole('button', { name: /2\.50/ });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledWith('INFO', 1);
  });

  it('renders gap values as divs when onCellClick is omitted', () => {
    render(<GlassHeatmap data={data} />);
    expect(screen.queryByRole('button', { name: /2\.50/ })).not.toBeInTheDocument();
    expect(screen.getByText('2.50')).toBeInTheDocument();
  });
});
