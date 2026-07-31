import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as predictive from '@/hooks/analyse/useAnalysePredictive';
import useAppNotification from '@/hooks/ui/useAppNotification';
import AnalyticsPage from '../AnalyticsPage';

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

vi.mock('@/hooks/analyse/useAnalysePredictive', () => ({
  useOverview: vi.fn(() => ({ data: undefined, isLoading: true })),
  useModelPerformance: vi.fn(() => ({ data: { gap_model_accuracy: 0.81, last_retrained: '2026-01-01T10:00:00Z' }, isLoading: false })),
  useRiskDistribution: vi.fn(() => ({ data: { by_level: { CRITIQUE: 5, ELEVE: 10, MODERE: 20, FAIBLE: 30 }, total: 65 }, isLoading: false })),
  useRiskEvolution: vi.fn(() => ({ data: [], isLoading: false })),
  useDemandForecast: vi.fn(() => ({ data: { method: 'prophet' }, isLoading: false })),
  useGapHeatmap: vi.fn(() => ({ data: [], isLoading: false })),
  useDecliningCompetencies: vi.fn(() => ({ data: [], isLoading: false })),
  useInDemandCompetencies: vi.fn(() => ({ data: [], isLoading: false })),
  useTeacherRiskIndicators: vi.fn(() => ({ data: [], isLoading: false })),
  useAlertsSummary: vi.fn(() => ({ data: undefined, isLoading: false })),
  useDriftStatus: vi.fn(() => ({ data: { drift_detected: false, message: 'Aucune dérive' }, isLoading: false })),
  useTrainModel: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock('@/hooks/auth/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: { role: 'ADMIN' } })),
}));

vi.mock('@/hooks/ui/useAppNotification', () => ({
  default: vi.fn(() => ({ message: { success: vi.fn(), error: vi.fn() } })),
}));

vi.mock('@/pages/analyse/WhatIfSimulator', () => ({
  default: () => <div>whatif</div>,
}));

const overview = {
  nb_enseignants_suivis: 120,
  nb_gaps_critiques: 18,
  taux_couverture_global: 0.72,
  score_risque_moyen: 0.45,
  nb_alertes_nouvelles: 7,
  deltas: {
    nb_enseignants_suivis: 5, nb_gaps_critiques: -2, taux_couverture_global: 3,
    score_risque_moyen: 1, nb_alertes_nouvelles: 2,
  },
};

function renderWith(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AnalyticsPage />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

describe('AnalyticsPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.resetAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('renders hero and KPIs', () => {
    vi.mocked(predictive.useOverview).mockReturnValue({ data: overview, isLoading: false } as never);
    renderWith(queryClient);
    expect(screen.getByText(/Intelligence des compétences/)).toBeInTheDocument();
    expect(screen.getByText('Enseignants suivis')).toBeInTheDocument();
    expect(screen.getByText('Gaps critiques')).toBeInTheDocument();
  });

  it('shows loading skeleton when overview is loading', () => {
    vi.mocked(predictive.useOverview).mockReturnValue({ data: undefined, isLoading: true } as never);
    vi.mocked(predictive.useRiskDistribution).mockReturnValue({ data: undefined, isLoading: true } as never);
    vi.mocked(predictive.useDemandForecast).mockReturnValue({ data: undefined, isLoading: true } as never);
    renderWith(queryClient);
    expect(document.querySelector('.ap-loading')).toBeInTheDocument();
  });

  it('renders all data sections when loaded', async () => {
    vi.mocked(predictive.useOverview).mockReturnValue({ data: overview, isLoading: false } as never);
    vi.mocked(predictive.useRiskEvolution).mockReturnValue({ data: [{ month: '2026-01', critical: 3, high: 5 }], isLoading: false } as never);
    vi.mocked(predictive.useDemandForecast).mockReturnValue({ data: { method: 'prophet', history: [{ month: '2026-01', value: 10, lower: 8, upper: 12 }], forecast: [{ month: '2026-02', value: 14, lower: 11, upper: 17 }] }, isLoading: false } as never);
    vi.mocked(predictive.useGapHeatmap).mockReturnValue({ data: [
      { competence_nom: 'Java', competence_id: 1, departement: 'INFO', avg_gap: 2.1, enseignants_count: 5 },
    ], isLoading: false } as never);
    vi.mocked(predictive.useDecliningCompetencies).mockReturnValue({ data: [{ competency_name: 'COBOL', demand_12m: 8, demand_3m: 4 }], isLoading: false } as never);
    vi.mocked(predictive.useInDemandCompetencies).mockReturnValue({ data: [{ competency_name: 'Rust', demand_12m: 22, demand_3m: 12 }], isLoading: false } as never);
    vi.mocked(predictive.useTeacherRiskIndicators).mockReturnValue({ data: [
      { teacher_id: 'T1', teacher_name: 'Alice Martin', departement: 'INFO', attrition_risk_score: 0.8, competency_stagnation_rate: 0.6, disengagement_signals: ['absence'], recommendation: 'Formation Python' },
      { teacher_id: 'T2', teacher_name: 'Bob Dupont', departement: 'MATH', attrition_risk_score: 0.2, competency_stagnation_rate: 0.1, recommendation: 'Aucune' },
    ], isLoading: false } as never);
    vi.mocked(predictive.useAlertsSummary).mockReturnValue({ data: { critiques_ouvertes: 3, nouvelles: 5, total: 12, by_type: [{ key: 'absence', count: 4 }] }, isLoading: false } as never);
    renderWith(queryClient);
    expect(await screen.findByText('Répartition du risque enseignant')).toBeInTheDocument();
    expect(screen.getByText('Prévision de la demande de compétences')).toBeInTheDocument();
    expect(screen.getByText('Cartographie des écarts (Gap Heatmap)')).toBeInTheDocument();
    expect(screen.getByText('Compétences en déclin')).toBeInTheDocument();
    expect(screen.getByText('Compétences en forte demande')).toBeInTheDocument();
    expect(screen.getByText('Précision du modèle')).toBeInTheDocument();
    expect(screen.getByText('Enseignants à risque')).toBeInTheDocument();
    expect(screen.getByText('Alice Martin')).toBeInTheDocument();
    expect(screen.getByText('Java')).toBeInTheDocument();
    expect(screen.getByText('whatif')).toBeInTheDocument();
  });

  it('renders empty states when data is empty', async () => {
    vi.mocked(predictive.useOverview).mockReturnValue({ data: overview, isLoading: false } as never);
    vi.mocked(predictive.useRiskEvolution).mockReturnValue({ data: [], isLoading: false } as never);
    vi.mocked(predictive.useDemandForecast).mockReturnValue({ data: { method: 'prophet' }, isLoading: false } as never);
    vi.mocked(predictive.useGapHeatmap).mockReturnValue({ data: [], isLoading: false } as never);
    vi.mocked(predictive.useDecliningCompetencies).mockReturnValue({ data: [], isLoading: false } as never);
    vi.mocked(predictive.useInDemandCompetencies).mockReturnValue({ data: [], isLoading: false } as never);
    vi.mocked(predictive.useTeacherRiskIndicators).mockReturnValue({ data: [], isLoading: false } as never);
    vi.mocked(predictive.useAlertsSummary).mockReturnValue({ data: undefined, isLoading: false } as never);
    renderWith(queryClient);
    expect(await screen.findByText('Pas de données')).toBeInTheDocument();
    expect(screen.getByText('Pas de prévision')).toBeInTheDocument();
    expect(screen.getByText('Pas de heatmap')).toBeInTheDocument();
    expect(screen.getByText('Aucun enseignant à risque')).toBeInTheDocument();
  });

  it('shows drift warning when drift detected', async () => {
    vi.mocked(predictive.useOverview).mockReturnValue({ data: overview, isLoading: false } as never);
    vi.mocked(predictive.useDriftStatus).mockReturnValue({ data: { drift_detected: true, message: 'Dérive détectée' }, isLoading: false } as never);
    renderWith(queryClient);
    expect(await screen.findByText('Dérive détectée')).toBeInTheDocument();
  });

  it('selects a heatmap cell and shows reset control', async () => {
    vi.mocked(predictive.useOverview).mockReturnValue({ data: overview, isLoading: false } as never);
    vi.mocked(predictive.useGapHeatmap).mockReturnValue({ data: [
      { competence_nom: 'Java', competence_id: 1, departement: 'INFO', avg_gap: 2.1, enseignants_count: 5 },
      { competence_nom: 'Python', competence_id: 2, departement: 'MATH', avg_gap: 0.5, enseignants_count: 3 },
    ], isLoading: false } as never);
    renderWith(queryClient);
    expect(await screen.findByText('Cartographie des écarts (Gap Heatmap)')).toBeInTheDocument();
    const cell = document.querySelector('.ap-heat-cell:not(.is-empty)') as HTMLButtonElement;
    expect(cell).toBeInTheDocument();
    fireEvent.click(cell);
    expect(await screen.findByText(/Réinitialiser/)).toBeInTheDocument();
  });

  it('calls refresh on the Actualiser button', async () => {
    vi.mocked(predictive.useOverview).mockReturnValue({ data: overview, isLoading: false } as never);
    const success = vi.fn();
    vi.mocked(useAppNotification).mockReturnValue({ message: { success, error: vi.fn() } } as never);
    renderWith(queryClient);
    const btn = await screen.findByText('Actualiser');
    fireEvent.click(btn);
    await waitFor(() => expect(success).toHaveBeenCalledWith('Données prédictives actualisées'));
  });

  it('navigates to teacher analytics from recommendation button', async () => {
    vi.mocked(predictive.useOverview).mockReturnValue({ data: overview, isLoading: false } as never);
    vi.mocked(predictive.useInDemandCompetencies).mockReturnValue({ data: [{ competency_name: 'Rust', demand_12m: 22, demand_3m: 12 }], isLoading: false } as never);
    renderWith(queryClient);
    const btn = await screen.findByText('Pilotage par enseignant');
    fireEvent.click(btn);
    expect(navigate).toHaveBeenCalledWith('/home/analytics');
  });
});
