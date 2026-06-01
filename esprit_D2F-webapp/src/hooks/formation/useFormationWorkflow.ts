import { useState, useEffect } from "react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { useAllFormations, useUpdateFormation, useUps, useDepartements } from "@/hooks/formation";
import { useEnseignants } from "@/hooks/enseignant";
import { useAuth } from "@/hooks/auth/useAuth";
import useAppNotification from "@/hooks/ui/useAppNotification";
import type {
  EnseignantItem, SeanceData, SeanceState, UPItem, DeptItem,
  FormationEdit, SeanceConflictItem,
} from "@/pages/formation/formationWorkflowTypes";

// ── Conflict detection utilities ──────────────────────────────────────────────

function toMinutes(t: string | null | undefined): number | null {
  if (!t) return null;
  const [h, m] = String(t).split(":").map(Number);
  return Number.isNaN(h) || Number.isNaN(m) ? null : h * 60 + m;
}

function sameTimeWindow(
  a: { dateSeance: string; heureDebut: string; heureFin: string },
  b: { dateSeance: string; heureDebut: string; heureFin: string },
): boolean {
  if (!a?.dateSeance || a.dateSeance !== b?.dateSeance) return false;
  const [aS, aE, bS, bE] = [toMinutes(a.heureDebut), toMinutes(a.heureFin), toMinutes(b.heureDebut), toMinutes(b.heureFin)];
  return aS !== null && aE !== null && bS !== null && bE !== null && aS < bE && bS < aE;
}

const intersects = (l: string[], r: string[]) => l.some((id) => r.includes(id));
const normSalle   = (v: unknown)              => String(v || "").trim().toLowerCase();

function checkTimeValidity(s: SeanceConflictItem, i: number, msgs: string[]): void {
  const start = toMinutes(s.heureDebut), end = toMinutes(s.heureFin);
  if (start !== null && end !== null && start >= end)
    msgs.push(`Séance #${i + 1}: heure de fin doit être après l'heure de début.`);
}

function checkInternalConflict(
  left: SeanceConflictItem, right: SeanceConflictItem, i: number, j: number,
  participantIds: unknown[], msgs: string[],
): void {
  if (!sameTimeWindow(left, right)) return;
  const ls = normSalle(left.salle), rs = normSalle(right.salle);
  if (ls && rs && ls === rs)
    msgs.push(`Conflit interne: les séances #${i + 1} et #${j + 1} utilisent la même salle au même horaire.`);
  if (participantIds.length > 0)
    msgs.push(`Conflit interne: les séances #${i + 1} et #${j + 1} se chevauchent pour les mêmes participants.`);
  if (intersects(left.animateurIds, right.animateurIds))
    msgs.push(`Conflit interne: les séances #${i + 1} et #${j + 1} se chevauchent pour un ou plusieurs animateurs.`);
}

function checkExternalConflict(
  ls: SeanceConflictItem, idx: number, es: { dateSeance: string; heureDebut?: string; heureFin?: string; animateurs?: { id?: unknown }[] },
  name: string, participantIds: unknown[], existParts: unknown[], msgs: string[],
): void {
  if (!sameTimeWindow(ls, es)) return;
  const lSalle = normSalle(ls.salle), eSalle = normSalle(es.salle);
  if (lSalle && eSalle && lSalle === eSalle)
    msgs.push(`Conflit salle: séance #${idx + 1} chevauche la formation ${name} dans la salle ${ls.salle}.`);
  if (participantIds.length > 0 && existParts.length > 0 && intersects(participantIds, existParts))
    msgs.push(`Conflit participants: séance #${idx + 1} chevauche la formation ${name}.`);
  const existAnimIds = (Array.isArray(es.animateurs) ? es.animateurs : []).map((a) => a?.id).filter(Boolean);
  if (intersects(ls.animateurIds, existAnimIds))
    msgs.push(`Conflit animateurs: séance #${idx + 1} chevauche la formation ${name}.`);
}

function buildConflictMessages(
  seances: SeanceState[],
  partSel: EnseignantItem[],
  existingFormations: FormationEdit[],
  formation: FormationEdit,
): string[] {
  const participantIds = partSel.map((p) => p.id).filter(Boolean);
  const local: SeanceConflictItem[] = seances.map((s) => ({
    dateSeance: s.dateSeance, heureDebut: s.heureDebut, heureFin: s.heureFin,
    salle: s.salle, animateurIds: (s.animateurs ?? []).map((a) => a?.id).filter(Boolean),
  }));

  const msgs: string[] = [];
  local.forEach((s, i) => checkTimeValidity(s, i, msgs));
  for (let i = 0; i < local.length; i += 1)
    for (let j = i + 1; j < local.length; j += 1)
      checkInternalConflict(local[i], local[j], i, j, participantIds, msgs);
  existingFormations
    .filter((f) => (f.idFormation || f.id) !== formation.idFormation)
    .forEach((f) => {
      const existingSeances = Array.isArray(f.seances) ? f.seances : [];
      const existParts = [
        ...(Array.isArray(f.participants) ? f.participants : []),
        ...existingSeances.flatMap((s) => Array.isArray(s.participants) ? s.participants : []),
      ].map((p) => p?.id).filter(Boolean);
      const name = f.titreFormation || `#${f.idFormation || f.id || "?"}`;
      local.forEach((ls, idx) => {
        existingSeances.forEach((es) => checkExternalConflict(ls, idx, es, name, participantIds, existParts, msgs));
      });
    });
  return [...new Set(msgs)];
}

const TRUTHY_FLAGS = new Set(["O", "Y", "1"]);

function getEnseignantLabel(opt: EnseignantItem | null) {
  if (!opt) return "";
  const roles: string[] = [];
  if (opt.type === "P") roles.push("Perm.");
  if (opt.type === "V") roles.push("Vac.");
  if (TRUTHY_FLAGS.has(opt.cup)) roles.push("CUP");
  if (TRUTHY_FLAGS.has(opt.chefDepartement)) roles.push("ChefDep");
  return `${opt.nom} ${opt.prenom} (${opt.mail})${roles.length ? ` [${roles.join(", ")}]` : ""}`;
}

function extractUpdateError(err: unknown): string {
  const error = err as { response?: { data?: { message?: string; error?: string } }; message?: string };
  return error.response?.data?.message || error.response?.data?.error || error.message || "Erreur inconnue";
}

// ── Main hook ─────────────────────────────────────────────────────────────────

export function useFormationWorkflow(
  formation: FormationEdit,
  onFormationUpdated: (res: Record<string, unknown>) => void,
) {
  const { message } = useAppNotification();
  const { user } = useAuth();
  const role = String(user?.role || "").toLowerCase().replaceAll(/[\s_-]+/g, "");
  const isResponsableDossier = role === "responsabledossier";

  const { data: upsRaw = [] }        = useUps();
  const { data: deptsRaw = [] }      = useDepartements();
  const { data: ensData = [] }       = useEnseignants();
  const { data: allFormations = [] } = useAllFormations();
  const updateMut                    = useUpdateFormation();

  const ups   = upsRaw   as UPItem[];
  const depts = deptsRaw as DeptItem[];
  const ens   = ensData  as unknown as EnseignantItem[];
  const existingFormations = (Array.isArray(allFormations) ? allFormations : []) as unknown as FormationEdit[];

  // General fields
  const [titre, setTitre]                       = useState("");
  const [dateDebut, setDateDebut]               = useState("");
  const [dateFin, setDateFin]                   = useState("");
  const [typeFormation, setTypeFormation]       = useState("INTERNE");
  const [etatFormation, setEtatFormation]       = useState("ENREGISTRE");
  const [cout, setCout]                         = useState(0);
  const [organisme, setOrganisme]               = useState("");
  const [chargeH, setChargeH]                   = useState(40);
  const [formNom, setFormNom]                   = useState("");
  const [formPrenom, setFormPrenom]             = useState("");
  const [formEmail, setFormEmail]               = useState("");
  const [selectedUp, setSelectedUp]             = useState<UPItem | null>(null);
  const [selectedDept, setSelectedDept]         = useState<DeptItem | null>(null);
  const [ouverte, setOuverte]                   = useState(false);
  const [periodCode, setPeriodCode]             = useState("OTHER");
  const [customPeriodLabel, setCustomPeriodLabel] = useState("");

  // More info
  const [domaine, setDomaine]                   = useState("");
  const [populationCible, setPopulationCible]   = useState("");
  const [objectifs, setObjectifs]               = useState("");
  const [objectifsPedago, setObjectifsPedago]   = useState("");
  const [evalMethods, setEvalMethods]           = useState("");
  const [prerequis, setPrerequis]               = useState("");
  const [acquis, setAcquis]                     = useState("");
  const [indicateurs, setIndicateurs]           = useState("");

  // Costs
  const [coutTransport, setCoutTransport]       = useState(0);
  const [coutHebergement, setCoutHebergement]   = useState(0);
  const [coutRepas, setCoutRepas]               = useState(0);

  // People + seances
  const [animSel, setAnimSel]   = useState<EnseignantItem[]>([]);
  const [partSel, setPartSel]   = useState<EnseignantItem[]>([]);
  const [seances, setSeances]   = useState<SeanceState[]>([]);
  const [overlapWarnings, setOverlapWarnings] = useState<string[]>([]);

  // Filter state
  const [partFilterUp, setPartFilterUp]     = useState<UPItem | null>(null);
  const [partFilterDept, setPartFilterDept] = useState<DeptItem | null>(null);

  // UI toggles
  const [showMore, setShowMore]               = useState(false);
  const [openDocModal, setOpenDocModal]       = useState(false);
  const [openUploadPanel, setOpenUploadPanel] = useState(false);

  // ── Init from formation prop ──────────────────────────────────────────────
  useEffect(() => {
    if (!formation) return;
    setTitre(formation.titreFormation);
    setDateDebut(format(new Date(formation.dateDebut), "yyyy-MM-dd"));
    setDateFin(format(new Date(formation.dateFin), "yyyy-MM-dd"));
    setTypeFormation(formation.typeFormation);
    setEtatFormation(formation.etatFormation);
    setCout(formation.coutFormation || 0);
    setOrganisme(formation.organismeRefExterne || "");
    setChargeH(formation.chargeHoraireGlobal || 40);
    setFormNom(formation.externeFormateurNom || "");
    setFormPrenom(formation.externeFormateurPrenom || "");
    setFormEmail(formation.externeFormateurEmail || "");
    setOuverte(!!formation.ouverte);
    setDomaine(formation.domaine || "");
    setPopulationCible(formation.populationCible || "");
    setObjectifs(formation.objectifs || "");
    setObjectifsPedago(formation.objectifsPedago || "");
    setEvalMethods(formation.evalMethods || "");
    setPrerequis(formation.prerequis || "");
    setAcquis(formation.acquis || "");
    setIndicateurs(formation.indicateurs || "");
    setCoutTransport(formation.coutTransport || 0);
    setCoutHebergement(formation.coutHebergement || 0);
    setCoutRepas(formation.coutRepas || 0);
    setSelectedUp(formation.up1 || null);
    setSelectedDept(formation.departement1 || null);
    setPeriodCode(formation.periodCode || "OTHER");
    setCustomPeriodLabel(formation.customPeriodLabel || formation.periodeFormation || "");
    setSeances(
      (formation.seances || []).map((s: SeanceData) => ({
        idSeance: s.idSeance,
        dateSeance: format(new Date(s.dateSeance), "yyyy-MM-dd"),
        heureDebut: s.heureDebut,
        heureFin: s.heureFin,
        salle: s.salle || "",
        animateurs: s.animateurs || [],
        typeSeance: s.typeSeance || "THEORIQUE",
        contenus: s.contenus || "",
        methodes: s.methodes || "",
        dureeTheorique: s.dureeTheorique || 0,
        dureePratique: s.dureePratique || 0,
        expanded: false,
      })),
    );
    const amap: Record<string, EnseignantItem> = {};
    const pmap: Record<string, EnseignantItem> = {};
    (formation.animateurs || []).forEach((a) => { amap[a.id] = a; });
    (formation.seances || []).forEach((s: SeanceData) => {
      (s.animateurs || []).forEach((a) => { amap[a.id] = a; });
      (s.participants || []).forEach((p) => { pmap[p.id] = p; });
    });
    setAnimSel(Object.values(amap));
    setPartSel(Object.values(pmap));
  }, [formation]);

  // Conflict warnings auto-update.
  // Les animateurs sont gérés au niveau formation (animSel) : on les injecte
  // dans chaque séance pour la détection de chevauchements.
  useEffect(() => {
    const seancesWithAnim = seances.map((s) => ({ ...s, animateurs: animSel }));
    setOverlapWarnings(buildConflictMessages(seancesWithAnim, partSel, existingFormations, formation));
  }, [seances, partSel, animSel, existingFormations]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Filtered options ──────────────────────────────────────────────────────
  const optionsAnim = ens.filter((x) => !x.upLibelle || true); // no filter on anim UP/dept
  const optionsPart = ens.filter(
    (x) =>
      (!partFilterUp   || x.upLibelle   === partFilterUp.libelle) &&
      (!partFilterDept || x.deptLibelle === partFilterDept.libelle),
  );

  // ── Helpers ───────────────────────────────────────────────────────────────
  const addSeance = () =>
    setSeances((s) => [
      ...s,
      { id: Date.now(), dateSeance: dateDebut || format(new Date(), "yyyy-MM-dd"), heureDebut: "08:00:00", heureFin: "10:00:00", salle: "", animateurs: [], typeSeance: "THEORIQUE", contenus: "", methodes: "", dureeTheorique: 0, dureePratique: 0, expanded: false },
    ]);

  const updateSeance = (i: number, field: string, value: unknown) =>
    setSeances((s) => { const a = [...s]; a[i] = { ...a[i], [field]: value }; return a; });

  const removeSeance = (i: number) => setSeances((s) => s.filter((_, idx) => idx !== i));
  const toggleSeance = (i: number) => setSeances((s) => s.map((se, idx) => idx === i ? { ...se, expanded: !se.expanded } : se));

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const buffer = await f.arrayBuffer();
    const data = new Uint8Array(buffer);
    const wb = XLSX.read(data, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
    if (rows.length < 2) { message.warning("Excel vide ou mal formaté"); return; }
    const hdr = rows[0].map((h) => String(h).toLowerCase().trim());
    const idx = hdr.findIndex((h) => h === "email" || h === "mail");
    if (idx < 0) { message.warning(`Colonne Email introuvable. Colonnes trouvées : ${rows[0].join(", ")}`); e.target.value = ""; return; }
    const mailsSet = new Set(rows.slice(1).map((r) => r[idx]).filter(Boolean));
    const matched = ens.filter((x) => mailsSet.has(x.mail));
    setPartSel(matched);
    message.success(`${matched.length} participant${matched.length > 1 ? "s" : ""} importé${matched.length > 1 ? "s" : ""}`);
    e.target.value = "";
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (seances.length === 0) { message.warning("Veuillez ajouter au moins une séance."); return; }
    // Animateurs au niveau formation : appliqués à toutes les séances.
    const seancesWithAnim = seances.map((s) => ({ ...s, animateurs: animSel }));
    const conflicts = buildConflictMessages(seancesWithAnim, partSel, existingFormations, formation);
    if (conflicts.length > 0) {
      setOverlapWarnings(conflicts);
      message.error("Conflits détectés: corrigez les dates/salles/personnes avant mise à jour.");
      return;
    }
    const payload = {
      titreFormation: titre, dateDebut, dateFin, typeFormation, etatFormation, ouverte,
      coutFormation: Number.parseFloat(cout as unknown as string),
      externeFormateurNom: formNom, externeFormateurPrenom: formPrenom, externeFormateurEmail: formEmail,
      organismeRefExterne: organisme, chargeHoraireGlobal: Number.parseInt(chargeH as unknown as string, 10),
      upId: selectedUp?.id, departementId: selectedDept?.id,
      participantsIds: partSel.map((p) => p.id), animateursIds: animSel.map((a) => a.id),
      domaine, populationCible, objectifs, objectifsPedago, evalMethods, prerequis, acquis, indicateurs,
      coutTransport, coutHebergement, coutRepas, periodCode, customPeriodLabel,
      seances: seances.map((s) => ({
        idSeance: s.idSeance, dateSeance: s.dateSeance, heureDebut: s.heureDebut, heureFin: s.heureFin,
        // Animateurs gérés au niveau formation → appliqués à chaque séance
        salle: s.salle, animateursIds: animSel.map((a) => a.id),
        typeSeance: s.typeSeance, contenus: s.contenus, methodes: s.methodes,
        dureeTheorique: s.dureeTheorique, dureePratique: s.dureePratique,
      })),
    };
    try {
      const res = await updateMut.mutateAsync({ id: formation.idFormation, data: payload });
      message.success("Formation mise à jour !");
      onFormationUpdated(res as unknown as Record<string, unknown>); // S4325: cast needed for compatibility
    } catch (err: unknown) {
      message.error(extractUpdateError(err));
    }
  };

  return {
    isResponsableDossier,
    ups, depts, optionsAnim, optionsPart, getEnseignantLabel,
    // general
    titre, setTitre, dateDebut, setDateDebut, dateFin, setDateFin,
    typeFormation, setTypeFormation, etatFormation, setEtatFormation,
    cout, setCout, organisme, setOrganisme, chargeH, setChargeH,
    formNom, setFormNom, formPrenom, setFormPrenom, formEmail, setFormEmail,
    selectedUp, setSelectedUp, selectedDept, setSelectedDept,
    ouverte, setOuverte, periodCode, setPeriodCode, customPeriodLabel, setCustomPeriodLabel,
    // more info
    showMore, setShowMore,
    domaine, setDomaine, populationCible, setPopulationCible,
    objectifs, setObjectifs, objectifsPedago, setObjectifsPedago,
    evalMethods, setEvalMethods, prerequis, setPrerequis, acquis, setAcquis, indicateurs, setIndicateurs,
    // people + seances
    seances, addSeance, updateSeance, removeSeance, toggleSeance,
    animSel, setAnimSel, partSel, setPartSel,
    partFilterUp, setPartFilterUp, partFilterDept, setPartFilterDept,
    overlapWarnings, handleFile, handleSubmit,
    // docs
    openDocModal, setOpenDocModal, openUploadPanel, setOpenUploadPanel,
  };
}
