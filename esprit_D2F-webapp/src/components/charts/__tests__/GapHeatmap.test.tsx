import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GapHeatmap from '../GapHeatmap';
import type { GapHeatmapCell, HeatmapDrilldown } from '@/models/analyse';

vi.mock('@/hooks/analyse/useAnalysePredictive', () => ({
  useHeatmapDrilldown: vi.fn(),
}));

vi.mock('./RiskBadge', () => ({
  default: ({ value }: { value: string }) => <span>badge:{value}</span>,
}));

import { useHeatmapDrilldown } from '@/hooks/analyse/useAnalysePredictive';

const data: GapHeatmapCell[] = [
  { departement: 'INFO', competence_id: 1, competence_nom: 'Python', avg_gap: 2.5, enseignants_count: 10 },
  { departement: 'INFO', competence_id: 2, competence_nom: 'Java', avg_gap: 0.8, enseignants_count: 5 },
  { departement: 'MATH', competence_id: 1, competence_nom: 'Python', avg_gap: 1.2, enseignants_count: 3 },
];

const drilldown: HeatmapDrilldown = {
  departement: 'INFO',
  competence_id: 1,
  competence_nom: 'Python',
  nb_enseignants: 2,
  avg_gap: 2.5,
  enseignants: [
    { enseignant_id: 'ENS001', niveau_actuel: 2, niveau_requis: 4, gap_score: 0.5, niveau_urgence: 'HAUTE', mois_stagnation: 8, score_risque: 0.6, niveau_risque: 'ELEVE' },
  ],
};

describe('GapHeatmap', () => {
  beforeEach(() => {
    vi.mocked(useHeatmapDrilldown).mockReturnValue({ data: undefined, isLoading: false } as never);
  });

  it('renders empty state when no data', () => {
    render(<GapHeatmap data={[]} />);
    expect(screen.getByText(/Aucune donnée de gap par département/i)).toBeInTheDocument();
  });

  it('renders department rows and competency columns', () => {
    render(<GapHeatmap data={data} />);
    expect(screen.getByText('INFO')).toBeInTheDocument();
    expect(screen.getByText('MATH')).toBeInTheDocument();
    expect(screen.getAllByText('Python').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Java').length).toBeGreaterThan(0);
  });

  it('opens drilldown drawer when a non-zero cell is clicked', async () => {
    vi.mocked(useHeatmapDrilldown).mockReturnValue({ data: drilldown, isLoading: false } as never);
    render(<GapHeatmap data={data} />);
    const cell = screen.getByText('2.5');
    fireEvent.click(cell);
    await waitFor(() => expect(screen.getByText(/Drilldown/i)).toBeInTheDocument());
    expect(screen.getByText('ENS001')).toBeInTheDocument();
    expect(screen.getAllByText(/enseignant\(s\)/i).length).toBeGreaterThan(0);
  });

  it('calls onAnalyzeTeacher when the eye button is clicked', async () => {
    const onAnalyze = vi.fn();
    vi.mocked(useHeatmapDrilldown).mockReturnValue({ data: drilldown, isLoading: false } as never);
    render(<GapHeatmap data={data} onAnalyzeTeacher={onAnalyze} />);
    fireEvent.click(screen.getByText('2.5'));
    await waitFor(() => expect(screen.getByText('ENS001')).toBeInTheDocument());
    const eye = screen.getByRole('button', { name: /eye/i });
    fireEvent.click(eye);
    expect(onAnalyze).toHaveBeenCalledWith('ENS001');
  });
});
