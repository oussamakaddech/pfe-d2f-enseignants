import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushQuery } from "@/hooks/testUtils";
import {
  usePreviewImport, useImportCalendar, useCalendarFormations, useCalendarParticipants,
  useCalendarConflicts, useSendInvitations, useSendAllInvitations,
} from "@/hooks/formation/useCalendar";
import CalendarService from "@/services/formation/CalendarService";
import { createWrapper } from "@/hooks/testUtils";

vi.mock("@/services/formation/CalendarService", () => ({
  default: {
    preview: vi.fn(), importCalendar: vi.fn(), listFormations: vi.fn(),
    getParticipants: vi.fn(), getConflicts: vi.fn(), sendInvitations: vi.fn(),
    sendAllInvitations: vi.fn(),
  },
  __esModule: true,
}));

describe("useCalendar", () => {
  beforeEach(() => vi.clearAllMocks());

  it("usePreviewImport calls preview", async () => {
    (CalendarService.preview as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => usePreviewImport(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync(new Blob() as never); });
    expect(CalendarService.preview).toHaveBeenCalled();
  });

  it("useImportCalendar calls importCalendar and invalidates", async () => {
    (CalendarService.importCalendar as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useImportCalendar(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync({ file: new Blob() as never }); });
    expect(CalendarService.importCalendar).toHaveBeenCalled();
  });

  it("useCalendarFormations fetches", async () => {
    (CalendarService.listFormations as ReturnType<typeof vi.fn>).mockResolvedValue({ items: [] });
    const { result } = renderHook(() => useCalendarFormations({} as never), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.isSuccess).toBe(true);
  });

  it("useCalendarParticipants disabled without id", async () => {
    const { result } = renderHook(() => useCalendarParticipants(undefined), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.isFetched).toBe(false);
  });

  it("useCalendarParticipants fetches", async () => {
    (CalendarService.getParticipants as ReturnType<typeof vi.fn>).mockResolvedValue({ items: [] });
    const { result } = renderHook(() => useCalendarParticipants(3), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(CalendarService.getParticipants).toHaveBeenCalledWith(3, 0, 50);
  });

  it("useCalendarConflicts fetches", async () => {
    (CalendarService.getConflicts as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useCalendarConflicts(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(result.current.isSuccess).toBe(true);
  });

  it("useSendInvitations calls sendInvitations", async () => {
    (CalendarService.sendInvitations as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useSendInvitations(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync(3); });
    expect(CalendarService.sendInvitations).toHaveBeenCalledWith(3);
  });

  it("useSendAllInvitations calls sendAllInvitations", async () => {
    (CalendarService.sendAllInvitations as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useSendAllInvitations(), { wrapper: createWrapper() });
    await act(async () => { await result.current.mutateAsync(); });
    expect(CalendarService.sendAllInvitations).toHaveBeenCalled();
  });
});
