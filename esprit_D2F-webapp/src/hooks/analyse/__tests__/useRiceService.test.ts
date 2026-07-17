import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushQuery } from "@/hooks/testUtils";
import {
  useRiceEnseignants, useRiceSavoirs, useRiceEnseignantAffectations, useRiceAnalyze,
  useRiceSaveAssignments, useRiceAssignCompetence, useRiceRemoveAssignment,
  useRiceCreateEnseignant, useRiceUpdateEnseignant, useRiceDeactivateEnseignant,
} from "@/hooks/analyse/useRiceService";
import RiceService from "@/services/analyse/RiceService";
import { createWrapper } from "@/hooks/testUtils";

vi.mock("@/services/analyse/RiceService", () => ({
  default: {
    getEnseignants: vi.fn(), getSavoirs: vi.fn(), getEnseignantAffectations: vi.fn(),
    analyze: vi.fn(), saveAssignments: vi.fn(), assignCompetence: vi.fn(),
    removeAssignment: vi.fn(), createEnseignant: vi.fn(), updateEnseignant: vi.fn(),
    deactivateEnseignant: vi.fn(), getImportHistory: vi.fn(),
  },
  __esModule: true,
}));

describe("useRiceService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("useRiceEnseignants fetches", async () => {
    (RiceService.getEnseignants as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { result } = renderHook(() => useRiceEnseignants("INFO"), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(RiceService.getEnseignants).toHaveBeenCalledWith("INFO");
  });

  it("useRiceSavoirs fetches", async () => {
    (RiceService.getSavoirs as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { result } = renderHook(() => useRiceSavoirs(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.isSuccess).toBe(true);
  });

  it("useRiceEnseignantAffectations fetches", async () => {
    (RiceService.getEnseignantAffectations as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { result } = renderHook(() => useRiceEnseignantAffectations(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.isSuccess).toBe(true);
  });

  it("useRiceAnalyze calls service", async () => {
    (RiceService.analyze as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useRiceAnalyze(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync({ files: [], enseignants: [], departement: "INFO" } as never); });
    expect(RiceService.analyze).toHaveBeenCalled();
  });

  it("useRiceSaveAssignments calls service", async () => {
    (RiceService.saveAssignments as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useRiceSaveAssignments(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync({ add: [], remove: [] } as never); });
    expect(RiceService.saveAssignments).toHaveBeenCalled();
  });

  it("useRiceAssignCompetence calls service", async () => {
    (RiceService.assignCompetence as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useRiceAssignCompetence(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync({} as never); });
    expect(RiceService.assignCompetence).toHaveBeenCalled();
  });

  it("useRiceRemoveAssignment calls service", async () => {
    (RiceService.removeAssignment as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useRiceRemoveAssignment(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync(1); });
    expect(RiceService.removeAssignment).toHaveBeenCalledWith(1);
  });

  it("useRiceCreateEnseignant calls service", async () => {
    (RiceService.createEnseignant as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useRiceCreateEnseignant(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync({ nom: "x" } as never); });
    expect(RiceService.createEnseignant).toHaveBeenCalled();
  });

  it("useRiceUpdateEnseignant calls service", async () => {
    (RiceService.updateEnseignant as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useRiceUpdateEnseignant(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync({ id: 1, data: {} } as never); });
    expect(RiceService.updateEnseignant).toHaveBeenCalledWith(1, {});
  });

  it("useRiceDeactivateEnseignant calls service", async () => {
    (RiceService.deactivateEnseignant as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useRiceDeactivateEnseignant(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync(1); });
    expect(RiceService.deactivateEnseignant).toHaveBeenCalledWith(1);
  });
});
