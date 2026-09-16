import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushQuery } from "@/hooks/testUtils";
import {
  useEvaluationsGlobales, useEvaluationGlobaleByFormation, useCreateEvaluationGlobale,
  useUpdateEvaluationGlobale, useDeleteEvaluationGlobale, useEvaluationsEnrichedByFormation,
  useUpdateEvaluationsBulk, useUpdateEvaluationsBulkFlat,
} from "@/hooks/evaluation/useEvaluations";
import EvaluationGlobaleService from "@/services/evaluation/EvaluationGlobaleService";
import EvaluationFormateurService from "@/services/evaluation/EvaluationFormateurService";
import { createWrapper } from "@/hooks/testUtils";

vi.mock("@/services/evaluation/EvaluationGlobaleService", () => ({
  default: {
    getAllEvaluationGlobales: vi.fn(), getEvaluationGlobaleByFormationId: vi.fn(),
    createEvaluationGlobale: vi.fn(), updateEvaluationGlobale: vi.fn(),
    deleteEvaluationGlobale: vi.fn(),
  },
  __esModule: true,
}));
vi.mock("@/services/evaluation/EvaluationFormateurService", () => ({
  default: {
    listEvaluationsEnrichedByFormation: vi.fn(), updateEvaluationsBulkByFormation: vi.fn(),
  },
  __esModule: true,
}));

describe("useEvaluations", () => {
  beforeEach(() => vi.clearAllMocks());

  it("useEvaluationsGlobales fetches", async () => {
    (EvaluationGlobaleService.getAllEvaluationGlobales as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 1 }]);
    const { result } = renderHook(() => useEvaluationsGlobales(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.data).toHaveLength(1);
  });

  it("useEvaluationGlobaleByFormation fetches", async () => {
    (EvaluationGlobaleService.getEvaluationGlobaleByFormationId as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 2 });
    const { result } = renderHook(() => useEvaluationGlobaleByFormation(2), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(EvaluationGlobaleService.getEvaluationGlobaleByFormationId).toHaveBeenCalledWith(2);
  });

  it("useCreateEvaluationGlobale calls service", async () => {
    (EvaluationGlobaleService.createEvaluationGlobale as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useCreateEvaluationGlobale(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync({} as never); });
    expect(EvaluationGlobaleService.createEvaluationGlobale).toHaveBeenCalled();
  });

  it("useUpdateEvaluationGlobale calls service", async () => {
    (EvaluationGlobaleService.updateEvaluationGlobale as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useUpdateEvaluationGlobale(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync({ id: 1, data: {} } as never); });
    expect(EvaluationGlobaleService.updateEvaluationGlobale).toHaveBeenCalledWith(1, {});
  });

  it("useDeleteEvaluationGlobale calls service", async () => {
    (EvaluationGlobaleService.deleteEvaluationGlobale as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useDeleteEvaluationGlobale(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync(1); });
    expect(EvaluationGlobaleService.deleteEvaluationGlobale).toHaveBeenCalledWith(1);
  });

  it("useEvaluationsEnrichedByFormation fetches", async () => {
    (EvaluationFormateurService.listEvaluationsEnrichedByFormation as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { result } = renderHook(() => useEvaluationsEnrichedByFormation(2), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(EvaluationFormateurService.listEvaluationsEnrichedByFormation).toHaveBeenCalledWith(2);
  });

  it("useUpdateEvaluationsBulk calls service", async () => {
    (EvaluationFormateurService.updateEvaluationsBulkByFormation as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useUpdateEvaluationsBulk(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync({ formationId: 1, evaluations: [] } as never); });
    expect(EvaluationFormateurService.updateEvaluationsBulkByFormation).toHaveBeenCalled();
  });

  it("useUpdateEvaluationsBulkFlat resolves null without formationId", async () => {
    const { result } = renderHook(() => useUpdateEvaluationsBulkFlat(), { wrapper: createWrapper() });
    const r = await act(async () => result.current.mutateAsync({ evaluations: [] } as never));
    expect(r).toBeNull();
  });
});
