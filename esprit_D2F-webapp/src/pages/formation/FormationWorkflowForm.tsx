import { useState, useEffect, useContext } from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import {
  Row,
  Col,
  Input,
  InputNumber,
  Select,
  Button,
  Typography,
  Card,
  Switch,
  Space,
  Alert as AntAlert,
} from "antd";
import {
  UploadOutlined,
  DeleteOutlined,
  UpOutlined,
  DownOutlined,
  TeamOutlined,
  CalendarOutlined,
  ReadOutlined,
  DollarOutlined,
  LinkOutlined,
  InfoCircleOutlined,
  NodeIndexOutlined,
  PlusOutlined,
  UserAddOutlined,
  BookOutlined,
  ApartmentOutlined,
  ClockCircleOutlined,
  TagOutlined,
  CheckSquareOutlined,
  EnvironmentOutlined,
  CheckOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  SaveOutlined,
  GlobalOutlined,
  LaptopOutlined,
  BankOutlined,
  DownloadOutlined,
  FilterOutlined,
} from "@ant-design/icons";
import * as XLSX from "xlsx";
import { writeExcel, exportDateLabel, isoDate } from "utils/helpers/excelExport";
import useAppNotification from "@/hooks/ui/useAppNotification";

const { Text, Title } = Typography;
const { TextArea } = Input;

import FormationWorkflowService from "@/services/formation/FormationWorkflowService";
import UpService from "@/services/api/UploadService";
import DeptService from "@/services/formation/DeptService";
import EnseignantService from "@/services/formation/EnseignantService";
import FormationCompetenceService from "@/services/competence/FormationCompetenceService";
import CompetenceService from "@/services/competence/CompetenceService";
import BesoinCompetenceService from "@/services/besoin/BesoinCompetenceService";
import { AuthContext } from "@/components/common/AuthProvider";

import DocumentUploadForm from "../documentFormation/DocumentUploadForm";
import "@/styles/pages/formation-workflow-form.css";

const STEPS = [
  { title: "Général", icon: <InfoCircleOutlined /> },
  { title: "Pédagogie", icon: <ReadOutlined /> },
  { title: "Planning & Acteurs", icon: <CalendarOutlined /> },
  { title: "Compétences RICE", icon: <NodeIndexOutlined /> },
  { title: "Coûts", icon: <DollarOutlined /> },
];

const PERIOD_OPTIONS = [
  { value: "WINTER",   label: "Winter" },
  { value: "SUMMER",   label: "Summer" },
  { value: "SPRINT",   label: "Sprint" },
  { value: "WORKSHOP", label: "Workshop" },
  { value: "OTHER",    label: "Autre" },
];

export default function FormationWorkflowForm({ initialDate, onFormationCreated, besoinInfo }) {
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const { message } = useAppNotification();
  const isAdmin = auth?.user?.role === "admin" || auth?.user?.role === "ADMIN";
  const [activeStep, setActiveStep] = useState(0);

  // States
  const [titre, setTitre] = useState(besoinInfo?.titre || besoinInfo?.objectifFormation || "");
  const [dateDebut, setDateDebut] = useState(besoinInfo?.dateDebut || (initialDate ? format(new Date(initialDate), "yyyy-MM-dd") : ""));
  const [dateFin, setDateFin] = useState(besoinInfo?.dateFin || (initialDate ? format(new Date(initialDate), "yyyy-MM-dd") : ""));
  const [typeFormation, setTypeFormation] = useState("INTERNE");
  const [etatFormation, setEtatFormation] = useState("ENREGISTRE");
  const [cout, setCout] = useState(0);
  const [organisme, setOrganisme] = useState("");
  const [chargeH, setChargeH] = useState(besoinInfo?.dureeFormation || 40);
  const [ouverte, setOuverte] = useState(besoinInfo?.estOuverte || false);
  
  // Structured Period State
  const [periodCode, setPeriodCode] = useState(besoinInfo?.periodCode || "OTHER");
  const [customPeriodLabel, setCustomPeriodLabel] = useState(besoinInfo?.customPeriodLabel || besoinInfo?.periodeFormation || "");

  const [formNom, setFormNom] = useState("");
  const [formPrenom, setFormPrenom] = useState("");
  const [formEmail, setFormEmail] = useState("");

  const [bureauNom, setBureauNom] = useState("");
  const [bureauMail, setBureauMail] = useState("");
  const [bureauTelephone, setBureauTelephone] = useState("");

  const [ups, setUps] = useState([]);
  const [depts, setDepts] = useState([]);
  const [selectedUp, setSelectedUp] = useState(null);
  const [selectedDept, setSelectedDept] = useState(null);

  const [enseignants, setEnseignants] = useState([]);
  const [existingFormations, setExistingFormations] = useState([]);

  const [animSel, setAnimSel] = useState([]);
  const [animFilterUp, setAnimFilterUp] = useState(null);
  const [animFilterDept, setAnimFilterDept] = useState(null);

  const [partSel, setPartSel] = useState([]);
  const [partFilterUp, setPartFilterUp] = useState(null);
  const [partFilterDept, setPartFilterDept] = useState(null);

  const [overlapWarnings, setOverlapWarnings] = useState([]);
  const [domaine, setDomaine] = useState(besoinInfo?.theme || "");
  const [populationCible, setPopulationCible] = useState(besoinInfo?.publicCible || "");
  const [objectifs, setObjectifs] = useState(besoinInfo?.objectifFormation || "");
  const [objectifsPedago, setObjectifsPedago] = useState(besoinInfo?.objectifsPedagogiques || "");
  const [evalMethods, setEvalMethods] = useState(besoinInfo?.methodesEvaluationAcquis || "");

  const [coutTransport, setCoutTransport] = useState(0);
  const [coutHebergement, setCoutHebergement] = useState(0);
  const [coutRepas, setCoutRepas] = useState(0);

  // Competence states
  const [compDomaines, setCompDomaines] = useState([]);
  const [compCompetences, setCompCompetences] = useState([]);
  const [selectedCompLinks, setSelectedCompLinks] = useState([]);
  const [rowSousComps, setRowSousComps] = useState({});
  const [rowSavoirs, setRowSavoirs] = useState({});
  const [compSearch, setCompSearch] = useState("");

  const [seances, setSeances] = useState([
    {
      id: Date.now(),
      dateSeance: dateDebut || format(new Date(), "yyyy-MM-dd"),
      heureDebut: "08:00:00",
      heureFin: "10:00:00",
      salle: "",
      onlineMeetingUrl: "",
      typeSeance: "THEORIQUE",
      contenus: "",
      methodes: "",
      dureeTheorique: 0,
      dureePratique: 0,
      expanded: true,
    },
  ]);

  // snack state replaced by message.xxx from antd
  const [showUpload, setShowUpload] = useState(false);
  const [newFormationId, setNewFormationId] = useState(null);

  const getEnseignantLabel = (opt) => {
    if (!opt) return "";
    let roles = [];
    if (opt.type === "P") roles.push("Perm.");
    if (opt.type === "V") roles.push("Vac.");
    if (opt.cup === "O" || opt.cup === "Y" || opt.cup === "1") roles.push("CUP");
    if (opt.chefDepartement === "O" || opt.chefDepartement === "Y" || opt.chefDepartement === "1") roles.push("ChefDep");

    const roleStr = roles.length > 0 ? ` [${roles.join(", ")}]` : "";
    return `${opt.nom} ${opt.prenom} (${opt.mail})${roleStr}`;
  };

  const getAnimateurLabel = (opt) => {
    if (!opt) return "";
    const type = opt.type === "P" ? " · Perm." : opt.type === "V" ? " · Vac." : "";
    const cup = opt.cup === "O" || opt.cup === "Y" || opt.cup === "1" ? " · CUP" : "";
    return `${opt.nom} ${opt.prenom} (${opt.mail})${type}${cup}`;
  };

  const [formateursList, setFormateursList] = useState([]);

  // Filters
  const optionsAnim = formateursList.filter(x =>
    (!animFilterUp || x.upLibelle === animFilterUp.libelle) &&
    (!animFilterDept || x.deptLibelle === animFilterDept.libelle)
  );

  const optionsPart = enseignants.filter(x =>
    (!partFilterUp || x.upLibelle === partFilterUp.libelle) &&
    (!partFilterDept || x.deptLibelle === partFilterDept.libelle)
  );

  // Pre-fill participants from publicCible if possible
  useEffect(() => {
    if (besoinInfo?.publicCible && enseignants.length > 0 && partSel.length === 0) {
      const emails = (besoinInfo.publicCible.match(/<([^>]+)>/g) || [])
        .map(m => m.slice(1, -1).trim().toLowerCase());

      if (emails.length > 0) {
        const matched = enseignants.filter(e => e.mail && emails.includes(e.mail.toLowerCase()));
        if (matched.length > 0) {
          setPartSel(matched);
        }
      }
    }
  }, [besoinInfo, enseignants, partSel.length]);

  // Pre-fill animateur from propositionAnimateur if possible
  useEffect(() => {
    if (!besoinInfo?.propositionAnimateur || formateursList.length === 0 || animSel.length > 0) return;
    const text = besoinInfo.propositionAnimateur.trim();
    const emailMatch = text.match(/<([^>]+)>/);
    let matched = null;
    if (emailMatch) {
      const email = emailMatch[1].trim().toLowerCase();
      matched = formateursList.find(f => f.mail && f.mail.toLowerCase() === email);
    }
    if (!matched) {
      const norm = text.toLowerCase().replace(/<[^>]*>/g, "").trim();
      matched = formateursList.find(f => {
        const full  = `${f.nom} ${f.prenom}`.toLowerCase();
        const fullR = `${f.prenom} ${f.nom}`.toLowerCase();
        return full === norm || fullR === norm || norm.includes(full) || norm.includes(fullR);
      });
    }
    if (matched) setAnimSel([matched]);
  }, [formateursList, besoinInfo, animSel.length]);

  // Chargement initial — données nécessaires dès les étapes 0-2
  useEffect(() => {
    (async () => {
      try {
        const [u, d, e, formations, accountsData] = await Promise.all([
          UpService.getAllUps(),
          DeptService.getAllDepts(),
          EnseignantService.getAllEnseignants(),
          FormationWorkflowService.getAllFormationWorkflows(),
          import("@/services/auth/AccountService").then(m => m.default.getAllAccounts()).catch(() => []),
        ]);
        setUps(u);
        setDepts(d);
        setEnseignants(e);

        if (besoinInfo) {
          if (besoinInfo.up) {
            const foundUp = u.find(up => String(up.id) === String(besoinInfo.up));
            if (foundUp) setSelectedUp(foundUp);
          }
          if (besoinInfo.departement) {
            const foundDept = d.find(dept => String(dept.id) === String(besoinInfo.departement));
            if (foundDept) setSelectedDept(foundDept);
          }
        }

        setExistingFormations(formations);
        setFormateursList(mergeFormateursAccounts(accountsData, e));
      } catch {
        message.error("Échec chargement des données");
      }
    })();
  }, [initialDate]);

  // Lazy-load référentiel RICE uniquement quand l'utilisateur atteint l'étape 3
  useEffect(() => {
    if (activeStep === 3 && compDomaines.length === 0) {
      Promise.all([
        CompetenceService.domaine.getAll(),
        CompetenceService.competence.getAll(),
      ]).then(([domainesData, competencesData]) => {
        const domaines = Array.isArray(domainesData) ? domainesData : [];
        const competences = Array.isArray(competencesData) ? competencesData : [];
        setCompDomaines(domaines);
        setCompCompetences(competences);

        // Pre-fill from besoin competences if available
        const besoinId = besoinInfo?.idBesoinFormation;
        if (besoinId && selectedCompLinks.length === 0) {
          BesoinCompetenceService.getByBesoin(Number(besoinId))
            .then((links) => {
              if (links.length > 0) {
                setSelectedCompLinks(links.map((l) => ({
                  domaineId: l.domaineId ?? null,
                  competenceId: l.competenceId ?? null,
                  competenceNom: l.competenceNom || "",
                  savoirId: l.savoirId ?? null,
                  savoirNom: l.savoirNom || "",
                  sousCompetenceId: l.sousCompetenceId ?? null,
                })));
              }
            })
            .catch(() => { /* ignore — pre-fill is best-effort */ });
        }
      }).catch(() => {
        message.error("Impossible de charger le référentiel de compétences");
      });
    }
  }, [activeStep]);

  const handleNext = () => {
    // ── Étape 0 : Général ───────────────────────────────────────────────────
    if (activeStep === 0) {
      if (!titre || titre.trim().length < 5) {
        message.error("Le titre doit contenir au moins 5 caractères");
        return;
      }
      if (!typeFormation) {
        message.error("Sélectionnez un type de formation");
        return;
      }
      if (dateDebut && dateFin && dateDebut > dateFin) {
        message.error("La date de fin doit être postérieure à la date de début");
        return;
      }
    }
    // ── Étape 2 : Planning & Acteurs ────────────────────────────────────────
    if (activeStep === 2) {
      if (seances.length === 0) {
        message.error("Ajoutez au moins une séance avant de continuer");
        return;
      }
      const missDate = seances.findIndex(s => !s.dateSeance);
      if (missDate !== -1) {
        message.error(`La séance #${missDate + 1} n'a pas de date`);
        return;
      }
      const badTime = seances.findIndex(s => s.heureDebut && s.heureFin && s.heureDebut >= s.heureFin);
      if (badTime !== -1) {
        message.error(`La séance #${badTime + 1} : l'heure de fin doit être après l'heure de début`);
        return;
      }
      // Auto-sync charge horaire depuis les séances si non modifiée manuellement
      const totalMin = seances.reduce((acc, s) => {
        const start = toMinutes(s.heureDebut) ?? 0;
        const end   = toMinutes(s.heureFin)   ?? 0;
        return acc + Math.max(0, end - start);
      }, 0);
      if (totalMin > 0) setChargeH(Math.round((totalMin / 60) * 10) / 10);
    }
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => setActiveStep((prev) => prev - 1);

  const toMinutes = (timeValue) => {
    if (!timeValue) return null;
    const parts = String(timeValue).split(":");
    if (parts.length <2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return (h * 60) + m;
  };

  const intersects = (left, right) => left.some((id) => right.includes(id));

  const sameTimeWindow = (a, b) => {
    if (!a?.dateSeance || !b?.dateSeance || a.dateSeance !== b.dateSeance) return false;
    const aStart = toMinutes(a.heureDebut);
    const aEnd = toMinutes(a.heureFin);
    const bStart = toMinutes(b.heureDebut);
    const bEnd = toMinutes(b.heureFin);
    if (aStart === null || aEnd === null || bStart === null || bEnd === null) return false;
    return aStart < bEnd && bStart < aEnd;
  };

  const normalizedSalle = (value) => String(value || "").trim().toLowerCase();

  const getAnimateurStableId = (anim) => (
    anim?.isAuthUser
      ? String(anim.userName || anim.nom || "").substring(0, 10).toUpperCase()
      : anim?.id
  );

  const mergeFormateursAccounts = (accountsData, enseignantsData) => {
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
    // Enrich with enseignant data when the same person exists in both lists
    const fUserNames = formateurs.map(f => f.userName).filter(Boolean);
    const enriched = formateurs.map(f => {
      const prefix = f.mail ? f.mail.split("@")[0] : "";
      const match = enseignantsData.find(ex =>
        fUserNames.includes(ex.id) || ex.mail === f.mail || ex.mail?.split("@")[0] === prefix
      );
      return match ? { ...f, upLibelle: match.upLibelle || "", deptLibelle: match.deptLibelle || "", type: match.type || f.type } : f;
    });
    return enriched;
  };

  const checkExistingFormationConflicts = (localSeance, idx, existingFormations, messages, participantIds, animateurIds) => {
    existingFormations.forEach((f) => {
      const existingSeances = Array.isArray(f.seances) ? f.seances : [];
      const existingParticipants = [
        ...(Array.isArray(f.participants) ? f.participants : []),
        ...existingSeances.flatMap((s) => Array.isArray(s.participants) ? s.participants : []),
      ].map((p) => p?.id).filter(Boolean);
      existingSeances.forEach((existingSeance) => {
        if (!sameTimeWindow(localSeance, existingSeance)) return;
        const formationName = f.titreFormation || `#${f.idFormation || f.id || "?"}`;
        const localSalle = normalizedSalle(localSeance.salle);
        const existingSalle = normalizedSalle(existingSeance.salle);
        if (localSalle && existingSalle && localSalle === existingSalle) {
          messages.push(`Conflit salle: séance #${idx + 1} chevauche la formation ${formationName} dans la salle ${localSeance.salle}.`);
        }
        const existingAnimIds = (Array.isArray(existingSeance.animateurs) ? existingSeance.animateurs : []).map((a) => a?.id).filter(Boolean);
        if (participantIds.length > 0 && existingParticipants.length > 0 && intersects(participantIds, existingParticipants)) {
          messages.push(`Conflit participants: séance #${idx + 1} chevauche la formation ${formationName}.`);
        }
        if (animateurIds.length > 0 && existingAnimIds.length > 0 && intersects(animateurIds, existingAnimIds)) {
          messages.push(`Conflit animateurs: séance #${idx + 1} chevauche la formation ${formationName}.`);
        }
      });
    });
  };

  const buildConflictMessages = ({ localSeances, participantIds, animateurIds }) => {
    const messages = [];

    localSeances.forEach((s, idx) => {
      const start = toMinutes(s.heureDebut);
      const end = toMinutes(s.heureFin);
      if (start !== null && end !== null && start >= end) {
        messages.push(`Séance #${idx + 1}: heure de fin doit être après l&apos;heure de début.`);
      }
    });

    for (let i = 0; i <localSeances.length; i += 1) {
      for (let j = i + 1; j < localSeances.length; j += 1) {
        const left = localSeances[i];
        const right = localSeances[j];
        if (!sameTimeWindow(left, right)) continue;

        const leftSalle = normalizedSalle(left.salle);
        const rightSalle = normalizedSalle(right.salle);
        if (leftSalle && rightSalle && leftSalle === rightSalle) {
          messages.push(`Conflit interne: les séances #${i + 1} et #${j + 1} utilisent la même salle au même horaire.`);
        }
        if (participantIds.length > 0) {
          messages.push(`Conflit interne: les séances #${i + 1} et #${j + 1} se chevauchent pour les mêmes participants.`);
        }
        if (animateurIds.length > 0) {
          messages.push(`Conflit interne: les séances #${i + 1} et #${j + 1} se chevauchent pour les mêmes animateurs.`);
        }
      }
    }

    localSeances.forEach((localSeance, idx) => {
      checkExistingFormationConflicts(localSeance, idx, existingFormations, messages, participantIds, animateurIds);
    });

    return [...new Set(messages)];
  };

  useEffect(() => {
    const localAnimIds = animSel.map(getAnimateurStableId).filter(Boolean);
    const localParticipantIds = partSel.map((p) => p.id).filter(Boolean);
    const messages = buildConflictMessages({
      localSeances: seances,
      participantIds: localParticipantIds,
      animateurIds: localAnimIds,
    });
    setOverlapWarnings(messages);
  }, [seances, partSel, animSel, existingFormations]);

  const handleCompetenceChange = async (idx, competence) => {
    const updated = [...selectedCompLinks];
    updated[idx] = { ...updated[idx], competenceId: competence?.id || null, competenceNom: competence?.nom || "", domaineId: competence?.domaineId || updated[idx].domaineId, sousCompetenceId: null, savoirId: null };
    setSelectedCompLinks(updated);
    if (competence?.id) {
      const [sc, sv] = await Promise.all([
        CompetenceService.sousCompetence.getByCompetence(competence.id),
        CompetenceService.savoir.getByCompetence(competence.id),
      ]);
      setRowSousComps(p => ({ ...p, [idx]: Array.isArray(sc) ? sc : [] }));
      setRowSavoirs(p => ({ ...p, [idx]: Array.isArray(sv) ? sv : [] }));
    }
  };

  const addSeance = () => setSeances([...seances, { id: Date.now(), dateSeance: dateDebut, heureDebut: "08:00:00", heureFin: "10:00:00", salle: "", onlineMeetingUrl: "", typeSeance: "THEORIQUE", contenus: "", methodes: "", dureeTheorique: 0, dureePratique: 0, expanded: true }]);
  const updateSeance = (i, f, v) => { const a = [...seances]; a[i] = { ...a[i], [f]: v }; setSeances(a); };
  const removeSeance = (i) => setSeances(seances.filter((_, idx) => idx !== i));
  const toggleSeance = (i) => updateSeance(i, "expanded", !seances[i].expanded);

  const handleSubmitError = (err) => {
    console.error("Submission error details:", err.response?.data);
    const backendErrors = err.response?.data;
    let errorMsg = "Échec de la création de la formation.";

    if (Array.isArray(backendErrors)) {
      errorMsg = backendErrors.map(e => e.defaultMessage || e.message || "Erreur de validation").join(" | ");
    } else if (backendErrors?.error && backendErrors?.message) {
      errorMsg = `${backendErrors.error} : ${backendErrors.message}`;
    } else if (backendErrors?.error) {
      errorMsg = backendErrors.error;
    } else if (backendErrors?.message) {
      errorMsg = backendErrors.message;
    } else if (err.message) {
      errorMsg = err.message;
    }

    message.error(errorMsg);
  };

  const handleSubmit = async () => {
    if (seances.length === 0) {
      message.warning("Ajoutez au moins une séance.");
      return;
    }
    try {
      // Validate seance dates
      for (let i = 0; i < seances.length; i++) {
        if (!seances[i].dateSeance || seances[i].dateSeance.trim() === "") {
          message.warning(`Séance #${i + 1}: veuillez remplir la date.`);
          return;
        }
        if (!seances[i].heureDebut || seances[i].heureDebut.trim() === "") {
          message.warning(`Séance #${i + 1}: veuillez remplir l'heure de début.`);
          return;
        }
        if (!seances[i].heureFin || seances[i].heureFin.trim() === "") {
          message.warning(`Séance #${i + 1}: veuillez remplir l'heure de fin.`);
          return;
        }
      }

      // Synchronize auth users to enseignants table if needed
      const finalAnimIds = animSel.map(getAnimateurStableId).filter(Boolean);

      const blockingConflicts = buildConflictMessages({
        localSeances: seances,
        participantIds: partSel.map((p) => p.id).filter(Boolean),
        animateurIds: finalAnimIds,
      });

      if (titre.trim().length < 5) {
        message.warning("Le titre doit contenir au moins 5 caractères.");
        return;
      }

      if (blockingConflicts.length > 0) {
        setOverlapWarnings(blockingConflicts);
        message.error("Conflits détectés: corrigez les dates/salles/personnes.");
        return;
      }

      for (const anim of animSel) {
        if (anim.isAuthUser) {
          const newId = getAnimateurStableId(anim);
          try {
            await EnseignantService.createEnseignant({
              id: newId,
              nom: anim.nom,
              prenom: anim.prenom,
              mail: anim.mail,
              type: anim.type,
              etat: anim.etat,
              cup: anim.cup,
              chefDepartement: anim.chefDepartement
            });
          } catch (e) {
            // Might already exist or fail, we still try to use the ID
            console.log("Enseignant sync info:", e.message);
          }
        }
      }

      const payload = {
        idBesoinFormation: besoinInfo?.idBesoinFormation || besoinInfo?.idBesionFormation || null,
        typeBesoin: besoinInfo?.typeBesoin || null,
        titreFormation: titre, 
        dateDebut: dateDebut || null, 
        dateFin: dateFin || null, 
        typeFormation, 
        etatFormation, 
        ouverte,
        coutFormation: parseFloat(cout) || 0, 
        externeFormateurNom: formNom,
        externeFormateurPrenom: formPrenom,
        externeFormateurEmail: formEmail || null,
        organismeRefExterne: organisme,
        bureauFormationNom: bureauNom || null,
        bureauFormationMail: bureauMail || null,
        bureauFormationTelephone: bureauTelephone || null,
        chargeHoraireGlobal: parseInt(chargeH, 10) || 0,
        upId: selectedUp?.id, 
        departementId: selectedDept?.id,
        animateursIds: finalAnimIds, 
        participantsIds: partSel.map(p => p.id),
        domaine, 
        populationCible, 
        objectifs, 
        objectifsPedago, 
        evalMethods,
        coutTransport: parseFloat(coutTransport) || 0, 
        coutHebergement: parseFloat(coutHebergement) || 0, 
        coutRepas: parseFloat(coutRepas) || 0, 
        periodCode, 
        customPeriodLabel,
        seances: seances.map(s => ({
          dateSeance: s.dateSeance || null, 
          heureDebut: s.heureDebut, 
          heureFin: s.heureFin,
          salle: s.salle, 
          onlineMeetingUrl: s.onlineMeetingUrl,
          animateursIds: (s.animateurs || []).map(a => a.id || a),
          typeSeance: s.typeSeance, 
          contenus: s.contenus, 
          methodes: s.methodes,
          dureeTheorique: parseFloat(s.dureeTheorique) || 0, 
          dureePratique: parseFloat(s.dureePratique) || 0
        })),
      };
      const newF = await FormationWorkflowService.createFormationWorkflow(payload);
      const fId = newF.idFormation || newF.id;
      setNewFormationId(fId);

      if (selectedCompLinks.length > 0 && fId) {
        const compLinks = selectedCompLinks.filter(l => l.competenceId).map(l => ({ ...l }));
        await FormationCompetenceService.replaceAllForFormation(fId, compLinks);
      }

      setShowUpload(true);
      message.success("Formation créée !");
      onFormationCreated(newF);
      setTimeout(() => navigate("/home/ListeFormation"), 2000);
    } catch (err) {
      handleSubmitError(err);
    }
  };

  const handleExcelImportFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target.result);
      const wb = XLSX.read(data, { type: "array" });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      const mails = rows
        .map(r => r.Email || r.email || r.Mail || r.mail || r.EMAIL || r.MAIL || r.email_address)
        .filter(Boolean)
        .map(m => String(m).trim().toLowerCase());
      const matched = enseignants.filter(ex => ex.mail && mails.includes(ex.mail.toLowerCase()));
      setPartSel(matched);
      e.target.value = "";
      if (matched.length > 0) {
        message.success(`${matched.length} participant${matched.length > 1 ? "s" : ""} importé${matched.length > 1 ? "s" : ""}`);
      } else if (mails.length === 0) {
        const headers = rows.length > 0 ? Object.keys(rows[0]).join(", ") : "fichier vide";
        message.warning(`Aucun email trouvé. Colonne attendue : Email ou Mail. Colonnes trouvées : ${headers}`);
      } else {
        message.warning(`Aucun participant correspondant pour les ${mails.length} email${mails.length > 1 ? "s" : ""} importés`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const exportParticipantsExcel = () => {
    const source = partSel.length > 0 ? partSel : optionsPart;
    const rows = source.map(p => ({
      Nom:         p.nom || "",
      Prénom:      p.prenom || "",
      Email:       p.mail || "",
      Type:        p.type === "P" ? "Permanent" : p.type === "V" ? "Vacataire" : p.type || "",
      UP:          p.upLibelle || "",
      Département: p.deptLibelle || "",
    }));
    writeExcel(
      [{ name: "Participants", rows, title: "Liste des Participants — Esprit", subtitle: exportDateLabel() }],
      `participants_${isoDate()}.xlsx`
    );
  };

  const handleCompetenceSelect = (idx, val) => {
    handleCompetenceChange(idx, compCompetences.find(c => c.id === val) || null);
  };

  const handleSavoirSelect = (idx, val) => {
    const u = [...selectedCompLinks];
    u[idx] = { ...u[idx], savoirId: val, savoirNom: (rowSavoirs[idx] || []).find(s => s.id === val)?.nom || "" };
    setSelectedCompLinks(u);
  };

  const handleRemoveCompetenceLink = (idx) => {
    setSelectedCompLinks(selectedCompLinks.filter((_, i) => i !== idx));
  };

  const getCompetenceOptions = (domaineId) => {
    const kw = compSearch.trim().toLowerCase();
    return compCompetences
      .filter(c => (!domaineId || c.domaineId === domaineId) && (!kw || c.nom?.toLowerCase().includes(kw)))
      .map(c => ({ value: c.id, label: c.nom }));
  };

  // Sous-composant : champ Charge Horaire avec indicateur temps réel depuis les séances
  const ChargeHoraireField = ({ chargeH, setChargeH, seances, toMinutes }) => {
    const totalMin = seances.reduce((acc, s) => {
      const start = toMinutes(s.heureDebut) ?? 0;
      const end   = toMinutes(s.heureFin)   ?? 0;
      return acc + Math.max(0, end - start);
    }, 0);
    const calc = totalMin > 0 ? `${(totalMin / 60).toFixed(1)}h` : null;
    return (
      <div className="creation-field">
        <label className="creation-field-label">
          <ClockCircleOutlined /> Charge Horaire (h)
        </label>
        <InputNumber
          size="large"
          style={{ width: "100%" }}
          value={chargeH}
          onChange={(val) => setChargeH(val)}
          min={0}
          addonAfter="h"
        />
        <span className="creation-field-help">
          {calc
            ? <>Calculé depuis les séances&nbsp;: <strong>{calc}</strong> — auto-synchronisé à l'étape suivante.</>
            : "Sera calculée automatiquement depuis les séances (étape 3)."}
        </span>
      </div>
    );
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0: // Général
        return (
          <div>
            {besoinInfo && (
              <AntAlert
                type="info"
                showIcon
                className="creation-alert-besoin"
                style={{ marginBottom: 20, borderRadius: "var(--radius-md)" }}
                message={<Text strong>Pré-rempli depuis le besoin de formation</Text>}
                description={
                  <div style={{ marginTop: 4, fontSize: "0.875rem" }}>
                    {besoinInfo.propositionAnimateur && <div>• <strong>Animateur proposé :</strong> {besoinInfo.propositionAnimateur}</div>}
                    {(besoinInfo.dateDebut || besoinInfo.dateFin) && (
                      <div>• <strong>Période :</strong> {besoinInfo.dateDebut || "?"} → {besoinInfo.dateFin || "?"}</div>
                    )}
                    {besoinInfo.priorite && <div>• <strong>Priorité :</strong> {besoinInfo.priorite}</div>}
                  </div>
                }
              />
            )}

            {/* Section Identité */}
            <div className="creation-section-box">
              <div className="creation-section-box-title">
                <BookOutlined /> Identité de la Formation
              </div>

              {/* Titre */}
              <div className="creation-field" style={{ marginBottom: 20 }}>
                <label className="creation-field-label" htmlFor="wf-titre">
                  <BookOutlined /> Titre de la Formation
                  <span className="creation-field-required" aria-hidden="true">*</span>
                </label>
                <Input
                  id="wf-titre"
                  size="large"
                  value={titre}
                  onChange={(e) => setTitre(e.target.value)}
                  placeholder="Ex : Formation Angular avancé pour les enseignants..."
                  aria-required="true"
                  aria-label="Titre de la formation (obligatoire)"
                  maxLength={120}
                  showCount
                />
                <span className="creation-field-help">Minimum 5 caractères — sera affiché dans le catalogue et le calendrier</span>
              </div>

              {/* Type Formation — cartes cliquables */}
              <div className="creation-field" style={{ marginBottom: 20 }}>
                <label className="creation-field-label">
                  <TagOutlined /> Type de Formation
                </label>
                <div className="creation-type-grid" role="radiogroup" aria-label="Type de formation">
                  {[
                    { value: "INTERNE",  label: "Interne (Esprit)",    desc: "Animée par un enseignant Esprit",      icon: <BankOutlined /> },
                    { value: "EXTERNE",  label: "Externe",             desc: "Dispensée par un prestataire externe", icon: <GlobalOutlined /> },
                    { value: "EN_LIGNE", label: "En ligne (Teams)",    desc: "À distance via Microsoft Teams",       icon: <LaptopOutlined /> },
                  ].map(opt => (
                    <div
                      key={opt.value}
                      className={`creation-type-card ${typeFormation === opt.value ? "selected" : ""}`}
                      onClick={() => setTypeFormation(opt.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setTypeFormation(opt.value); } }}
                      role="radio"
                      aria-checked={typeFormation === opt.value}
                      tabIndex={0}
                    >
                      <div className="creation-type-card-check" aria-hidden="true"><CheckOutlined /></div>
                      <div className="creation-type-card-icon" aria-hidden="true">{opt.icon}</div>
                      <span className="creation-type-card-label">{opt.label}</span>
                      <span className="creation-type-card-desc">{opt.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* État — badges radio */}
              <div className="creation-field">
                <label className="creation-field-label">
                  <CheckSquareOutlined /> État de la Formation
                </label>
                <div className="creation-etat-grid" role="radiogroup" aria-label="État de la formation">
                  {[
                    { value: "ENREGISTRE", label: "Enregistré" },
                    { value: "PLANIFIE",   label: "Planifié" },
                    { value: "EN_COURS",   label: "En cours" },
                    { value: "ACHEVE",     label: "Achevé" },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`creation-etat-badge ${opt.value} ${etatFormation === opt.value ? "selected" : ""}`}
                      onClick={() => setEtatFormation(opt.value)}
                      role="radio"
                      aria-checked={etatFormation === opt.value}
                    >
                      <span className="creation-etat-dot" aria-hidden="true" />
                      {opt.label}
                    </button>
                  ))}
                </div>
                <span className="creation-field-help">Peut être mis à jour à tout moment depuis la liste des formations</span>
              </div>
            </div>

            {/* Section Dates */}
            <div className="creation-section-box">
              <div className="creation-section-box-title">
                <CalendarOutlined /> Dates &amp; Planning
              </div>
              <Row gutter={[20, 16]}>
                <Col xs={24} sm={12}>
                  <div className="creation-field">
                    <label className="creation-field-label">
                      <CalendarOutlined /> Date Début <span style={{ color: "var(--color-error)" }}>*</span>
                    </label>
                    <Input size="large" type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
                  </div>
                </Col>
                <Col xs={24} sm={12}>
                  <div className="creation-field">
                    <label className="creation-field-label">
                      <CalendarOutlined /> Date Fin <span style={{ color: "var(--color-error)" }}>*</span>
                    </label>
                    <Input size="large" type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
                  </div>
                </Col>
                <Col xs={24} sm={12}>
                  <div className="creation-field">
                    <label className="creation-field-label">
                      <TagOutlined /> Période de Formation
                    </label>
                    <Select size="large" style={{ width: "100%" }} value={periodCode} onChange={(val) => setPeriodCode(val)}>
                      {PERIOD_OPTIONS.map((opt) => (
                        <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
                      ))}
                    </Select>
                  </div>
                </Col>
                <Col xs={24} sm={12}>
                  {periodCode === "OTHER" ? (
                    <div className="creation-field">
                      <label className="creation-field-label">Précisez la période</label>
                      <Input size="large" value={customPeriodLabel} onChange={(e) => setCustomPeriodLabel(e.target.value)} placeholder="Ex : Mai - Juin 2024" />
                    </div>
                  ) : (
                    <ChargeHoraireField chargeH={chargeH} setChargeH={setChargeH} seances={seances} toMinutes={toMinutes} />
                  )}
                </Col>
                {periodCode !== "OTHER" ? null : (
                  <Col xs={24} sm={12}>
                    <ChargeHoraireField chargeH={chargeH} setChargeH={setChargeH} seances={seances} toMinutes={toMinutes} />
                  </Col>
                )}
              </Row>
            </div>

            {/* Section Structure */}
            <div className="creation-section-box">
              <div className="creation-section-box-title">
                <ApartmentOutlined /> Structure Organisationnelle
              </div>
              <Row gutter={[20, 16]}>
                <Col xs={24} sm={12}>
                  <div className="creation-field">
                    <label className="creation-field-label">
                      <TeamOutlined /> UP (Unité Pédagogique)
                    </label>
                    <Select
                      size="large"
                      showSearch
                      style={{ width: "100%" }}
                      value={selectedUp?.id}
                      onChange={(val) => setSelectedUp(ups.find(u => u.id === val) || null)}
                      optionFilterProp="label"
                      options={ups.map(u => ({ value: u.id, label: u.libelle }))}
                      placeholder="Sélectionner l'UP"
                    />
                  </div>
                </Col>
                <Col xs={24} sm={12}>
                  <div className="creation-field">
                    <label className="creation-field-label">
                      <ApartmentOutlined /> Département
                    </label>
                    <Select
                      size="large"
                      showSearch
                      style={{ width: "100%" }}
                      value={selectedDept?.id}
                      onChange={(val) => setSelectedDept(depts.find(d => d.id === val) || null)}
                      optionFilterProp="label"
                      options={depts.map(d => ({ value: d.id, label: d.libelle }))}
                      placeholder="Sélectionner le département"
                    />
                  </div>
                </Col>
                <Col span={24}>
                  <div className="creation-switch-row">
                    <Switch checked={ouverte} onChange={(val) => setOuverte(val)} />
                    <Text style={{ fontWeight: 600, color: "var(--text-body)" }}>
                      Inscriptions Ouvertes
                    </Text>
                    <Text type="secondary" style={{ fontSize: "var(--text-xs)" }}>
                      {ouverte ? "Accessible à toutes les UPs" : "Réservée aux participants de l'UP uniquement"}
                    </Text>
                  </div>
                </Col>
              </Row>
            </div>
          </div>
        );
      case 1: // Pédagogie
        return (
          <div>
            <div className="creation-section-box">
              <div className="creation-section-box-title">
                <ReadOutlined /> Contenu Pédagogique
              </div>
              <Row gutter={[20, 16]}>
                {[
                  { label: "Domaine / Thème", val: domaine, set: setDomaine, placeholder: "Ex : Informatique, Management..." },
                  { label: "Population Cible", val: populationCible, set: setPopulationCible, placeholder: "Ex : Enseignants permanents..." },
                  { label: "Objectifs Généraux", val: objectifs, set: setObjectifs, multiline: true, placeholder: "Décrire les objectifs généraux de la formation..." },
                  { label: "Objectifs Pédagogiques", val: objectifsPedago, set: setObjectifsPedago, multiline: true, placeholder: "Détails des compétences à acquérir..." },
                  { label: "Méthodes d'Évaluation", val: evalMethods, set: setEvalMethods, placeholder: "Ex : Quiz, Projet, QCM..." },
                ].map((f) => (
                  <Col xs={24} sm={f.multiline ? 24 : 12} key={f.label}>
                    <div className="creation-field">
                      <label className="creation-field-label">{f.label}</label>
                      {f.multiline ? (
                        <TextArea rows={3} value={f.val} onChange={(e) => f.set(e.target.value)} placeholder={f.placeholder} />
                      ) : (
                        <Input size="large" value={f.val} onChange={(e) => f.set(e.target.value)} placeholder={f.placeholder} />
                      )}
                    </div>
                  </Col>
                ))}
              </Row>
            </div>
          </div>
        );
      case 2: // Planning & Acteurs
        return (
          <div>
            {/* Séances */}
            <div className="creation-section-box">
              <div className="creation-section-box-title">
                <CalendarOutlined /> Séances de Formation
              </div>
              {seances.map((s, i) => (
                <Card key={s.id} className="creation-seance-card">
                  <div className="creation-seance-header">
                    <Text className="creation-seance-title">
                      <CalendarOutlined style={{ marginRight: 6, color: "var(--primary-500)" }} />
                      Séance #{i + 1}
                    </Text>
                    <Space>
                      <Button type="text" size="small" onClick={() => toggleSeance(i)}>
                        {s.expanded ? <UpOutlined /> : <DownOutlined />}
                      </Button>
                      <Button type="text" danger size="small" onClick={() => removeSeance(i)}>
                        <DeleteOutlined />
                      </Button>
                    </Space>
                  </div>
                  {s.expanded && (
                    <Row gutter={[16, 12]} style={{ marginTop: 12 }}>
                      <Col xs={24} sm={8}>
                        <div className="creation-field">
                          <label className="creation-field-label"><CalendarOutlined /> Date</label>
                          <Input size="large" type="date" value={s.dateSeance} onChange={(e) => updateSeance(i, "dateSeance", e.target.value)} />
                        </div>
                      </Col>
                      <Col xs={12} sm={8}>
                        <div className="creation-field">
                          <label className="creation-field-label"><ClockCircleOutlined /> Heure Début</label>
                          <Input size="large" type="time" value={s.heureDebut} onChange={(e) => updateSeance(i, "heureDebut", e.target.value)} />
                        </div>
                      </Col>
                      <Col xs={12} sm={8}>
                        <div className="creation-field">
                          <label className="creation-field-label"><ClockCircleOutlined /> Heure Fin</label>
                          <Input size="large" type="time" value={s.heureFin} onChange={(e) => updateSeance(i, "heureFin", e.target.value)} />
                        </div>
                      </Col>
                      <Col xs={24} sm={12}>
                        <div className="creation-field">
                          {typeFormation === "EN_LIGNE" ? (
                            <>
                              <label className="creation-field-label"><LinkOutlined /> Lien Réunion (Teams)</label>
                              <Input size="large" prefix={<LinkOutlined />} value={s.onlineMeetingUrl} onChange={(e) => updateSeance(i, "onlineMeetingUrl", e.target.value)} placeholder="https://teams.microsoft.com/..." />
                            </>
                          ) : (
                            <>
                              <label className="creation-field-label"><EnvironmentOutlined /> Salle / Lieu</label>
                              <Input size="large" value={s.salle} onChange={(e) => updateSeance(i, "salle", e.target.value)} placeholder="Ex : Salle A101" />
                            </>
                          )}
                        </div>
                      </Col>
                      <Col xs={24} sm={12}>
                        <div className="creation-field">
                          <label className="creation-field-label"><TagOutlined /> Type de Séance</label>
                          <Select size="large" style={{ width: "100%" }} value={s.typeSeance} onChange={(val) => updateSeance(i, "typeSeance", val)}>
                            <Select.Option value="THEORIQUE">THÉORIQUE</Select.Option>
                            <Select.Option value="PRATIQUE">PRATIQUE</Select.Option>
                          </Select>
                        </div>
                      </Col>
                    </Row>
                  )}
                </Card>
              ))}
              <Button className="creation-btn-add-seance" type="dashed" onClick={addSeance} icon={<PlusOutlined />}>
                Ajouter une séance
              </Button>
            </div>

            {/* Acteurs */}
            <div className="creation-section-box">
              <div className="creation-section-box-title">
                <TeamOutlined /> Animateurs &amp; Participants
              </div>
              <Row gutter={[20, 20]}>

                {/* ── Animateurs ── */}
                <Col span={24}>
                  <div className="creation-field">
                    <div className="creation-acteur-header">
                      <label className="creation-field-label">
                        <TeamOutlined />
                        {typeFormation === "EXTERNE" ? " Animateur Externe" : " Animateurs (Formateurs internes)"}
                      </label>
                      {animSel.length > 0 && (
                        <span className="creation-acteur-count">{animSel.length} sélectionné(s)</span>
                      )}
                    </div>

                    {typeFormation !== "EXTERNE" && (
                      <div className="creation-acteur-filters">
                        <FilterOutlined className="creation-acteur-filter-icon" />
                        <Select
                          size="small"
                          allowClear
                          placeholder="UP"
                          style={{ flex: 1, minWidth: 100 }}
                          value={animFilterUp?.id ?? null}
                          onChange={(val) => setAnimFilterUp(ups.find(u => u.id === val) ?? null)}
                          options={ups.map(u => ({ value: u.id, label: u.libelle }))}
                        />
                        <Select
                          size="small"
                          allowClear
                          placeholder="Département"
                          style={{ flex: 1, minWidth: 120 }}
                          value={animFilterDept?.id ?? null}
                          onChange={(val) => setAnimFilterDept(depts.find(d => d.id === val) ?? null)}
                          options={depts.map(d => ({ value: d.id, label: d.libelle }))}
                        />
                      </div>
                    )}

                    <Select
                      mode="multiple"
                      size="large"
                      disabled={typeFormation === "EXTERNE"}
                      style={{ width: "100%" }}
                      value={animSel.map(a => a.id)}
                      onChange={(vals) => setAnimSel(optionsAnim.filter(a => vals.includes(a.id)))}
                      optionFilterProp="label"
                      options={optionsAnim.map(a => ({ value: a.id, label: getAnimateurLabel(a) }))}
                      placeholder="Sélectionner les animateurs..."
                    />
                    <span className="creation-field-help">
                      {typeFormation === "EXTERNE"
                        ? "Pour une formation externe, renseignez l'animateur dans le bloc ci-dessous."
                        : `${optionsAnim.length} formateur(s) disponible(s) — Permanent · Vacataire · CUP`}
                    </span>
                  </div>
                </Col>

                {/* ── Animateur externe ── */}
                {(isAdmin || typeFormation === "EXTERNE") && (
                  <Col span={24}>
                    <div className="creation-externe-box">
                      <Text className="creation-externe-title">
                        <UserAddOutlined style={{ marginRight: 6 }} />Animateur Externe
                      </Text>
                      <Row gutter={[16, 12]} style={{ marginTop: 12 }}>
                        <Col xs={24} sm={8}>
                          <div className="creation-field">
                            <label className="creation-field-label">Nom</label>
                            <Input size="large" value={formNom} onChange={(e) => setFormNom(e.target.value)} placeholder="Nom de l'animateur" />
                          </div>
                        </Col>
                        <Col xs={24} sm={8}>
                          <div className="creation-field">
                            <label className="creation-field-label">Prénom</label>
                            <Input size="large" value={formPrenom} onChange={(e) => setFormPrenom(e.target.value)} placeholder="Prénom de l'animateur" />
                          </div>
                        </Col>
                        <Col xs={24} sm={8}>
                          <div className="creation-field">
                            <label className="creation-field-label">Email</label>
                            <Input size="large" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="email@organisme.com" />
                          </div>
                        </Col>
                      </Row>
                    </div>
                  </Col>
                )}

                {/* ── Bureau de formation (uniquement pour formation EXTERNE) ── */}
                {typeFormation === "EXTERNE" && (
                  <Col span={24}>
                    <div className="creation-externe-box">
                      <Text className="creation-externe-title">
                        <BankOutlined style={{ marginRight: 6 }} />Bureau de Formation
                      </Text>
                      <Row gutter={[16, 12]} style={{ marginTop: 12 }}>
                        <Col xs={24} sm={8}>
                          <div className="creation-field">
                            <label className="creation-field-label">Nom du bureau</label>
                            <Input
                              size="large"
                              value={bureauNom}
                              onChange={(e) => setBureauNom(e.target.value)}
                              placeholder="Ex : Centre de Formation ESPRIT"
                            />
                          </div>
                        </Col>
                        <Col xs={24} sm={8}>
                          <div className="creation-field">
                            <label className="creation-field-label">Email du bureau</label>
                            <Input
                              size="large"
                              type="email"
                              value={bureauMail}
                              onChange={(e) => setBureauMail(e.target.value)}
                              placeholder="contact@bureau.com"
                            />
                          </div>
                        </Col>
                        <Col xs={24} sm={8}>
                          <div className="creation-field">
                            <label className="creation-field-label">Numéro de téléphone</label>
                            <Input
                              size="large"
                              value={bureauTelephone}
                              onChange={(e) => setBureauTelephone(e.target.value)}
                              placeholder="+216 XX XXX XXX"
                            />
                          </div>
                        </Col>
                      </Row>
                    </div>
                  </Col>
                )}

                {/* ── Participants ── */}
                <Col span={24}>
                  <div className="creation-field">
                    <div className="creation-acteur-header">
                      <label className="creation-field-label">
                        <TeamOutlined /> Participants (Enseignants)
                      </label>
                      <div style={{ display: "flex", gap: 6 }}>
                        <Button
                          size="small"
                          icon={<DownloadOutlined />}
                          onClick={exportParticipantsExcel}
                          className="creation-btn-excel"
                          title={partSel.length > 0 ? "Exporter la sélection" : "Exporter la liste filtrée"}
                        >
                          {partSel.length > 0 ? `Export (${partSel.length})` : "Export"}
                        </Button>
                        <Button
                          size="small"
                          icon={<UploadOutlined />}
                          onClick={() => document.getElementById("excel-import").click()}
                          className="creation-btn-excel"
                        >
                          Import
                        </Button>
                        <input id="excel-import" hidden accept=".xlsx,.xls" type="file" onChange={handleExcelImportFile} />
                      </div>
                    </div>

                    <div className="creation-acteur-filters">
                      <FilterOutlined className="creation-acteur-filter-icon" />
                      <Select
                        size="small"
                        allowClear
                        placeholder="UP"
                        style={{ flex: 1, minWidth: 100 }}
                        value={partFilterUp?.id ?? null}
                        onChange={(val) => setPartFilterUp(ups.find(u => u.id === val) ?? null)}
                        options={ups.map(u => ({ value: u.id, label: u.libelle }))}
                      />
                      <Select
                        size="small"
                        allowClear
                        placeholder="Département"
                        style={{ flex: 1, minWidth: 120 }}
                        value={partFilterDept?.id ?? null}
                        onChange={(val) => setPartFilterDept(depts.find(d => d.id === val) ?? null)}
                        options={depts.map(d => ({ value: d.id, label: d.libelle }))}
                      />
                    </div>

                    <Select
                      mode="multiple"
                      size="large"
                      style={{ width: "100%" }}
                      value={partSel.map(p => p.id)}
                      onChange={(vals) => setPartSel(optionsPart.filter(p => vals.includes(p.id)))}
                      optionFilterProp="label"
                      options={optionsPart.map(p => ({ value: p.id, label: getEnseignantLabel(p) }))}
                      placeholder="Sélectionner les participants..."
                    />
                    <span className="creation-field-help">
                      {optionsPart.length} enseignant(s) disponible(s) — Perm. / Vac. / CUP / ChefDep
                    </span>
                  </div>
                </Col>

              </Row>
            </div>

            {overlapWarnings.length > 0 && (
              <AntAlert
                type="warning"
                showIcon
                className="creation-alert-overlap"
                message={<strong>Chevauchements détectés</strong>}
                description={
                  <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
                    {overlapWarnings.map((msg) => <li key={msg}>{msg}</li>)}
                  </ul>
                }
              />
            )}
          </div>
        );
      case 3: // Compétences RICE
        return (
          <div>
            <div className="creation-section-box">
              <div className="creation-section-box-title">
                <ReadOutlined /> Cartographie des Compétences (RICE)
              </div>

              {compDomaines.length === 0 && compCompetences.length === 0 ? (
                <div className="creation-comp-loading">
                  <span className="creation-comp-loading-dot" />
                  Chargement du référentiel…
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
                    <Input
                      allowClear
                      placeholder="Rechercher une compétence…"
                      prefix={<FilterOutlined style={{ color: "#999" }} />}
                      value={compSearch}
                      onChange={(e) => setCompSearch(e.target.value)}
                      style={{ maxWidth: 320 }}
                    />
                    {compSearch && (
                      <span style={{ fontSize: 12, color: "#888" }}>
                        {compCompetences.filter(c => c.nom?.toLowerCase().includes(compSearch.trim().toLowerCase())).length} résultat(s)
                      </span>
                    )}
                  </div>

                  {selectedCompLinks.length === 0 ? (
                    <div className="creation-comp-empty">
                      <ReadOutlined aria-hidden="true" />
                      <span>Aucune compétence liée — cliquez sur &laquo;&nbsp;Ajouter&nbsp;&raquo; pour en associer une.</span>
                    </div>
                  ) : (
                    <div className="creation-competence-card">
                      {selectedCompLinks.map((link, idx) => (
                        <div key={idx} className="creation-competence-row">
                          <span className="creation-competence-num" aria-hidden="true">{idx + 1}</span>

                          <div className="creation-field creation-comp-select">
                            <label className="creation-field-label">Domaine (filtre)</label>
                            <Select
                              showSearch
                              allowClear
                              size="large"
                              style={{ width: "100%" }}
                              value={link.domaineId}
                              onChange={(val) => {
                                const u = [...selectedCompLinks];
                                u[idx] = { ...u[idx], domaineId: val ?? null, competenceId: null, savoirId: null };
                                setSelectedCompLinks(u);
                              }}
                              options={compDomaines.map(d => ({ value: d.id, label: d.nom }))}
                              optionFilterProp="label"
                              placeholder="Filtrer par domaine…"
                              aria-label={`Domaine — ligne ${idx + 1}`}
                            />
                          </div>

                          <div className="creation-field creation-comp-select">
                            <label className="creation-field-label">Compétence</label>
                            <Select
                              showSearch
                              size="large"
                              style={{ width: "100%" }}
                              value={link.competenceId}
                              onChange={(val) => handleCompetenceSelect(idx, val)}
                              options={getCompetenceOptions(link.domaineId)}
                              optionFilterProp="label"
                              placeholder="Rechercher une compétence…"
                              aria-label={`Compétence — ligne ${idx + 1}`}
                            />
                          </div>

                          <div className="creation-field creation-comp-select">
                            <label className="creation-field-label">Savoir</label>
                            <Select
                              showSearch
                              size="large"
                              style={{ width: "100%" }}
                              value={link.savoirId}
                              onChange={(val) => handleSavoirSelect(idx, val)}
                              options={(rowSavoirs[idx] || []).map(s => ({ value: s.id, label: `${s.nom} (${s.type})` }))}
                              optionFilterProp="label"
                              placeholder="Choisir un savoir…"
                              disabled={!link.competenceId}
                              aria-label={`Savoir — ligne ${idx + 1}`}
                            />
                          </div>

                          <Button
                            type="text"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={() => handleRemoveCompetenceLink(idx)}
                            aria-label={`Supprimer la ligne ${idx + 1}`}
                            className="creation-comp-del-btn"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              <Button
                type="dashed"
                onClick={() => setSelectedCompLinks([...selectedCompLinks, { domaineId: null, competenceId: null, savoirId: null }])}
                icon={<PlusOutlined />}
                className="creation-btn-add-seance"
                style={{ marginTop: 12, width: "100%" }}
              >
                Ajouter une compétence RICE
              </Button>
              <span className="creation-field-help" style={{ display: "block", marginTop: 8 }}>
                Chaque ligne associe un <strong>Domaine</strong> → <strong>Compétence</strong> → <strong>Savoir</strong> du référentiel RICE Esprit à cette formation.
              </span>
            </div>
          </div>
        );
      case 4: // Coûts
        return (
          <div>
            <div className="creation-section-box">
              <div className="creation-section-box-title">
                <DollarOutlined /> Budget &amp; Coûts
              </div>
              {typeFormation === "EXTERNE" ? (
                <Row gutter={[20, 16]}>
                  <Col xs={24} sm={12}>
                    <div className="creation-field">
                      <label className="creation-field-label">Organisme Prestataire</label>
                      <Input size="large" value={organisme} onChange={(e) => setOrganisme(e.target.value)} placeholder="Nom de l'organisme..." />
                    </div>
                  </Col>
                  <Col xs={24} sm={12}>
                    <div className="creation-field">
                      <label className="creation-field-label"><DollarOutlined /> Frais de Formation (DT)</label>
                      <InputNumber size="large" style={{ width: "100%" }} suffix="DT" value={cout} onChange={(val) => setCout(val)} min={0} />
                    </div>
                  </Col>
                  <Col xs={24} sm={8}>
                    <div className="creation-field">
                      <label className="creation-field-label">Coût Transport (DT)</label>
                      <InputNumber size="large" style={{ width: "100%" }} value={coutTransport} onChange={(val) => setCoutTransport(val)} min={0} />
                    </div>
                  </Col>
                  <Col xs={24} sm={8}>
                    <div className="creation-field">
                      <label className="creation-field-label">Coût Hébergement (DT)</label>
                      <InputNumber size="large" style={{ width: "100%" }} value={coutHebergement} onChange={(val) => setCoutHebergement(val)} min={0} />
                    </div>
                  </Col>
                  <Col xs={24} sm={8}>
                    <div className="creation-field">
                      <label className="creation-field-label">Coût Repas (DT)</label>
                      <InputNumber size="large" style={{ width: "100%" }} value={coutRepas} onChange={(val) => setCoutRepas(val)} min={0} />
                    </div>
                  </Col>
                </Row>
              ) : (
                <AntAlert
                  type="info"
                  showIcon
                  className="creation-alert-costs"
                  message="Aucun coût direct pour cette formation"
                  description="Pour les formations internes ou en ligne, les coûts directs sont généralement nuls. Seule la charge horaire est comptabilisée."
                />
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="creation-form">
      {/* Custom Stepper */}
      <div className="wf-stepper" role="list" aria-label="Étapes du formulaire">
        {STEPS.map((s, i) => (
          <div
            key={i}
            className={`wf-step${i === activeStep ? " active" : ""}${i < activeStep ? " done" : ""}`}
            role="listitem"
            aria-current={i === activeStep ? "step" : undefined}
          >
            <div className="wf-step-circle" aria-hidden="true">
              {i < activeStep ? <CheckOutlined /> : s.icon}
            </div>
            <span className="wf-step-label">{s.title}</span>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div
        className="wf-progress-bar"
        role="progressbar"
        aria-valuenow={activeStep + 1}
        aria-valuemin={1}
        aria-valuemax={STEPS.length}
        aria-label={`Étape ${activeStep + 1} sur ${STEPS.length}`}
      >
        <div
          className="wf-progress-fill"
          style={{ width: `${((activeStep + 1) / STEPS.length) * 100}%` }}
        />
      </div>

      <Card className="creation-step-card">
        {/* Step header */}
        <div className="wf-step-header">
          <div className="wf-step-header-icon" aria-hidden="true">
            {STEPS[activeStep].icon}
          </div>
          <div className="wf-step-header-text">
            <div className="wf-step-header-title">{STEPS[activeStep].title}</div>
            <div className="wf-step-header-desc">Étape {activeStep + 1} sur {STEPS.length}</div>
          </div>
        </div>

        <div className="creation-step-content">
          {renderStepContent(activeStep)}
        </div>

        <div className="creation-nav-footer">
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
            size="large"
            icon={<ArrowLeftOutlined />}
            className="creation-btn-back"
          >
            Retour
          </Button>
          <span className="creation-step-counter" aria-live="polite">
            {activeStep + 1} / {STEPS.length}
          </span>
          {activeStep === STEPS.length - 1 ? (
            <Button
              type="primary"
              size="large"
              onClick={handleSubmit}
              icon={<SaveOutlined />}
              className="creation-btn-submit"
            >
              Finaliser &amp; Créer
            </Button>
          ) : (
            <Button
              type="primary"
              size="large"
              onClick={handleNext}
              icon={<ArrowRightOutlined />}
              iconPosition="end"
              className="creation-btn-next"
            >
              Suivant
            </Button>
          )}
        </div>
      </Card>

      {showUpload && <DocumentUploadForm formationId={newFormationId} onClose={() => setShowUpload(false)} />}
    </div>
  );
}








