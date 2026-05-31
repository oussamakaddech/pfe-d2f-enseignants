import { useState, useRef, useCallback } from "react";
import type { RefObject } from "react";
import type { RiceDomaine } from "@/models/competence";
import type { AnalysisResult, EnseignantRef, ExtractedEnseignant } from "@/pages/competence/rice/riceTypes";
import { cloneDeep } from "@/pages/competence/rice/constants";

interface MsgApi {
  warning: (msg: string) => void;
  error: (msg: string) => void;
}

interface RiceAnalyzeMutation {
  mutateAsync: (params: {
    files: File[];
    enseignants: Record<string, unknown>[];
    departement?: string;
  }) => Promise<AnalysisResult>;
}

interface UseRiceAnalysisParams {
  files: File[];
  departement: string;
  allEnseignants: EnseignantRef[];
  ignoreEnseignants: boolean;
  riceAnalyze: RiceAnalyzeMutation;
  msgApi: MsgApi;
  setTree: (tree: RiceDomaine[]) => void;
  setCurrentStep: (step: number) => void;
  setDepartement: (dept: string) => void;
  skipHistoryRef: RefObject<boolean>;
  prevTreeRef: RefObject<RiceDomaine[]>;
}

function isLikelyValidExtractedName(value: unknown): boolean {
  const name = typeof value === "string" ? value.trim() : "";
  if (name.length < 5 || name.includes(":")) return false;
  if (/^(module|code|unite|unit[eé]|responsable|pr[ée]requis|niveaux|objectif)\b/i.test(name)) return false;
  if (name.toLowerCase().includes("module") && name.toLowerCase().includes("unite")) return false;
  return /[a-zà-ÿ]{2,}\s+[a-zà-ÿ]{2,}/i.test(name);
}

function cleanTreePropositions(propositions: RiceDomaine[]): RiceDomaine[] {
  const cleaned = cloneDeep(propositions);
  for (const d of cleaned)
    for (const c of d.competences ?? []) {
      for (const s of c.savoirs ?? []) {
        s.aiSuggestedIds = (s.enseignantsSuggeres ?? []).map(String);
        s.enseignantsSuggeres = [];
      }
      for (const sc of c.sousCompetences ?? [])
        for (const s of sc.savoirs ?? []) {
          s.aiSuggestedIds = (s.enseignantsSuggeres ?? []).map(String);
          s.enseignantsSuggeres = [];
        }
    }
  return cleaned;
}

export function useRiceAnalysis({
  files, departement, allEnseignants, ignoreEnseignants,
  riceAnalyze, msgApi, setTree, setCurrentStep, setDepartement,
  skipHistoryRef, prevTreeRef,
}: UseRiceAnalysisParams) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [extractedEnseignants, setExtractedEnseignants] = useState<ExtractedEnseignant[]>([]);
  const [ensSearchStep2, setEnsSearchStep2] = useState("");
  const analyzeIsCanceledRef = useRef(false);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const deduplicateExtractedEnseignants = useCallback((extracted: ExtractedEnseignant[]) => {
    const extractedClean = (extracted ?? []).filter((ex) => isLikelyValidExtractedName(ex?.nom_complet));
    const dbNameSets = new Set<string>();
    (allEnseignants ?? []).forEach((e) => {
      const nom = String(e.nom ?? "").trim().toLowerCase();
      const prenom = String(e.prenom ?? "").trim().toLowerCase();
      if (nom && prenom) { dbNameSets.add(`${nom} ${prenom}`); dbNameSets.add(`${prenom} ${nom}`); }
    });
    const dedupMap = new Map<string, ExtractedEnseignant>();
    extractedClean.forEach((ex) => {
      const key = String(ex?.nom_complet ?? "").trim().toLowerCase();
      if (!key || dedupMap.has(key)) return;
      const parts = key.split(/\s+/).filter(Boolean);
      let matchesDB = dbNameSets.has(key);
      if (!matchesDB && parts.length >= 2) {
        matchesDB = dbNameSets.has(`${parts[0]} ${parts[1]}`) || dbNameSets.has(`${parts[1]} ${parts[0]}`);
      }
      if (!matchesDB) dedupMap.set(key, ex);
    });
    const deduped = Array.from(dedupMap.values());
    setExtractedEnseignants(deduped);
    try { sessionStorage.setItem("rice_extracted_enseignants", JSON.stringify(deduped)); } catch { }
  }, [allEnseignants]);

  const detectDepartment = useCallback((result: AnalysisResult) => {
    const detected = String(
      result?.detectedDepartement ?? result?.detectedDepartment ??
      result?.departementDetecte ?? result?.departement_detecte ??
      result?.stats?.departement ?? "",
    ).toLowerCase();
    if (detected && detected !== departement.toLowerCase()) {
      msgApi.warning(`Département détecté : ${detected.toUpperCase()}. Rechargement des enseignants...`);
      setDepartement(detected);
    }
  }, [departement, msgApi, setDepartement]);

  const handleAnalyze = useCallback(async () => {
    if (files.length === 0) { msgApi.warning("Veuillez charger au moins un fichier."); return; }
    const enseignants = (ignoreEnseignants ? [] : allEnseignants).map((e) => ({
      id: String(e.id ?? e.enseignantId), nom: e.nom ?? "", prenom: e.prenom ?? "", modules: e.modules ?? [],
    }));
    analyzeIsCanceledRef.current = false;
    setAnalyzing(true);
    setAnalysisProgress(0);
    setCurrentStep(1);
    progressTimerRef.current = setInterval(() => {
      setAnalysisProgress((p) => (p < 90 ? p + Math.random() * 15 : p));
    }, 800);
    try {
      const result = await riceAnalyze.mutateAsync({ files: files.filter(Boolean), enseignants, departement });
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      if (analyzeIsCanceledRef.current) return;
      setAnalysisProgress(100);
      const cleaned = cleanTreePropositions(result.propositions ?? []);
      setTree(cleaned);
      setAnalysisResult(result);
      skipHistoryRef.current = true;
      prevTreeRef.current = cloneDeep(cleaned);
      deduplicateExtractedEnseignants(result.extractedEnseignants ?? []);
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
  }, [files, departement, allEnseignants, ignoreEnseignants, riceAnalyze, msgApi, setTree, setCurrentStep, deduplicateExtractedEnseignants, detectDepartment, skipHistoryRef, prevTreeRef]);

  const handleUploadChange = useCallback(({ fileList }: { fileList: Array<{ originFileObj?: File; name?: string; size?: number }> }) => {
    const allowed = new Set(["pdf", "docx", "doc", "txt"]);
    const maxSize = 20 * 1024 * 1024;
    const accepted: File[] = [];
    for (const f of fileList) {
      const raw = f.originFileObj;
      if (!raw) continue;
      const ext = (raw.name.split(".").pop() || "").toLowerCase();
      if (!allowed.has(ext)) { msgApi.warning(`'${raw.name}' n'est pas supporté — seuls PDF, DOCX et TXT sont acceptés`); continue; }
      if (raw.size > maxSize) { msgApi.warning(`'${raw.name}' dépasse 20 Mo`); continue; }
      accepted.push(raw);
    }
    return accepted;
  }, [msgApi]);

  return {
    analyzing, setAnalyzing,
    analysisProgress, setAnalysisProgress,
    analysisResult,
    extractedEnseignants, setExtractedEnseignants,
    ensSearchStep2, setEnsSearchStep2,
    handleAnalyze, handleUploadChange,
    analyzeIsCanceledRef, progressTimerRef,
  };
}
