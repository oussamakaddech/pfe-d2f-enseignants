import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushQuery } from "@/hooks/testUtils";
import React from "react";
import { App } from "antd";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import useStructureData from "@/hooks/competence/useStructureData";
import CompetenceService from "@/services/competence/CompetenceService";

const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(QueryClientProvider, { client: qc },
    React.createElement(App, {}, children));

vi.mock("@/services/competence/CompetenceService", () => ({
  default: {
    savoir: { getAll: vi.fn() },
    structure: {
      getArbreComplet: vi.fn(),
      rechercheParDomaine: vi.fn(),
      rechercheGlobale: vi.fn(),
    },
    niveauDefinition: {
      getByCompetence: vi.fn(),
      getBySousCompetence: vi.fn(),
      add: vi.fn(),
      remove: vi.fn(),
    },
  },
  __esModule: true,
}));
vi.mock("@/components/competence/tree/TreeNodeBuilders", () => ({
  buildDomaineNode: vi.fn((d) => ({ key: d.nom, title: d.nom })),
}));

describe("useStructureData", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches structure and builds treeData", async () => {
    (CompetenceService.structure.getArbreComplet as ReturnType<typeof vi.fn>).mockResolvedValue({
      domaines: [{ nom: "D1", competences: [] }],
    });
    (CompetenceService.savoir.getAll as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { result } = renderHook(() => useStructureData(), { wrapper });
    await flushQuery(result);
    expect(result.current.treeData).toHaveLength(1);
  });

  it("applyFilter sets filters", () => {
    const { result } = renderHook(() => useStructureData(), { wrapper });
    act(() => { result.current.applyFilter(1, 2); });
    expect(result.current.filterUpId).toBe(1);
    expect(result.current.filterDeptId).toBe(2);
  });

  it("handleClearSearch resets keyword and results", () => {
    const { result } = renderHook(() => useStructureData(), { wrapper });
    act(() => { result.current.setSearchKeyword("abc"); });
    act(() => { result.current.handleClearSearch(); });
    expect(result.current.searchKeyword).toBe("");
    expect(result.current.searchResults).toBeNull();
  });

  it("handleAddNiveauSavoir requires target", async () => {
    (CompetenceService.niveauDefinition.add as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useStructureData(), { wrapper });
    await act(async () => { await result.current.handleAddNiveauSavoir({ niveau: "N1" } as never); });
    expect(CompetenceService.niveauDefinition.add).not.toHaveBeenCalled();
  });

  it("handleAddNiveauSavoir calls add when target set", async () => {
    (CompetenceService.niveauDefinition.add as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const { result } = renderHook(() => useStructureData(), { wrapper });
    act(() => { result.current.openNiveauModal("competence", 5, "c"); });
    await act(async () => { await result.current.handleAddNiveauSavoir({ niveau: "N1" } as never); });
    expect(CompetenceService.niveauDefinition.add).toHaveBeenCalled();
  });
});
