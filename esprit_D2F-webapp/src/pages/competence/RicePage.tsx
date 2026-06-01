import React, { useState, useCallback, useRef, useMemo, useEffect } from "react";
import type { ComponentProps } from "react";
import { useNavigate } from "react-router-dom";
import { Steps, Typography } from "antd";
import { AnimatePresence, motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { BarChartOutlined, EditOutlined, InboxOutlined, LoadingOutlined, RobotOutlined } from "@ant-design/icons";

import { useRiceTree }    from "@/hooks/analyse/useRiceTree";
import { useDragAndDrop } from "@/hooks/ui/useDragAndDrop";
import { useRiceReport }  from "@/hooks/analyse/useRiceReport";
import { useRiceAnalyze } from "@/hooks/analyse/useRiceService";
import { useCreateEnseignant } from "@/hooks/enseignant/useEnseignants";
import { useRiceEnseignantsLoader } from "@/hooks/analyse/useRiceEnseignantsLoader";
import { useRiceAnalysis }         from "@/hooks/analyse/useRiceAnalysis";
import { useRiceSession }          from "@/hooks/analyse/useRiceSession";
import { useRiceTeacherManager }   from "@/hooks/analyse/useRiceTeacherManager";

import UploadStep    from "./rice/UploadStep";
import AnalyzingStep from "./rice/AnalyzingStep";
import ReviewStep    from "./rice/ReviewStep";
import ReportStep    from "./rice/ReportStep";
import RiceHeroSection       from "./rice/RiceHeroSection";
import RiceSidePanel         from "./rice/RiceSidePanel";
import CreateEnseignantModal from "./rice/CreateEnseignantModal";
import MergeSavoirModal      from "./rice/MergeSavoirModal";

import { STORAGE_KEY } from "./rice/constants";
import type { RiceDomaine } from "@/models/competence";
import "@/styles/pages/rice-page.css";
import useAppNotification from "@/hooks/ui/useAppNotification";

const { Text, Title } = Typography;

const DEPT_ACCENT = {
  gc: "#52c41a", info: "#1677ff", telecom: "#722ed1", ge: "#fa541c", meca: "#fa8c16",
};

const STEP_VARIANTS: Variants = {
  initial: { opacity: 0, y: 18, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 28 } },
  exit:    { opacity: 0, y: -12, scale: 0.97, transition: { duration: 0.18 } },
};

// ---------------------------------------------------------------------------
export default function RicePage() {
  const { message: msgApi } = useAppNotification();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(0);
  const [files, setFiles]             = useState<File[]>([]);
  const [departement, setDepartement] = useState("auto");

  // Refs shared between useRiceAnalysis ↔ useRiceSession to coordinate undo history
  const skipHistoryRef = useRef(false);
  const prevTreeRef    = useRef<RiceDomaine[]>([]);

  // ── Hooks (ordered: tree → report → analysis → session → teacher) ──────────
  const riceAnalyze          = useRiceAnalyze();
  const createEnseignantHook = useCreateEnseignant();

  const treeHook = useRiceTree(msgApi);
  const {
    tree, setTree, treeSearch, setTreeSearch,
    editingNom, setEditingNom, mergeModal, setMergeModal,
    mergeSrc, setMergeSrc, mergeDst, setMergeDst,
    startRename, commitRename, updateTree,
    deleteSavoir, deleteSC, deleteComp, deleteDomaine,
    toggleType, setNiveau, toggleEnsAssign, setEnseignants,
    remapInTree, confirmMerge,
    allSavoirsFlat, liveStats, treeFilteredIndices,
  } = treeHook;

  const reportHook = useRiceReport({ tree, departement, msgApi, onImportSuccess: () => setCurrentStep(3) });
  const { importing, report, setReport, importHistory, setImportHistory, historyLoading, handleImport, loadImportHistory, exportReportJson } = reportHook;

  const {
    allEnseignants, setAllEnseignants,
    enseignantsLoading, enseignantsError, enseignantsLoadSlow, ignoreEnseignants,
    loadEnseignants, continueWithoutEnseignants,
  } = useRiceEnseignantsLoader(departement, msgApi);

  const {
    analyzing, setAnalyzing, analysisProgress, setAnalysisProgress,
    analysisResult, extractedEnseignants, setExtractedEnseignants,
    handleAnalyze, handleUploadChange,
    analyzeIsCanceledRef, progressTimerRef,
  } = useRiceAnalysis({
    files, departement, allEnseignants, ignoreEnseignants,
    riceAnalyze, msgApi, setTree, setCurrentStep, setDepartement,
    skipHistoryRef, prevTreeRef,
  });

  const { showAutosave } = useRiceSession({
    tree, currentStep, departement, filesCount: files.length,
    analyzing, importing, handleAnalyze, handleImport,
    msgApi, setTree, editingNom, mergeModal,
    setEditingNom, setMergeModal, setMergeSrc, setMergeDst,
    skipHistoryRef, prevTreeRef,
  });

  const {
    createEnsModal, setCreateEnsModal,
    setCreateEnsTarget,
    createEnsData, setCreateEnsData,
    savingNewEns, handleCreateNewEnseignant,
  } = useRiceTeacherManager({
    msgApi, createEnseignantMutate: createEnseignantHook.mutateAsync,
    setAllEnseignants, tree, setEnseignants, remapInTree, setExtractedEnseignants,
  });

  // ── Derived state ───────────────────────────────────────────────────────────
  const effectiveEnseignants = useMemo(() => {
    const dbMap = new Map((allEnseignants ?? []).map((e) => [String(e.id ?? e.enseignantId), e]));
    (analysisResult?.foundEnseignants ?? []).forEach((e) => {
      const id = String(e.id ?? e.enseignantId);
      if (!dbMap.has(id)) dbMap.set(id, { ...e, id, enseignantId: id });
    });
    return Array.from(dbMap.values());
  }, [allEnseignants, analysisResult]);

  const dndHook = useDragAndDrop({ tree, toggleEnsAssign, updateTree, effectiveEnseignants, msgApi });

  const resetAll = useCallback(() => {
    setCurrentStep(0); setFiles([]); setDepartement("auto");
    setTree([]); setReport(null); setImportHistory(null);
    prevTreeRef.current = []; skipHistoryRef.current = true;
    try { sessionStorage.removeItem("rice_extracted_enseignants"); } catch {}
    try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
  }, [setTree, setReport, setImportHistory]);

  // Confetti on clean import success
  useEffect(() => {
    if (currentStep !== 3 || !report) return;
    const errorsCount = (report.errors?.length ?? report.importStats?.errors?.length ?? 0);
    if (errorsCount > 0) return;
    document.body.classList.add("confetti-active");
    const colors = ["#ff4d4f", "#faad14", "#52c41a", "#1677ff", "#722ed1"];
    const pieces: HTMLElement[] = [];
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
    const timer = setTimeout(() => { pieces.forEach((p) => p.remove()); document.body.classList.remove("confetti-active"); }, 3000);
    return () => { clearTimeout(timer); pieces.forEach((p) => p.remove()); document.body.classList.remove("confetti-active"); };
  }, [currentStep, report]);

  // ── Display config ──────────────────────────────────────────────────────────
  const currentDeptLabel = departement === "auto" ? "Auto-détection" : departement.toUpperCase();

  const steps = useMemo(() => [
    { title: "Upload",          icon: <InboxOutlined />,                                      description: files.length > 0 ? `${files.length} fichier(s)` : "" },
    { title: "Analyse IA",      icon: analyzing ? <LoadingOutlined /> : <RobotOutlined />,   description: analyzing ? "En cours..." : "" },
    { title: "Revue structure", icon: <EditOutlined />,                                       description: currentStep >= 2 ? `${liveStats.totalSavoirs} savoirs` : "" },
    { title: "Rapport",         icon: <BarChartOutlined /> },
  ], [files.length, analyzing, currentStep, liveStats.totalSavoirs]);

  const currentStageTitle = steps[currentStep]?.title ?? "Upload";

  // ── JSX ─────────────────────────────────────────────────────────────────────
  return (
    <div
      className="rice-page"
      style={{ "--rice-accent": DEPT_ACCENT[departement as keyof typeof DEPT_ACCENT] ?? "#1677ff" } as React.CSSProperties & Record<string, string>}
    >
      <div className="rice-shell">
        <RiceHeroSection
          currentDeptLabel={currentDeptLabel}
          filesCount={files.length}
          currentStep={currentStep}
          stepsCount={steps.length}
          currentStageTitle={currentStageTitle}
          liveStats={liveStats}
          allEnseignants={allEnseignants}
          ignoreEnseignants={ignoreEnseignants}
          effectiveEnseignants={effectiveEnseignants}
          analyzing={analyzing}
          onAnalyze={() => void handleAnalyze()}
          onNavigateMatchmaking={() => navigate("/home/rice/matchmaking")}
          onReset={resetAll}
        />

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
                    handleUploadChange={(info) => { const accepted = handleUploadChange(info as Parameters<typeof handleUploadChange>[0]); if (accepted) setFiles(accepted); }}
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

          <RiceSidePanel
            ignoreEnseignants={ignoreEnseignants}
            enseignantsCount={allEnseignants.length}
            currentDeptLabel={currentDeptLabel}
            enseignantsLoading={enseignantsLoading}
            enseignantsError={enseignantsError}
            steps={steps}
            currentStep={currentStep}
            onReload={loadEnseignants}
            onContinueWithout={continueWithoutEnseignants}
          />
        </div>

        <CreateEnseignantModal
          open={createEnsModal}
          data={createEnsData}
          saving={savingNewEns}
          onChangeData={setCreateEnsData}
          onConfirm={() => void handleCreateNewEnseignant()}
          onCancel={() => setCreateEnsModal(false)}
        />

        <MergeSavoirModal
          open={mergeModal}
          mergeSrc={mergeSrc as ComponentProps<typeof MergeSavoirModal>["mergeSrc"]}
          mergeDst={mergeDst as ComponentProps<typeof MergeSavoirModal>["mergeDst"]}
          allSavoirsFlat={allSavoirsFlat as ComponentProps<typeof MergeSavoirModal>["allSavoirsFlat"]}
          onConfirm={confirmMerge}
          onCancel={() => { setMergeModal(false); setMergeSrc(null); setMergeDst(null); }}
          onSelectDst={(coords) => setMergeDst(coords as Parameters<typeof setMergeDst>[0])}
        />

        {currentStep === 2 && showAutosave && (
          <div className="rice-autosave-badge">Sauvegardé automatiquement</div>
        )}
      </div>
    </div>
  );
}
