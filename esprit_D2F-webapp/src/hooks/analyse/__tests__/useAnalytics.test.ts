import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushQuery } from "@/hooks/testUtils";
import {
  useAnalytics, useGroupedRecommendations, useSimulateWhatIf,
} from "@/hooks/analyse/useAnalytics";
import AnalyticsService from "@/services/analyse/AnalyticsService";
import { createWrapper } from "@/hooks/testUtils";

vi.mock("@/services/analyse/AnalyticsService", () => ({
  default: {
    analyzeEnseignant: vi.fn(), getGaps: vi.fn(), getRecommendations: vi.fn(),
    getTrainingPath: vi.fn(), updateRecommendationStatus: vi.fn(),
    getGroupedRecommendations: vi.fn(), simulateWhatIf: vi.fn(),
  },
  __esModule: true,
}));

describe("useAnalytics", () => {
  beforeEach(() => vi.clearAllMocks());

  it("runAnalysis calls analyzeEnseignant", async () => {
    (AnalyticsService.analyzeEnseignant as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useAnalytics("e1"), { wrapper: createWrapper() });
    await act(async () => { await result.current.runAnalysis(); });
    expect(AnalyticsService.analyzeEnseignant).toHaveBeenCalledWith("e1");
  });

  it("fetchGaps enables gaps query", async () => {
    (AnalyticsService.getGaps as ReturnType<typeof vi.fn>).mockResolvedValue({ items: [] });
    const { result } = renderHook(() => useAnalytics("e1"), { wrapper: createWrapper() });
    act(() => { result.current.fetchGaps("HAUTE", 0); });
    await flushQuery(result);
    expect(AnalyticsService.getGaps).toHaveBeenCalled();
  });

  it("fetchRecommendations enables reco query", async () => {
    (AnalyticsService.getRecommendations as ReturnType<typeof vi.fn>).mockResolvedValue({ items: [] });
    const { result } = renderHook(() => useAnalytics("e1"), { wrapper: createWrapper() });
    act(() => { result.current.fetchRecommendations(5, 0); });
    await flushQuery(result);
    expect(AnalyticsService.getRecommendations).toHaveBeenCalled();
  });

  it("fetchTrainingPath enables training path query", async () => {
    (AnalyticsService.getTrainingPath as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useAnalytics("e1"), { wrapper: createWrapper() });
    act(() => { result.current.fetchTrainingPath(5); });
    await flushQuery(result);
    expect(AnalyticsService.getTrainingPath).toHaveBeenCalled();
  });

  it("updateRecoStatus calls service", async () => {
    (AnalyticsService.updateRecommendationStatus as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useAnalytics("e1"), { wrapper: createWrapper() });
    await act(async () => { await result.current.updateRecoStatus({ recommendationId: 1, statut: "ACCEPTEE" } as never); });
    expect(AnalyticsService.updateRecommendationStatus).toHaveBeenCalledWith(1, "ACCEPTEE");
  });

  it("useGroupedRecommendations fetches", async () => {
    (AnalyticsService.getGroupedRecommendations as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useGroupedRecommendations("e1", "competence" as never), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(AnalyticsService.getGroupedRecommendations).toHaveBeenCalled();
  });

  it("useSimulateWhatIf calls service", async () => {
    (AnalyticsService.simulateWhatIf as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useSimulateWhatIf("e1"), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync({ plan: [] } as never); });
    expect(AnalyticsService.simulateWhatIf).toHaveBeenCalled();
  });
});
