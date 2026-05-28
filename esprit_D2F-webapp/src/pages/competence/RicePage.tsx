// RICE - Referentiel Intelligent de Competences Enseignants
// Slim orchestrator: owns cross-cutting state and delegates rendering to step components.
//
// Architecture:
//   * useRiceTree       - all tree state + operations + derived memos
//   * useDragAndDrop    - HTML5 DnD state + event handlers
//   * useRiceReport     - Step-3 import/report state
//   * UploadStep        - Step 0 JSX
//   * AnalyzingStep     - Step 1 JSX
//   * ReviewStep        - Step 2 JSX (tree + DnD)
//   * ReportStep        - Step 3 JSX

import React, {
  useState, useEffect, useCallback, useRef, useMemo,
} from "react";
import type { ComponentProps } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert, Button, Card, Input, Modal, Select, Space, Steps, Typography,
} from "antd";
import {
  BarChartOutlined, EditOutlined, InboxOutlined,
  LoadingOutlined, MergeCellsOutlined, RobotOutlined,
  ThunderboltOutlined, UserAddOutlined,
} from "@ant-design/icons";
import { AnimatePresence, motion } from "framer-motion";
import type { Variants } from "framer-motion";

import { useRiceTree }    from "@/hooks/analyse/useRiceTree";
import { useDragAndDrop } from "@/hooks/ui/useDragAndDrop";
import { useRiceReport }  from "@/hooks/analyse/useRiceReport";

import { useRiceEnseignants, useRiceAnalyze } from "@/hooks/analyse/useRiceService";
import { useCreateEnseignant } from "@/hooks/enseignant/useEnseignants";

import UploadStep    from "./rice/UploadStep";
import AnalyzingStep from "./rice/AnalyzingStep";
import ReviewStep    from "./rice/ReviewStep";
import ReportStep    from "./rice/ReportStep";
import { cloneDeep, STORAGE_KEY } from "./rice/constants";
import type { RiceDomaine } from "@/models/competence";

import "@/styles/pages/rice-page.css";
import useAppNotification from "@/hooks/ui/useAppNotification";

const { Text, Title, Paragraph } = Typography;
const { Option } = Select;

// Department → accent colour used as a CSS custom property on the page root.
const DEPT_ACCENT = {
  gc:     "#52c41a",
  info:   "#1677ff",
  telecom:"#722ed1",
  ge:     "#fa541c",
  meca:   "#fa8c16",
};

interface EnseignantRef extends Record<string, unknown> {
  id?: string | number;
  enseignantId?: string | number;
  nom?: string;
  prenom?: string;
  modules?: string[];
}

interface ExtractedEnseignant extends Record<string, unknown> {
  nom_complet?: string;
  fichier?: string;
  matched_id?: string | number;
}

interface AnalysisResult extends Record<string, unknown> {
  propositions?: RiceDomaine[];
  extractedEnseignants?: ExtractedEnseignant[];
  foundEnseignants?: EnseignantRef[];
  detectedDepartement?: string;
  detectedDepartment?: string;
  departementDetecte?: string;
  departement_detecte?: string;
  stats?: { departement?: string };
}

interface CreateEnsTarget {
  path?: number[];
  eid?: string;
}

// Shared spring transition for step panels
const STEP_VARIANTS: Variants = {
  initial: { opacity: 0, y: 18, scale: 0.98 },
  animate: { opacity: 1, y: 0,  scale: 1,    transition: { type: "spring", stiffness: 300, damping: 28 } },
  exit:    { opacity: 0, y: -12, scale: 0.97, transition: { duration: 0.18 } },
};

const isLikelyValidExtractedName = (value: unknown) => {
  const name = String(value ?? "").trim();
  if (name.length < 5) return false;
  if (name.includes(":")) return false;
  const low = name.toLowerCase();
  if (/^(module|code|unite|unit[eé]|responsable|pr[ée]requis|niveaux|objectif)\b/i.test(name)) {
    return false;
  }
  if (low.includes("module") && low.includes("unite")) return false;
  return /[a-zà-ÿ]{2,}\s+[a-zà-ÿ]{2,}/i.test(name);
};

// ---------------------------------------------------------------------------
export default function RicePage() {
  const { message: msgApi } = useAppNotification();
  const navigate = useNavigate();

  // -- Step control -----------------------------------------------------------
  const [currentStep, setCurrentStep] = useState(0);

  // -- Step 0 state -----------------------------------------------------------
  const [files, setFiles] = useState<File[]>([]);
  const [departement, setDepartement] = useState("auto");
  const [allEnseignants, setAllEnseignants] = useState<EnseignantRef[]>([]);
  const [enseignantsLoading, setEnseignantsLoading] = useState(false);
  const [enseignantsError, setEnseignantsError] = useState<string | null>(null);
  const [enseignantsLoadSlow, setEnseignantsLoadSlow] = useState(false);
  const [ignoreEnseignants, setIgnoreEnseignants] = useState(false);
  const [enseignantsReloadKey, setEnseignantsReloadKey] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  // -- Step 1 state -----------------------------------------------------------
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const analyzeIsCanceledRef = useRef(false);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // -- Step 2 teacher state ---------------------------------------------------
  const [extractedEnseignants, setExtractedEnseignants] = useState<ExtractedEnseignant[]>([]);
  const [ensSearchStep2, setEnsSearchStep2] = useState("");
  const [treeHistory, setTreeHistory] = useState<RiceDomaine[][]>([]);
  const [showAutosave, setShowAutosave] = useState(false);

  // -- Create-teacher modal state ---------------------------------------------
  const [createEnsModal, setCreateEnsModal] = useState(false);
  const [createEnsTarget, setCreateEnsTarget] = useState<CreateEnsTarget | null>(null);
  const [createEnsData, setCreateEnsData] = useState({ nom: "", prenom: "", mail: "" });
  const [savingNewEns, setSavingNewEns] = useState(false);
  const autosaveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosaveHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevTreeRef = useRef<RiceDomaine[]>([]);
  const skipHistoryRef = useRef(false);

  // -- Custom hooks -----------------------------------------------------------
  const riceAnalyze = useRiceAnalyze();
  const createEnseignantHook = useCreateEnseignant();

  const treeHook = useRiceTree(msgApi);
  const {
    tree, setTree,
    treeSearch, setTreeSearch,
    editingNom, setEditingNom,
    mergeModal, setMergeModal,
    mergeSrc, setMergeSrc, mergeDst, setMergeDst,
    updateTree,
    startRename, commitRename,
    // create helpers
    addDomaine, addCompetence, addSousCompetence, addSavoir,
    deleteSavoir, deleteSC, deleteComp, deleteDomaine,
    toggleType, setNiveau, toggleEnsAssign, setEnseignants,
    clearAllAssignments, remapInTree,
    openMerge, confirmMerge,
    allSavoirsFlat, liveStats, treeFilteredIndices,
  } = treeHook;

  // -- effectiveEnseignants: teachers shown in the Step-2 right panel ---------
  // Combines DB-matched enseignants from the fiche with ext_ synthetic IDs.
  const effectiveEnseignants = useMemo(() => {
    const dbMap = new Map(
      (allEnseignants ?? []).map((e) => [String(e.id ?? e.enseignantId), e]),
    );

    (analysisResult?.foundEnseignants ?? []).forEach((e) => {
      const id = String(e.id ?? e.enseignantId);
      if (!dbMap.has(id)) dbMap.set(id, { ...e, id, enseignantId: id });
    });

    return Array.from(dbMap.values());
  }, [allEnseignants, analysisResult]);

  const filteredEffectiveEns = useMemo(() => {
    if (!ensSearchStep2.trim()) return effectiveEnseignants;
    const q = ensSearchStep2.toLowerCase();
    return effectiveEnseignants.filter(
      (e) =>
        (e.nom ?? "").toLowerCase().includes(q) ||
        (e.prenom ?? "").toLowerCase().includes(q) ||
        String(e.id ?? e.enseignantId).toLowerCase().includes(q),
    );
  }, [effectiveEnseignants, ensSearchStep2]);

  // -- useDragAndDrop ---------------------------------------------------------
  const dndHook = useDragAndDrop({
    tree, toggleEnsAssign, updateTree, effectiveEnseignants, msgApi,
  });

  // -- useRiceReport ----------------------------------------------------------
  const reportHook = useRiceReport({
    tree,
    departement,
    msgApi,
    onImportSuccess: () => setCurrentStep(3),
  });
  const {
    importing, report, setReport,
    importHistory, setImportHistory,
    historyLoading, handleImport, loadImportHistory, exportReportJson,
  } = reportHook;

  // -- Load enseignants from DB (mount + department change) ------------------
  const riceEnsQuery = useRiceEnseignants(departement === "auto" ? null : departement);
  const ensSlowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadEnseignants = useCallback(() => {
    setIgnoreEnseignants(false);
    riceEnsQuery.refetch();
  }, [riceEnsQuery.refetch]);

  const continueWithoutEnseignants = useCallback(() => {
    setIgnoreEnseignants(true);
    setEnseignantsLoadSlow(false);
    setEnseignantsError(null);
    setEnseignantsLoading(false);
    setAllEnseignants([]);
  }, []);

  useEffect(() => {
    if (ignoreEnseignants) return;

    if (riceEnsQuery.isLoading) {
      setEnseignantsLoading(true);
      setEnseignantsError(null);
      setEnseignantsLoadSlow(false);
      ensSlowTimerRef.current = setTimeout(() => {
        setEnseignantsLoadSlow(true);
      }, 5000);
    }

    if (riceEnsQuery.data) {
      if (ensSlowTimerRef.current) clearTimeout(ensSlowTimerRef.current);
      setAllEnseignants(Array.isArray(riceEnsQuery.data) ? riceEnsQuery.data : []);
      setEnseignantsLoading(false);
      setEnseignantsLoadSlow(false);
    }

    if (riceEnsQuery.error) {
      if (ensSlowTimerRef.current) clearTimeout(ensSlowTimerRef.current);
      const err = riceEnsQuery.error as { response?: { status?: number } };
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        setEnseignantsError("Session expirée. Veuillez vous reconnecter pour charger les enseignants.");
        msgApi.warning("Session expirée — reconnectez-vous");
      } else {
        setEnseignantsError(
          "Impossible de charger les enseignants. Vérifiez votre connexion ou contactez l&apos;admin.",
        );
        msgApi.warning("Enseignants non chargés — affectation manuelle uniquement");
      }
      setAllEnseignants([]);
      setEnseignantsLoading(false);
      setEnseignantsLoadSlow(false);
    }

    return () => {
      if (ensSlowTimerRef.current) clearTimeout(ensSlowTimerRef.current);
    };
  }, [riceEnsQuery.data, riceEnsQuery.isLoading, riceEnsQuery.error, ignoreEnseignants, msgApi]);

  // -- Upload change handler --------------------------------------------------
  const handleUploadChange = useCallback(({ fileList }: { fileList: Array<{ originFileObj?: File; name?: string; size?: number }> }) => {
    const allowed = new Set(["pdf", "docx", "doc", "txt"]);
    const maxSize = 20 * 1024 * 1024;
    const accepted: File[] = [];

    for (const f of fileList) {
      const raw = f.originFileObj;
      if (!raw) continue;
      const name = raw?.name ?? "fichier";
      const ext = (name.split(".").pop() || "").toLowerCase();

      if (!allowed.has(ext)) {
        msgApi.warning(`&apos;${name}&apos; n&apos;est pas supporté — seuls PDF, DOCX et TXT sont acceptés`);
        continue;
      }
      if ((raw.size ?? 0) > maxSize) {
        msgApi.warning(`&apos;${name}&apos; dépasse 20 Mo`);
        continue;
      }
      accepted.push(raw);
    }

    setFiles(accepted);
  }, [msgApi]);

  // -- Step 1: Launch AI analysis --------------------------------------------
  const cleanTreePropositions = (propositions: RiceDomaine[]) => {
    const cleaned = cloneDeep(propositions);
    for (const d of cleaned)
      for (const c of d.competences ?? []) {
        for (const s of c.savoirs ?? []) {
          const suggested = (s.enseignantsSuggeres ?? []).map(String);
          s.aiSuggestedIds = suggested;
          s.enseignantsSuggeres = []; // Clear auto-assignments – use Matchmaking page instead
        }
        for (const sc of c.sousCompetences ?? [])
          for (const s of sc.savoirs ?? []) {
            const suggested = (s.enseignantsSuggeres ?? []).map(String);
            s.aiSuggestedIds = suggested;
            s.enseignantsSuggeres = []; // Clear auto-assignments – use Matchmaking page instead
          }
      }
    return cleaned;
  };

  const deduplicateExtractedEnseignants = (extracted: ExtractedEnseignant[]) => {
    const extractedClean = (extracted ?? []).filter(
      (ex) => isLikelyValidExtractedName(ex?.nom_complet),
    );
    const dbNameSets = new Set<string>();
    (allEnseignants ?? []).forEach((e) => {
      const nom = String(e.nom ?? "").trim().toLowerCase();
      const prenom = String(e.prenom ?? "").trim().toLowerCase();
      if (nom && prenom) {
        dbNameSets.add(`${nom} ${prenom}`);
        dbNameSets.add(`${prenom} ${nom}`);
      }
    });
    const dedupMap = new Map<string, ExtractedEnseignant>();
    extractedClean.forEach((ex) => {
      const key = String(ex?.nom_complet ?? "").trim().toLowerCase();
      if (!key || dedupMap.has(key)) return;
      // Check if this extracted name matches any DB enseignant (handles both "nom prenom" and "prenom nom")
      const nameParts = key.split(/\s+/).filter(Boolean);
      let matchesDB = dbNameSets.has(key);
      if (!matchesDB && nameParts.length >= 2) {
        // Try first two parts as "prenom nom" or "nom prenom"
        const combo1 = `${nameParts[0]} ${nameParts[1]}`;
        const combo2 = `${nameParts[1]} ${nameParts[0]}`;
        matchesDB = dbNameSets.has(combo1) || dbNameSets.has(combo2);
      }
      if (matchesDB) return; // Skip – already exists in DB
      dedupMap.set(key, ex);
    });
    setExtractedEnseignants(Array.from(dedupMap.values()));
    try {
      sessionStorage.setItem("rice_extracted_enseignants", JSON.stringify(Array.from(dedupMap.values())));
    } catch {
      // ignore
    }
  };

  const detectDepartment = (result: AnalysisResult) => {
    const detectedDept = String(
      result?.detectedDepartement
        ?? result?.detectedDepartment
        ?? result?.departementDetecte
        ?? result?.departement_detecte
        ?? result?.stats?.departement
        ?? "",
    ).toLowerCase();
    if (
      departement !== "auto"
      && detectedDept
      && detectedDept !== departement.toLowerCase()
    ) {
      msgApi.warning(`Département détecté : ${detectedDept.toUpperCase()}. Rechargement des enseignants...`);
      setDepartement(detectedDept);
    }
  };

  const handleAnalyze = async () => {
    if (files.length === 0) {
      msgApi.warning("Veuillez charger au moins un fichier.");
      return;
    }
    const enseignants = (ignoreEnseignants ? [] : allEnseignants).map((e) => ({
      id: String(e.id ?? e.enseignantId),
      nom: e.nom ?? "",
      prenom: e.prenom ?? "",
      modules: e.modules ?? [],
    }));

    analyzeIsCanceledRef.current = false;
    setAnalyzing(true);
    setAnalysisProgress(0);
    setCurrentStep(1);

    progressTimerRef.current = setInterval(() => {
      setAnalysisProgress((p) => (p <90 ? p + Math.random() * 15 : p));
    }, 800);

    try {
      const result = await riceAnalyze.mutateAsync({
        files: files.filter(Boolean), enseignants, departement,
      });
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      if (analyzeIsCanceledRef.current) return;
      setAnalysisProgress(100);

      const cleaned = cleanTreePropositions(result.propositions);
      setTree(cleaned);
      setAnalysisResult(result);
      skipHistoryRef.current = true;
      prevTreeRef.current = cloneDeep(cleaned);
      setTreeHistory([]);
      deduplicateExtractedEnseignants(result.extractedEnseignants);
      detectDepartment(result);

      setTimeout(() => setCurrentStep(2), 400);
    } catch (err: unknown) {
      clearInterval(progressTimerRef.current ?? undefined);
      if (analyzeIsCanceledRef.current) return;
      const e = err as { response?: { data?: { detail?: string } }; message?: string };
      msgApi.error(e?.response?.data?.detail ?? e?.message ?? "Erreur d'analyse IA");
      setCurrentStep(0);
    } finally {
      setAnalyzing(false);
    }
  };

  // -- Remap ext_ ID to real DB ID across tree + extracted list ---------------
  const remapEnseignant = useCallback(
    (extId: string, realId: string) => {
      remapInTree(extId, realId);
      const extIdx = Number.parseInt(extId.replace("ext_", ""), 10);
      setExtractedEnseignants((prev) => {
        const next = prev.map((ex, i) => (i === extIdx ? { ...ex, matched_id: realId } : ex));
        try { sessionStorage.setItem("rice_extracted_enseignants", JSON.stringify(next)); } catch { }
        return next;
      });
      msgApi.success("Enseignant identifie");
    },
    [remapInTree, msgApi],
  );

  // -- Create new teacher from the non-identified panel ----------------------
  const handleCreateNewEnseignant = useCallback(async () => {
    if (!createEnsTarget || !createEnsData.nom.trim()) {
      msgApi.warning("Le nom est requis");
      return;
    }
    setSavingNewEns(true);
    try {
      const nomUp  = createEnsData.nom.trim().toUpperCase();
      const prenom = createEnsData.prenom.trim();
      const mail =
        createEnsData.mail.trim() ||
        `${nomUp.toLowerCase()}.${prenom.toLowerCase().replaceAll(/\s+/g, ".")}@esprit.tn`;
      const created = await createEnseignantHook.mutateAsync({
        nom: nomUp, prenom, mail, type: "P", etat: "A",
      });
      const realId = String(created.id ?? created.enseignantId);
      setAllEnseignants((prev) => [...prev, { ...created, enseignantId: realId }]);
      if (Array.isArray(createEnsTarget.path) && createEnsTarget.path.length >= 3) {
        const [di, ci, sci, si] = createEnsTarget.path;
        const current = sci === -1
          ? tree?.[di]?.competences?.[ci]?.savoirs?.[si]
          : tree?.[di]?.competences?.[ci]?.sousCompetences?.[sci]?.savoirs?.[si];
        if (current) {
          const ids = new Set((current.enseignantsSuggeres ?? []).map(String));
          ids.add(realId);
          setEnseignants(di, ci, sci, si, Array.from(ids));
        }
        msgApi.success(`Enseignant ${prenom} ${nomUp} crée et lié au savoir sélectionné`);
      } else if (createEnsTarget.eid) {
        remapEnseignant(createEnsTarget.eid, realId);
        msgApi.success(`Enseignant ${prenom} ${nomUp} créé et lié`);
      } else {
        msgApi.success(`Enseignant ${prenom} ${nomUp} créé`);
      }
      setCreateEnsModal(false);
      setCreateEnsTarget(null);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      msgApi.error(e?.response?.data?.message ?? "Erreur lors de la creation");
    } finally {
      setSavingNewEns(false);
    }
  }, [createEnsTarget, createEnsData, remapEnseignant, msgApi, setEnseignants, tree]);

  // -- Reset all -------------------------------------------------------------
  const resetAll = useCallback(() => {
    setCurrentStep(0);
    setFiles([]);
    setDepartement("auto");
    setTree([]);
    setReport(null);
    setImportHistory(null);
    setAnalysisResult(null);
    setEnsSearchStep2("");
    setAnalysisProgress(0);
    setExtractedEnseignants([]);
    try { sessionStorage.removeItem("rice_extracted_enseignants"); } catch {}
    setIgnoreEnseignants(false);
    setTreeHistory([]);
    prevTreeRef.current = [];
    skipHistoryRef.current = true;
    analyzeIsCanceledRef.current = false;
    try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }, [setTree, setReport, setImportHistory]);

  // -- Undo history for Step-2 tree mutations (max 10 snapshots) ------------
  useEffect(() => {
    const prevTree = prevTreeRef.current;
    const prevStr = JSON.stringify(prevTree ?? []);
    const currStr = JSON.stringify(tree ?? []);
    if (prevStr === currStr) return;

    if (skipHistoryRef.current) {
      skipHistoryRef.current = false;
      prevTreeRef.current = cloneDeep(tree);
      return;
    }

    if (currentStep === 2 && Array.isArray(prevTree) && prevTree.length > 0) {
      setTreeHistory((hist) => {
        const next = [...hist, cloneDeep(prevTree)];
        return next.slice(-10);
      });
    }

    prevTreeRef.current = cloneDeep(tree);
  }, [tree, currentStep]);

  // -- Auto-save + visual indicator -----------------------------------------
  useEffect(() => {
    if (currentStep !== 2) return;
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          departement,
          tree,
          currentStep,
          savedAt: Date.now(),
        }),
      );
    } catch {
      // ignore quota/security failures
    }

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

  // -- Keyboard shortcuts ----------------------------------------------------
  useEffect(() => {
    const handleCtrlEnter = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key !== "Enter") return;
      e.preventDefault();
      if (currentStep === 0 && files.length > 0 && !analyzing) {
        void handleAnalyze();
        return;
      }
      if (currentStep === 3 && !importing) {
        void handleImport();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (editingNom) setEditingNom(null);
      if (mergeModal) {
        setMergeModal(false);
        setMergeSrc(null);
        setMergeDst(null);
      }
    };

    const handleCtrlZ = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "z") return;
      if (currentStep !== 2 || treeHistory.length === 0) return;
      e.preventDefault();
      const previous = treeHistory[treeHistory.length - 1];
      skipHistoryRef.current = true;
      setTree(cloneDeep(previous) as RiceDomaine[]);
      setTreeHistory((hist) => hist.slice(0, -1));
      msgApi.info("Modification annulée (Ctrl+Z)");
    };

    const onKeyDown = (e: KeyboardEvent) => {
      handleCtrlEnter(e);
      handleEscape(e);
      handleCtrlZ(e);
    };

    globalThis.addEventListener("keydown", onKeyDown);
    return () => globalThis.removeEventListener("keydown", onKeyDown);
  }, [
    currentStep,
    files.length,
    analyzing,
    importing,
    handleAnalyze,
    handleImport,
    editingNom,
    mergeModal,
    treeHistory,
    msgApi,
    setTree,
    setEditingNom,
    setMergeModal,
    setMergeSrc,
    setMergeDst,
  ]);

  // -- Confetti on successful import (no errors) -----------------------------
  useEffect(() => {
    if (currentStep !== 3 || !report) return;
    const errorsCount = (report.errors?.length ?? report.importStats?.errors?.length ?? 0);
    if (errorsCount > 0) return;

    document.body.classList.add("confetti-active");
    const colors = ["#ff4d4f", "#faad14", "#52c41a", "#1677ff", "#722ed1"];
    const pieces: HTMLElement[] = [];
    for (let i = 0; i <26; i += 1) {
      const el = document.createElement("div");
      el.className = "confetti-piece";
      el.style.left = `${Math.random() * 100}vw`;
      el.style.background = colors[i % colors.length];
      el.style.animationDelay = `${Math.random() * 0.8}s`;
      el.style.opacity = String(0.8 + Math.random() * 0.2);
      document.body.appendChild(el);
      pieces.push(el);
    }

    const timer = setTimeout(() => {
      pieces.forEach((p) => p.remove());
      document.body.classList.remove("confetti-active");
    }, 3000);

    return () => {
      clearTimeout(timer);
      pieces.forEach((p) => p.remove());
      document.body.classList.remove("confetti-active");
    };
  }, [currentStep, report]);

  // -- Steps config -----------------------------------------------------------
  const steps = useMemo(() => ([
    {
      title: "Upload",
      icon: <InboxOutlined />,
      description: files.length > 0 ? `${files.length} fichier(s)` : "",
    },
    {
      title: "Analyse IA",
      icon: analyzing ? <LoadingOutlined /> : <RobotOutlined />,
      description: analyzing ? "En cours..." : "",
    },
    {
      title: "Revue structure",
      icon: <EditOutlined />,
      description: currentStep >= 2 ? `${liveStats.totalSavoirs} savoirs` : "",
    },
    { title: "Rapport", icon: <BarChartOutlined /> },
  ]), [files.length, analyzing, currentStep, liveStats.totalSavoirs]);

  const workflowHighlights = useMemo(() => ([
    {
      label: "Fichiers prêts",
      value: files.length,
      note: "Documents à analyser",
    },
    {
      label: "Enseignants chargés",
      value: ignoreEnseignants ? 0 : allEnseignants.length,
      note: ignoreEnseignants ? "Mode manuel actif" : "Synchronisé avec le backend",
    },
    {
      label: "Savoirs extraits",
      value: liveStats.totalSavoirs,
      note: `${liveStats.totalDomaines} domaines · ${liveStats.totalComp} compétences`,
    },
    {
      label: "Affectations actives",
      value: liveStats.enseignantsAssigned,
      note: `${effectiveEnseignants.length} enseignants visibles`,
    },
  ]), [
    files.length,
    ignoreEnseignants,
    allEnseignants.length,
    liveStats.totalSavoirs,
    liveStats.totalDomaines,
    liveStats.totalComp,
    liveStats.enseignantsAssigned,
    effectiveEnseignants.length,
  ]);

  const currentStageTitle = steps[currentStep]?.title ?? "Upload";
  const currentDeptLabel = departement === "auto" ? "Auto-détection" : departement.toUpperCase();

  // --------------------------------------------------------------------------
  return (
    <div
      className="rice-page"
      style={{ "--rice-accent": DEPT_ACCENT[departement as keyof typeof DEPT_ACCENT] ?? "#1677ff" } as React.CSSProperties & Record<string, string>}
    >
      <div className="rice-shell">
        <section className="rice-hero">
          <div className="rice-hero-content">
            <div className="rice-hero-copy">
              <div className="rice-hero-kicker">
                <ThunderboltOutlined />
                <span>RICE Workbench</span>
              </div>
              <Title level={2} className="rice-hero-title">
                Référentiel intelligent des compétences enseignants
              </Title>
              <Paragraph className="rice-hero-subtitle">
                Importez vos fiches, laissez l&apos;analyse IA extraire l&apos;arbre de compétences,
                corrigez la structure par glisser-déposer, puis synchronisez les résultats vers la base.
              </Paragraph>
              <div className="rice-hero-chips">
                <span className="rice-chip">{currentDeptLabel}</span>
                <span className="rice-chip">Étape {currentStep + 1} / {steps.length}</span>
                <span className="rice-chip">Backend prêt</span>
                <span className="rice-chip rice-chip-accent">{currentStageTitle}</span>
              </div>
              <Space wrap className="rice-hero-actions">
                <Button
                  type="primary"
                  size="large"
                  icon={analyzing ? <LoadingOutlined /> : <RobotOutlined />}
                  onClick={handleAnalyze}
                  disabled={files.length === 0 || analyzing}
                  className="rice-primary-action"
                >
                  {analyzing ? "Analyse en cours" : "Lancer l&apos;analyse"}
                </Button>
                <Button
                  size="large"
                  icon={<MergeCellsOutlined />}
                  onClick={() => navigate("/home/rice/matchmaking")}
                >
                  Ouvrir le matchmaking
                </Button>
                <Button size="large" onClick={resetAll}>
                  Réinitialiser
                </Button>
              </Space>
            </div>

            <div className="rice-hero-metrics">
              {workflowHighlights.map((item) => (
                <Card key={item.label} className="rice-metric-card" bordered={false}>
                  <Text className="rice-metric-label">{item.label}</Text>
                  <div className="rice-metric-value">{item.value}</div>
                  <Text className="rice-metric-note" type="secondary">{item.note}</Text>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="rice-stage-card">
          <div className="rice-stage-head">
            <div>
              <Text className="rice-section-kicker">Pipeline backend</Text>
              <Title level={4} style={{ margin: 0 }}>
                {currentStageTitle} · {files.length} fichier(s) · {liveStats.totalSavoirs} savoirs
              </Title>
            </div>
            <div className="rice-stage-summary">
              <span className="rice-chip">{liveStats.totalDomaines} domaines</span>
              <span className="rice-chip">{liveStats.totalComp} compétences</span>
              <span className="rice-chip">{liveStats.enseignantsAssigned} enseignants liés</span>
            </div>
          </div>
          <Steps current={currentStep} items={steps} size="small" responsive className="rice-steps-wrapper" />
        </section>

        <div className="rice-workbench-grid">
          <main className="rice-workbench-main">
            <AnimatePresence mode="wait">
              {currentStep === 0 && (
                <motion.div key="step0" variants={STEP_VARIANTS} initial="initial" animate="animate" exit="exit">
                  <UploadStep
                    files={files}
                    analyzing={analyzing}
                    handleAnalyze={() => void handleAnalyze()}
                    handleUploadChange={handleUploadChange as (info: unknown) => void}
                    setCurrentStep={setCurrentStep}
                    departement={departement}
                    setDepartement={setDepartement}
                    allEnseignants={allEnseignants as ComponentProps<typeof UploadStep>["allEnseignants"]}
                    enseignantsLoading={enseignantsLoading}
                    enseignantsError={enseignantsError ?? undefined}
                    enseignantsLoadSlow={enseignantsLoadSlow}
                    onRetryEnseignants={loadEnseignants}
                    onContinueWithoutEnseignants={continueWithoutEnseignants}
                  />
                </motion.div>
              )}

              {currentStep === 1 && (
                <motion.div key="step1" variants={STEP_VARIANTS} initial="initial" animate="animate" exit="exit">
                  <AnalyzingStep
                    filesCount={files.length}
                    analysisProgress={analysisProgress}
                    analyzeIsCanceledRef={analyzeIsCanceledRef}
                    progressTimerRef={progressTimerRef}
                    setAnalyzing={setAnalyzing}
                    setCurrentStep={setCurrentStep}
                    setAnalysisProgress={setAnalysisProgress}
                  />
                </motion.div>
              )}

              {currentStep === 2 && (
                <motion.div key="step2" variants={STEP_VARIANTS} initial="initial" animate="animate" exit="exit">
                  <ReviewStep
                    tree={tree as ComponentProps<typeof ReviewStep>["tree"]}
                    setTree={setTree as ComponentProps<typeof ReviewStep>["setTree"]}
                    treeSearch={treeSearch}
                    setTreeSearch={setTreeSearch}
                    editingNom={editingNom as unknown as ComponentProps<typeof ReviewStep>["editingNom"]}
                    setEditingNom={setEditingNom as unknown as ComponentProps<typeof ReviewStep>["setEditingNom"]}
                    startRename={startRename as unknown as ComponentProps<typeof ReviewStep>["startRename"]}
                    commitRename={commitRename}
                    deleteSavoir={deleteSavoir}
                    deleteSC={deleteSC}
                    deleteComp={deleteComp}
                    deleteDomaine={deleteDomaine}
                    toggleType={(di, ci, sci) => toggleType(di, ci, sci, 0)}
                    setNiveau={(di, ci, sci, niveau) => setNiveau(di, ci, sci, 0, niveau)}
                    setEnseignants={(di, ci, sci, ids) => setEnseignants(di, ci, sci, 0, ids)}
                    openMerge={() => undefined}
                    setMergeModal={() => undefined}
                    liveStats={liveStats}
                    treeFilteredIndices={treeFilteredIndices as unknown as ComponentProps<typeof ReviewStep>["treeFilteredIndices"]}
                    departement={departement}
                    dbEnseignants={allEnseignants as ComponentProps<typeof ReviewStep>["dbEnseignants"]}
                    allSavoirsFlat={allSavoirsFlat as ComponentProps<typeof ReviewStep>["allSavoirsFlat"]}
                    onSavoirDragStart={dndHook.onSavoirDragStart as unknown as ComponentProps<typeof ReviewStep>["onSavoirDragStart"]}
                    onSavoirDragEnd={dndHook.onSavoirDragEnd}
                    setCurrentStep={setCurrentStep}
                    updateNodeField={() => undefined}
                    moveSavoirToSC={() => undefined}
                    setCreateEnsTarget={setCreateEnsTarget as ComponentProps<typeof ReviewStep>["setCreateEnsTarget"]}
                    setCreateEnsData={setCreateEnsData as ComponentProps<typeof ReviewStep>["setCreateEnsData"]}
                    setCreateEnsModal={setCreateEnsModal}
                  />
                </motion.div>
              )}

              {currentStep === 3 && (
                <motion.div key="step3" variants={STEP_VARIANTS} initial="initial" animate="animate" exit="exit">
                  <ReportStep
                    report={report as ComponentProps<typeof ReportStep>["report"]}
                    importing={importing}
                    handleImport={handleImport}
                    exportReportJson={exportReportJson}
                    departement={departement}
                    importHistory={importHistory as ComponentProps<typeof ReportStep>["importHistory"]}
                    historyLoading={historyLoading}
                    loadImportHistory={loadImportHistory}
                    allSavoirsFlat={allSavoirsFlat as ComponentProps<typeof ReportStep>["allSavoirsFlat"]}
                    effectiveEnseignants={effectiveEnseignants as ComponentProps<typeof ReportStep>["effectiveEnseignants"]}
                    extractedEnseignants={extractedEnseignants as ComponentProps<typeof ReportStep>["extractedEnseignants"]}
                    setCurrentStep={setCurrentStep}
                    resetAll={resetAll}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </main>

          <aside className="rice-workbench-aside">
            <Card className="rice-side-card" bordered={false} title="Connecteur backend">
              <div className="rice-side-stat-list">
                <div className="rice-side-stat">
                  <Text type="secondary">Enseignants chargés</Text>
                  <strong>{ignoreEnseignants ? 0 : allEnseignants.length}</strong>
                </div>
                <div className="rice-side-stat">
                  <Text type="secondary">Département</Text>
                  <strong>{currentDeptLabel}</strong>
                </div>
                <div className="rice-side-stat">
                  <Text type="secondary">Synchronisation</Text>
                  <strong>{enseignantsLoading ? "En cours" : "Active"}</strong>
                </div>
              </div>
              {enseignantsError && (
                <Alert
                  type="warning"
                  showIcon
                  message={enseignantsError}
                  className="rice-side-alert"
                />
              )}
              <div className="rice-side-actions">
                <Button block onClick={loadEnseignants}>
                  Recharger le backend
                </Button>
                <Button block onClick={continueWithoutEnseignants}>
                  Continuer sans enseignants
                </Button>
              </div>
            </Card>

            <Card className="rice-side-card" bordered={false} title="Parcours rapide">
              <div className="rice-journey-list">
                {steps.map((step, index) => (
                  <div
                    key={step.title}
                    className={`rice-journey-item${index === currentStep ? " active" : ""}${index < currentStep ? " done" : ""}`}
                  >
                    <span className="rice-journey-index">{index + 1}</span>
                    <div>
                      <strong>{step.title}</strong>
                      <div>{step.description || "Prêt"}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </aside>
        </div>

        {/* Create Enseignant Modal */}
        <Modal
          title={<Space><UserAddOutlined /> Creer un nouvel enseignant</Space>}
          open={createEnsModal}
          onCancel={() => setCreateEnsModal(false)}
          onOk={handleCreateNewEnseignant}
          okText="Creer et lier"
          cancelText="Annuler"
          confirmLoading={savingNewEns}
          destroyOnHidden
        >
          <Space direction="vertical" style={{ width: "100%" }} size="middle">
            <div>
              <Text strong>Prenom</Text>
              <Input
                value={createEnsData.prenom}
                onChange={(e) => setCreateEnsData((d) => ({ ...d, prenom: e.target.value }))}
                placeholder="Prenom"
                style={{ marginTop: 4 }}
              />
            </div>
            <div>
              <Text strong>Nom</Text>
              <Input
                value={createEnsData.nom}
                onChange={(e) => setCreateEnsData((d) => ({ ...d, nom: e.target.value }))}
                placeholder="Nom de famille"
                style={{ marginTop: 4 }}
              />
            </div>
            <div>
              <Text strong>Email</Text>
              <Input
                value={createEnsData.mail}
                onChange={(e) => setCreateEnsData((d) => ({ ...d, mail: e.target.value }))}
                placeholder="email@esprit.tn"
                style={{ marginTop: 4 }}
              />
            </div>
          </Space>
        </Modal>

        {/* Merge Modal */}
        <Modal
          title={<Space><MergeCellsOutlined /> Fusionner deux savoirs</Space>}
          open={mergeModal}
          onOk={confirmMerge}
          onCancel={() => {
            setMergeModal(false);
            setMergeSrc(null);
            setMergeDst(null);
          }}
          okText="Fusionner"
          cancelText="Annuler"
          okButtonProps={{ disabled: !mergeDst }}
          destroyOnHidden
        >
          <Alert
            type="warning"
            message="Le savoir source sera supprime et ses enseignants fusionnes vers le savoir cible."
            style={{ marginBottom: 16, borderRadius: 8 }}
            showIcon
          />
          {mergeSrc && (
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ marginRight: 8 }}>Source :</Text>
              <span style={{ color: "#cf1322" }}>
                {allSavoirsFlat.find(
                  (s) =>
                    s.di === mergeSrc.di && s.ci === mergeSrc.ci &&
                    s.sci === mergeSrc.sci && s.si === mergeSrc.si,
                )?.nom ?? "?"}
              </span>
            </div>
          )}
          <div>
            <Text strong>Cible :</Text>
            <Select
              showSearch
              optionFilterProp="children"
              placeholder="Rechercher et selectionner le savoir cible..."
              style={{ width: "100%", marginTop: 8 }}
              onChange={(key) => {
                const [di, ci, sci, si] = key.split("|").map(Number);
                setMergeDst({ di, ci, sci, si });
              }}
            >
              {allSavoirsFlat
                .filter(
                  (s) =>
                    !(mergeSrc &&
                      s.di === mergeSrc.di && s.ci === mergeSrc.ci &&
                      s.sci === mergeSrc.sci && s.si === mergeSrc.si),
                )
                .map((s) => (
                  <Option
                    key={`${s.di}|${s.ci}|${s.sci}|${s.si}`}
                    value={`${s.di}|${s.ci}|${s.sci}|${s.si}`}
                  >
                    {s.label}
                  </Option>
                ))}
            </Select>
          </div>
        </Modal>

        {currentStep === 2 && showAutosave && (
          <div className="rice-autosave-badge">Sauvegardé automatiquement</div>
        )}

      </div>
    </div>
  );
}






