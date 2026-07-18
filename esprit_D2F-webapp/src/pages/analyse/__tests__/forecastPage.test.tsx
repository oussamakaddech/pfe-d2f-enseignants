import { describe, it, expect, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  usePilotage: vi.fn(),
  useTrainingImpact: vi.fn(),
  useTrainingImpactFormations: vi.fn(),
}));

vi.mock("../hooks/useAnalyticsQueries", () => ({
  usePilotage: mocks.usePilotage,
  useTrainingImpact: mocks.useTrainingImpact,
  useTrainingImpactFormations: mocks.useTrainingImpactFormations,
}));

import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { App } from "antd";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ForecastPage from "@/pages/analyse/ForecastPage";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <BrowserRouter>
      <App>{children}</App>
    </BrowserRouter>
  </QueryClientProvider>
);

describe("ForecastPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("affiche un message d'erreur en cas d'échec", () => {
    mocks.usePilotage.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    mocks.useTrainingImpact.mockReturnValue({ isLoading: false, data: undefined });
    mocks.useTrainingImpactFormations.mockReturnValue({ isLoading: false, data: { formations: [] } });
    render(<ForecastPage />, { wrapper });
    expect(screen.getByText(/Échec du chargement de la prévision/i)).toBeInTheDocument();
  });

  it("affiche les KPI de prévision avec des données", () => {
    mocks.usePilotage.mockReturnValue({
      data: {
        forecast_kpis: { horizon_mois: 6, nb_enseignants: 10, niveau_projet_moyen: 0.5, pct_objectifs_atteignables: 70, nb_competences_regression: 2, nb_competences_suivies: 8 },
        benchmark_departements: [],
        anomalies_live: { nb_anomalies_recentes: 0, fenetre_jours: 30, nb_nouvelles: 0, alertes: [] },
        correlation_besoins_gaps: { coefficient_pearson: 0.3, nb_competences: 4, top_paires: [], interpretation: "interp" },
        generated_at: "2024-01-01",
      },
      isLoading: false,
      isError: false,
    });
    mocks.useTrainingImpact.mockReturnValue({ isLoading: false, data: undefined });
    mocks.useTrainingImpactFormations.mockReturnValue({ isLoading: false, data: { formations: [] } });
    render(<ForecastPage />, { wrapper });
    expect(screen.getByText(/Prévision institutionnelle/i)).toBeInTheDocument();
    expect(screen.getByText("Horizon (mois)")).toBeInTheDocument();
  });
});
