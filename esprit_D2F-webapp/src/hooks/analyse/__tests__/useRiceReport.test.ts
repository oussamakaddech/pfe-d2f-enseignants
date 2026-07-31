import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRiceReport } from "@/hooks/analyse/useRiceReport";
import RiceService from "@/services/analyse/RiceService";

vi.mock("@/services/analyse/RiceService", () => ({
  default: { importToDb: vi.fn(), getImportHistory: vi.fn() },
  __esModule: true,
}));

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(QueryClientProvider, { client: qc }, children);

const msgApi = { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } as any;

const tree = ([{
  code: "D1", nom: "Domaine1", description: "", competences: [
    {
      code: "C1", nom: "Comp1", description: "", ordre: 1, savoirs: [
        { code: "S1", nom: "Sav1", type: "THEORIQUE", niveau: null, enseignantsSuggeres: ["1"] },
      ], sousCompetences: [],
    },
  ],
}] as any);

describe("useRiceReport", () => {
  beforeEach(() => vi.clearAllMocks());

  it("computeClientCoverage computes per-domain coverage", () => {
    const { result } = renderHook(() => useRiceReport({ tree, departement: "INFO", msgApi }), { wrapper });
    const cov = result.current.computeClientCoverage();
    expect(cov["Domaine1"]).toBe(100);
  });

  it("handleImport imports and sets report", async () => {
    (RiceService.importToDb as ReturnType<typeof vi.fn>).mockResolvedValue({
      affectationsCreated: 2, domainesCreated: 1,
    });
    const { result } = renderHook(() => useRiceReport({ tree, departement: "INFO", msgApi }), { wrapper });
    await act(async () => { await result.current.handleImport(); });
    expect(RiceService.importToDb).toHaveBeenCalled();
    expect(result.current.report?.affectationsCreated).toBe(2);
    expect(msgApi.success).toHaveBeenCalled();
  });

  it("handleImport shows error on failure", async () => {
    (RiceService.importToDb as ReturnType<typeof vi.fn>).mockRejectedValue({ response: { data: { message: "bad" } } });
    const { result } = renderHook(() => useRiceReport({ tree, departement: "INFO", msgApi }), { wrapper });
    await act(async () => { await result.current.handleImport(); });
    expect(msgApi.error).toHaveBeenCalled();
  });

  it("loadImportHistory refetches history", async () => {
    (RiceService.getImportHistory as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { result } = renderHook(() => useRiceReport({ tree, departement: "INFO", msgApi }), { wrapper });
    await act(async () => { await result.current.loadImportHistory(); });
    expect(RiceService.getImportHistory).toHaveBeenCalled();
  });
});
