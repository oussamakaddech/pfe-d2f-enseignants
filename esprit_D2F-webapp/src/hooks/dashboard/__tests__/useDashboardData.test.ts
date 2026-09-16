import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushQuery } from "@/hooks/testUtils";
import { useGlobalDashboard, useInactifs, useFormationsTimeline, useParticipationByDept, useParticipationByUp } from "@/hooks/dashboard/useDashboardData";
import { usePlatformKPIs } from "@/hooks/dashboard/usePlatformStats";
import AnalyticsService from "@/services/analyse/AnalyticsService";
import KPIService from "@/services/analyse/KPIService";
import ParticipantKPIService from "@/services/analyse/ParticipantKPIService";
import { createWrapper } from "@/hooks/testUtils";

vi.mock("@/services/analyse/AnalyticsService", () => ({
  default: {
    getDashboardGlobal: vi.fn(), getEnseignantsSansFormation: vi.fn(),
    getFormationsParPeriode: vi.fn(), getFormationsParDepartement: vi.fn(),
    getFormationsParUp: vi.fn(),
  },
  __esModule: true,
}));
vi.mock("@/services/analyse/KPIService", () => ({
  default: {
    getFormationsByEtat: vi.fn(), getFormationsByTypeFiltered: vi.fn(),
    getTotalHeures: vi.fn(), getUniqueParticipants: vi.fn(),
    getTopParticipants: vi.fn(), getCountAndHeures: vi.fn(),
  },
  __esModule: true,
}));
vi.mock("@/services/analyse/ParticipantKPIService", () => ({
  default: { getGlobalParticipantKPI: vi.fn() },
  __esModule: true,
}));

describe("useDashboardData", () => {
  beforeEach(() => vi.clearAllMocks());

  it("useGlobalDashboard fetches", async () => {
    (AnalyticsService.getDashboardGlobal as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useGlobalDashboard(true), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.isSuccess).toBe(true);
  });

  it("useInactifs fetches", async () => {
    (AnalyticsService.getEnseignantsSansFormation as ReturnType<typeof vi.fn>).mockResolvedValue({ items: [] });
    const { result } = renderHook(() => useInactifs(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(AnalyticsService.getEnseignantsSansFormation).toHaveBeenCalled();
  });

  it("useFormationsTimeline disabled without dates", async () => {
    const { result } = renderHook(() => useFormationsTimeline({ start: "", end: "" } as never), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.isFetched).toBe(false);
  });

  it("useFormationsTimeline fetches", async () => {
    (AnalyticsService.getFormationsParPeriode as ReturnType<typeof vi.fn>).mockResolvedValue({ items: [] });
    const { result } = renderHook(() => useFormationsTimeline({ start: "s", end: "e" } as never), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(AnalyticsService.getFormationsParPeriode).toHaveBeenCalled();
  });

  it("useParticipationByDept fetches", async () => {
    (AnalyticsService.getFormationsParDepartement as ReturnType<typeof vi.fn>).mockResolvedValue({ departements: [] });
    const { result } = renderHook(() => useParticipationByDept(true), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.isSuccess).toBe(true);
  });

  it("useParticipationByUp fetches", async () => {
    (AnalyticsService.getFormationsParUp as ReturnType<typeof vi.fn>).mockResolvedValue({ items: [] });
    const { result } = renderHook(() => useParticipationByUp(true), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.isSuccess).toBe(true);
  });
});

describe("usePlatformStats", () => {
  beforeEach(() => vi.clearAllMocks());

  it("usePlatformKPIs fetches all queries", async () => {
    (KPIService.getFormationsByEtat as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (KPIService.getFormationsByTypeFiltered as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (KPIService.getTotalHeures as ReturnType<typeof vi.fn>).mockResolvedValue(1);
    (KPIService.getUniqueParticipants as ReturnType<typeof vi.fn>).mockResolvedValue(2);
    (KPIService.getTopParticipants as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (ParticipantKPIService.getGlobalParticipantKPI as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => usePlatformKPIs(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.heures.data).toBe(1);
    expect(result.current.participants.data).toBe(2);
  });
});
