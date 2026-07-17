import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushQuery } from "@/hooks/testUtils";
import {
  useBureaux, useCreateBureau, useUpdateBureau, useDeleteBureau,
} from "@/hooks/bureau/useBureaux";
import {
  useAnimateursExternes, useCreateAnimateurExterne, useUpdateAnimateurExterne, useDeleteAnimateurExterne,
} from "@/hooks/bureau/useAnimateursExternes";
import BureauService from "@/services/bureau/BureauService";
import AnimateurExterneService from "@/services/bureau/AnimateurExterneService";
import { createWrapper } from "@/hooks/testUtils";

vi.mock("@/services/bureau/BureauService", () => ({
  default: { getAllBureaux: vi.fn(), createBureau: vi.fn(), updateBureau: vi.fn(), deleteBureau: vi.fn() },
  __esModule: true,
}));
vi.mock("@/services/bureau/AnimateurExterneService", () => ({
  default: { getByBureau: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  __esModule: true,
}));

describe("useBureaux", () => {
  beforeEach(() => vi.clearAllMocks());

  it("useBureaux fetches", async () => {
    (BureauService.getAllBureaux as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 1 }]);
    const { result } = renderHook(() => useBureaux(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.data).toHaveLength(1);
  });

  it("useCreateBureau calls createBureau", async () => {
    (BureauService.createBureau as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useCreateBureau(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync({ nom: "b" } as never); });
    expect(BureauService.createBureau).toHaveBeenCalled();
  });

  it("useUpdateBureau calls updateBureau", async () => {
    (BureauService.updateBureau as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useUpdateBureau(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync({ id: 1, data: {} } as never); });
    expect(BureauService.updateBureau).toHaveBeenCalledWith(1, {});
  });

  it("useDeleteBureau calls deleteBureau", async () => {
    (BureauService.deleteBureau as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useDeleteBureau(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync(1); });
    expect(BureauService.deleteBureau).toHaveBeenCalledWith(1);
  });
});

describe("useAnimateursExternes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("disabled when bureauId null", async () => {
    const { result } = renderHook(() => useAnimateursExternes(null), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.isFetched).toBe(false);
  });

  it("fetches when bureauId provided", async () => {
    (AnimateurExterneService.getByBureau as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 1 }]);
    const { result } = renderHook(() => useAnimateursExternes(7), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.data).toHaveLength(1);
  });

  it("useCreateAnimateurExterne calls create", async () => {
    (AnimateurExterneService.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useCreateAnimateurExterne(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync({ bureauId: 7, data: {} } as never); });
    expect(AnimateurExterneService.create).toHaveBeenCalled();
  });

  it("useUpdateAnimateurExterne calls update", async () => {
    (AnimateurExterneService.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useUpdateAnimateurExterne(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync({ bureauId: 7, id: 2, data: {} } as never); });
    expect(AnimateurExterneService.update).toHaveBeenCalled();
  });

  it("useDeleteAnimateurExterne calls delete", async () => {
    (AnimateurExterneService.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useDeleteAnimateurExterne(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync({ bureauId: 7, id: 2 } as never); });
    expect(AnimateurExterneService.delete).toHaveBeenCalled();
  });
});
