import { describe, it, expect, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useDashboard: vi.fn(),
  useAtRisk: vi.fn(),
  useAlerts: vi.fn(),
  useUpdateAlert: vi.fn(),
  useDecliningSkills: vi.fn(),
}));

vi.mock("../hooks/useAnalyticsQueries", () => ({
  useDashboard: mocks.useDashboard,
  useAtRisk: mocks.useAtRisk,
  useAlerts: mocks.useAlerts,
  useUpdateAlert: mocks.useUpdateAlert,
  useDecliningSkills: mocks.useDecliningSkills,
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
  mocks.useDashboard.mockReturnValue({
    data: { kpis: {}, enseignants_a_risque: [], heatmap: [], alertes_recentes: [], tendances: [], top_formations: [] },
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  });
  mocks.useAtRisk.mockReturnValue({ data: [], isLoading: false, isFetching: false, refetch: vi.fn() });
  mocks.useAlerts.mockReturnValue({ data: { alerts: [] }, isLoading: false });
  mocks.useUpdateAlert.mockReturnValue({ mutate: vi.fn() });
  mocks.useDecliningSkills.mockReturnValue({ data: [], isLoading: false });
};

describe("AnalyticsDashboardPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("affiche le titre du tableau de bord", () => {
    setup();
    render(<AnalyticsDashboardPage />, { wrapper });
    expect(screen.getByText(/Tableau de bord analytique/i)).toBeInTheDocument();
  });

  it("affiche les KPI globaux", () => {
    setup();
    render(<AnalyticsDashboardPage />, { wrapper });
    expect(screen.getByText(/Enseignants monitorés/i)).toBeInTheDocument();
    expect(screen.getByText(/Indice de risque moyen/i)).toBeInTheDocument();
  });

  it("affiche le bouton d'export CSV", () => {
    setup();
    render(<AnalyticsDashboardPage />, { wrapper });
    expect(screen.getByText(/Export CSV/i)).toBeInTheDocument();
  });
});
