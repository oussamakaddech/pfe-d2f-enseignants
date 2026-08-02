import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  useRealDashboardImpact: vi.fn(),
  useAlerts: vi.fn(),
  useUpdateAlert: vi.fn(),
  useRiskTrends: vi.fn(),
  useSupplyDemand: vi.fn(),
  getTeachersByCell: vi.fn(),
  useTrainingImpact: vi.fn(),
  useTrainingImpactFormations: vi.fn(),
}));

vi.mock("@/hooks/analytics/useAnalyticsQueries", () => ({
  useRealDashboardImpact: mocks.useRealDashboardImpact,
  useAlerts: mocks.useAlerts,
  useUpdateAlert: mocks.useUpdateAlert,
  useRiskTrends: mocks.useRiskTrends,
  useTrainingImpact: mocks.useTrainingImpact,
  useTrainingImpactFormations: mocks.useTrainingImpactFormations,
}));

vi.mock("@/hooks/analyse/useAnalysePredictive", () => ({
  useSupplyDemand: mocks.useSupplyDemand,
}));

vi.mock("@/services/analyse/analyticsApi", () => ({
  analyticsApi: { getTeachersByCell: mocks.getTeachersByCell },
}));

import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { App } from "antd";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AnalyticsDashboardPage from "@/pages/analyse/AnalyticsDashboardPage";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <BrowserRouter>
      <App>{children}</App>
    </BrowserRouter>
  </QueryClientProvider>
);

const setup = () => {
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
      at_risk_teachers: [],
      top_formations: [],
      coverage_by_dept: [],
      data_source: "database",
    },
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  });
  mocks.useAlerts.mockReturnValue({ data: { alerts: [] }, isLoading: false, refetch: vi.fn() });
  mocks.useUpdateAlert.mockReturnValue({ mutate: vi.fn() });
  mocks.useRiskTrends.mockReturnValue({ data: [], isLoading: false, refetch: vi.fn() });
  mocks.useSupplyDemand.mockReturnValue({ data: [], isLoading: false });
  mocks.useTrainingImpact.mockReturnValue({ data: null, isLoading: false });
  mocks.useTrainingImpactFormations.mockReturnValue({ data: null, isLoading: false });
  mocks.getTeachersByCell.mockResolvedValue([]);
};

describe("AnalyticsDashboardPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("affiche le titre du tableau de bord", () => {
    setup();
    render(<AnalyticsDashboardPage />, { wrapper });
    expect(screen.getByText(/Tableau de bord analytique/i)).toBeInTheDocument();
  });

  it("affiche les KPI globaux (données réelles)", () => {
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
});
