import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushQuery } from "@/hooks/testUtils";
import { useDashboard } from "@/hooks/analyse/useDashboard";
import { usePilotageDashboard } from "@/hooks/analyse/usePilotageDashboard";
import { useForecast, useBenchmark, useDetectAnomalies, useDetectAnomaliesDepartment } from "@/hooks/analyse/useNewFeatures";
import AnalyticsService from "@/services/analyse/AnalyticsService";
import { createWrapper } from "@/hooks/testUtils";

vi.mock("@/services/analyse/AnalyticsService", () => ({
  default: {
    getDashboardGlobal: vi.fn(), getPilotageDashboard: vi.fn(),
    getForecast: vi.fn(), getBenchmark: vi.fn(),
    detectAnomalies: vi.fn(), detectAnomaliesDepartment: vi.fn(),
  },
  __esModule: true,
}));

describe("useDashboard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches dashboard and exposes refetch", async () => {
    (AnalyticsService.getDashboardGlobal as ReturnType<typeof vi.fn>).mockResolvedValue({ key: "v" });
    const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.dashboard).toEqual({ key: "v" });
    expect(typeof result.current.refetch).toBe("function");
  });

  it("error when fetch fails", async () => {
    (AnalyticsService.getDashboardGlobal as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useDashboard(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.error).toBe("Impossible de charger le tableau de bord");
  });
});

describe("usePilotageDashboard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches pilotage dashboard with horizon", async () => {
    (AnalyticsService.getPilotageDashboard as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => usePilotageDashboard(6), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(AnalyticsService.getPilotageDashboard).toHaveBeenCalledWith({ horizonMois: 6 });
  });
});

describe("useNewFeatures", () => {
  beforeEach(() => vi.clearAllMocks());

  it("useForecast fetches", async () => {
    (AnalyticsService.getForecast as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useForecast("e1"), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(AnalyticsService.getForecast).toHaveBeenCalled();
  });

  it("useBenchmark fetches", async () => {
    (AnalyticsService.getBenchmark as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useBenchmark("e1", true), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(AnalyticsService.getBenchmark).toHaveBeenCalled();
  });

  it("useDetectAnomalies calls service", async () => {
    (AnalyticsService.detectAnomalies as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useDetectAnomalies(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync("e1"); });
    expect(AnalyticsService.detectAnomalies).toHaveBeenCalledWith("e1");
  });

  it("useDetectAnomaliesDepartment calls service", async () => {
    (AnalyticsService.detectAnomaliesDepartment as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useDetectAnomaliesDepartment(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync("d1"); });
    expect(AnalyticsService.detectAnomaliesDepartment).toHaveBeenCalledWith("d1");
  });
});
