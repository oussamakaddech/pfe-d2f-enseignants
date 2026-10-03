import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  useRealDashboardImpact: vi.fn(),
  useAlerts: vi.fn(),
  useUpdateAlert: vi.fn(),
  useRiskTrends: vi.fn(),
  useDailyRiskTrends: vi.fn(),
  useSupplyDemand: vi.fn(),
  getTeachersByCell: vi.fn(),
  useTrainingImpact: vi.fn(),
  useTrainingImpactFormations: vi.fn(),
}));

vi.mock('@/hooks/analytics/useAnalyticsQueries', () => ({
  useRealDashboardImpact: mocks.useRealDashboardImpact,
  useAlerts: mocks.useAlerts,
  useUpdateAlert: mocks.useUpdateAlert,
  useRiskTrends: mocks.useRiskTrends,
  useDailyRiskTrends: mocks.useDailyRiskTrends,
  useTrainingImpact: mocks.useTrainingImpact,
  useTrainingImpactFormations: mocks.useTrainingImpactFormations,
}));

vi.mock('@/hooks/analyse/useAnalysePredictive', () => ({
  useSupplyDemand: mocks.useSupplyDemand,
}));

vi.mock('@/services/analyse/analyticsApi', () => ({
  analyticsApi: { getTeachersByCell: mocks.getTeachersByCell },
}));

import { fireEvent, render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { App } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AnalyticsDashboardPage from '@/pages/analyse/AnalyticsDashboardPage';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <BrowserRouter>
      <App>{children}</App>
    </BrowserRouter>
  </QueryClientProvider>
);

const setup = (atRisk: Record<string, unknown>[] = []) => {
  mocks.useRealDashboardImpact.mockReturnValue({
    data: {
      kpis: {
        nb_enseignants: 30,
        nb_enseignants_avec_gaps: 25,
        nb_gaps_critiques: 12,
        nb_gaps_haute: 8,
        nb_gaps_total: 60,
        avg_gap_score: 0.45,
        nb_alertes_non_traitees: 6,
        nb_alertes_critiques: 2,
        avg_risk_score: 0.62,
        taux_couverture_pct: 83.3,
      },
      heatmap: [],
      at_risk_teachers: atRisk,
      top_formations: [],
      coverage_by_dept: [],
      data_source: 'database',
    },
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  });
  mocks.useAlerts.mockReturnValue({ data: { alerts: [] }, isLoading: false, refetch: vi.fn() });
  mocks.useUpdateAlert.mockReturnValue({ mutate: vi.fn() });
  mocks.useRiskTrends.mockReturnValue({ data: [], isLoading: false, refetch: vi.fn() });
  mocks.useDailyRiskTrends.mockReturnValue({ data: [], isLoading: false, refetch: vi.fn() });
  mocks.useSupplyDemand.mockReturnValue({ data: [], isLoading: false });
  mocks.useTrainingImpact.mockReturnValue({ data: null, isLoading: false });
  mocks.useTrainingImpactFormations.mockReturnValue({ data: null, isLoading: false });
  mocks.getTeachersByCell.mockResolvedValue([]);
};

describe('AnalyticsDashboardPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('affiche le titre du tableau de bord', () => {
    setup();
    render(<AnalyticsDashboardPage />, { wrapper });
    expect(screen.getByText(/Tableau de bord analytique/i)).toBeInTheDocument();
  });

  it('affiche les KPI globaux (données réelles)', () => {
    setup();
    render(<AnalyticsDashboardPage />, { wrapper });
    expect(screen.getByText(/Enseignants en base/i)).toBeInTheDocument();
    expect(screen.getByText(/Indice de risque moyen/i)).toBeInTheDocument();
    expect(screen.getByText(/Alertes non traitées/i)).toBeInTheDocument();
  });

  it("affiche le bouton d'export CSV", () => {
    setup();
    render(<AnalyticsDashboardPage />, { wrapper });
    expect(screen.getByText(/Export CSV/i)).toBeInTheDocument();
  });

  it('affiche la couverture réelle par département (pas le seed impact)', () => {
    setup();
    mocks.useRealDashboardImpact.mockReturnValue({
      ...mocks.useRealDashboardImpact(),
      data: {
        ...mocks.useRealDashboardImpact().data,
        coverage_by_dept: [
          {
            dept_id: 'DEPT_IA',
            dept_libelle: 'IA',
            nb_enseignants: 10,
            nb_enseignants_avec_competences: 8,
            nb_affectations: 25,
            niveau_moyen: 3.5,
          },
        ],
      },
    });
    render(<AnalyticsDashboardPage />, { wrapper });
    expect(screen.getByText('Couverture par département')).toBeInTheDocument();
    expect(screen.getByText('IA')).toBeInTheDocument();
    expect(screen.getByText('8/10 avec compétences')).toBeInTheDocument();
    expect(screen.queryByText('Impact des formations')).not.toBeInTheDocument();
  });

  it('charge les tendances quotidiennes sur la période sélectionnée', () => {
    setup();
    render(<AnalyticsDashboardPage />, { wrapper });
    expect(mocks.useDailyRiskTrends).toHaveBeenCalledWith(30);
    fireEvent.click(screen.getByText('7 j'));
    expect(mocks.useDailyRiskTrends).toHaveBeenLastCalledWith(7);
  });

  it('transmet les filtres (périmètre + période) au backend des statistiques', () => {
    // Non-régression : les 8 KPI restaient globaux quand on changeait de filtre
    // car useRealDashboardImpact/useAlerts étaient appelés sans paramètres.
    setup();
    render(<AnalyticsDashboardPage />, { wrapper });
    expect(mocks.useRealDashboardImpact).toHaveBeenCalledWith({
      dept_id: undefined,
      up_id: undefined,
      niveau_risque: undefined,
      days: 30,
    });
    expect(mocks.useAlerts).toHaveBeenCalledWith(
      expect.objectContaining({ since_days: 30 }),
    );

    // Changer la période refetch les statistiques sur la nouvelle fenêtre.
    fireEvent.click(screen.getByText('7 j'));
    expect(mocks.useRealDashboardImpact).toHaveBeenLastCalledWith({
      dept_id: undefined,
      up_id: undefined,
      niveau_risque: undefined,
      days: 7,
    });
    expect(mocks.useAlerts).toHaveBeenLastCalledWith(
      expect.objectContaining({ since_days: 7 }),
    );
  });
  it("liste tous les enseignants et isole les scores sans niveau dans la vue à risque", () => {
    const row = (id: string, prenom: string, score: number, significatif: boolean) => ({
      enseignant_id: id,
      nom: 'TEST',
      prenom,
      specialite: null,
      grade: null,
      up_id: 'UP_IA',
      dept_id: 'DEPT_IA',
      up_libelle: 'UP IA',
      dept_libelle: 'IA',
      score_risque: score,
      niveau_risque: 'CRITICAL',
      tendance: 'STABLE',
      snapshot_date: '2026-09-24',
      nb_gaps_persistes: 3,
      nb_gaps_critiques: 2,
      max_gap_score: 0.75,
      niveaux_sur_scope: significatif ? 4 : 0,
      score_significatif: significatif,
    });
    setup([
      row('E1', 'SansNiveau', 0.89, false),
      row('E2', 'AvecNiveau', 0.77, true),
      row('E3', 'Faible', 0.3, true),
    ]);
    render(<AnalyticsDashboardPage />, { wrapper });
    const ranked = () =>
      Array.from(document.querySelectorAll('.ar-teacher-link')).map((e) => e.textContent);
    expect(screen.getByText('1 / 3')).toBeInTheDocument();

    // Vue par défaut : TOUS les enseignants, classés par indice ; le compte sans
    // niveau reste visible mais signalé.
    expect(ranked()).toEqual(['SansNiveau TEST', 'AvecNiveau TEST', 'Faible TEST']);
    expect(screen.getByText('Données insuffisantes')).toBeInTheDocument();

    // Vue « À risque » : seuls les scores significatifs >= 0,5 ; le compte sans
    // niveau est cité dans l'avertissement.
    fireEvent.click(screen.getByText('À risque ≥ 0,5 (1)'));
    expect(ranked()).toEqual(['AvecNiveau TEST']);
    expect(
      screen.getByText(/1 enseignant\(s\) exclu\(s\) du classement : aucun niveau enregistré/),
    ).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'SansNiveau TEST' });
    expect(link).toHaveAttribute('href', '/home/analytics/teacher/E1');
  });
});
