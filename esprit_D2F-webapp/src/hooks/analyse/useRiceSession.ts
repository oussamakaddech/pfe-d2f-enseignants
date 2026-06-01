import { useState, useEffect, useRef, useCallback } from "react";
import type { RefObject } from "react";
import type { RiceDomaine } from "@/models/competence";
import { cloneDeep, STORAGE_KEY } from "@/pages/competence/rice/constants";

interface MsgApi {
  info: (msg: string) => void;
}

interface UseRiceSessionParams {
  tree: RiceDomaine[];
  currentStep: number;
  departement: string;
  filesCount: number;
  analyzing: boolean;
  importing: boolean;
  handleAnalyze: () => Promise<void>;
  handleImport: () => void | Promise<void>;
  msgApi: MsgApi;
  setTree: (tree: RiceDomaine[]) => void;
  editingNom: unknown;
  mergeModal: boolean;
  setEditingNom: (v: null) => void;
  setMergeModal: (v: boolean) => void;
  setMergeSrc: (v: null) => void;
  setMergeDst: (v: null) => void;
  skipHistoryRef: RefObject<boolean>;
  prevTreeRef: RefObject<RiceDomaine[]>;
}

export function useRiceSession({
  tree, currentStep, departement, filesCount,
  analyzing, importing, handleAnalyze, handleImport,
  msgApi, setTree,
  editingNom, mergeModal, setEditingNom, setMergeModal, setMergeSrc, setMergeDst,
  skipHistoryRef, prevTreeRef,
}: UseRiceSessionParams) {
  const [treeHistory, setTreeHistory] = useState<RiceDomaine[][]>([]);
  const [showAutosave, setShowAutosave] = useState(false);
  const autosaveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosaveHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Undo history tracking
  useEffect(() => {
    const prevTree = prevTreeRef.current;
    if (JSON.stringify(prevTree ?? []) === JSON.stringify(tree ?? [])) return;
    if (skipHistoryRef.current) {
      skipHistoryRef.current = false;
      prevTreeRef.current = cloneDeep(tree);
      return;
    }
    if (currentStep === 2 && Array.isArray(prevTree) && prevTree.length > 0) {
      setTreeHistory((hist) => [...hist, cloneDeep(prevTree)].slice(-10));
    }
    prevTreeRef.current = cloneDeep(tree);
  }, [tree, currentStep, skipHistoryRef, prevTreeRef]);

  // Autosave to sessionStorage while on step 2
  useEffect(() => {
    if (currentStep !== 2) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ departement, tree, currentStep, savedAt: Date.now() }));
    } catch { /* ignore quota/security failures */ }
    if (autosaveDebounceRef.current) clearTimeout(autosaveDebounceRef.current);
    if (autosaveHideRef.current) clearTimeout(autosaveHideRef.current);
    autosaveDebounceRef.current = setTimeout(() => {
      setShowAutosave(true);
      autosaveHideRef.current = setTimeout(() => setShowAutosave(false), 3000);
    }, 2000);
    return () => {
      if (autosaveDebounceRef.current) clearTimeout(autosaveDebounceRef.current);
      if (autosaveHideRef.current) clearTimeout(autosaveHideRef.current);
    };
  }, [tree, currentStep, departement]);

  // Keyboard shortcuts
  const handleCtrlEnter = useCallback((e: KeyboardEvent) => {
    if (!(e.ctrlKey || e.metaKey) || e.key !== "Enter") return;
    e.preventDefault();
    if (currentStep === 0 && filesCount > 0 && !analyzing) { handleAnalyze(); return; }
    if (currentStep === 3 && !importing) { handleImport(); }
  }, [currentStep, filesCount, analyzing, importing, handleAnalyze, handleImport]);

  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    if (editingNom) setEditingNom(null);
    if (mergeModal) { setMergeModal(false); setMergeSrc(null); setMergeDst(null); }
  }, [editingNom, mergeModal, setEditingNom, setMergeModal, setMergeSrc, setMergeDst]);

  const handleCtrlZ = useCallback((e: KeyboardEvent) => {
    if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "z") return;
    if (currentStep !== 2 || treeHistory.length === 0) return;
    e.preventDefault();
    const previous = treeHistory.at(-1);
    skipHistoryRef.current = true;
    setTree(cloneDeep(previous) as RiceDomaine[]);
    setTreeHistory((hist) => hist.slice(0, -1));
    msgApi.info("Modification annulée (Ctrl+Z)");
  }, [currentStep, treeHistory, skipHistoryRef, setTree, msgApi]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { handleCtrlEnter(e); handleEscape(e); handleCtrlZ(e); };
    globalThis.addEventListener("keydown", onKeyDown);
    return () => globalThis.removeEventListener("keydown", onKeyDown);
  }, [handleCtrlEnter, handleEscape, handleCtrlZ]);

  return { treeHistory, setTreeHistory, showAutosave };
}
