import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/auth/useAuth";
import { useAllFormations, useCreateFormation, useAllAccounts } from "@/hooks/formation/useFormations";
import { useAllUps } from "@/hooks/formation/useUpCrud";
import { useAllDepts } from "@/hooks/formation/useDeptCrud";
import { useEnseignants } from "@/hooks/enseignant/useEnseignants";
import { useReplaceAllFormationCompetences } from "@/hooks/competence/useFormationCompetence";
import { useCompetenceDomaineApi, useCompetenceApi } from "@/hooks/competence/useCompetenceService";
import { useBesoinCompetences } from "@/hooks/besoin/useBesoins";
import { isAdmin } from "@/utils/constants/roles";
import useAppNotification from "@/hooks/ui/useAppNotification";
import EnseignantService from "@/services/formation/EnseignantService";
import CompetenceService from "@/services/competence/CompetenceService";

export type PersonItem = { id?: unknown; type?: string; cup?: string; chefDepartement?: string; nom?: string; prenom?: string; mail?: string; upLibelle?: string; deptLibelle?: string; isAuthUser?: boolean; userName?: string; etat?: string };
export type AccountItem = { id?: unknown; role?: string; userName?: string; username?: string; lastName?: string; firstName?: string; emailAddress?: string; email?: string; type?: string; upLibelle?: string; deptLibelle?: string };
export type SeanceItem = { id?: unknown; dateSeance?: string; heureDebut?: unknown; heureFin?: unknown; salle?: unknown; animateurs?: { id?: unknown }[]; participants?: { id?: unknown }[]; seances?: SeanceItem[] };
export type FormationRaw = { idFormation?: unknown; id?: unknown; titreFormation?: string; seances?: SeanceItem[]; participants?: { id?: unknown }[] };
export type LookupNode = { id?: unknown; libelle?: string; nom?: string };
export type BesoinLinkRaw = { _id?: string; domaineId?: number | null; competenceId?: number | null; competenceNom?: string; savoirId?: number | null; savoirNom?: string; sousCompetenceId?: number | null };

export type BesoinInfoShape = { titre?: string; objectifFormation?: string; dateDebut?: string; dateFin?: string; dureeFormation?: number; estOuverte?: boolean; periodCode?: string; customPeriodLabel?: string; periodeFormation?: string; publicCible?: string; propositionAnimateur?: string; objectifsPedagogiques?: string; methodesEvaluationAcquis?: string; theme?: string; up?: unknown; departement?: unknown; idBesoinFormation?: number | string; typeBesoin?: string; priorite?: string };

export function mapBesoinLink(l: BesoinLinkRaw) {
  return {
    _id: crypto.randomUUID(),
    domaineId: l.domaineId ?? null,
    competenceId: l.competenceId ?? null,
    competenceNom: l.competenceNom || "",
    savoirId: l.savoirId ?? null,
    savoirNom: l.savoirNom || "",
    sousCompetenceId: l.sousCompetenceId ?? null,
  };
}

export const getPersonIds = (arr: { id?: unknown }[]) => (Array.isArray(arr) ? arr : []).map((a) => a?.id).filter(Boolean);

function mergeFormateursAccounts(accountsData: AccountItem[], enseignantsData: PersonItem[]): PersonItem[] {
  if (!Array.isArray(accountsData)) return [];
  const formateurs = accountsData
    .filter(a => (a.role || "").toUpperCase() === "FORMATEUR")
    .map(a => ({
      id: a.id,
      isAuthUser: true,
      userName: a.userName || a.username,
      nom: a.lastName || a.userName || a.username || "Formateur",
      prenom: a.firstName || "",
      mail: a.emailAddress || a.email || "",
      type: "V",
      etat: "A",
      cup: "N",
      chefDepartement: "N",
      upLibelle: "",
      deptLibelle: ""
    }));
  const fUserNames = formateurs.map(f => f.userName).filter(Boolean);
  const enriched = formateurs.map(f => {
    const prefix = f.mail ? f.mail.split("@")[0] : "";
    const match = enseignantsData.find(ex =>
      fUserNames.includes(ex.id as string) || ex.mail === f.mail || ex.mail?.split("@")[0] === prefix
    );
    return match ? { ...f, upLibelle: match.upLibelle || "", deptLibelle: match.deptLibelle || "", type: match.type || f.type } : f;
  });
  return enriched;
}

export function toMinutes(timeValue: unknown): number | null {
  if (!timeValue) return null;
  const parts = String(timeValue).split(":");
  if (parts.length < 2) return null;
  const h = Number.parseInt(parts[0], 10);
  const m = Number.parseInt(parts[1], 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return (h * 60) + m;
}

export function getAnimateurStableId(anim: PersonItem): unknown {
  return anim?.isAuthUser
    ? String(anim.userName || anim.nom || "").substring(0, 10).toUpperCase()
    : anim?.id;
}

export type FormationWorkflowFormProps = {
  initialDate?: string;
  onFormationCreated?: (f?: import("@/models/formation").Formation) => void;
  besoinInfo?: BesoinInfoShape;
};

export function useFormationWorkflow({ initialDate, onFormationCreated, besoinInfo }: FormationWorkflowFormProps) {
  const navigate = useNavigate();
  const auth = useAuth();
  const { message } = useAppNotification();
  const isAdminUser = isAdmin(auth?.user?.role);
  const [activeStep, setActiveStep] = useState(0);

  const { data: upsData } = useAllUps();
  const { data: deptsData } = useAllDepts();
  const { data: enseignantsData } = useEnseignants();
  const { data: formationsData } = useAllFormations();
  const { data: accountsData } = useAllAccounts();
  const { data: besoinCompetencesData } = useBesoinCompetences(
    activeStep === 3 ? besoinInfo?.idBesoinFormation : undefined
  );
  const { mutateAsync: createFormation } = useCreateFormation();
  const { mutateAsync: replaceCompetences } = useReplaceAllFormationCompetences();

  const [titre, setTitre] = useState(besoinInfo?.titre || besoinInfo?.objectifFormation || "");
  const [dateDebut, setDateDebut] = useState(besoinInfo?.dateDebut || (initialDate ? format(new Date(initialDate), "yyyy-MM-dd") : ""));
  const [dateFin, setDateFin] = useState(besoinInfo?.dateFin || (initialDate ? format(new Date(initialDate), "yyyy-MM-dd") : ""));
  const [typeFormation, setTypeFormation] = useState("INTERNE");
  const [etatFormation, setEtatFormation] = useState("ENREGISTRE");
  const [cout, setCout] = useState(0);
  const [organisme, setOrganisme] = useState("");
  const [chargeH, setChargeH] = useState(besoinInfo?.dureeFormation || 40);
  const [ouverte, setOuverte] = useState(besoinInfo?.estOuverte || false);
  const [periodCode, setPeriodCode] = useState(besoinInfo?.periodCode || "OTHER");
  const [customPeriodLabel, setCustomPeriodLabel] = useState(besoinInfo?.customPeriodLabel || besoinInfo?.periodeFormation || "");

  const [formNom, setFormNom] = useState("");
  const [formPrenom, setFormPrenom] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [salle, setSalle] = useState("");
  const [bureauNom, setBureauNom] = useState("");
  const [bureauMail, setBureauMail] = useState("");
  const [bureauTelephone, setBureauTelephone] = useState("");

  const [ups, setUps] = useState<LookupNode[]>([]);
  const [depts, setDepts] = useState<LookupNode[]>([]);
  const [selectedUp, setSelectedUp] = useState<LookupNode | null>(null);
  const [selectedDept, setSelectedDept] = useState<LookupNode | null>(null);

  const [enseignants, setEnseignants] = useState<PersonItem[]>([]);
  const [existingFormations, setExistingFormations] = useState<unknown[]>([]);
  const [formateursList, setFormateursList] = useState<PersonItem[]>([]);

  const [animSel, setAnimSel] = useState<PersonItem[]>([]);
  const [animFilterUp, setAnimFilterUp] = useState<LookupNode | null>(null);
  const [animFilterDept, setAnimFilterDept] = useState<LookupNode | null>(null);

  const [partSel, setPartSel] = useState<PersonItem[]>([]);
  const [partFilterUp, setPartFilterUp] = useState<LookupNode | null>(null);
  const [partFilterDept, setPartFilterDept] = useState<LookupNode | null>(null);

  const [overlapWarnings, setOverlapWarnings] = useState<unknown[]>([]);
  const [domaine, setDomaine] = useState(besoinInfo?.theme || "");
  const [populationCible, setPopulationCible] = useState(besoinInfo?.publicCible || "");
  const [objectifs, setObjectifs] = useState(besoinInfo?.objectifFormation || "");
  const [objectifsPedago, setObjectifsPedago] = useState(besoinInfo?.objectifsPedagogiques || "");
  const [evalMethods, setEvalMethods] = useState(besoinInfo?.methodesEvaluationAcquis || "");

  const [coutTransport, setCoutTransport] = useState(0);
  const [coutHebergement, setCoutHebergement] = useState(0);
  const [coutRepas, setCoutRepas] = useState(0);

  const [compDomaines, setCompDomaines] = useState<{ id?: string | number | null; nom?: string }[]>([]);
  const [compCompetences, setCompCompetences] = useState<{ id?: string | number | null; nom?: string; domaineId?: string | number | null }[]>([]);
  const [selectedCompLinks, setSelectedCompLinks] = useState<BesoinLinkRaw[]>([]);
  const [rowSavoirs, setRowSavoirs] = useState<Record<number, { id?: unknown; nom?: string; type?: string }[]>>({});
  const [compSearch, setCompSearch] = useState("");

  const [seances, setSeances] = useState([
    { id: Date.now(), dateSeance: dateDebut || format(new Date(), "yyyy-MM-dd"), heureDebut: "08:00:00", heureFin: "10:00:00", salle: "", onlineMeetingUrl: "", typeSeance: "THEORIQUE", contenus: "", methodes: "", dureeTheorique: 0, dureePratique: 0, expanded: true },
  ]);

  const [showUpload, setShowUpload] = useState(false);
  const [newFormationId, setNewFormationId] = useState<number | string | null>(null);

  const enseignantsList = Array.isArray(enseignants) ? enseignants : [];

  const optionsAnim = formateursList.filter(x =>
    (!animFilterUp || x.upLibelle === animFilterUp.libelle) &&
    (!animFilterDept || x.deptLibelle === animFilterDept.libelle)
  );

  const optionsPart = enseignantsList.filter(x =>
    (!partFilterUp || x.upLibelle === partFilterUp.libelle) &&
    (!partFilterDept || x.deptLibelle === partFilterDept.libelle)
  );

  useEffect(() => {
    if (besoinInfo?.publicCible && enseignantsList.length > 0 && partSel.length === 0) {
      const emails = (besoinInfo.publicCible.match(/<([^>]+)>/g) || []).map(m => m.slice(1, -1).trim().toLowerCase());
      if (emails.length > 0) {
        const matched = enseignantsList.filter(e => e.mail && emails.includes(e.mail.toLowerCase()));
        if (matched.length > 0) setPartSel(matched);
      }
    }
  }, [besoinInfo, enseignantsList, partSel.length]);

  useEffect(() => {
    if (!besoinInfo?.propositionAnimateur || formateursList.length === 0 || animSel.length > 0) return;
    const text = besoinInfo.propositionAnimateur.trim();
    const emailMatch = text.match(/<([^>]+)>/);
    let matched: PersonItem | undefined = undefined;
    if (emailMatch) {
      const email = emailMatch[1].trim().toLowerCase();
      matched = formateursList.find(f => f.mail && f.mail.toLowerCase() === email);
    }
    if (!matched) {
      const norm = text.toLowerCase().replaceAll(/<[^>]*>/g, "").trim();
      matched = formateursList.find(f => {
        const full = `${f.nom} ${f.prenom}`.toLowerCase();
        const fullR = `${f.prenom} ${f.nom}`.toLowerCase();
        return full === norm || fullR === norm || norm.includes(full) || norm.includes(fullR);
      });
    }
    if (matched) setAnimSel([matched]);
  }, [formateursList, besoinInfo, animSel.length]);

  useEffect(() => {
    (async () => {
      try {
        const u = (upsData ?? []) as LookupNode[];
        const d = (deptsData ?? []) as LookupNode[];
        const e = (enseignantsData ?? []) as PersonItem[];
        const formations = (formationsData ?? []) as FormationRaw[];
        setUps(u);
        setDepts(d);
        setEnseignants(e);
        if (besoinInfo) {
          if (besoinInfo.up) {
            const foundUp = u.find((up: LookupNode) => String(up.id) === String(besoinInfo.up));
            if (foundUp) setSelectedUp(foundUp);
          }
          if (besoinInfo.departement) {
            const foundDept = d.find((dept: LookupNode) => String(dept.id) === String(besoinInfo.departement));
            if (foundDept) setSelectedDept(foundDept);
          }
        }
        setExistingFormations(formations);
        setFormateursList(mergeFormateursAccounts((accountsData ?? []) as AccountItem[], e));
      } catch {
        message.error("Échec chargement des données");
      }
    })();
  }, [initialDate]);

  useEffect(() => {
    if (activeStep === 3 && compDomaines.length === 0) {
      const domaineApi = useCompetenceDomaineApi();
      const competenceApi = useCompetenceApi();
      Promise.all([domaineApi.getAll(), competenceApi.getAll()]).then(([domainesData, competencesData]) => {
        const domaines = Array.isArray(domainesData) ? domainesData : [];
        const competences = Array.isArray(competencesData) ? competencesData : [];
        setCompDomaines(domaines);
        setCompCompetences(competences);
        if (besoinCompetencesData && selectedCompLinks.length === 0) {
          const links = Array.isArray(besoinCompetencesData) ? besoinCompetencesData : [];
          if (links.length > 0) setSelectedCompLinks(links.map(mapBesoinLink));
        }
      }).catch(() => message.error("Impossible de charger le référentiel de compétences"));
    }
  }, [activeStep]);

  const intersects = (left: unknown[], right: unknown[]) => left.some((id) => right.includes(id));

  const sameTimeWindow = (a: { dateSeance?: string; heureDebut?: unknown; heureFin?: unknown }, b: { dateSeance?: string; heureDebut?: unknown; heureFin?: unknown }) => {
    if (!a?.dateSeance || !b?.dateSeance || a.dateSeance !== b.dateSeance) return false;
    const aStart = toMinutes(a.heureDebut); const aEnd = toMinutes(a.heureFin);
    const bStart = toMinutes(b.heureDebut); const bEnd = toMinutes(b.heureFin);
    if (aStart === null || aEnd === null || bStart === null || bEnd === null) return false;
    return aStart < bEnd && bStart < aEnd;
  };

  const normalizedSalle = (value: unknown) => String(value || "").trim().toLowerCase();

  const checkExistingFormationConflicts = (localSeance: SeanceItem, idx: number, formations: FormationRaw[], msgs: string[], participantIds: unknown[], animateurIds: unknown[]) => {
    formations.forEach((f) => {
      const existingSeances: SeanceItem[] = Array.isArray(f.seances) ? f.seances : [];
      const existingParticipants = [...(Array.isArray(f.participants) ? f.participants : []), ...existingSeances.flatMap((s) => Array.isArray(s.participants) ? s.participants : [])].map((p) => p?.id).filter(Boolean);
      existingSeances.forEach((existingSeance) => {
        if (!sameTimeWindow(localSeance, existingSeance)) return;
        const formationName = f.titreFormation || `#${f.idFormation || f.id || "?"}`;
        const localSalle = normalizedSalle(localSeance.salle); const existingSalle = normalizedSalle(existingSeance.salle);
        if (localSalle && existingSalle && localSalle === existingSalle) msgs.push(`Conflit salle: séance #${idx + 1} chevauche la formation ${formationName} dans la salle ${localSeance.salle}.`);
        const existingAnimIds = getPersonIds(existingSeance.animateurs ?? []);
        if (participantIds.length > 0 && existingParticipants.length > 0 && intersects(participantIds, existingParticipants)) msgs.push(`Conflit participants: séance #${idx + 1} chevauche la formation ${formationName}.`);
        if (animateurIds.length > 0 && existingAnimIds.length > 0 && intersects(animateurIds, existingAnimIds)) msgs.push(`Conflit animateurs: séance #${idx + 1} chevauche la formation ${formationName}.`);
      });
    });
  };

  const checkSeancePairConflicts = (left: SeanceItem, right: SeanceItem, i: number, j: number, participantIds: unknown[], animateurIds: unknown[], msgs: string[]) => {
    if (!sameTimeWindow(left, right)) return;
    const leftSalle = normalizedSalle(left.salle); const rightSalle = normalizedSalle(right.salle);
    if (leftSalle && rightSalle && leftSalle === rightSalle) msgs.push(`Conflit interne: les séances #${i + 1} et #${j + 1} utilisent la même salle au même horaire.`);
    const leftPartIds = getPersonIds(left.participants ?? []); const rightPartIds = getPersonIds(right.participants ?? []);
    if (leftPartIds.length > 0 && rightPartIds.length > 0 && intersects(leftPartIds, rightPartIds)) msgs.push(`Conflit interne: les séances #${i + 1} et #${j + 1} se chevauchent pour les mêmes participants.`);
    const leftAnimIds = getPersonIds(left.animateurs ?? []); const rightAnimIds = getPersonIds(right.animateurs ?? []);
    if (leftAnimIds.length > 0 && rightAnimIds.length > 0 && intersects(leftAnimIds, rightAnimIds)) msgs.push(`Conflit interne: les séances #${i + 1} et #${j + 1} se chevauchent pour les mêmes animateurs.`);
  };

  const buildConflictMessages = ({ localSeances, participantIds, animateurIds }: { localSeances: SeanceItem[]; participantIds: unknown[]; animateurIds: unknown[] }) => {
    const msgs: string[] = [];
    localSeances.forEach((s, idx) => { const start = toMinutes(s.heureDebut); const end = toMinutes(s.heureFin); if (start !== null && end !== null && start >= end) msgs.push(`Séance #${idx + 1}: heure de fin doit être après l&apos;heure de début.`); });
    for (let i = 0; i < localSeances.length; i += 1) for (let j = i + 1; j < localSeances.length; j += 1) checkSeancePairConflicts(localSeances[i], localSeances[j], i, j, participantIds, animateurIds, msgs);
    localSeances.forEach((localSeance, idx) => checkExistingFormationConflicts(localSeance, idx, existingFormations as FormationRaw[], msgs, participantIds, animateurIds));
    return [...new Set(msgs)];
  };

  useEffect(() => {
    const localAnimIds = animSel.map(getAnimateurStableId).filter(Boolean);
    const localParticipantIds = partSel.map((p) => p.id).filter(Boolean);
    setOverlapWarnings(buildConflictMessages({ localSeances: seances, participantIds: localParticipantIds, animateurIds: localAnimIds }));
  }, [seances, partSel, animSel, existingFormations]);

  const validateStep0 = () => {
    if (!titre || titre.trim().length < 5) { message.error("Le titre doit contenir au moins 5 caractères"); return false; }
    if (!typeFormation) { message.error("Sélectionnez un type de formation"); return false; }
    if (dateDebut && dateFin && dateDebut > dateFin) { message.error("La date de fin doit être postérieure à la date de début"); return false; }
    return true;
  };

  const validateStep2 = () => {
    if (seances.length === 0) { message.error("Ajoutez au moins une séance avant de continuer"); return false; }
    const missDate = seances.findIndex(s => !s.dateSeance);
    if (missDate !== -1) { message.error(`La séance #${missDate + 1} n'a pas de date`); return false; }
    const badTime = seances.findIndex(s => { const sd = toMinutes(s.heureDebut); const ed = toMinutes(s.heureFin); return sd !== null && ed !== null && sd >= ed; });
    if (badTime !== -1) { message.error(`La séance #${badTime + 1} : l'heure de fin doit être après l'heure de début`); return false; }
    const totalMin = seances.reduce((acc, s) => { const start = toMinutes(s.heureDebut) ?? 0; const end = toMinutes(s.heureFin) ?? 0; return acc + Math.max(0, end - start); }, 0);
    if (totalMin > 0) setChargeH(Math.round((totalMin / 60) * 10) / 10);
    return true;
  };

  const handleNext = () => {
    if (activeStep === 0 && !validateStep0()) return;
    if (activeStep === 2 && !validateStep2()) return;
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => setActiveStep((prev) => prev - 1);

  const addSeance = () => setSeances([...seances, { id: Date.now(), dateSeance: dateDebut, heureDebut: "08:00:00", heureFin: "10:00:00", salle: "", onlineMeetingUrl: "", typeSeance: "THEORIQUE", contenus: "", methodes: "", dureeTheorique: 0, dureePratique: 0, expanded: true }]);
  const updateSeance = (i: number, f: string, v: unknown) => { const a = [...seances]; a[i] = { ...a[i], [f]: v }; setSeances(a); };
  const removeSeance = (i: number) => setSeances(seances.filter((_, idx) => idx !== i));
  const toggleSeance = (i: number) => updateSeance(i, "expanded", !seances[i].expanded);

  const handleCompetenceChange = async (idx: number, competence: { id?: string | number | null; nom?: string; domaineId?: string | number | null } | null) => {
    const updated = [...selectedCompLinks];
    const toNum = (v: string | number | null | undefined): number | null => v == null ? null : Number(v);
    updated[idx] = { ...updated[idx], competenceId: toNum(competence?.id), competenceNom: competence?.nom || "", domaineId: toNum(competence?.domaineId ?? updated[idx].domaineId), sousCompetenceId: null, savoirId: null };
    setSelectedCompLinks(updated);
    if (competence?.id) {
      const [, sv] = await Promise.all([CompetenceService.sousCompetence.getByCompetence(competence.id), CompetenceService.savoir.getByCompetence(competence.id)]);
      setRowSavoirs((p) => ({ ...p, [idx]: Array.isArray(sv) ? sv : [] }));
    }
  };

  const handleCompetenceSelect = (idx: number, val: number | string | null) => handleCompetenceChange(idx, compCompetences.find(c => c.id === val) ?? null);

  const handleSavoirSelect = (idx: number, val: number | null) => {
    const u = [...selectedCompLinks];
    const savoirs = (rowSavoirs as Record<number, { id?: unknown; nom?: string; type?: string }[]>)[idx] ?? [];
    u[idx] = { ...u[idx], savoirId: val, savoirNom: savoirs.find(s => s.id === val)?.nom ?? "" };
    setSelectedCompLinks(u);
  };

  const handleRemoveCompetenceLink = (idx: number) => setSelectedCompLinks(selectedCompLinks.filter((_, i) => i !== idx));

  const getCompetenceOptions = (domaineId: number | string | null | undefined) => {
    const kw = compSearch.trim().toLowerCase();
    return compCompetences.filter(c => (!domaineId || c.domaineId === domaineId) && (!kw || c.nom?.toLowerCase().includes(kw))).map(c => ({ value: c.id, label: c.nom }));
  };

  const getEnseignantLabel = (opt: { type?: string; cup?: string; chefDepartement?: string; nom?: string; prenom?: string; mail?: string } | null) => {
    if (!opt) return "";
    const roles = [];
    if (opt.type === "P") roles.push("Perm.");
    if (opt.type === "V") roles.push("Vac.");
    if (opt.cup === "O" || opt.cup === "Y" || opt.cup === "1") roles.push("CUP");
    if (opt.chefDepartement === "O" || opt.chefDepartement === "Y" || opt.chefDepartement === "1") roles.push("ChefDep");
    const roleStr = roles.length > 0 ? ` [${roles.join(", ")}]` : "";
    return `${opt.nom} ${opt.prenom} (${opt.mail})${roleStr}`;
  };

  const getAnimateurLabel = (opt: { type?: string; cup?: string; nom?: string; prenom?: string; mail?: string } | null) => {
    if (!opt) return "";
    let type = ""; if (opt.type === "P") type = " · Perm."; else if (opt.type === "V") type = " · Vac.";
    const cup = opt.cup === "O" || opt.cup === "Y" || opt.cup === "1" ? " · CUP" : "";
    return `${opt.nom} ${opt.prenom} (${opt.mail})${type}${cup}`;
  };

  const handleExcelImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const { read, utils } = await import("xlsx");
      const data = new Uint8Array(ev.target!.result as ArrayBuffer);
      const wb = read(data, { type: "array" });
      const rows = utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]]);
      const mails = rows.map(r => r["Email"] ?? r["email"] ?? r["Mail"] ?? r["mail"] ?? r["EMAIL"] ?? r["MAIL"] ?? r["email_address"]).filter(Boolean).map(m => String(m).trim().toLowerCase());
      const matched = enseignants.filter(ex => ex.mail && mails.includes(ex.mail.toLowerCase()));
      setPartSel(matched);
      e.target.value = "";
      if (matched.length > 0) message.success(`${matched.length} participant${matched.length > 1 ? "s" : ""} importé${matched.length > 1 ? "s" : ""}`);
      else if (mails.length === 0) { const headers = rows.length > 0 ? Object.keys(rows[0]).join(", ") : "fichier vide"; message.warning(`Aucun email trouvé. Colonne attendue : Email ou Mail. Colonnes trouvées : ${headers}`); }
      else message.warning(`Aucun participant correspondant pour les ${mails.length} email${mails.length > 1 ? "s" : ""} importés`);
    };
    reader.readAsArrayBuffer(file);
  };

  const exportParticipantsExcel = async () => {
    const { writeExcel, exportDateLabel, isoDate } = await import("utils/helpers/excelExport");
    const source = partSel.length > 0 ? partSel : optionsPart;
    const rows = source.map(p => {
      let pType = p.type || "";
      if (p.type === "P") pType = "Permanent"; else if (p.type === "V") pType = "Vacataire";
      return { Nom: p.nom || "", Prénom: p.prenom || "", Email: p.mail || "", Type: pType, UP: p.upLibelle || "", Département: p.deptLibelle || "" };
    });
    writeExcel([{ name: "Participants", rows, title: "Liste des Participants — Esprit", subtitle: exportDateLabel() }], `participants_${isoDate()}.xlsx`);
  };

  const validateSeancesForSubmit = () => {
    for (let i = 0; i < seances.length; i += 1) {
      if (!seances[i].dateSeance || seances[i].dateSeance.trim() === "") { message.warning(`Séance #${i + 1}: veuillez remplir la date.`); return false; }
      if (!seances[i].heureDebut || seances[i].heureDebut.trim() === "") { message.warning(`Séance #${i + 1}: veuillez remplir l'heure de début.`); return false; }
      if (!seances[i].heureFin || seances[i].heureFin.trim() === "") { message.warning(`Séance #${i + 1}: veuillez remplir l'heure de fin.`); return false; }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (seances.length === 0) { message.warning("Ajoutez au moins une séance."); return; }
    try {
      if (!validateSeancesForSubmit()) return;
      const finalAnimIds = animSel.map(getAnimateurStableId).filter(Boolean);
      const blockingConflicts = buildConflictMessages({ localSeances: seances, participantIds: partSel.map((p) => p.id).filter(Boolean), animateurIds: finalAnimIds });
      if (titre.trim().length < 5) { message.warning("Le titre doit contenir au moins 5 caractères."); return; }
      if (blockingConflicts.length > 0) { setOverlapWarnings(blockingConflicts); message.error("Conflits détectés: corrigez les dates/salles/personnes."); return; }
      for (const anim of animSel) {
        if (anim.isAuthUser) {
          try { await EnseignantService.createEnseignant({ id: getAnimateurStableId(anim), nom: anim.nom, prenom: anim.prenom, mail: anim.mail, type: anim.type, etat: anim.etat, cup: anim.cup, chefDepartement: anim.chefDepartement }); } catch { /* may already exist */ }
        }
      }
      const payload = {
        idBesoinFormation: besoinInfo?.idBesoinFormation || null, typeBesoin: besoinInfo?.typeBesoin || null, titreFormation: titre, salle: salle || null, dateDebut: dateDebut || null, dateFin: dateFin || null, typeFormation, etatFormation, ouverte, coutFormation: cout || 0, externeFormateurNom: formNom, externeFormateurPrenom: formPrenom, externeFormateurEmail: formEmail || null, organismeRefExterne: organisme, bureauFormationNom: bureauNom || null, bureauFormationMail: bureauMail || null, bureauFormationTelephone: bureauTelephone || null, chargeHoraireGlobal: chargeH || 0, upId: selectedUp?.id, departementId: selectedDept?.id, animateursIds: finalAnimIds, participantsIds: partSel.map(p => p.id), domaine, populationCible, objectifs, objectifsPedago, evalMethods, coutTransport: coutTransport || 0, coutHebergement: coutHebergement || 0, coutRepas: coutRepas || 0, periodCode, customPeriodLabel,
        seances: seances.map(s => ({ dateSeance: s.dateSeance || null, heureDebut: s.heureDebut, heureFin: s.heureFin, salle: s.salle, onlineMeetingUrl: s.onlineMeetingUrl, typeSeance: s.typeSeance, contenus: s.contenus, methodes: s.methodes, dureeTheorique: s.dureeTheorique || 0, dureePratique: s.dureePratique || 0 })),
      };
      const newF = await createFormation(payload);
      const fId = newF.idFormation;
      setNewFormationId(fId ?? null);
      if (selectedCompLinks.length > 0 && fId) {
        const compLinks = selectedCompLinks.filter(l => l.competenceId).map(l => ({ ...l }));
        await replaceCompetences({ formationId: fId, newLinks: compLinks as unknown as Record<string, unknown>[] });
      }
      setShowUpload(true);
      message.success("Formation créée !");
      onFormationCreated?.(newF);
      setTimeout(() => navigate("/home/ListeFormation"), 2000);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string; message?: string; defaultMessage?: string }[] | { error?: string; message?: string } }; message?: string };
      const backendErrors = e.response?.data;
      let errorMsg = "Échec de la création de la formation.";
      if (Array.isArray(backendErrors)) errorMsg = backendErrors.map(r => r.defaultMessage || r.message || "Erreur de validation").join(" | ");
      else if (backendErrors && !Array.isArray(backendErrors) && backendErrors.error && backendErrors.message) errorMsg = `${backendErrors.error} : ${backendErrors.message}`;
      else if (backendErrors && !Array.isArray(backendErrors) && backendErrors.error) errorMsg = backendErrors.error;
      else if (backendErrors && !Array.isArray(backendErrors) && backendErrors.message) errorMsg = backendErrors.message;
      else if (e.message) errorMsg = e.message;
      message.error(errorMsg);
    }
  };

  return {
    activeStep, setActiveStep, isAdminUser,
    titre, setTitre, dateDebut, setDateDebut, dateFin, setDateFin,
    typeFormation, setTypeFormation, etatFormation, setEtatFormation,
    cout, setCout, organisme, setOrganisme, chargeH, setChargeH,
    ouverte, setOuverte, periodCode, setPeriodCode, customPeriodLabel, setCustomPeriodLabel,
    formNom, setFormNom, formPrenom, setFormPrenom, formEmail, setFormEmail,
    salle, setSalle, bureauNom, setBureauNom, bureauMail, setBureauMail, bureauTelephone, setBureauTelephone,
    ups, depts, selectedUp, setSelectedUp, selectedDept, setSelectedDept,
    enseignants, enseignantsList, formateursList,
    animSel, setAnimSel, animFilterUp, setAnimFilterUp, animFilterDept, setAnimFilterDept,
    partSel, setPartSel, partFilterUp, setPartFilterUp, partFilterDept, setPartFilterDept,
    optionsAnim, optionsPart, overlapWarnings,
    domaine, setDomaine, populationCible, setPopulationCible,
    objectifs, setObjectifs, objectifsPedago, setObjectifsPedago, evalMethods, setEvalMethods,
    coutTransport, setCoutTransport, coutHebergement, setCoutHebergement, coutRepas, setCoutRepas,
    compDomaines, compCompetences, selectedCompLinks, setSelectedCompLinks, rowSavoirs, compSearch, setCompSearch,
    seances, addSeance, updateSeance, removeSeance, toggleSeance,
    showUpload, setShowUpload, newFormationId,
    handleNext, handleBack, handleSubmit,
    handleCompetenceSelect, handleSavoirSelect, handleRemoveCompetenceLink, getCompetenceOptions,
    getEnseignantLabel, getAnimateurLabel, handleExcelImportFile, exportParticipantsExcel,
  };
}
