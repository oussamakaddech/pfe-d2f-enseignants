/* ─────────────────────────────────────────────────────────────────────────
 * useBesoinForm — Extracted state + logic from BesoinForm wizard.
 * ─────────────────────────────────────────────────────────────────────── */
import { useEffect, useRef, useState } from "react";
import { Form } from "antd";
import { getActiveRole } from "@/utils/storage/storage";
import { useAuth } from "@/hooks/auth/useAuth";
import { useAddBesoin, useReplaceBesoinCompetences } from "@/hooks/besoin/useBesoins";
import type { BesoinCompetenceLink } from "@/models/besoin";
import {
  useCompetenceDomaineApi,
  useCompetenceApi,
  useSavoirApi,
} from "@/hooks/competence/useCompetenceService";
import { useAllDepts } from "@/hooks/formation/useDeptCrud";
import { useAllUps } from "@/hooks/formation/useUpCrud";
import useAppNotification from "@/hooks/ui/useAppNotification";
import { ROLES } from "@/utils/constants/roles";
import * as XLSX from "xlsx";

type ReferentielDomaine    = { id?: string | number; nom?: string };
type ReferentielCompetence = { id?: string | number; nom?: string; domaineId?: string | number };
type ReferentielSavoir     = { id?: string | number; nom?: string; type?: string };

const toNum = (v: string | number | null | undefined): number | null =>
  v == null ? null : Number(v);

export function useBesoinForm() {
  const { user } = useAuth();
  const [form] = Form.useForm();
  const activeRole = String(getActiveRole() || "").toUpperCase();
  const userRole   = String(user?.role || "").toUpperCase();
  const canManageParticipants =
    [ROLES.CUP.toUpperCase(), ROLES.ADMIN.toUpperCase()].includes(userRole) ||
    [ROLES.CUP.toUpperCase(), ROLES.ADMIN.toUpperCase()].includes(activeRole);

  const { message: msgApi } = useAppNotification();
  const { data: departements = [], isLoading: deptsLoading } = useAllDepts();
  const { data: ups         = [], isLoading: upsLoading   } = useAllUps();
  const loading = deptsLoading || upsLoading;

  const [submitting,    setSubmitting]    = useState(false);
  const [currentStep,   setCurrentStep]   = useState(0);
  const [direction,     setDirection]     = useState(0);
  const [submitted,     setSubmitted]     = useState(false);
  const [lastImportCount, setLastImportCount] = useState(0);

  const participantsFileInputRef = useRef<HTMLInputElement>(null);
  const participantsText  = String(Form.useWatch("publicCible", form) || "");
  const participantsLines = participantsText.split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean);
  const participantsCount = participantsLines.length;

  // Competence RICE state
  const [compDomaines,      setCompDomaines]      = useState<ReferentielDomaine[]>([]);
  const [compCompetences,   setCompCompetences]   = useState<ReferentielCompetence[]>([]);
  const [selectedCompLinks, setSelectedCompLinks] = useState<BesoinCompetenceLink[]>([]);
  const [rowSavoirs,        setRowSavoirs]         = useState<Record<number, ReferentielSavoir[]>>({});
  const [compLoaded,        setCompLoaded]         = useState(false);
  const [compSearch,        setCompSearch]         = useState("");

  // Lazy-load référentiel RICE when user reaches step 3
  useEffect(() => {
    if (currentStep === 3 && !compLoaded) {
      const upId   = form.getFieldValue("up")         ? Number(form.getFieldValue("up"))         : null;
      const deptId = form.getFieldValue("departement") ? Number(form.getFieldValue("departement")) : null;
      Promise.all([
        useCompetenceDomaineApi().getAll(upId, deptId),
        useCompetenceApi().getAll(),
      ]).then(([domainesData, competencesData]) => {
        setCompDomaines(Array.isArray(domainesData)    ? domainesData    : []);
        setCompCompetences(Array.isArray(competencesData) ? competencesData : []);
        setCompLoaded(true);
      }).catch(() => msgApi.error("Impossible de charger le référentiel de compétences"));
    }
  }, [currentStep]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCompetenceChange = async (idx: number, competence: ReferentielCompetence | null) => {
    const updated = [...selectedCompLinks];
    updated[idx] = {
      ...updated[idx],
      competenceId:   toNum(competence?.id ?? null),
      competenceNom:  competence?.nom || "",
      domaineId:      toNum(competence?.domaineId ?? updated[idx]?.domaineId ?? null),
      sousCompetenceId: null,
      savoirId:       null,
    };
    setSelectedCompLinks(updated);
    const newSavoirs: Record<number, ReferentielSavoir[]> = { ...rowSavoirs };
    newSavoirs[idx] = [];
    if (competence?.id) {
      try {
        newSavoirs[idx] = await useSavoirApi().getByCompetence(competence.id) as ReferentielSavoir[];
      } catch { /* ignore */ }
    }
    setRowSavoirs(newSavoirs);
  };

  const getStepFields = (step: number): string[] => {
    switch (step) {
      case 0: return ["up", "departement", "typeBesoin", "publicCible"];
      case 1: return ["titre", "theme", "objectifFormation", "objectifsPedagogiques", "priorite", "impactStrategique"];
      case 2: return ["propositionAnimateur", "dateDebut", "dateFin", "dureeFormation", "nbMaxParticipants", "periodCode", "customPeriodLabel"];
      case 3: return [];
      case 4: return ["estOuverte", "methodesEvaluationAcquis", "autresInformations"];
      default: return [];
    }
  };

  const next = async () => {
    try {
      await form.validateFields(getStepFields(currentStep));
      setDirection(1);
      setCurrentStep((s) => s + 1);
    } catch { /* validation failed */ }
  };

  const prev = () => { setDirection(-1); setCurrentStep((s) => s - 1); };

  const importParticipantsFromExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) { msgApi.warning("Fichier Excel vide"); return; }
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], { header: 1 });
      if (!Array.isArray(rows) || rows.length === 0) { msgApi.warning("Aucune donnée participants trouvée"); return; }
      const [headerRow = [], ...dataRows] = rows as unknown[][];
      const header = (headerRow as unknown[]).map((cell) => String(cell || "").trim().toLowerCase());
      const idxNom    = header.findIndex((h: string) => ["nom", "name"].includes(h));
      const idxPrenom = header.findIndex((h: string) => ["prénom", "prenom", "first name", "firstname"].includes(h));
      const idxEmail  = header.findIndex((h: string) => ["email", "mail"].includes(h));
      const parsedLines = dataRows
        .map((row) => {
          if (!Array.isArray(row)) return "";
          const nom    = idxNom    >= 0 ? String(row[idxNom]    || "").trim() : "";
          const prenom = idxPrenom >= 0 ? String(row[idxPrenom] || "").trim() : "";
          const email  = idxEmail  >= 0 ? String(row[idxEmail]  || "").trim() : "";
          const fallback = String(row[0] || "").trim();
          if (nom || prenom || email) {
            return [nom, prenom].filter(Boolean).join(" ") + (email ? ` <${email}>` : "");
          }
          return fallback;
        })
        .map((l) => l.trim())
        .filter(Boolean);
      const uniqueLines = [...new Set(parsedLines)];
      const currentValue = String(form.getFieldValue("publicCible") || "").trim();
      const merged = [currentValue, ...uniqueLines].filter(Boolean).join("\n");
      form.setFieldsValue({ publicCible: merged });
      setLastImportCount(uniqueLines.length);
      msgApi.success(`${uniqueLines.length} participant(s) importé(s) depuis Excel`);
    } catch {
      msgApi.error("Erreur lors de l'import Excel des participants");
    } finally {
      if (participantsFileInputRef.current) participantsFileInputRef.current.value = "";
    }
  };

  const clearParticipants = () => {
    form.setFieldsValue({ publicCible: "" });
    setLastImportCount(0);
  };

  const formatParticipantsSummary = (rawValue: unknown): string => {
    const lines = String(rawValue || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return "—";
    const preview = lines.slice(0, 3).join(" | ");
    if (lines.length <= 3) return `${lines.length} participant(s) — ${preview}`;
    return `${lines.length} participant(s) — ${preview} ...`;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const values = form.getFieldsValue(true);
      const payload = {
        username:              user?.username || user?.userName || "anonymous",
        typeBesoin:            values.typeBesoin,
        up:                    values.up,
        departement:           values.departement,
        titre:                 values.titre,
        objectifFormation:     values.objectifFormation,
        propositionAnimateur:  values.propositionAnimateur,
        dateDebut:             values.dateDebut  ? values.dateDebut.format("YYYY-MM-DD")  : undefined,
        dateFin:               values.dateFin    ? values.dateFin.format("YYYY-MM-DD")    : undefined,
        priorite:              values.priorite,
        impactStrategique:     values.impactStrategique,
        publicCible:           (canManageParticipants || values.typeBesoin === "INDIVIDUEL" || values.typeBesoin === "COLLECTIF")
          ? values.publicCible : undefined,
        estOuverte:            values.estOuverte || false,
        autresInformations:    values.autresInformations,
        theme:                 values.theme,
        dureeFormation:        values.dureeFormation ? Number(values.dureeFormation) : undefined,
        nbMaxParticipants:     values.nbMaxParticipants ? Number(values.nbMaxParticipants) : 0,
        periodCode:            values.periodCode,
        customPeriodLabel:     values.customPeriodLabel,
        objectifsPedagogiques: values.objectifsPedagogiques,
        methodesEvaluationAcquis: values.methodesEvaluationAcquis,
      };
      const created = await useAddBesoin().mutateAsync(payload);
      const besoinId = created?.idBesoinFormation;
      if (besoinId && selectedCompLinks.length > 0) {
        const links = selectedCompLinks.filter((l) => l.competenceId).map((l) => ({ ...l }));
        if (links.length > 0) {
          await useReplaceBesoinCompetences().mutateAsync({ besoinId: Number(besoinId), links });
        }
      }
      msgApi.success("Besoin de formation ajouté avec succès !");
      setSubmitted(true);
      form.resetFields();
      setSelectedCompLinks([]);
      setRowSavoirs({});
      setCompLoaded(false);
      setCompSearch("");
      setLastImportCount(0);
      setCurrentStep(0);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      msgApi.error(e.response?.data?.message || "Erreur lors de l'ajout du besoin");
    } finally {
      setSubmitting(false);
    }
  };

  return {
    form,
    user,
    canManageParticipants,
    loading,
    submitting,
    currentStep,
    setCurrentStep,
    direction,
    setDirection,
    submitted,
    setSubmitted,
    participantsFileInputRef,
    participantsCount,
    lastImportCount,
    compDomaines,
    compCompetences,
    selectedCompLinks,
    setSelectedCompLinks,
    rowSavoirs,
    setRowSavoirs,
    compLoaded,
    compSearch,
    setCompSearch,
    departements,
    ups,
    handleCompetenceChange,
    handleSubmit,
    next,
    prev,
    importParticipantsFromExcel,
    clearParticipants,
    formatParticipantsSummary,
  };
}
