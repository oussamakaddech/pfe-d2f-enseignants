import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushQuery } from "@/hooks/testUtils";
import {
  useEnseignantsInactifs, useFormationsParPeriode, useFormationsParUp,
  useFormationsParDepartement, useAnalyticsExport,
} from "@/hooks/analyse/useReporting";
import AnalyticsService from "@/services/analyse/AnalyticsService";
import { createWrapper } from "@/hooks/testUtils";

vi.mock("@/services/analyse/AnalyticsService", () => ({
  default: {
    getEnseignantsSansFormation: vi.fn(), getFormationsParPeriode: vi.fn(),
    getFormationsParUp: vi.fn(), getFormationsParDepartement: vi.fn(),
    exportExcel: vi.fn(), exportPdf: vi.fn(),
  },
  __esModule: true,
}));

describe("useReporting", () => {
  beforeEach(() => vi.clearAllMocks());

  it("useEnseignantsInactifs fetches", async () => {
    (AnalyticsService.getEnseignantsSansFormation as ReturnType<typeof vi.fn>).mockResolvedValue({ items: [] });
    const { result } = renderHook(() => useEnseignantsInactifs({ mois: 6, page: 0, size: 5 }), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(AnalyticsService.getEnseignantsSansFormation).toHaveBeenCalled();
  });

  it("useFormationsParPeriode fetches", async () => {
    (AnalyticsService.getFormationsParPeriode as ReturnType<typeof vi.fn>).mockResolvedValue({ items: [] });
    const { result } = renderHook(() => useFormationsParPeriode({ granularite: "MOIS" } as never), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(AnalyticsService.getFormationsParPeriode).toHaveBeenCalled();
  });

  it("useFormationsParUp fetches", async () => {
    (AnalyticsService.getFormationsParUp as ReturnType<typeof vi.fn>).mockResolvedValue({ items: [] });
    const { result } = renderHook(() => useFormationsParUp(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(AnalyticsService.getFormationsParUp).toHaveBeenCalled();
  });

  it("useFormationsParDepartement fetches", async () => {
    (AnalyticsService.getFormationsParDepartement as ReturnType<typeof vi.fn>).mockResolvedValue({ departements: [] });
    const { result } = renderHook(() => useFormationsParDepartement(), { wrapper: createWrapper() });
    await flushQuery(result);
    expect(AnalyticsService.getFormationsParDepartement).toHaveBeenCalled();
  });

  it("useAnalyticsExport exportExcel triggers download", async () => {
    (AnalyticsService.exportExcel as ReturnType<typeof vi.fn>).mockResolvedValue(new Blob(["x"]));
    const { result } = renderHook(() => useAnalyticsExport(), { wrapper: createWrapper() });
    await act(async () => { await result.current.exportExcel("FORMATION" as never); });
    expect(AnalyticsService.exportExcel).toHaveBeenCalled();
    expect(result.current.exporting).toBe(false);
  });

  it("useAnalyticsExport exportPdf triggers download", async () => {
    (AnalyticsService.exportPdf as ReturnType<typeof vi.fn>).mockResolvedValue(new Blob(["x"]));
    const { result } = renderHook(() => useAnalyticsExport(), { wrapper: createWrapper() });
    await act(async () => { await result.current.exportPdf("SYNTHESE" as never); });
    expect(AnalyticsService.exportPdf).toHaveBeenCalled();
  });
});
