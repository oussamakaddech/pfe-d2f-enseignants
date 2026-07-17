import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushQuery } from "@/hooks/testUtils";
import {
  useTotalFormations, useTotalHeures, useUniqueParticipants, useFormationsByEtat,
  useTopParticipants, useTopAbsentees, useEnseignantsNonAffectes, useKpiCountAndHeures,
  useKpiFormationsByTypeFiltered, useKpiCountAndHeuresMutation, useKpiFormationsByTypeFilteredMutation,
  useKpiCountByTrainerType, useKpiCountByTrainerTypeMutation, useFormationsParticipantKPIs,
  useGlobalParticipantKPI,
} from "@/hooks/kpi/useKpi";
import KPIService from "@/services/analyse/KPIService";
import ParticipantKPIService from "@/services/analyse/ParticipantKPIService";
import { createWrapper } from "@/hooks/testUtils";

vi.mock("@/services/analyse/KPIService", () => ({
  default: {
    getTotalFormations: vi.fn(), getTotalHeures: vi.fn(), getUniqueParticipants: vi.fn(),
    getFormationsByEtat: vi.fn(), getTopParticipants: vi.fn(), getTopAbsentees: vi.fn(),
    getEnseignantsNonAffectes: vi.fn(), getCountAndHeures: vi.fn(),
    getFormationsByTypeFiltered: vi.fn(), getCountByTrainerTypeWithIds: vi.fn(),
  },
  __esModule: true,
}));
vi.mock("@/services/analyse/ParticipantKPIService", () => ({
  default: {
    getFormationsParticipantKPIs: vi.fn(), getGlobalParticipantKPI: vi.fn(),
  },
  __esModule: true,
}));

describe("useKpi", () => {
  beforeEach(() => vi.clearAllMocks());

  it("useTotalFormations disabled without dates", async () => {
    const { result } = renderHook(() => useTotalFormations("", ""), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.isFetched).toBe(false);
  });

  it("useTotalFormations fetches", async () => {
    (KPIService.getTotalFormations as ReturnType<typeof vi.fn>).mockResolvedValue(5);
    const { result } = renderHook(() => useTotalFormations("2024-01-01", "2024-12-31"), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.data).toBe(5);
  });

  it("useTotalHeures fetches", async () => {
    (KPIService.getTotalHeures as ReturnType<typeof vi.fn>).mockResolvedValue(10);
    const { result } = renderHook(() => useTotalHeures("s", "e"), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(KPIService.getTotalHeures).toHaveBeenCalled();
  });

  it("useUniqueParticipants fetches", async () => {
    (KPIService.getUniqueParticipants as ReturnType<typeof vi.fn>).mockResolvedValue(3);
    const { result } = renderHook(() => useUniqueParticipants("s", "e"), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.data).toBe(3);
  });

  it("useFormationsByEtat fetches", async () => {
    (KPIService.getFormationsByEtat as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useFormationsByEtat("s", "e"), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.isSuccess).toBe(true);
  });

  it("useTopParticipants fetches", async () => {
    (KPIService.getTopParticipants as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { result } = renderHook(() => useTopParticipants("s", "e"), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.isSuccess).toBe(true);
  });

  it("useTopAbsentees fetches", async () => {
    (KPIService.getTopAbsentees as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { result } = renderHook(() => useTopAbsentees("s", "e"), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.isSuccess).toBe(true);
  });

  it("useEnseignantsNonAffectes fetches", async () => {
    (KPIService.getEnseignantsNonAffectes as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { result } = renderHook(() => useEnseignantsNonAffectes("s", "e"), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.isSuccess).toBe(true);
  });

  it("useKpiCountAndHeures fetches", async () => {
    (KPIService.getCountAndHeures as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useKpiCountAndHeures({} as never), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(KPIService.getCountAndHeures).toHaveBeenCalled();
  });

  it("useKpiFormationsByTypeFiltered fetches", async () => {
    (KPIService.getFormationsByTypeFiltered as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { result } = renderHook(() => useKpiFormationsByTypeFiltered({} as never), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(KPIService.getFormationsByTypeFiltered).toHaveBeenCalled();
  });

  it("useKpiCountAndHeuresMutation calls service", async () => {
    (KPIService.getCountAndHeures as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useKpiCountAndHeuresMutation(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync({} as never); });
    expect(KPIService.getCountAndHeures).toHaveBeenCalled();
  });

  it("useKpiFormationsByTypeFilteredMutation calls service", async () => {
    (KPIService.getFormationsByTypeFiltered as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useKpiFormationsByTypeFilteredMutation(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync({} as never); });
    expect(KPIService.getFormationsByTypeFiltered).toHaveBeenCalled();
  });

  it("useKpiCountByTrainerType fetches", async () => {
    (KPIService.getCountByTrainerTypeWithIds as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useKpiCountByTrainerType(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(KPIService.getCountByTrainerTypeWithIds).toHaveBeenCalled();
  });

  it("useKpiCountByTrainerTypeMutation calls service", async () => {
    (KPIService.getCountByTrainerTypeWithIds as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useKpiCountByTrainerTypeMutation(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync({}); });
    expect(KPIService.getCountByTrainerTypeWithIds).toHaveBeenCalled();
  });

  it("useFormationsParticipantKPIs fetches", async () => {
    (ParticipantKPIService.getFormationsParticipantKPIs as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { result } = renderHook(() => useFormationsParticipantKPIs("s", "e"), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(ParticipantKPIService.getFormationsParticipantKPIs).toHaveBeenCalled();
  });

  it("useGlobalParticipantKPI fetches", async () => {
    (ParticipantKPIService.getGlobalParticipantKPI as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useGlobalParticipantKPI("s", "e"), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(ParticipantKPIService.getGlobalParticipantKPI).toHaveBeenCalled();
  });
});
