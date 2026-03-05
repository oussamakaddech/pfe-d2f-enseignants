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
import { cloneDeep } from "./rice/constants.jsx";

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
  const [ficheMatchedEnseignants, setFicheMatchedEnseignants] = useState([]);
  const [loadingEns, setLoadingEns] = useState(false);

  // -- Step 1 state -----------------------------------------------------------
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const analyzeIsCanceledRef = useRef(false);
  const progressTimerRef = useRef(null);

  // -- Step 2 teacher state ---------------------------------------------------
  const [extractedEnseignants, setExtractedEnseignants] = useState([]);
  const [manuallyAddedExtracts, setManuallyAddedExtracts] = useState([]);
  const [ensSearchStep2, setEnsSearchStep2] = useState("");

  // -- Create-teacher modal state ---------------------------------------------
  const [createEnsModal, setCreateEnsModal] = useState(false);
  const [createEnsTarget, setCreateEnsTarget] = useState(null);
  const [createEnsData, setCreateEnsData] = useState({ nom: "", prenom: "", mail: "" });
  const [savingNewEns, setSavingNewEns] = useState(false);

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
    deleteSavoir, deleteSC, deleteComp, deleteDomaine,
    toggleType, setNiveau, toggleEnsAssign, setEnseignants,
    clearAllAssignments, remapInTree,
    openMerge, confirmMerge,
    allSavoirsFlat, liveStats, treeFilteredIndices,
  } = treeHook;

  // -- effectiveEnseignants: teachers shown in the Step-2 right panel ---------
  // Combines DB-matched enseignants from the fiche with ext_ synthetic IDs.
  const effectiveEnseignants = useMemo(() => {
    const knownIds = new Set(
      ficheMatchedEnseignants.map((e) => String(e.id ?? e.enseignantId)),
    );
    const extractedNameMap = {};
    const seenExtracted = new Set();
    const extractedExtras = [];

    extractedEnseignants.forEach((ext, idx) => {
      if (ext.matched_id) {
        const sid = String(ext.matched_id);
        if (ext.nom_complet) extractedNameMap[sid] = ext.nom_complet;
        if (!knownIds.has(sid) && !seenExtracted.has(sid)) {
          seenExtracted.add(sid);
          extractedExtras.push({
            id: sid, enseignantId: sid,
            nom: ext.nom_complet ?? ext.matched_nom ?? sid,
            prenom: "", _fromExtraction: true, _matched: true,
          });
        }
      } else if (ext.nom_complet) {
        const syntheticId = `ext_${idx}`;
        const nameKey = ext.nom_complet.toLowerCase();
        if (!seenExtracted.has(nameKey) && !seenExtracted.has(syntheticId)) {
          seenExtracted.add(nameKey);
          seenExtracted.add(syntheticId);
          const isManuallyAdded = manuallyAddedExtracts.includes(ext.nom_complet);
          extractedExtras.push({
            id: syntheticId, enseignantId: syntheticId,
            nom: ext.nom_complet, prenom: "",
            _fromExtraction: true, _matched: isManuallyAdded, _manuallyAdded: isManuallyAdded,
          });
        }
      }
    });

    // Orphans: IDs referenced in the tree but not covered by either list above
    const coveredIds = new Set([
      ...ficheMatchedEnseignants.map((e) => String(e.id ?? e.enseignantId)),
      ...extractedExtras.map((e) => e.id),
    ]);
    const orphanIds = new Set();
    allSavoirsFlat.forEach((s) =>
      (s.enseignantsSuggeres ?? []).forEach((id) => {
        if (!coveredIds.has(String(id))) orphanIds.add(String(id));
      }),
    );
    const orphans = Array.from(orphanIds).map((id) => ({
      id, enseignantId: id,
      nom: extractedNameMap[id] ?? id,
      prenom: "",
    }));

    return [...ficheMatchedEnseignants, ...extractedExtras, ...orphans];
  }, [ficheMatchedEnseignants, allSavoirsFlat, extractedEnseignants, manuallyAddedExtracts]);

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

  // -- Load enseignants -------------------------------------------------------
  const loadEnseignants = useCallback(() => {
    setLoadingEns(true);
    EnseignantService.getAllEnseignants()
      .then((data) => setAllEnseignants(Array.isArray(data) ? data : []))
      .catch(() => msgApi.warning("Impossible de charger la liste des enseignants"))
      .finally(() => setLoadingEns(false));
  }, [msgApi]);

  useEffect(() => { loadEnseignants(); }, [loadEnseignants]);

  // -- Upload change handler --------------------------------------------------
  const handleUploadChange = useCallback(({ fileList }) => {
    setFiles(fileList.map((f) => f.originFileObj ?? f));
  }, []);

  // -- Step 1: Launch AI analysis --------------------------------------------
  const handleAnalyze = async () => {
    if (files.length === 0) {
      msgApi.warning("Veuillez charger au moins un fichier.");
      return;
    }
    const enseignants = allEnseignants.map((e) => ({
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

      // Clear auto-assignments so the user assigns manually via DnD
      const cleaned = cloneDeep(result.propositions);
      for (const d of cleaned)
        for (const c of d.competences ?? [])
          for (const sc of c.sousCompetences ?? [])
            for (const s of sc.savoirs ?? [])
              s.enseignantsSuggeres = [];

      setTree(cleaned);
      setExtractedEnseignants(result.extractedEnseignants ?? []);
      setManuallyAddedExtracts([]);
      setFicheMatchedEnseignants(
        (result.foundEnseignants ?? []).map((e) => ({ ...e, enseignantId: String(e.id) })),
      );

      if (result.foundEnseignants?.length > 0) {
        setAllEnseignants((prev) => {
          const map = new Map();
          prev.forEach((e) => map.set(String(e.id ?? e.enseignantId), e));
          result.foundEnseignants.forEach((e) => {
            const eid = String(e.id);
            if (!map.has(eid)) map.set(eid, { ...e, enseignantId: e.id });
          });
          return Array.from(map.values());
        });
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
      setExtractedEnseignants((prev) =>
        prev.map((ex, i) => (i === extIdx ? { ...ex, matched_id: realId } : ex)),
      );
      msgApi.success("Enseignant identifie et affecte sur tous les savoirs lies");
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
      remapEnseignant(createEnsTarget.eid, realId);
      msgApi.success(`Enseignant ${prenom} ${nomUp} cree et lie`);
      setCreateEnsModal(false);
      setCreateEnsTarget(null);
    } catch (err) {
      msgApi.error(err.response?.data?.message ?? "Erreur lors de la creation");
    } finally {
      setSavingNewEns(false);
    }
  }, [createEnsTarget, createEnsData, remapEnseignant, msgApi]);

  // -- Reset all -------------------------------------------------------------
  const resetAll = useCallback(() => {
    setCurrentStep(0);
    setFiles([]);
    setDepartement("auto");
    setTree([]);
    setReport(null);
    setImportHistory(null);
    setEnsSearchStep2("");
    setAnalysisProgress(0);
    setManuallyAddedExtracts([]);
    setExtractedEnseignants([]);
    setFicheMatchedEnseignants([]);
    analyzeIsCanceledRef.current = false;
  }, [setTree, setReport, setImportHistory]);

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
      title: "Revision",
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

          {/* Step 2: Review */}
          {currentStep === 2 && (
            <motion.div key="step2" variants={STEP_VARIANTS} initial="initial" animate="animate" exit="exit">
              <ReviewStep
                tree={tree}
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
                effectiveEnseignants={effectiveEnseignants}
                filteredEffectiveEns={filteredEffectiveEns}
                ensSearchStep2={ensSearchStep2}
                setEnsSearchStep2={setEnsSearchStep2}
                loadingEns={loadingEns}
                loadEnseignants={loadEnseignants}
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
                const [di, ci, sci, si] = key.split("-").map(Number);
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
                    key={`${s.di}-${s.ci}-${s.sci}-${s.si}`}
                    value={`${s.di}-${s.ci}-${s.sci}-${s.si}`}
                  >
                    {s.label}
                  </Option>
                ))}
            </Select>
          </div>
        </Modal>

      </div>
    </>
  );
}
