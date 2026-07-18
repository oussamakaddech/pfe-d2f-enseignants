import { describe, it, expect, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useAnalyzeTeacher: vi.fn(),
  useTeacherRisk: vi.fn(),
  useTeacherGaps: vi.fn(),
  useTeacherRecommendations: vi.fn(),
  useTeacherTrainingPath: vi.fn(),
  useRiskHistory: vi.fn(),
  useAlerts: vi.fn(),
  useUpdateAlert: vi.fn(),
}));

vi.mock("../hooks/useAnalyticsQueries", () => ({
  useAnalyzeTeacher: mocks.useAnalyzeTeacher,
  useTeacherRisk: mocks.useTeacherRisk,
  useTeacherGaps: mocks.useTeacherGaps,
  useTeacherRecommendations: mocks.useTeacherRecommendations,
  useTeacherTrainingPath: mocks.useTeacherTrainingPath,
  useRiskHistory: mocks.useRiskHistory,
  useAlerts: mocks.useAlerts,
  useUpdateAlert: mocks.useUpdateAlert,
}));

import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { App } from "antd";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AnalyticsTeacherPage from "@/pages/analyse/AnalyticsTeacherPage";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <BrowserRouter>
      <App>{children}</App>
    </BrowserRouter>
  </QueryClientProvider>
);

const setup = () => {
  mocks.useAnalyzeTeacher.mockReturnValue({ isPending: false, isError: false, mutate: vi.fn() });
  mocks.useTeacherRisk.mockReturnValue({ isLoading: false, data: undefined });
  mocks.useTeacherGaps.mockReturnValue({ isLoading: false, data: { gaps: [] } });
  mocks.useTeacherRecommendations.mockReturnValue({ isLoading: false, data: { recommendations: [] } });
  mocks.useTeacherTrainingPath.mockReturnValue({ isLoading: false, data: undefined });
  mocks.useRiskHistory.mockReturnValue({ isLoading: false, data: { points: [] } });
  mocks.useAlerts.mockReturnValue({ isLoading: false, data: { alerts: [] } });
  mocks.useUpdateAlert.mockReturnValue({ mutate: vi.fn() });
};

describe("AnalyticsTeacherPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("affiche le titre de la page", () => {
    setup();
    render(<AnalyticsTeacherPage />, { wrapper });
    expect(screen.getByText(/Analyse prédictive — Enseignant/i)).toBeInTheDocument();
  });

  it("affiche le bouton Lancer l'analyse", () => {
    setup();
    render(<AnalyticsTeacherPage />, { wrapper });
    expect(screen.getByText(/Lancer l'analyse/i)).toBeInTheDocument();
  });
});
