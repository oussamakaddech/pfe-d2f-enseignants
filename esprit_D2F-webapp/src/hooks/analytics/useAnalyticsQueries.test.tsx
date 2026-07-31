import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const api = vi.hoisted(() => ({
  analyze: vi.fn(),
  getGaps: vi.fn(),
  getRecommendations: vi.fn(),
  getTrainingPath: vi.fn(),
  getRisk: vi.fn(),
  getRiskHistory: vi.fn(),
  getPilotage: vi.fn(),
  getTrainingImpact: vi.fn(),
  getTrainingImpactFormations: vi.fn(),
  simulateWhatIf: vi.fn(),
  getDashboard: vi.fn(),
  getHeatmap: vi.fn(),
  getAtRisk: vi.fn(),
  getDecliningSkills: vi.fn(),
  getAlerts: vi.fn(),
  updateAlert: vi.fn(),
  getModelStatus: vi.fn(),
  getDrift: vi.fn(),
  retrain: vi.fn(),
  rollback: vi.fn(),
}));

vi.mock("@/services/analyse/analyticsApi", () => ({ analyticsApi: api, default: api }));

import {
  useAnalyzeTeacher,
  useTeacherGaps,
  useTeacherRecommendations,
  useTeacherTrainingPath,
  useTeacherRisk,
  useRiskHistory,
  usePilotage,
  useTrainingImpact,
  useTrainingImpactFormations,
  useWhatIfSimulation,
  useDashboard,
  useHeatmap,
  useAtRisk,
  useDecliningSkills,
  useAlerts,
  useUpdateAlert,
  useModelStatus,
  useModelDrift,
  useModelRetrain,
  useModelRollback,
  useTeacherPicker,
} from "@/hooks/analytics/useAnalyticsQueries";

const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useAnalyticsQueries – queries", () => {
  it("useTeacherRisk appelle getRisk avec l'id", async () => {
    api.getRisk.mockResolvedValue({ score: 0.5, niveau: "MODERE" });
    const { result } = renderHook(() => useTeacherRisk("T1"), { wrapper: createWrapper() });
    await waitFor(() => expect(api.getRisk).toHaveBeenCalledWith("T1"));
    await waitFor(() => expect(result.current.data).toEqual({ score: 0.5, niveau: "MODERE" }));
  });

  it("useTeacherGaps appelle getGaps avec pagination par défaut", async () => {
    api.getGaps.mockResolvedValue({ gaps: [] });
    renderHook(() => useTeacherGaps("T1", "CRITIQUE"), { wrapper: createWrapper() });
    await waitFor(() =>
      expect(api.getGaps).toHaveBeenCalledWith("T1", { urgence: "CRITIQUE", page: 0, size: 20 }),
    );
  });

  it("useTeacherRecommendations appelle getRecommendations", async () => {
    api.getRecommendations.mockResolvedValue({ recommendations: [] });
    renderHook(() => useTeacherRecommendations("T1", 3), { wrapper: createWrapper() });
    await waitFor(() =>
      expect(api.getRecommendations).toHaveBeenCalledWith("T1", { competence_id: 3, page: 0, size: 20 }),
    );
  });

  it("useTeacherTrainingPath n'appelle pas getTrainingPath sans competenceId", async () => {
    api.getTrainingPath.mockResolvedValue({});
    renderHook(() => useTeacherTrainingPath("T1", null), { wrapper: createWrapper() });
    await new Promise((r) => setTimeout(r, 50));
    expect(api.getTrainingPath).not.toHaveBeenCalled();
  });

  it("useRiskHistory passe le mois", async () => {
    api.getRiskHistory.mockResolvedValue({ points: [] });
    renderHook(() => useRiskHistory("T1", 6), { wrapper: createWrapper() });
    await waitFor(() => expect(api.getRiskHistory).toHaveBeenCalledWith("T1", 6));
  });

  it("usePilotage appelle getPilotage", async () => {
    api.getPilotage.mockResolvedValue({});
    renderHook(() => usePilotage(), { wrapper: createWrapper() });
    await waitFor(() => expect(api.getPilotage).toHaveBeenCalled());
  });

  it("useTrainingImpact appelle getTrainingImpact", async () => {
    api.getTrainingImpact.mockResolvedValue({});
    renderHook(() => useTrainingImpact(), { wrapper: createWrapper() });
    await waitFor(() => expect(api.getTrainingImpact).toHaveBeenCalled());
  });

  it("useTrainingImpactFormations transmet page/size", async () => {
    api.getTrainingImpactFormations.mockResolvedValue({ formations: [] });
    renderHook(() => useTrainingImpactFormations(2, 5), { wrapper: createWrapper() });
    await waitFor(() => expect(api.getTrainingImpactFormations).toHaveBeenCalledWith(2, 5));
  });

  it("useDashboard appelle getDashboard", async () => {
    api.getDashboard.mockResolvedValue({ kpis: {} });
    renderHook(() => useDashboard({ departement_id: "D1" }), { wrapper: createWrapper() });
    await waitFor(() => expect(api.getDashboard).toHaveBeenCalledWith({ departement_id: "D1" }));
  });

  it("useHeatmap appelle getHeatmap", async () => {
    api.getHeatmap.mockResolvedValue([]);
    renderHook(() => useHeatmap(), { wrapper: createWrapper() });
    await waitFor(() => expect(api.getHeatmap).toHaveBeenCalled());
  });

  it("useAtRisk appelle getAtRisk", async () => {
    api.getAtRisk.mockResolvedValue([]);
    renderHook(() => useAtRisk(), { wrapper: createWrapper() });
    await waitFor(() => expect(api.getAtRisk).toHaveBeenCalled());
  });

  it("useDecliningSkills appelle getDecliningSkills", async () => {
    api.getDecliningSkills.mockResolvedValue([]);
    renderHook(() => useDecliningSkills(), { wrapper: createWrapper() });
    await waitFor(() => expect(api.getDecliningSkills).toHaveBeenCalled());
  });

  it("useAlerts appelle getAlerts avec filtres", async () => {
    api.getAlerts.mockResolvedValue({ alerts: [] });
    renderHook(() => useAlerts({ severite: "CRITICAL" }), { wrapper: createWrapper() });
    await waitFor(() => expect(api.getAlerts).toHaveBeenCalledWith({ severite: "CRITICAL" }));
  });

  it("useModelStatus appelle getModelStatus", async () => {
    api.getModelStatus.mockResolvedValue({});
    renderHook(() => useModelStatus(), { wrapper: createWrapper() });
    await waitFor(() => expect(api.getModelStatus).toHaveBeenCalled());
  });

  it("useModelDrift appelle getDrift", async () => {
    api.getDrift.mockResolvedValue({});
    renderHook(() => useModelDrift(), { wrapper: createWrapper() });
    await waitFor(() => expect(api.getDrift).toHaveBeenCalled());
  });
});

describe("useAnalyticsQueries – mutations", () => {
  it("useAnalyzeTeacher invalide les queries liées au succès", async () => {
    api.analyze.mockResolvedValue({});
    const { result } = renderHook(() => useAnalyzeTeacher("T1"), { wrapper: createWrapper() });
    result.current.mutate();
    await waitFor(() => expect(api.analyze).toHaveBeenCalledWith("T1"));
  });

  it("useWhatIfSimulation ajoute enseignant_id au payload", async () => {
    api.simulateWhatIf.mockResolvedValue({});
    const { result } = renderHook(() => useWhatIfSimulation("T1"), { wrapper: createWrapper() });
    result.current.mutate({ plan: [], horizon_mois: 6 });
    await waitFor(() =>
      expect(api.simulateWhatIf).toHaveBeenCalledWith({ enseignant_id: "T1", plan: [], horizon_mois: 6 }),
    );
  });

  it("useUpdateAlert appelle updateAlert", async () => {
    api.updateAlert.mockResolvedValue({});
    const { result } = renderHook(() => useUpdateAlert(), { wrapper: createWrapper() });
    result.current.mutate({ id: 1, payload: { statut: "TRAITEE" } });
    await waitFor(() => expect(api.updateAlert).toHaveBeenCalledWith(1, { statut: "TRAITEE" }));
  });

  it("useModelRetrain appelle retrain", async () => {
    api.retrain.mockResolvedValue({});
    const { result } = renderHook(() => useModelRetrain(), { wrapper: createWrapper() });
    result.current.mutate();
    await waitFor(() => expect(api.retrain).toHaveBeenCalled());
  });

  it("useModelRollback appelle rollback", async () => {
    api.rollback.mockResolvedValue({});
    const { result } = renderHook(() => useModelRollback(), { wrapper: createWrapper() });
    result.current.mutate();
    await waitFor(() => expect(api.rollback).toHaveBeenCalled());
  });
});

describe("useTeacherPicker", () => {
  it("gère la sélection d'enseignant", () => {
    const { result } = renderHook(() => useTeacherPicker());
    expect(result.current.enseignantId).toBe("");
    act(() => result.current.setEnseignantId("T9"));
    expect(result.current.enseignantId).toBe("T9");
  });
});
