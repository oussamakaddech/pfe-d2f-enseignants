import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushQuery } from "@/hooks/testUtils";
import {
  useBesoins, useMyBesoins, useApprovedBesoins, useBesoinsByUp, useBesoinsByDepartement,
  useAddBesoin, useModifyBesoin, useRemoveBesoin, useApproveBesoin,
  useBesoinCompetences, useReplaceBesoinCompetences,
} from "@/hooks/besoin/useBesoins";
import BesoinFormationService from "@/services/besoin/BesoinFormationService";
import BesoinCompetenceService from "@/services/besoin/BesoinCompetenceService";
import { createWrapper } from "@/hooks/testUtils";

vi.mock("@/services/besoin/BesoinFormationService", () => ({
  default: {
    getAllBesoinFormations: vi.fn(), getMyBesoins: vi.fn(),
    getApprovedBesoinFormations: vi.fn(), getBesoinsByUp: vi.fn(),
    getBesoinsByDepartement: vi.fn(), addBesoinFormation: vi.fn(),
    modifyBesoinFormation: vi.fn(), removeBesoinFormation: vi.fn(),
    approveBesoin: vi.fn(),
  },
  __esModule: true,
}));
vi.mock("@/services/besoin/BesoinCompetenceService", () => ({
  default: { getByBesoin: vi.fn(), replaceAll: vi.fn() },
  __esModule: true,
}));

describe("useBesoins", () => {
  beforeEach(() => vi.clearAllMocks());

  it("useBesoins fetches", async () => {
    (BesoinFormationService.getAllBesoinFormations as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 1 }]);
    const { result } = renderHook(() => useBesoins(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.data).toHaveLength(1);
  });

  it("useBesoins disabled when enabled=false", async () => {
    const { result } = renderHook(() => useBesoins(false), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.isFetched).toBe(false);
  });

  it("useMyBesoins fetches", async () => {
    (BesoinFormationService.getMyBesoins as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { result } = renderHook(() => useMyBesoins(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.isSuccess).toBe(true);
  });

  it("useApprovedBesoins fetches", async () => {
    (BesoinFormationService.getApprovedBesoinFormations as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { result } = renderHook(() => useApprovedBesoins(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.isSuccess).toBe(true);
  });

  it("useBesoinsByUp disabled without up", async () => {
    const { result } = renderHook(() => useBesoinsByUp(undefined), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.isFetched).toBe(false);
  });

  it("useBesoinsByUp fetches when up provided", async () => {
    (BesoinFormationService.getBesoinsByUp as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 2 }]);
    const { result } = renderHook(() => useBesoinsByUp("up1"), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.data).toHaveLength(1);
  });

  it("useBesoinsByDepartement fetches when dept provided", async () => {
    (BesoinFormationService.getBesoinsByDepartement as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { result } = renderHook(() => useBesoinsByDepartement("d1"), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(BesoinFormationService.getBesoinsByDepartement).toHaveBeenCalledWith("d1");
  });

  it("useAddBesoin calls service", async () => {
    (BesoinFormationService.addBesoinFormation as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useAddBesoin(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync({ titre: "t" } as never); });
    expect(BesoinFormationService.addBesoinFormation).toHaveBeenCalled();
  });

  it("useModifyBesoin calls service", async () => {
    (BesoinFormationService.modifyBesoinFormation as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useModifyBesoin(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync({ besoin: {}, commentaire: "c" } as never); });
    expect(BesoinFormationService.modifyBesoinFormation).toHaveBeenCalled();
  });

  it("useRemoveBesoin calls service", async () => {
    (BesoinFormationService.removeBesoinFormation as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useRemoveBesoin(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync(1); });
    expect(BesoinFormationService.removeBesoinFormation).toHaveBeenCalledWith(1);
  });

  it("useApproveBesoin calls service", async () => {
    (BesoinFormationService.approveBesoin as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useApproveBesoin(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync(1); });
    expect(BesoinFormationService.approveBesoin).toHaveBeenCalledWith(1);
  });

  it("useBesoinCompetences fetches when besoinId provided", async () => {
    (BesoinCompetenceService.getByBesoin as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { result } = renderHook(() => useBesoinCompetences(5), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(BesoinCompetenceService.getByBesoin).toHaveBeenCalledWith(5);
  });

  it("useReplaceBesoinCompetences calls service", async () => {
    (BesoinCompetenceService.replaceAll as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useReplaceBesoinCompetences(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync({ besoinId: 3, links: [] } as never); });
    expect(BesoinCompetenceService.replaceAll).toHaveBeenCalled();
  });
});
