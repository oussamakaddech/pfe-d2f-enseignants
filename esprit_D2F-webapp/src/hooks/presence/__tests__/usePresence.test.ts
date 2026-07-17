import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushQuery } from "@/hooks/testUtils";
import {
  useFormationsByAnimateur, useSeancePresences, useSeancePresenceStats, useUpdatePresence,
  useBatchUpdatePresences, useMarkAllPresences, useAggregatedPresences, useMesPresences,
} from "@/hooks/presence/usePresence";
import FormationWorkflowService from "@/services/formation/FormationWorkflowService";
import { createWrapper } from "@/hooks/testUtils";

vi.mock("@/services/formation/FormationWorkflowService", () => ({
  default: {
    getFormationsByAnimateur: vi.fn(), getPresencesBySeance: vi.fn(),
    getSeancePresenceStats: vi.fn(), updatePresence: vi.fn(),
    batchUpdatePresences: vi.fn(), markAllPresences: vi.fn(), getMesPresences: vi.fn(),
  },
  __esModule: true,
}));

describe("usePresence", () => {
  beforeEach(() => vi.clearAllMocks());

  it("useFormationsByAnimateur fetches", async () => {
    (FormationWorkflowService.getFormationsByAnimateur as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 1 }]);
    const { result } = renderHook(() => useFormationsByAnimateur(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.data).toHaveLength(1);
  });

  it("useSeancePresences disabled without id", async () => {
    const { result } = renderHook(() => useSeancePresences(undefined), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.isFetched).toBe(false);
  });

  it("useSeancePresences fetches", async () => {
    (FormationWorkflowService.getPresencesBySeance as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { result } = renderHook(() => useSeancePresences(3), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(FormationWorkflowService.getPresencesBySeance).toHaveBeenCalledWith(3);
  });

  it("useSeancePresenceStats fetches", async () => {
    (FormationWorkflowService.getSeancePresenceStats as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useSeancePresenceStats(3), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.isSuccess).toBe(true);
  });

  it("useUpdatePresence calls service", async () => {
    (FormationWorkflowService.updatePresence as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useUpdatePresence(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync({ id: 1, isPresent: true } as never); });
    expect(FormationWorkflowService.updatePresence).toHaveBeenCalled();
  });

  it("useBatchUpdatePresences calls service", async () => {
    (FormationWorkflowService.batchUpdatePresences as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useBatchUpdatePresences(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync({ seanceId: 1, updates: [] } as never); });
    expect(FormationWorkflowService.batchUpdatePresences).toHaveBeenCalled();
  });

  it("useMarkAllPresences calls service", async () => {
    (FormationWorkflowService.markAllPresences as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useMarkAllPresences(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync({ seanceId: 1, present: true } as never); });
    expect(FormationWorkflowService.markAllPresences).toHaveBeenCalledWith(1, true);
  });

  it("useAggregatedPresences disabled for empty list", async () => {
    const { result } = renderHook(() => useAggregatedPresences([]), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.isFetched).toBe(false);
  });

  it("useAggregatedPresences fetches many", async () => {
    (FormationWorkflowService.getPresencesBySeance as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { result } = renderHook(() => useAggregatedPresences([1, 2]), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.data).toEqual([[], []]);
  });

  it("useMesPresences fetches", async () => {
    (FormationWorkflowService.getMesPresences as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { result } = renderHook(() => useMesPresences(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.isSuccess).toBe(true);
  });
});
