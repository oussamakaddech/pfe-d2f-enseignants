import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import useAppNotification from "@/hooks/ui/useAppNotification";
import { useAllFormations, useUpdateFormation, useUps, useDepartements, useAllAccounts } from "@/hooks/formation";
import { useEnseignants } from "@/hooks/enseignant";
import { useAuth } from "@/hooks/auth/useAuth";

export type EditSeance = {
  idSeance?: unknown; id?: unknown;
  dateSeance: string; heureDebut: string; heureFin: string; salle: string;
  animateurs: { id?: unknown }[];
  typeSeance: string; contenus: string; methodes: string;
  dureeTheorique: number; dureePratique: number; expanded: boolean;
};

export type EditLookup = { id?: unknown; libelle?: string };
export type EditPerson = { id?: unknown; type?: string; cup?: string; chefDepartement?: string; nom?: string; prenom?: string; mail?: string; upLibelle?: string; deptLibelle?: string; isAuthUser?: boolean; userName?: string; etat?: string; isManual?: boolean };
export type EditFormation = Record<string, unknown>;

type AccountItem = {
  id?: unknown;
  userName?: string;
  username?: string;
  firstName?: string;
  firsName?: string;
  lastName?: string;
  email?: string;
  emailAddress?: string;
  role?: string;
};

function mergeAuthAccountAnimateurs(accountsData: AccountItem[], enseignantsData: EditPerson[]): EditPerson[] {
  if (!Array.isArray(accountsData)) return [];
  // Rôle FORMATEUR consolidé dans ANIMATEUR (cf. migration V19).
  const formateurs = accountsData
    .filter((a) => {
      const role = (a.role || "").toUpperCase();
      return role === "ANIMATEUR";
    })
    .map((a) => ({
      id: a.id,
      isAuthUser: true,
      userName: a.userName || a.username,
      nom: a.lastName || a.userName || a.username || "Formateur",
      prenom: a.firstName || a.firsName || "",
      mail: a.emailAddress || a.email || "",
      type: "V",
      etat: "A",
      cup: "N",
      chefDepartement: "N",
      upLibelle: "",
      deptLibelle: "",
    }));
  const fUserNames = new Set(formateurs.map((f) => f.userName).filter((n): n is string => Boolean(n)));
  const enriched = formateurs.map((f) => {
    const prefix = f.mail ? f.mail.split("@")[0] : "";
    const match = enseignantsData.find((ex) =>
      (typeof ex.id === "string" && fUserNames.has(ex.id)) || ex.mail === f.mail || (ex.mail ?? "").split("@")[0] === prefix
    );
    return match ? { ...f, upLibelle: match.upLibelle || "", deptLibelle: match.deptLibelle || "", type: match.type || f.type } : f;
  });
  return enriched;
}

function toMinutes(timeValue: unknown): number | null {
  if (!timeValue) return null;
  const parts = String(timeValue).split(":");
  if (parts.length < 2) return null;
  const h = Number.parseInt(parts[0], 10);
  const m = Number.parseInt(parts[1], 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return (h * 60) + m;
}

function sameTimeWindow(a: { dateSeance?: string; heureDebut?: unknown; heureFin?: unknown }, b: { dateSeance?: string; heureDebut?: unknown; heureFin?: unknown }): boolean {
  if (!a?.dateSeance || !b?.dateSeance || a.dateSeance !== b.dateSeance) return false;
  const aStart = toMinutes(a.heureDebut); const aEnd = toMinutes(a.heureFin);
  const bStart = toMinutes(b.heureDebut); const bEnd = toMinutes(b.heureFin);
  if (aStart === null || aEnd === null || bStart === null || bEnd === null) return false;
  return aStart < bEnd && bStart < aEnd;
}

function intersects(left: unknown[], right: unknown[]): boolean {
  return left.some((id) => right.includes(id));
}

function normalizedSalle(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

export function useFormationWorkflowEdit(formation: EditFormation, onFormationUpdated: (res: unknown) => void) {
  const { message } = useAppNotification();
  const { user } = useAuth();
  const role = String(user?.role || "").toLowerCase().replaceAll(/[\s_-]+/g, "");
  const isResponsableDossier = role === "responsabledossier";

  const [titre, setTitre] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [typeFormation, setTypeFormation] = useState("INTERNE");
  const [etatFormation, setEtatFormation] = useState("ENREGISTRE");
  const [cout, setCout] = useState(0);
  const [organisme, setOrganisme] = useState("");
  const [chargeH, setChargeH] = useState(40);
  const [formNom, setFormNom] = useState("");
  const [formPrenom, setFormPrenom] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [selectedUp, setSelectedUp] = useState<EditLookup | null>(null);
  const [selectedDept, setSelectedDept] = useState<EditLookup | null>(null);
  const [domaine, setDomaine] = useState("");
  const [populationCible, setPopulationCible] = useState("");
  const [objectifs, setObjectifs] = useState("");
  const [objectifsPedago, setObjectifsPedago] = useState("");
  const [evalMethods, setEvalMethods] = useState("");
  const [prerequis, setPrerequis] = useState("");
  const [acquis, setAcquis] = useState("");
  const [indicateurs, setIndicateurs] = useState("");
  const [coutTransport, setCoutTransport] = useState(0);
  const [coutHebergement, setCoutHebergement] = useState(0);
  const [coutRepas, setCoutRepas] = useState(0);
  const [seances, setSeances] = useState<EditSeance[]>([]);
  const [ouverte, setOuverte] = useState(false);
  const [periodCode, setPeriodCode] = useState("OTHER");
  const [customPeriodLabel, setCustomPeriodLabel] = useState("");
  const [animSel, setAnimSel] = useState<EditPerson[]>([]);
  const [partSel, setPartSel] = useState<EditPerson[]>([]);
  const [overlapWarnings, setOverlapWarnings] = useState<string[]>([]);
  const [animFilterUp, setAnimFilterUp] = useState<EditLookup | null>(null);
  const [animFilterDept, setAnimFilterDept] = useState<EditLookup | null>(null);
  const [partFilterUp, setPartFilterUp] = useState<EditLookup | null>(null);
  const [partFilterDept, setPartFilterDept] = useState<EditLookup | null>(null);
  const [animSearch, setAnimSearch] = useState("");
  const [partSearch, setPartSearch] = useState("");
  const [showMore, setShowMore] = useState(false);
  const [openDocModal, setOpenDocModal] = useState(false);
  const [openUploadPanel, setOpenUploadPanel] = useState(false);
  const [lastReloadAt, setLastReloadAt] = useState<Date | null>(null);
  const [isReloading, setIsReloading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [salle, setSalle] = useState("");

  const upsQuery = useUps();
  const deptsQuery = useDepartements();
  const ensQuery = useEnseignants();
  const accountsQuery = useAllAccounts();
  const allFormationsQuery = useAllFormations();
  const updateMut = useUpdateFormation();
  const { data: ups = [], refetch: refetchUps } = upsQuery;
  const { data: depts = [], refetch: refetchDepts } = deptsQuery;
  const { data: ensData = [], refetch: refetchEnseignants, isFetching: isFetchingEnseignants } = ensQuery;
  const { data: accountsData, refetch: refetchAccounts, isFetching: isFetchingAccounts } = accountsQuery;
  const { data: allFormations = [] } = allFormationsQuery;

  const refetchAll = async () => {
    setIsReloading(true);
    try {
      await Promise.all([refetchEnseignants(), refetchAccounts(), refetchUps(), refetchDepts()]);
      setLastReloadAt(new Date());
    } finally {
      setIsReloading(false);
    }
  };

  const ens = ensData as EditPerson[];
  const existingFormations = Array.isArray(allFormations) ? allFormations : [];

  // Animateurs = formation-service enseignants + comptes auth (FORMATEUR/ANIMATEUR)
  // même source que useFormationWorkflow pour rester cohérent avec la création.
  const formateursList = useMemo(
    () => mergeAuthAccountAnimateurs((accountsData ?? []) as AccountItem[], ens),
    [accountsData, ens]
  );

  // Participants = enseignants + comptes auth ENSEIGNANT/FORMATEUR/ANIMATEUR
  // non déjà présents côté animateurs ou enseignants.
  const animateurMailSet = useMemo(
    () => new Set(formateursList.map((a) => (a.mail || "").toLowerCase()).filter(Boolean)),
    [formateursList]
  );
  const enseignantMails = useMemo(
    () => new Set(ens.map((e) => ((e as Record<string, unknown>).mail ?? e.mail ?? "").toString().toLowerCase()).filter(Boolean)),
    [ens]
  );
  const accountsFallbackForParticipants = useMemo(() => {
    if (!Array.isArray(accountsData)) return [] as EditPerson[];
    return (accountsData as AccountItem[])
      .filter((a) => {
        const role = (a.role || "").toUpperCase();
        return role === "ENSEIGNANT" || role === "ANIMATEUR";
      })
      .filter((a) => {
        const mail = (a.emailAddress || a.email || "").toLowerCase();
        return mail && !enseignantMails.has(mail) && !animateurMailSet.has(mail);
      })
      .map((a) => ({
        id: a.id,
        isAuthUser: true,
        userName: a.userName || a.username,
        nom: a.lastName || a.userName || a.username || "Compte",
        prenom: a.firstName || a.firsName || "",
        mail: a.emailAddress || a.email || "",
        type: (a.role || "").toUpperCase() === "ENSEIGNANT" ? "P" : "V",
        etat: "A",
        cup: "N",
        chefDepartement: "N",
        upLibelle: "",
        deptLibelle: "",
      } as EditPerson));
  }, [accountsData, animateurMailSet, enseignantMails]);

  // Union par id : les acteurs déjà affectés à la formation doivent toujours
  // figurer parmi les options (même s'ils sont absents de la liste enseignants,
  // ex. enseignant supprimé/soft-deleted) — sinon ils ne s'affichent pas en édition.
  const unionById = (base: EditPerson[], selected: EditPerson[]): EditPerson[] => {
    const seen = new Set(base.map((x) => String(x.id)));
    const extra = selected.filter((s) => s.id != null && !seen.has(String(s.id)));
    return extra.length > 0 ? [...base, ...extra] : base;
  };
  const matchSearch = (x: EditPerson, q: string): boolean => {
    if (!q.trim()) return true;
    const needle = q.trim().toLowerCase();
    return (
      (x.nom || "").toLowerCase().includes(needle) ||
      (x.prenom || "").toLowerCase().includes(needle) ||
      (x.mail || (x as Record<string, unknown>).email as string || "").toLowerCase().includes(needle) ||
      ((x as Record<string, unknown>).userName as string || "").toLowerCase().includes(needle)
    );
  };
  const optionsAnim = unionById(
    [
      ...formateursList,
      ...ens,
    ].filter(
      (x) => (!animFilterUp || x.upLibelle === (animFilterUp as EditLookup & { libelle?: string }).libelle) && (!animFilterDept || x.deptLibelle === (animFilterDept as EditLookup & { libelle?: string }).libelle) && matchSearch(x, animSearch)
    ),
    animSel,
  );
  const optionsPart = unionById(
    [
      ...ens,
      ...accountsFallbackForParticipants,
    ].filter(
      (x) => (!partFilterUp || x.upLibelle === (partFilterUp as EditLookup & { libelle?: string }).libelle) && (!partFilterDept || x.deptLibelle === (partFilterDept as EditLookup & { libelle?: string }).libelle) && matchSearch(x, partSearch)
    ),
    partSel,
  );

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
    setSalle(String(formation.salle || ""));
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
    // L'API renvoie `up`/`departement` (le DTO) ; `up1`/`departement1` n'existent
    // pas dans la réponse → fallback conservé par sécurité.
    setSelectedUp((formation.up ?? formation.up1) || null);
    setSelectedDept((formation.departement ?? formation.departement1) || null);
    setPeriodCode(formation.periodCode || "OTHER");
    setCustomPeriodLabel(formation.customPeriodLabel || formation.periodeFormation || "");
    setSeances((formation.seances || []).map((s: EditFormation) => ({
      idSeance: s.idSeance, dateSeance: format(new Date(s.dateSeance), "yyyy-MM-dd"),
      heureDebut: s.heureDebut, heureFin: s.heureFin, salle: s.salle || "",
      animateurs: s.animateurs || [], typeSeance: s.typeSeance || "THEORIQUE",
      contenus: s.contenus || "", methodes: s.methodes || "",
      dureeTheorique: s.dureeTheorique || 0, dureePratique: s.dureePratique || 0, expanded: false,
    })));
    const amap: Record<string, EditPerson> = {};
    const pmap: Record<string, EditPerson> = {};
    (formation.animateurs || []).forEach((a: EditPerson) => { if (a.id) amap[String(a.id)] = a; });
    (formation.seances || []).forEach((s: EditFormation) => {
      (s.animateurs || []).forEach((a: EditPerson) => { if (a.id) amap[String(a.id)] = a; });
      (s.participants || []).forEach((p: EditPerson) => { if (p.id) pmap[String(p.id)] = p; });
    });
    setAnimSel(Object.values(amap));
    setPartSel(Object.values(pmap));
  }, [formation]);

  type ConflictSeance = { dateSeance: string; heureDebut: string; heureFin: string; salle: string; animateurIds: unknown[] };

  function toConflictSeances(src: EditSeance[]): ConflictSeance[] {
    return src.map((s) => ({
      dateSeance: s.dateSeance, heureDebut: s.heureDebut, heureFin: s.heureFin, salle: s.salle,
      animateurIds: (Array.isArray(s.animateurs) ? s.animateurs : []).map((a) => a?.id).filter(Boolean),
    }));
  }

  function checkTimeOrder(msgs: string[], seances: ConflictSeance[]): void {
    seances.forEach((s, idx) => {
      const start = toMinutes(s.heureDebut); const end = toMinutes(s.heureFin);
      if (start !== null && end !== null && start >= end) msgs.push(`Séance #${idx + 1}: heure de fin doit être après l&apos;heure de début.`);
    });
  }

  function checkInternalPair(msgs: string[], left: ConflictSeance, right: ConflictSeance, i: number, j: number, participantIds: unknown[]): void {
    if (!sameTimeWindow(left, right)) return;
    const lSalle = normalizedSalle(left.salle); const rSalle = normalizedSalle(right.salle);
    if (lSalle && rSalle && lSalle === rSalle) msgs.push(`Conflit interne: les séances #${i + 1} et #${j + 1} utilisent la même salle au même horaire.`);
    if (participantIds.length > 0) msgs.push(`Conflit interne: les séances #${i + 1} et #${j + 1} se chevauchent pour les mêmes participants.`);
    if (left.animateurIds.length > 0 && right.animateurIds.length > 0 && intersects(left.animateurIds, right.animateurIds)) msgs.push(`Conflit interne: les séances #${i + 1} et #${j + 1} se chevauchent pour un ou plusieurs animateurs.`);
  }

  function checkInternalConflicts(msgs: string[], seances: ConflictSeance[], participantIds: unknown[]): void {
    for (let i = 0; i < seances.length; i += 1)
      for (let j = i + 1; j < seances.length; j += 1)
        checkInternalPair(msgs, seances[i], seances[j], i, j, participantIds);
  }

  function checkSeanceAgainstExisting(msgs: string[], localSeance: ConflictSeance, existingSeance: EditFormation, idx: number, formationName: string, participantIds: unknown[], exPartIds: unknown[]): void {
    if (!sameTimeWindow(localSeance, existingSeance)) return;
    const lSalle = normalizedSalle(localSeance.salle); const eSalle = normalizedSalle(existingSeance.salle);
    if (lSalle && eSalle && lSalle === eSalle) msgs.push(`Conflit salle: séance #${idx + 1} chevauche la formation ${formationName} dans la salle ${localSeance.salle}.`);
    const existingAnimIds = (Array.isArray(existingSeance.animateurs) ? existingSeance.animateurs : []).map((a: EditPerson) => a?.id).filter(Boolean);
    if (participantIds.length > 0 && exPartIds.length > 0 && intersects(participantIds, exPartIds)) msgs.push(`Conflit participants: séance #${idx + 1} chevauche la formation ${formationName}.`);
    if (localSeance.animateurIds.length > 0 && existingAnimIds.length > 0 && intersects(localSeance.animateurIds, existingAnimIds)) msgs.push(`Conflit animateurs: séance #${idx + 1} chevauche la formation ${formationName}.`);
  }

  function getExistingPartIds(f: EditFormation): unknown[] {
    const fSeances = Array.isArray(f.seances) ? f.seances : [];
    return [...(Array.isArray(f.participants) ? f.participants : []), ...fSeances.flatMap((s: EditFormation) => Array.isArray(s.participants) ? s.participants : [])].map((p: EditPerson) => p?.id).filter(Boolean);
  }

  function checkExternalConflicts(msgs: string[], seances: ConflictSeance[], participantIds: unknown[], existingFormations: EditFormation[], currentId: unknown): void {
    for (const f of existingFormations) {
      if ((f.idFormation || f.id) === currentId) continue;
      const exSeances = Array.isArray(f.seances) ? f.seances : [];
      const exPartIds = getExistingPartIds(f);
      const formationName = f.titreFormation || `#${f.idFormation || f.id || "?"}`;
      for (const [idx, localSeance] of seances.entries())
        for (const existingSeance of exSeances)
          checkSeanceAgainstExisting(msgs, localSeance, existingSeance, idx, formationName, participantIds, exPartIds);
    }
  }

  const buildConflictMessages = (): string[] => {
    const msgs: string[] = [];
    const participantIds = partSel.map((p) => p.id).filter(Boolean);
    const localSeances = toConflictSeances(seances);
    checkTimeOrder(msgs, localSeances);
    checkInternalConflicts(msgs, localSeances, participantIds);
    checkExternalConflicts(msgs, localSeances, participantIds, existingFormations, formation.idFormation);
    return [...new Set(msgs)];
  };

  useEffect(() => { setOverlapWarnings(buildConflictMessages()); }, [seances, partSel, existingFormations]);

  const addSeance = () => setSeances((s) => [...s, { id: Date.now(), dateSeance: dateDebut || format(new Date(), "yyyy-MM-dd"), heureDebut: "08:00:00", heureFin: "10:00:00", salle: "", animateurs: [], typeSeance: "THEORIQUE", contenus: "", methodes: "", dureeTheorique: 0, dureePratique: 0, expanded: false }]);
  const updateSeance = (i: number, f: string, v: unknown) => setSeances((s) => { const a = [...s]; a[i] = { ...a[i], [f]: v }; return a; });
  const removeSeance = (i: number) => setSeances((s) => s.filter((_, idx) => idx !== i));
  const toggleSeance = (i: number) => setSeances((s) => s.map((se, idx) => (idx === i ? { ...se, expanded: !se.expanded } : se)));

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const buffer = await f.arrayBuffer();
    const data = new Uint8Array(buffer);
    const wb = XLSX.read(data, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 });
    if (rows.length < 2) { message.warning("Excel vide ou mal formaté"); return; }
    const hdr = (rows[0] as string[]).map((h) => String(h).toLowerCase().trim());
    const idx = hdr.findIndex((h) => h === "email" || h === "mail");
    if (idx < 0) { message.warning(`Colonne Email introuvable. Colonnes attendues : Email, Nom, Prénom. Colonnes trouvées : ${(rows[0] as string[]).join(", ")}`); e.target.value = ""; return; }
    const mailsSet = new Set(rows.slice(1).map((r) => r[idx]).filter(Boolean));
    const matched = ens.filter((x) => mailsSet.has(x.mail));
    setPartSel(matched);
    message.success(`${matched.length} participant${matched.length > 1 ? "s" : ""} importé${matched.length > 1 ? "s" : ""}`);
    e.target.value = "";
  };

  const getEnseignantLabel = (opt: EditPerson | null): string => {
    if (!opt) return "";
    const roles: string[] = [];
    if (opt.type === "P") roles.push("Perm.");
    if (opt.type === "V") roles.push("Vac.");
    if (opt.cup === "O" || opt.cup === "Y" || opt.cup === "1") roles.push("CUP");
    if (opt.chefDepartement === "O" || opt.chefDepartement === "Y" || opt.chefDepartement === "1") roles.push("ChefDep");
    const roleStr = roles.length > 0 ? ` [${roles.join(", ")}]` : "";
    return `${opt.nom} ${opt.prenom} (${opt.mail})${roleStr}`;
  };

  function buildEditPayload() {
    return {
      titreFormation: titre, dateDebut, dateFin, typeFormation, etatFormation, ouverte, salle: salle || null,
      coutFormation: Number.parseFloat(String(cout)),
      externeFormateurNom: formNom, externeFormateurPrenom: formPrenom, externeFormateurEmail: formEmail, organismeRefExterne: organisme,
      chargeHoraireGlobal: Number.parseInt(String(chargeH), 10),
      upId: selectedUp?.id, departementId: selectedDept?.id,
      participantsIds: partSel.map((p) => p.id), animateursIds: animSel.map((a) => a.id),
      domaine, populationCible, objectifs, objectifsPedago, evalMethods, prerequis, acquis, indicateurs,
      coutTransport, coutHebergement, coutRepas, periodCode, customPeriodLabel,
      seances: seances.map((s) => ({
        idSeance: s.idSeance, dateSeance: s.dateSeance, heureDebut: s.heureDebut, heureFin: s.heureFin,
        salle: s.salle, animateursIds: s.animateurs.map((a) => a.id), typeSeance: s.typeSeance,
        contenus: s.contenus, methodes: s.methodes, dureeTheorique: s.dureeTheorique, dureePratique: s.dureePratique,
      })),
    };
  }

  function handleUpdateError(err: unknown): void {
    const e = err as { response?: { data?: { message?: string; error?: string } }; message?: string };
    message.error(e.response?.data?.message || e.response?.data?.error || e.message);
  }

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setSaving(true);
    if (seances.length === 0) { message.warning("Veuillez ajouter au moins une séance."); setSaving(false); return; }
    const blockingConflicts = buildConflictMessages();
    if (blockingConflicts.length > 0) { setOverlapWarnings(blockingConflicts); message.error("Conflits détectés: corrigez les dates/salles/personnes avant mise à jour."); setSaving(false); return; }
    try {
      const res = await updateMut.mutateAsync({ id: formation.idFormation, data: buildEditPayload() });
      message.success("Formation mise à jour !");
      onFormationUpdated(res);
    } catch (err: unknown) {
      handleUpdateError(err);
    } finally {
      setSaving(false);
    }
  };

  const selectAllVisibleAnim = () => {
    setAnimSel((prev) => {
      const seen = new Set(prev.map((p) => String(p.id)));
      const extras = optionsAnim.filter((o) => o.id != null && !seen.has(String(o.id)));
      return [...prev, ...extras];
    });
  };
  const clearAnimSel = () => setAnimSel([]);
  const selectAllVisiblePart = () => {
    setPartSel((prev) => {
      const seen = new Set(prev.map((p) => String(p.id)));
      const extras = optionsPart.filter((o) => o.id != null && !seen.has(String(o.id)));
      return [...prev, ...extras];
    });
  };
  const clearPartSel = () => setPartSel([]);

  return {
    isResponsableDossier,
    titre, setTitre, dateDebut, setDateDebut, dateFin, setDateFin,
    typeFormation, setTypeFormation, etatFormation, setEtatFormation,
    cout, setCout, organisme, setOrganisme, chargeH, setChargeH,
    formNom, setFormNom, formPrenom, setFormPrenom, formEmail, setFormEmail,
    selectedUp, setSelectedUp, selectedDept, setSelectedDept,
    domaine, setDomaine, populationCible, setPopulationCible,
    objectifs, setObjectifs, objectifsPedago, setObjectifsPedago,
    evalMethods, setEvalMethods, prerequis, setPrerequis, acquis, setAcquis, indicateurs, setIndicateurs,
    coutTransport, setCoutTransport, coutHebergement, setCoutHebergement, coutRepas, setCoutRepas,
    seances, addSeance, updateSeance, removeSeance, toggleSeance,
    ouverte, setOuverte, periodCode, setPeriodCode, customPeriodLabel, setCustomPeriodLabel,
    animSel, setAnimSel, partSel, setPartSel,
    overlapWarnings,
    animFilterUp, setAnimFilterUp, animFilterDept, setAnimFilterDept,
    partFilterUp, setPartFilterUp, partFilterDept, setPartFilterDept,
    animSearch, setAnimSearch, partSearch, setPartSearch,
    selectAllVisibleAnim, clearAnimSel, selectAllVisiblePart, clearPartSel,
    salle, setSalle,
    refetchAll, lastReloadAt, isReloading, saving,
    isFetchingEnseignants, isFetchingAccounts,
    showMore, setShowMore, openDocModal, setOpenDocModal, openUploadPanel, setOpenUploadPanel,
    ups: ups as EditLookup[], depts: depts as EditLookup[], optionsAnim, optionsPart,
    handleFile, handleSubmit, getEnseignantLabel, message,
  };
}
