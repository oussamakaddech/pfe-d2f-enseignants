import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useTeacherSearch, formatTeacherLabel, getTeacherId } from "@/hooks/formation/useTeacherSearch";
import UnifiedProfileService from "@/services/formation/UnifiedProfileService";
import { createWrapper } from "@/hooks/testUtils";

vi.mock("@/services/formation/UnifiedProfileService", () => ({
  default: { search: vi.fn() },
  __esModule: true,
}));

describe("useTeacherSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it("disabled when term shorter than 2 chars", async () => {
    const { result } = renderHook(() => useTeacherSearch("a"), { wrapper: createWrapper() });
    await vi.advanceTimersByTimeAsync(0);
    expect(result.current.isFetched).toBe(false);
  });

  it("fetches and filters teacher roles after debounce", async () => {
    (UnifiedProfileService.search as ReturnType<typeof vi.fn>).mockResolvedValue([
      { prenom: "A", nom: "B", departement: "D", matricule: "1", role: "enseignant" },
      { prenom: "C", nom: "D", departement: "D", matricule: "2", role: "admin" },
    ]);
    const { result } = renderHook(() => useTeacherSearch("prof"), { wrapper: createWrapper() });
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    await vi.waitFor(() => { if (!result.current.data) throw new Error("pending"); }, { timeout: 2000 });
    expect(UnifiedProfileService.search).toHaveBeenCalled();
    expect(result.current.data?.length).toBe(1);
  });

  it("formatTeacherLabel formats name", () => {
    expect(formatTeacherLabel({ prenom: "A", nom: "B", departement: "D", matricule: "1" } as never))
      .toBe("A B — D (1)");
  });

  it("getTeacherId returns matricule or id", () => {
    expect(getTeacherId({ matricule: "m", id: "i" } as never)).toBe("m");
    expect(getTeacherId({ id: "i" } as never)).toBe("i");
  });
});
