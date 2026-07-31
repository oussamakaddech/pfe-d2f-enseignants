import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRiceAnalysis } from "@/hooks/analyse/useRiceAnalysis";

vi.mock("@/pages/competence/rice/constants", () => ({
  cloneDeep: (x: unknown) => JSON.parse(JSON.stringify(x)),
  __esModule: true,
}));
vi.mock("@/utils/secureRandom", () => ({
  secureRandomUnit: () => 0.5,
  __esModule: true,
}));

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(QueryClientProvider, { client: qc }, children);

const makeEnseignant = (over: Record<string, unknown> = {}) => ({ id: 1, nom: "Doe", prenom: "John", modules: ["M1"], ...over });

const baseParams = (over: Record<string, unknown> = {}) => ({
  files: [] as File[],
  departement: "INFO",
  allEnseignants: [makeEnseignant()] as any,
  ignoreEnseignants: false,
  riceAnalyze: { mutateAsync: vi.fn() } as any,
  msgApi: { warning: vi.fn(), error: vi.fn(), success: vi.fn(), info: vi.fn() } as any,
  setTree: vi.fn(),
  setCurrentStep: vi.fn(),
  setDepartement: vi.fn(),
  skipHistoryRef: { current: false } as React.MutableRefObject<boolean>,
  prevTreeRef: { current: null } as React.MutableRefObject<never>,
  ...over,
});

describe("useRiceAnalysis", () => {
  beforeEach(() => { vi.clearAllMocks(); sessionStorage.clear(); });

  it("initial state", () => {
    const { result } = renderHook(() => useRiceAnalysis(baseParams()), { wrapper });
    expect(result.current.analyzing).toBe(false);
    expect(result.current.analysisProgress).toBe(0);
    expect(result.current.analysisResult).toBeNull();
    expect(result.current.extractedEnseignants).toEqual([]);
    expect(result.current.ensSearchStep2).toBe("");
    expect(typeof result.current.handleAnalyze).toBe("function");
    expect(typeof result.current.handleUploadChange).toBe("function");
  });

  it("handleAnalyze warns when no files", async () => {
    const msgApi = { warning: vi.fn(), error: vi.fn() } as any;
    const { result } = renderHook(() => useRiceAnalysis(baseParams({ files: [], msgApi })), { wrapper });
    await act(async () => { await result.current.handleAnalyze(); });
    expect(msgApi.warning).toHaveBeenCalledWith("Veuillez charger au moins un fichier.");
  });

  it("handleAnalyze success updates state and tree", async () => {
    vi.useFakeTimers();
    const setTree = vi.fn();
    const setCurrentStep = vi.fn();
    const skipHistoryRef = { current: false } as React.MutableRefObject<boolean>;
    const prevTreeRef = { current: null } as React.MutableRefObject<never>;
    const riceAnalyze = { mutateAsync: vi.fn().mockResolvedValue({
      propositions: [{ code: "D1", nom: "Domaine", competences: [] }],
      extractedEnseignants: [{ nom_complet: "Jane Smith" }],
      detectedDepartement: "INFO",
    } as any) } as any;
    const { result } = renderHook(() => useRiceAnalysis(baseParams({
      files: [new File([], "a.pdf")], riceAnalyze, setTree, setCurrentStep, skipHistoryRef, prevTreeRef,
    })), { wrapper });

    await act(async () => {
      const p = result.current.handleAnalyze();
      await Promise.resolve();
      await vi.runAllTimersAsync();
      await p;
    });
    vi.useRealTimers();

    expect(riceAnalyze.mutateAsync).toHaveBeenCalledOnce();
    expect(result.current.analyzing).toBe(false);
    expect(result.current.analysisProgress).toBe(100);
    expect(setTree).toHaveBeenCalledOnce();
    expect(skipHistoryRef.current).toBe(true);
    expect(prevTreeRef.current).toEqual(setTree.mock.calls[0][0]);
    expect(result.current.analysisResult).toMatchObject({ detectedDepartement: "INFO" });
    expect(result.current.extractedEnseignants).toEqual([{ nom_complet: "Jane Smith" }]);
    expect(sessionStorage.getItem("rice_extracted_enseignants")).toContain("Jane Smith");
  });

  it("handleAnalyze dedupes extracted enseignants already in DB", async () => {
    vi.useFakeTimers();
    const allEnseignants = [makeEnseignant({ nom: "Smith", prenom: "Jane" })] as any;
    const riceAnalyze = { mutateAsync: vi.fn().mockResolvedValue({
      propositions: [],
      extractedEnseignants: [{ nom_complet: "Jane Smith" }, { nom_complet: "Jane Smith" }],
    } as any) } as any;
    const { result } = renderHook(() => useRiceAnalysis(baseParams({ files: [new File([], "a.pdf")], riceAnalyze, allEnseignants })), { wrapper });
    await act(async () => {
      const p = result.current.handleAnalyze();
      await Promise.resolve();
      await vi.runAllTimersAsync();
      await p;
    });
    vi.useRealTimers();
    expect(result.current.extractedEnseignants).toEqual([]);
  });

  it("handleAnalyze detects new department and warns", async () => {
    vi.useFakeTimers();
    const setDepartement = vi.fn();
    const msgApi = { warning: vi.fn(), error: vi.fn() } as any;
    const riceAnalyze = { mutateAsync: vi.fn().mockResolvedValue({
      propositions: [],
      detectedDepartement: "TI",
    } as any) } as any;
    const { result } = renderHook(() => useRiceAnalysis(baseParams({ files: [new File([], "a.pdf")], riceAnalyze, setDepartement, msgApi })), { wrapper });
    await act(async () => {
      const p = result.current.handleAnalyze();
      await Promise.resolve();
      await vi.runAllTimersAsync();
      await p;
    });
    vi.useRealTimers();
    expect(msgApi.warning).toHaveBeenCalledWith("Département détecté : TI. Rechargement des enseignants...");
    expect(setDepartement).toHaveBeenCalledWith("ti");
  });

  it("handleAnalyze error path", async () => {
    vi.useFakeTimers();
    const setCurrentStep = vi.fn();
    const msgApi = { warning: vi.fn(), error: vi.fn() } as any;
    const riceAnalyze = { mutateAsync: vi.fn().mockRejectedValue({ response: { data: { detail: "boom" } } }) } as any;
    const { result } = renderHook(() => useRiceAnalysis(baseParams({ files: [new File([], "a.pdf")], riceAnalyze, setCurrentStep, msgApi })), { wrapper });
    await act(async () => {
      const p = result.current.handleAnalyze();
      await Promise.resolve();
      await vi.runAllTimersAsync();
      await p;
    });
    vi.useRealTimers();
    expect(msgApi.error).toHaveBeenCalledWith("boom");
    expect(setCurrentStep).toHaveBeenCalledWith(0);
    expect(result.current.analyzing).toBe(false);
  });

  it("handleAnalyze falls back to message on error", async () => {
    vi.useFakeTimers();
    const msgApi = { warning: vi.fn(), error: vi.fn() } as any;
    const riceAnalyze = { mutateAsync: vi.fn().mockRejectedValue({ message: "kaboom" }) } as any;
    const { result } = renderHook(() => useRiceAnalysis(baseParams({ files: [new File([], "a.pdf")], riceAnalyze, msgApi })), { wrapper });
    await act(async () => {
      const p = result.current.handleAnalyze();
      await Promise.resolve();
      await vi.runAllTimersAsync();
      await p;
    });
    vi.useRealTimers();
    expect(msgApi.error).toHaveBeenCalledWith("kaboom");
  });

  it("handleUploadChange filters by extension and size", () => {
    const msgApi = { warning: vi.fn(), error: vi.fn() } as any;
    const { result } = renderHook(() => useRiceAnalysis(baseParams({ msgApi })), { wrapper });
    const big = new File([new Uint8Array(21 * 1024 * 1024)], "big.pdf");
    Object.defineProperty(big, "size", { value: 21 * 1024 * 1024 });
    const bad = new File([], "x.png");
    const ok1 = new File([], "a.pdf");
    const ok2 = new File([], "b.docx");
    const accepted = result.current.handleUploadChange({
      fileList: [
        { originFileObj: big, name: "big.pdf", size: 21 * 1024 * 1024 },
        { originFileObj: bad, name: "x.png", size: 1 },
        { originFileObj: ok1, name: "a.pdf", size: 1 },
        { originFileObj: ok2, name: "b.docx", size: 1 },
      ] as any,
    });
    expect(accepted).toHaveLength(2);
    expect(msgApi.warning).toHaveBeenCalledTimes(2);
  });

  it("handleUploadChange rejects files without originFileObj", () => {
    const msgApi = { warning: vi.fn(), error: vi.fn() } as any;
    const { result } = renderHook(() => useRiceAnalysis(baseParams({ msgApi })), { wrapper });
    const accepted = result.current.handleUploadChange({ fileList: [{ name: "a.pdf" }] as any });
    expect(accepted).toHaveLength(0);
    expect(msgApi.warning).not.toHaveBeenCalled();
  });

  it("cleanTreePropositions drops metadata savoirs and empty sous-competences", async () => {
    vi.useFakeTimers();
    const riceAnalyze = { mutateAsync: vi.fn().mockResolvedValue({
      propositions: [{
        code: "D", nom: "D", competences: [{
          code: "C", nom: "C", savoirs: [
            { code: "S1", nom: "Code: HE: HNE: Responsable:", enseignantsSuggeres: ["e1"] },
            { code: "S2", nom: "Real savoir name", enseignantsSuggeres: ["e2"] },
          ],
          sousCompetences: [{ code: "SC", nom: "SC", savoirs: [{ code: "S3", nom: "Metadata line: : :", enseignantsSuggeres: [] }] }],
        }],
      }],
    } as any) } as any;
    const setTree = vi.fn();
    const { result } = renderHook(() => useRiceAnalysis(baseParams({ files: [new File([], "a.pdf")], riceAnalyze, setTree })), { wrapper });
    await act(async () => {
      const p = result.current.handleAnalyze();
      await Promise.resolve();
      await vi.runAllTimersAsync();
      await p;
    });
    vi.useRealTimers();
    const tree = setTree.mock.calls[0][0] as any[];
    const comp = (tree[0] as { competences: { savoirs: unknown[]; sousCompetences: unknown[] }[] }).competences[0];
    expect(comp.savoirs).toHaveLength(1);
    expect((comp.savoirs[0] as { nom: string }).nom).toBe("Real savoir name");
    expect(comp.sousCompetences).toHaveLength(0);
  });

  it("setters update state", () => {
    const { result } = renderHook(() => useRiceAnalysis(baseParams()), { wrapper });
    act(() => result.current.setAnalyzing(true));
    act(() => result.current.setAnalysisProgress(50));
    act(() => result.current.setEnsSearchStep2("foo"));
    act(() => result.current.setExtractedEnseignants([{ nom_complet: "A B" }] as any));
    expect(result.current.analyzing).toBe(true);
    expect(result.current.analysisProgress).toBe(50);
    expect(result.current.ensSearchStep2).toBe("foo");
    expect(result.current.extractedEnseignants).toHaveLength(1);
  });

  it("handleAnalyze sends empty enseignants when ignoreEnseignants", async () => {
    vi.useFakeTimers();
    const riceAnalyze = { mutateAsync: vi.fn().mockResolvedValue({ propositions: [] }) } as any;
    const { result } = renderHook(() => useRiceAnalysis(baseParams({ files: [new File([], "a.pdf")], riceAnalyze, ignoreEnseignants: true, allEnseignants: [makeEnseignant()] as any })), { wrapper });
    await act(async () => {
      const p = result.current.handleAnalyze();
      await Promise.resolve();
      await vi.runAllTimersAsync();
      await p;
    });
    vi.useRealTimers();
    const sent = riceAnalyze.mutateAsync.mock.calls[0][0] as { enseignants: unknown[] };
    expect(sent.enseignants).toEqual([]);
  });

  it("handleAnalyze includes enseignants mapped from allEnseignants", async () => {
    vi.useFakeTimers();
    const riceAnalyze = { mutateAsync: vi.fn().mockResolvedValue({ propositions: [] }) } as any;
    const { result } = renderHook(() => useRiceAnalysis(baseParams({ files: [new File([], "a.pdf")], riceAnalyze, allEnseignants: [makeEnseignant({ id: 7, nom: "X", prenom: "Y", modules: ["M2"] })] as any })), { wrapper });
    await act(async () => {
      const p = result.current.handleAnalyze();
      await Promise.resolve();
      await vi.runAllTimersAsync();
      await p;
    });
    vi.useRealTimers();
    const sent = riceAnalyze.mutateAsync.mock.calls[0][0] as { enseignants: { id: string; nom: string; prenom: string; modules: string[] }[] };
    expect(sent.enseignants[0]).toMatchObject({ id: "7", nom: "X", prenom: "Y", modules: ["M2"] });
  });
});
