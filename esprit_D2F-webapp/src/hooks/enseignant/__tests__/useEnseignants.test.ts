import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushQuery } from "@/hooks/testUtils";
import {
  useEnseignants, useEnseignantById, useCreateEnseignant, useUpdateEnseignant,
  useDeleteEnseignant, useUploadEnseignants,
} from "@/hooks/enseignant/useEnseignants";
import EnseignantService from "@/services/formation/EnseignantService";
import { createWrapper } from "@/hooks/testUtils";

vi.mock("@/services/formation/EnseignantService", () => ({
  default: {
    getAllEnseignants: vi.fn(), getEnseignantById: vi.fn(),
    createEnseignant: vi.fn(), updateEnseignant: vi.fn(),
    deleteEnseignant: vi.fn(), uploadEnseignants: vi.fn(),
  },
  __esModule: true,
}));

describe("useEnseignants", () => {
  beforeEach(() => vi.clearAllMocks());

  it("useEnseignants maps email field", async () => {
    (EnseignantService.getAllEnseignants as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 1, mail: "", email: "a@b.c" }]);
    const { result } = renderHook(() => useEnseignants(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.data?.[0].mail).toBe("a@b.c");
  });

  it("useEnseignantById fetches by id", async () => {
    (EnseignantService.getEnseignantById as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 3 });
    const { result } = renderHook(() => useEnseignantById(3), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(EnseignantService.getEnseignantById).toHaveBeenCalledWith(3);
  });

  it("useEnseignantById falls back to list on 404", async () => {
    (EnseignantService.getEnseignantById as ReturnType<typeof vi.fn>).mockRejectedValue({ response: { status: 404 } });
    (EnseignantService.getAllEnseignants as ReturnType<typeof vi.fn>).mockResolvedValue([{ mail: "a@b.c" }]);
    const { result } = renderHook(() => useEnseignantById("a@b.c"), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(EnseignantService.getAllEnseignants).toHaveBeenCalled();
  });

  it("useCreateEnseignant calls service", async () => {
    (EnseignantService.createEnseignant as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useCreateEnseignant(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync({ nom: "x" } as never); });
    expect(EnseignantService.createEnseignant).toHaveBeenCalled();
  });

  it("useUpdateEnseignant calls service", async () => {
    (EnseignantService.updateEnseignant as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useUpdateEnseignant(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync({ id: 1, data: {} } as never); });
    expect(EnseignantService.updateEnseignant).toHaveBeenCalledWith(1, {});
  });

  it("useDeleteEnseignant calls service", async () => {
    (EnseignantService.deleteEnseignant as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useDeleteEnseignant(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync(1); });
    expect(EnseignantService.deleteEnseignant).toHaveBeenCalledWith(1);
  });

  it("useUploadEnseignants calls service", async () => {
    (EnseignantService.uploadEnseignants as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useUploadEnseignants(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync(new Blob() as never); });
    expect(EnseignantService.uploadEnseignants).toHaveBeenCalled();
  });
});
