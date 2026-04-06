// src/pages/competence/RicePage.jsx
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

import {
  useState, useEffect, useCallback, useRef, useMemo,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert, Input, message, Modal, Select, Space, Steps, Typography,
} from "antd";
import {
  BarChartOutlined, EditOutlined, InboxOutlined,
  LoadingOutlined, MergeCellsOutlined, RobotOutlined,
  ThunderboltOutlined, UserAddOutlined,
} from "@ant-design/icons";
import { AnimatePresence, motion } from "framer-motion";

import { useRiceTree }    from "../../hooks/useRiceTree";
import { useDragAndDrop } from "../../hooks/useDragAndDrop";
import { useRiceReport }  from "../../hooks/useRiceReport";

import RiceService       from "../../services/RiceService";
import EnseignantService from "../../services/EnseignantService";

import UploadStep    from "./rice/UploadStep.jsx";
import AnalyzingStep from "./rice/AnalyzingStep.jsx";
import ReviewStep    from "./rice/ReviewStep.jsx";
import ReportStep    from "./rice/ReportStep.jsx";
import { cloneDeep, STORAGE_KEY } from "./rice/constants.jsx";

import "./RicePage.css";

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

// Shared spring transition for step panels
const STEP_VARIANTS = {
  initial: { opacity: 0, y: 18, scale: 0.98 },
  animate: { opacity: 1, y: 0,  scale: 1,    transition: { type: "spring", stiffness: 300, damping: 28 } },
  exit:    { opacity: 0, y: -12, scale: 0.97, transition: { duration: 0.18 } },
};

const isLikelyValidExtractedName = (value) => {
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
  const [msgApi, msgCtx] = message.useMessage();
  // useNavigate kept for potential future programmatic navigation
  const _navigate = useNavigate(); // eslint-disable-line no-unused-vars

  // -- Step control -----------------------------------------------------------
  const [currentStep, setCurrentStep] = useState(0);

  // -- Step 0 state -----------------------------------------------------------
  const [files, setFiles] = useState([]);
  const [departement, setDepartement] = useState("auto");
  const [allEnseignants, setAllEnseignants] = useState([]);
  const [enseignantsLoading, setEnseignantsLoading] = useState(false);
  const [enseignantsError, setEnseignantsError] = useState(null);
  const [enseignantsLoadSlow, setEnseignantsLoadSlow] = useState(false);
  const [ignoreEnseignants, setIgnoreEnseignants] = useState(false);
  const [enseignantsReloadKey, setEnseignantsReloadKey] = useState(0);
  const [analysisResult, setAnalysisResult] = useState(null);

  // -- Step 1 state -----------------------------------------------------------
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const analyzeIsCanceledRef = useRef(false);
  const progressTimerRef = useRef(null);

  // -- Step 2 teacher state ---------------------------------------------------
  const [extractedEnseignants, setExtractedEnseignants] = useState([]);
  const [ensSearchStep2, setEnsSearchStep2] = useState("");
  const [treeHistory, setTreeHistory] = useState([]);
  const [showAutosave, setShowAutosave] = useState(false);

  // -- Create-teacher modal state ---------------------------------------------
  const [createEnsModal, setCreateEnsModal] = useState(false);
  const [createEnsTarget, setCreateEnsTarget] = useState(null);
  const [createEnsData, setCreateEnsData] = useState({ nom: "", prenom: "", mail: "" });
  const [savingNewEns, setSavingNewEns] = useState(false);
  const autosaveDebounceRef = useRef(null);
  const autosaveHideRef = useRef(null);
  const prevTreeRef = useRef([]);
  const skipHistoryRef = useRef(false);

  // -- Custom hooks -----------------------------------------------------------
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
  const loadEnseignants = useCallback(() => {
    setIgnoreEnseignants(false);
    setEnseignantsReloadKey((k) => k + 1);
  }, []);

  const continueWithoutEnseignants = useCallback(() => {
    setIgnoreEnseignants(true);
    setEnseignantsLoadSlow(false);
    setEnseignantsError(null);
    setEnseignantsLoading(false);
    setAllEnseignants([]);
  }, []);

  useEffect(() => {
    if (ignoreEnseignants) return;
    let cancelled = false;
    let slowTimer;

    const load = async () => {
      setEnseignantsLoading(true);
      setEnseignantsError(null);
      setEnseignantsLoadSlow(false);
      slowTimer = setTimeout(() => {
        if (!cancelled) setEnseignantsLoadSlow(true);
      }, 5000);

      try {
        const dept = departement === "auto" ? null : departement;
        const data = await RiceService.getEnseignants(dept);
        if (!cancelled) setAllEnseignants(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) {
          const status = err?.response?.status;
          if (status === 401 || status === 403) {
            setEnseignantsError("Session expirée. Veuillez vous reconnecter pour charger les enseignants.");
            msgApi.warning("Session expirée — reconnectez-vous");
          } else {
            setEnseignantsError(
              "Impossible de charger les enseignants. Vérifiez votre connexion ou contactez l'admin.",
            );
            msgApi.warning("Enseignants non chargés — affectation manuelle uniquement");
          }
          setAllEnseignants([]);
        }
      } finally {
        clearTimeout(slowTimer);
        if (!cancelled) {
          setEnseignantsLoading(false);
          setEnseignantsLoadSlow(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
      clearTimeout(slowTimer);
    };
  }, [departement, enseignantsReloadKey, ignoreEnseignants, msgApi]);

  // -- Upload change handler --------------------------------------------------
  const handleUploadChange = useCallback(({ fileList }) => {
    const allowed = new Set(["pdf", "docx", "doc", "txt"]);
    const maxSize = 20 * 1024 * 1024;
    const accepted = [];

    for (const f of fileList) {
      const raw = f.originFileObj ?? f;
      const name = raw?.name ?? "fichier";
      const ext = (name.split(".").pop() || "").toLowerCase();

      if (!allowed.has(ext)) {
        msgApi.warning(`'${name}' n'est pas supporté — seuls PDF, DOCX et TXT sont acceptés`);
        continue;
      }
      if ((raw?.size ?? 0) > maxSize) {
        msgApi.warning(`'${name}' dépasse 20 Mo`);
        continue;
      }
      accepted.push(raw);
    }

    setFiles(accepted);
  }, [msgApi]);

  // -- Step 1: Launch AI analysis --------------------------------------------
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
      setAnalysisProgress((p) => (p < 90 ? p + Math.random() * 15 : p));
    }, 800);

    try {
      const result = await RiceService.analyze(
        files.filter(Boolean), enseignants, departement,
      );
      clearInterval(progressTimerRef.current);
      if (analyzeIsCanceledRef.current) return;
      setAnalysisProgress(100);

      const cleaned = cloneDeep(result.propositions);
      for (const d of cleaned)
        for (const c of d.competences ?? []) {
          for (const s of c.savoirs ?? []) {
            const suggested = (s.enseignantsSuggeres ?? []).map((id) => String(id));
            s.aiSuggestedIds = suggested;
            s.enseignantsSuggeres = []; // Clear auto-assignments – use Matchmaking page instead
          }
          for (const sc of c.sousCompetences ?? [])
            for (const s of sc.savoirs ?? []) {
              const suggested = (s.enseignantsSuggeres ?? []).map((id) => String(id));
              s.aiSuggestedIds = suggested;
              s.enseignantsSuggeres = []; // Clear auto-assignments – use Matchmaking page instead
            }
        }

      setTree(cleaned);
      setAnalysisResult(result);
      skipHistoryRef.current = true;
      prevTreeRef.current = cloneDeep(cleaned);
      setTreeHistory([]);
      const extractedClean = (result.extractedEnseignants ?? []).filter(
        (ex) => isLikelyValidExtractedName(ex?.nom_complet),
      );
      // Build sets of DB enseignant identifiers for fast lookup (both nom+prenom and prenom+nom)
      const dbNameSets = new Set();
      (allEnseignants ?? []).forEach((e) => {
        const nom = String(e.nom ?? "").trim().toLowerCase();
        const prenom = String(e.prenom ?? "").trim().toLowerCase();
        if (nom && prenom) {
          dbNameSets.add(`${nom} ${prenom}`);
          dbNameSets.add(`${prenom} ${nom}`);
        }
      });
      const dedupMap = new Map();
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
        localStorage.setItem("rice_extracted_enseignants", JSON.stringify(Array.from(dedupMap.values())));
      } catch (err) {
        // ignore
      }

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

      setTimeout(() => setCurrentStep(2), 400);
    } catch (err) {
      clearInterval(progressTimerRef.current);
      if (analyzeIsCanceledRef.current) return;
      msgApi.error(err.response?.data?.detail ?? err.message ?? "Erreur d'analyse IA");
      setCurrentStep(0);
    } finally {
      setAnalyzing(false);
    }
  };

  // -- Remap ext_ ID to real DB ID across tree + extracted list ---------------
  const remapEnseignant = useCallback(
    (extId, realId) => {
      remapInTree(extId, realId);
      const extIdx = parseInt(extId.replace("ext_", ""), 10);
      setExtractedEnseignants((prev) => {
        const next = prev.map((ex, i) => (i === extIdx ? { ...ex, matched_id: realId } : ex));
        try { localStorage.setItem("rice_extracted_enseignants", JSON.stringify(next)); } catch (e) {}
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
        `${nomUp.toLowerCase()}.${prenom.toLowerCase().replace(/\s+/g, ".")}@esprit.tn`;
      const created = await EnseignantService.createEnseignant({
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
    } catch (err) {
      msgApi.error(err.response?.data?.message ?? "Erreur lors de la creation");
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
    try { localStorage.removeItem("rice_extracted_enseignants"); } catch {}
    setIgnoreEnseignants(false);
    setTreeHistory([]);
    prevTreeRef.current = [];
    skipHistoryRef.current = true;
    analyzeIsCanceledRef.current = false;
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
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

    if (currentStep === 2 && Array.isArray(prevTree) && prevTree.length >= 0) {
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
      localStorage.setItem(
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
    const onKeyDown = (e) => {
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;

      if (isCmdOrCtrl && e.key === "Enter") {
        e.preventDefault();
        if (currentStep === 0 && files.length > 0 && !analyzing) {
          handleAnalyze();
          return;
        }
        // trigger import from the Enseignants page (page-level step 3)
        if (currentStep === 3 && !importing) {
          handleImport();
        }
      }

      if (e.key === "Escape") {
        if (editingNom) setEditingNom(null);
        if (mergeModal) {
          setMergeModal(false);
          setMergeSrc(null);
          setMergeDst(null);
        }
      }

      if (isCmdOrCtrl && e.key.toLowerCase() === "z" && currentStep === 2) {
        if (treeHistory.length === 0) return;
        e.preventDefault();
        const previous = treeHistory[treeHistory.length - 1];
        skipHistoryRef.current = true;
        setTree(cloneDeep(previous));
        setTreeHistory((hist) => hist.slice(0, -1));
        msgApi.info("Modification annulée (Ctrl+Z)");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
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
    const pieces = [];
    for (let i = 0; i < 26; i += 1) {
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
  const steps = [
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
      title: "Revision (Structure)",
      icon: <EditOutlined />,
      description: currentStep >= 2 ? `${liveStats.totalSavoirs} savoirs` : "",
    },
    { title: "Rapport", icon: <BarChartOutlined /> },
  ];

  // --------------------------------------------------------------------------
  return (
    <>
      {msgCtx}
      <div
        className="rice-page"
        style={{ "--rice-accent": DEPT_ACCENT[departement] ?? "#1677ff" }}
      >

        {/* Hero banner */}
        <div className="rice-hero">
          <div className="rice-hero-content">
            <div className="rice-hero-icon-wrap"><RobotOutlined /></div>
            <div className="rice-hero-text">
              <Title level={3} className="rice-hero-title">
                RICE - Referentiel Intelligent de Competences
              </Title>
              <Paragraph className="rice-hero-subtitle">
                Importez vos fiches UE/modules, laissez l&apos;IA extraire automatiquement
                l&apos;arbre de competences, revisez par glisser-deposer, puis enregistrez en base.
              </Paragraph>
            </div>
            <div className="rice-hero-badge">
              <ThunderboltOutlined style={{ marginRight: 5 }} />
              IA · NLP · Bloom
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="rice-steps-wrapper">
          <Steps current={currentStep} items={steps} size="small" responsive />
        </div>

        {/* Step 0: Upload */}
        <AnimatePresence mode="wait">
          {currentStep === 0 && (
            <motion.div key="step0" variants={STEP_VARIANTS} initial="initial" animate="animate" exit="exit">
              <UploadStep
                files={files}
                analyzing={analyzing}
                handleAnalyze={handleAnalyze}
                handleUploadChange={handleUploadChange}
                setCurrentStep={setCurrentStep}
                departement={departement}
                setDepartement={setDepartement}
                allEnseignants={allEnseignants}
                enseignantsLoading={enseignantsLoading}
                enseignantsError={enseignantsError}
                enseignantsLoadSlow={enseignantsLoadSlow}
                onRetryEnseignants={loadEnseignants}
                onContinueWithoutEnseignants={continueWithoutEnseignants}
              />
            </motion.div>
          )}

          {/* Step 1: Analyzing */}
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

          {/* Step 2: Review (Structure) */}
          {currentStep === 2 && (
            <motion.div key="step2" variants={STEP_VARIANTS} initial="initial" animate="animate" exit="exit">
              <ReviewStep
                tree={tree}
                setTree={setTree}
                treeSearch={treeSearch}
                setTreeSearch={setTreeSearch}
                editingNom={editingNom}
                setEditingNom={setEditingNom}
                startRename={startRename}
                commitRename={commitRename}
                deleteSavoir={deleteSavoir}
                deleteSC={deleteSC}
                deleteComp={deleteComp}
                deleteDomaine={deleteDomaine}
                addDomaine={addDomaine}
                addCompetence={addCompetence}
                addSousCompetence={addSousCompetence}
                addSavoir={addSavoir}
                toggleType={toggleType}
                setNiveau={setNiveau}
                setEnseignants={setEnseignants}
                openMerge={openMerge}
                setMergeModal={setMergeModal}
                liveStats={liveStats}
                treeFilteredIndices={treeFilteredIndices}
                departement={departement}
                extractedEnseignants={extractedEnseignants}
                allEnseignants={allEnseignants}
                dbEnseignants={allEnseignants}
                effectiveEnseignants={effectiveEnseignants}
                filteredEffectiveEns={filteredEffectiveEns}
                ensSearchStep2={ensSearchStep2}
                setEnsSearchStep2={setEnsSearchStep2}
                loadingEns={enseignantsLoading}
                loadEnseignants={loadEnseignants}
                result={analysisResult}
                clearAllAssignments={clearAllAssignments}
                remapEnseignant={remapEnseignant}
                allSavoirsFlat={allSavoirsFlat}
                setCreateEnsTarget={setCreateEnsTarget}
                setCreateEnsData={setCreateEnsData}
                setCreateEnsModal={setCreateEnsModal}
                isDragging={dndHook.isDragging}
                draggedSavoirInfo={dndHook.draggedSavoirInfo}
                dragOverEns={dndHook.dragOverEns}
                onSavoirDragStart={dndHook.onSavoirDragStart}
                onSavoirDragEnd={dndHook.onSavoirDragEnd}
                onTagDragStart={dndHook.onTagDragStart}
                onEnsDragOver={dndHook.onEnsDragOver}
                onEnsDragLeave={dndHook.onEnsDragLeave}
                onEnsDrop={dndHook.onEnsDrop}
                toggleEnsAssign={toggleEnsAssign}
                setCurrentStep={setCurrentStep}
                initialPanel="structure"
              />
            </motion.div>
          )}

          
          {/* Step 3: Report */}
          {currentStep === 3 && (
            <motion.div key="step3" variants={STEP_VARIANTS} initial="initial" animate="animate" exit="exit">
              <ReportStep
                report={report}
                importing={importing}
                handleImport={handleImport}
                exportReportJson={exportReportJson}
                departement={departement}
                importHistory={importHistory}
                historyLoading={historyLoading}
                loadImportHistory={loadImportHistory}
                allSavoirsFlat={allSavoirsFlat}
                effectiveEnseignants={effectiveEnseignants}
                extractedEnseignants={extractedEnseignants}
                setCurrentStep={setCurrentStep}
                resetAll={resetAll}
              />
            </motion.div>
          )}
        </AnimatePresence>

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
          <div className="rice-autosave-badge">💾 Sauvegardé automatiquement</div>
        )}

      </div>
    </>
  );
}
