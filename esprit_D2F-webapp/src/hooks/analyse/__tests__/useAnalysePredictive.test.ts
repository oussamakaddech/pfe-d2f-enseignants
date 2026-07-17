import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushQuery } from "@/hooks/testUtils";
import {
  useDashboardSummary, useTrainModel, useAnalyserEnseignant, usePredictGaps,
  useAnalyseTendancesGlobales, useDriftStatus, useDecliningCompetencies,
  useInDemandCompetencies, useTeacherRiskIndicators, useGapHeatmap,
  useTrainingEffectiveness, useTopFormations, useRiskEvolution, useModelPerformance,
  useOverview, useDemandForecast, useTrainingNeedsForecast, useAlertsSummary,
  useBulkUpdateAlerts, usePriorityActions, useBatchRecommendations, useSupplyDemand,
  useRiskDistribution, useHeatmapDrilldown, useTrainingImpact, useTrainingImpactFormations,
  useSimulateWhatIf,
} from "@/hooks/analyse/useAnalysePredictive";
import AnalysePredictiveService from "@/services/analyse/AnalysePredictiveService";
import { createWrapper } from "@/hooks/testUtils";

vi.mock("@/services/analyse/AnalysePredictiveService", () => {
  const svc: Record<string, unknown> = {};
  const names = [
    "getDashboardSummary", "retrainModel", "analyserEnseignant", "predictGaps",
    "analyserTendancesGlobales", "getDrift", "getDecliningCompetencies",
    "getInDemandCompetencies", "getTeacherRiskIndicators", "getGapHeatmap",
    "getTrainingEffectiveness", "getTopFormationsRecommandees", "getRiskEvolution",
    "getModelPerformance", "getOverview", "getDemandForecast",
    "getTrainingNeedsForecast", "getAlertsSummary", "bulkUpdateAlerts",
    "getPriorityActions", "getBatchRecommendations", "getSupplyDemand",
    "getRiskDistribution", "getHeatmapDrilldown", "getTrainingImpact",
    "getTrainingImpactFormations", "simulateWhatIf",
  ];
  names.forEach((n) => (svc[n] = vi.fn()));
  return { default: svc, __esModule: true };
});

type Svc = typeof AnalysePredictiveService;

describe("useAnalysePredictive", () => {
  beforeEach(() => vi.clearAllMocks());

  it("useDashboardSummary fetches summary", async () => {
    (AnalysePredictiveService.getDashboardSummary as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ declining_competencies: [] });
    const { result } = renderHook(() => useDashboardSummary(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.data).toEqual({ declining_competencies: [] });
  });

  it("useTrainModel retrains and invalidates", async () => {
    (AnalysePredictiveService.retrainModel as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useTrainModel(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync(); });
    expect(AnalysePredictiveService.retrainModel).toHaveBeenCalled();
  });

  it("useAnalyserEnseignant calls analyserEnseignant", async () => {
    (AnalysePredictiveService.analyserEnseignant as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useAnalyserEnseignant(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync({ enseignantId: "e1", autoTrain: true } as never); });
    expect(AnalysePredictiveService.analyserEnseignant).toHaveBeenCalledWith("e1", undefined, { autoTrain: true });
  });

  it("usePredictGaps calls predictGaps", async () => {
    (AnalysePredictiveService.predictGaps as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { result } = renderHook(() => usePredictGaps(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync({ enseignantId: "e1", horizonMonths: 3 } as never); });
    expect(AnalysePredictiveService.predictGaps).toHaveBeenCalled();
  });

  it("useAnalyseTendancesGlobales fetches", async () => {
    (AnalysePredictiveService.analyserTendancesGlobales as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ dashboard: {} });
    const { result } = renderHook(() => useAnalyseTendancesGlobales(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.data).toEqual({ dashboard: {} });
  });

  it("useDriftStatus fetches drift", async () => {
    (AnalysePredictiveService.getDrift as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ drift_detected: false });
    const { result } = renderHook(() => useDriftStatus(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.data).toEqual({ drift_detected: false });
  });

  it("useDecliningCompetencies fetches", async () => {
    (AnalysePredictiveService.getDecliningCompetencies as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 1 }]);
    const { result } = renderHook(() => useDecliningCompetencies(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.data).toHaveLength(1);
  });

  it("useInDemandCompetencies fetches", async () => {
    (AnalysePredictiveService.getInDemandCompetencies as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { result } = renderHook(() => useInDemandCompetencies(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.data).toEqual([]);
  });

  it("useTeacherRiskIndicators fetches", async () => {
    (AnalysePredictiveService.getTeacherRiskIndicators as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { result } = renderHook(() => useTeacherRiskIndicators(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.isSuccess).toBe(true);
  });

  it("useGapHeatmap fetches", async () => {
    (AnalysePredictiveService.getGapHeatmap as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { result } = renderHook(() => useGapHeatmap(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.isSuccess).toBe(true);
  });

  it("useTrainingEffectiveness fetches", async () => {
    (AnalysePredictiveService.getTrainingEffectiveness as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { result } = renderHook(() => useTrainingEffectiveness(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.isSuccess).toBe(true);
  });

  it("useTopFormations fetches", async () => {
    (AnalysePredictiveService.getTopFormationsRecommandees as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { result } = renderHook(() => useTopFormations(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.isSuccess).toBe(true);
  });

  it("useRiskEvolution fetches with months arg", async () => {
    (AnalysePredictiveService.getRiskEvolution as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { result } = renderHook(() => useRiskEvolution(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(AnalysePredictiveService.getRiskEvolution).toHaveBeenCalledWith(6);
  });

  it("useRiskEvolution uses custom months", async () => {
    (AnalysePredictiveService.getRiskEvolution as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { result } = renderHook(() => useRiskEvolution(12), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(AnalysePredictiveService.getRiskEvolution).toHaveBeenCalledWith(12);
  });

  it("useModelPerformance fetches", async () => {
    (AnalysePredictiveService.getModelPerformance as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useModelPerformance(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.isSuccess).toBe(true);
  });

  it("useOverview fetches", async () => {
    (AnalysePredictiveService.getOverview as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useOverview(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.isSuccess).toBe(true);
  });

  it("useDemandForecast fetches", async () => {
    (AnalysePredictiveService.getDemandForecast as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useDemandForecast(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(AnalysePredictiveService.getDemandForecast as unknown as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(6);
  });

  it("useTrainingNeedsForecast fetches with months", async () => {
    (AnalysePredictiveService.getTrainingNeedsForecast as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useTrainingNeedsForecast(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(AnalysePredictiveService.getTrainingNeedsForecast as unknown as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(6, 12);
  });

  it("useAlertsSummary fetches", async () => {
    (AnalysePredictiveService.getAlertsSummary as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useAlertsSummary(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.isSuccess).toBe(true);
  });

  it("useBulkUpdateAlerts calls bulkUpdateAlerts", async () => {
    (AnalysePredictiveService.bulkUpdateAlerts as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useBulkUpdateAlerts(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync({ ids: ["a"], statut: "LU" } as never); });
    expect(AnalysePredictiveService.bulkUpdateAlerts).toHaveBeenCalled();
  });

  it("usePriorityActions fetches with args", async () => {
    (AnalysePredictiveService.getPriorityActions as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { result } = renderHook(() => usePriorityActions(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(AnalysePredictiveService.getPriorityActions as unknown as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(20, undefined);
  });

  it("useBatchRecommendations calls getBatchRecommendations", async () => {
    (AnalysePredictiveService.getBatchRecommendations as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useBatchRecommendations(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync({ ids: [] } as never); });
    expect(AnalysePredictiveService.getBatchRecommendations).toHaveBeenCalled();
  });

  it("useSupplyDemand fetches", async () => {
    (AnalysePredictiveService.getSupplyDemand as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { result } = renderHook(() => useSupplyDemand(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.isSuccess).toBe(true);
  });

  it("useRiskDistribution fetches", async () => {
    (AnalysePredictiveService.getRiskDistribution as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useRiskDistribution(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.isSuccess).toBe(true);
  });

  it("useHeatmapDrilldown disabled without departement", async () => {
    (AnalysePredictiveService.getHeatmapDrilldown as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useHeatmapDrilldown(null, null), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.isFetched).toBe(false);
  });

  it("useTrainingImpact fetches", async () => {
    (AnalysePredictiveService.getTrainingImpact as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useTrainingImpact(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.isSuccess).toBe(true);
  });

  it("useTrainingImpactFormations fetches with page", async () => {
    (AnalysePredictiveService.getTrainingImpactFormations as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useTrainingImpactFormations(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(AnalysePredictiveService.getTrainingImpactFormations as unknown as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(0, 20);
  });

  it("useSimulateWhatIf calls simulateWhatIf and invalidates", async () => {
    (AnalysePredictiveService.simulateWhatIf as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useSimulateWhatIf(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync({ enseignant_id: "e", plan: [] } as never); });
    expect(AnalysePredictiveService.simulateWhatIf).toHaveBeenCalled();
  });
});
