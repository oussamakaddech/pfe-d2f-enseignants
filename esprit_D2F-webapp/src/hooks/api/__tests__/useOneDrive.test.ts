import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushQuery } from "@/hooks/testUtils";
import {
  useDriveHierarchy, useFormationHierarchy, useDownloadOneDriveFile,
  useDeleteOneDriveFile, useGetEmbedLink,
} from "@/hooks/api/useOneDrive";
import OneDriveService from "@/services/api/OneDriveService";
import { createWrapper } from "@/hooks/testUtils";

vi.mock("@/services/api/OneDriveService", () => ({
  default: {
    getDriveHierarchy: vi.fn(), getFormationHierarchy: vi.fn(),
    downloadFile: vi.fn(), deleteFile: vi.fn(), getEmbedLink: vi.fn(),
  },
  __esModule: true,
}));

describe("useOneDrive", () => {
  beforeEach(() => vi.clearAllMocks());

  it("useDriveHierarchy fetches", async () => {
    (OneDriveService.getDriveHierarchy as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useDriveHierarchy(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.isSuccess).toBe(true);
  });

  it("useFormationHierarchy disabled without id", async () => {
    const { result } = renderHook(() => useFormationHierarchy(undefined), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.isFetched).toBe(false);
  });

  it("useFormationHierarchy fetches", async () => {
    (OneDriveService.getFormationHierarchy as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useFormationHierarchy(3), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(OneDriveService.getFormationHierarchy).toHaveBeenCalledWith(3);
  });

  it("useDownloadOneDriveFile calls service", async () => {
    (OneDriveService.downloadFile as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useDownloadOneDriveFile(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync({ nomFormation: "f", nomDocument: "d", originalFileName: "o" } as never); });
    expect(OneDriveService.downloadFile).toHaveBeenCalled();
  });

  it("useDeleteOneDriveFile calls service and invalidates", async () => {
    (OneDriveService.deleteFile as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useDeleteOneDriveFile(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync({ nomFormation: "f", nomDocument: "d", originalFileName: "o" } as never); });
    expect(OneDriveService.deleteFile).toHaveBeenCalled();
  });

  it("useGetEmbedLink calls service", async () => {
    (OneDriveService.getEmbedLink as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useGetEmbedLink(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync({ nomFormation: "f", nomDocument: "d" } as never); });
    expect(OneDriveService.getEmbedLink).toHaveBeenCalled();
  });
});
