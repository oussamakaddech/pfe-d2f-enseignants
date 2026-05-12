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
  Collapse,
  Steps,
  Card,
  Divider,
  Switch,
  Space,
  Tag,
  message,
  Popconfirm,
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
} from "@ant-design/icons";
import * as XLSX from "xlsx";

const { Text, Title } = Typography;
const { TextArea } = Input;

import FormationWorkflowService from "../services/FormationWorkflowService";
import UpService from "../services/upService";
import DeptService from "../services/DeptService";
import EnseignantService from "../services/EnseignantService";
import FormationCompetenceService from "../services/FormationCompetenceService";
import CompetenceService from "../services/CompetenceService";
import { AuthContext } from "../context/AuthContext";

import DocumentUploadForm from "./documentFormation/DocumentUploadForm";

const STEPS = ["Général", "Pédagogie", "Planning & Acteurs", "Compétences RICE", "Coûts"];

const PERIOD_OPTIONS = [
  { value: "P1", label: "Période 1" },
  { value: "P2", label: "Période 2" },
  { value: "P3", label: "Période 3" },
  { value: "P4", label: "Période 4" },
  { value: "SUMMER", label: "Session d'Été" },
  { value: "WINTER", label: "Session d'Hiver" },
  { value: "OTHER", label: "Autre" },
];

export default function FormationWorkflowForm({ initialDate, onFormationCreated, besoinInfo }) {
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const isAdmin = auth?.user?.role === "admin" || auth?.user?.role === "ADMIN";
  const [activeStep, setActiveStep] = useState(0);

  // States
  const [titre, setTitre] = useState(besoinInfo?.titre || besoinInfo?.objectifFormation || "");
  const [dateDebut, setDateDebut] = useState(initialDate ? format(new Date(initialDate), "yyyy-MM-dd") : "");
  const [dateFin, setDateFin] = useState(initialDate ? format(new Date(initialDate), "yyyy-MM-dd") : "");
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
    return `${opt.nom} ${opt.prenom} (${opt.mail})`;
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

  useEffect(() => {
    (async () => {
      try {
        const [u, d, e, formations, domainesData, competencesData, accountsData] = await Promise.all([
          UpService.getAllUps(),
          DeptService.getAllDepts(),
          EnseignantService.getAllEnseignants(),
          FormationWorkflowService.getAllFormationWorkflows(),
          CompetenceService.domaine.getAll(),
          CompetenceService.competence.getAll(),
          import("../services/accountService").then(m => m.default.getAllAccounts()).catch(() => []),
        ]);
        setUps(u);
        setDepts(d);
        setEnseignants(e);
        
        // Préréglage de l&apos;UP et du département à partir du besoin
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
        setCompDomaines(Array.isArray(domainesData) ? domainesData : []);
        setCompCompetences(Array.isArray(competencesData) ? competencesData : []);
        
        setFormateursList(mergeFormateursAccounts(accountsData, e));
      } catch {
        message.error("Échec chargement des données");
      }
    })();
  }, [initialDate]);

  const handleNext = () => setActiveStep((prev) => prev + 1);
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

  const mergeFormateursAccounts = (accountsData, enseignants) => {
    if (!Array.isArray(accountsData)) return enseignants;
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
    const fIds = formateurs.map(f => f.userName);
    const existingFormateurs = enseignants.filter(ex => {
      const prefix = ex.mail ? ex.mail.split('@')[0] : "";
      return fIds.includes(ex.id) || fIds.includes(ex.mail) || fIds.includes(prefix);
    });
    const merged = [...formateurs];
    existingFormateurs.forEach(ex => {
      if (!merged.find(m => m.mail === ex.mail || m.userName === ex.id)) {
        merged.push(ex);
      }
    });
    return merged.length > 0 ? merged : enseignants;
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
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target.result, { type: "binary" });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      const mails = rows.map(r => r.Email || r.email || r.Mail).filter(Boolean);
      setPartSel(enseignants.filter(ex => mails.includes(ex.mail)));
    };
    reader.readAsBinaryString(file);
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

  const getCompetenceOptions = (domaineId) =>
    compCompetences.filter(c => !domaineId || c.domaineId === domaineId).map(c => ({ value: c.id, label: c.nom }));

  const renderStepContent = (step) => {
    switch (step) {
      case 0: // Général
        return (
          <Row gutter={[24, 24]}>
            {besoinInfo && (
              <Col span={24}>
                <AntAlert type="info" showIcon style={{ marginBottom: 16, borderRadius: 8 }}>
                  <Text strong>Contexte du Besoin :</Text>
                  <div style={{ marginTop: 8, fontSize: "0.875rem" }}>
                    {besoinInfo.propositionAnimateur && <div>• <strong>Animateur proposé :</strong> {besoinInfo.propositionAnimateur}</div>}
                    {besoinInfo.horaireSouhaite && <div>• <strong>Horaire souhaité :</strong> {besoinInfo.horaireSouhaite}</div>}
                    {besoinInfo.periodeFormation && <div>• <strong>Période souhaitée :</strong> {besoinInfo.periodeFormation}</div>}
                    {besoinInfo.priorite && <div>• <strong>Priorité :</strong> {besoinInfo.priorite}</div>}
                    {besoinInfo.autresInformations && <div>• <strong>Notes :</strong> {besoinInfo.autresInformations}</div>}
                  </div>
                </AntAlert>
              </Col>
            )}
            <Col span={24}>
              <Text type="secondary">Titre de la Formation</Text>
              <Input value={titre} onChange={(e) => setTitre(e.target.value)} required />
            </Col>
            <Col xs={24} sm={12}>
              <Text type="secondary">Type</Text>
              <Select style={{ width: "100%" }} value={typeFormation} onChange={(val) => setTypeFormation(val)}>
                <Select.Option value="INTERNE">INTERNE (Esprit)</Select.Option>
                <Select.Option value="EXTERNE">EXTERNE (Prestataire)</Select.Option>
                <Select.Option value="EN_LIGNE">EN LIGNE (Teams)</Select.Option>
              </Select>
            </Col>
            <Col xs={24} sm={12}>
              <Text type="secondary">État</Text>
              <Select style={{ width: "100%" }} value={etatFormation} onChange={(val) => setEtatFormation(val)}>
                <Select.Option value="ENREGISTRE">ENREGISTRÉ</Select.Option>
                <Select.Option value="PLANIFIE">PLANIFIÉ</Select.Option>
                <Select.Option value="EN_COURS">EN COURS</Select.Option>
                <Select.Option value="ACHEVE">ACHEVÉ</Select.Option>
              </Select>
            </Col>
            <Col xs={24} sm={12}>
              <Text type="secondary">Date Début</Text>
              <Input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} required />
            </Col>
            <Col xs={24} sm={12}>
              <Text type="secondary">Date Fin</Text>
              <Input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} required />
            </Col>
            <Col xs={24} sm={12}>
              <Text type="secondary">UP</Text>
              <Select showSearch style={{ width: "100%" }} value={selectedUp?.id} onChange={(val) => setSelectedUp(ups.find(u => u.id === val) || null)} optionFilterProp="label" options={ups.map(u => ({ value: u.id, label: u.libelle }))} />
            </Col>
            <Col xs={24} sm={12}>
              <Text type="secondary">Département</Text>
              <Select showSearch style={{ width: "100%" }} value={selectedDept?.id} onChange={(val) => setSelectedDept(depts.find(d => d.id === val) || null)} optionFilterProp="label" options={depts.map(d => ({ value: d.id, label: d.libelle }))} />
            </Col>
            <Col span={12}>
              <Text type="secondary">Charge Horaire (h)</Text>
              <InputNumber style={{ width: "100%" }} value={chargeH} onChange={(val) => setChargeH(val)} />
            </Col>
            <Col span={12}>
              <Space><Switch checked={ouverte} onChange={(val) => setOuverte(val)} /> <Text>Inscriptions Ouvertes</Text></Space>
            </Col>
            <Col xs={24} sm={12}>
              <Text type="secondary">Période de Formation</Text>
              <Select style={{ width: "100%" }} value={periodCode} onChange={(val) => setPeriodCode(val)}>
                {PERIOD_OPTIONS.map((opt) => (
                  <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} sm={12}>
              {periodCode === "OTHER" && (
                <>
                  <Text type="secondary">Précisez la période</Text>
                  <Input value={customPeriodLabel} onChange={(e) => setCustomPeriodLabel(e.target.value)} placeholder="Ex : Mai - Juin 2024" />
                </>
              )}
            </Col>
          </Row>
        );
      case 1: // Pédagogie
        return (
          <Row gutter={[24, 24]}>
            {[
              { label: "Domaine", val: domaine, set: setDomaine },
              { label: "Population Cible", val: populationCible, set: setPopulationCible },
              { label: "Objectifs Généraux", val: objectifs, set: setObjectifs, multiline: true },
              { label: "Objectifs Pédagogiques", val: objectifsPedago, set: setObjectifsPedago, multiline: true },
              { label: "Méthodes d'Évaluation", val: evalMethods, set: setEvalMethods },
            ].map((f) => (
              <Col xs={24} sm={f.multiline ? 24 : 12} key={f.label}>
                <Text type="secondary">{f.label}</Text>
                {f.multiline ? (
                  <TextArea rows={3} value={f.val} onChange={(e) => f.set(e.target.value)} />
                ) : (
                  <Input value={f.val} onChange={(e) => f.set(e.target.value)} />
                )}
              </Col>
            ))}
          </Row>
        );
      case 2: // Planning & Acteurs
        return (
          <div>
            <Title level={5} style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <CalendarOutlined style={{ color: "#d32f2f" }} /> Séances de Formation
            </Title>
            {seances.map((s, i) => (
              <Card key={s.id} style={{ marginBottom: 16, borderLeft: "5px solid #d32f2f", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Text strong>Séance #{i + 1}</Text>
                  <Space>
                    <Button type="text" onClick={() => toggleSeance(i)}>{s.expanded ? <UpOutlined /> : <DownOutlined />}</Button>
                    <Button type="text" danger onClick={() => removeSeance(i)}><DeleteOutlined /></Button>
                  </Space>
                </div>
                {s.expanded && (
                  <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
                    <Col xs={24} sm={8}><Text type="secondary">Date</Text><Input type="date" value={s.dateSeance} onChange={(e) => updateSeance(i, "dateSeance", e.target.value)} /></Col>
                    <Col span={12} sm={8}><Text type="secondary">Début</Text><Input type="time" value={s.heureDebut} onChange={(e) => updateSeance(i, "heureDebut", e.target.value)} /></Col>
                    <Col span={12} sm={8}><Text type="secondary">Fin</Text><Input type="time" value={s.heureFin} onChange={(e) => updateSeance(i, "heureFin", e.target.value)} /></Col>
                    <Col xs={24} sm={12}>
                      {typeFormation === "EN_LIGNE" ? (
                        <>
                          <Text type="secondary">Lien Réunion (Teams)</Text>
                          <Input prefix={<LinkOutlined />} value={s.onlineMeetingUrl} onChange={(e) => updateSeance(i, "onlineMeetingUrl", e.target.value)} placeholder="https://teams.microsoft.com/..." />
                        </>
                      ) : (
                        <>
                          <Text type="secondary">Salle / Lieu</Text>
                          <Input value={s.salle} onChange={(e) => updateSeance(i, "salle", e.target.value)} />
                        </>
                      )}
                    </Col>
                    <Col xs={24} sm={12}>
                      <Text type="secondary">Type Séance</Text>
                      <Select style={{ width: "100%" }} value={s.typeSeance} onChange={(val) => updateSeance(i, "typeSeance", val)}>
                        <Select.Option value="THEORIQUE">THÉORIQUE</Select.Option>
                        <Select.Option value="PRATIQUE">PRATIQUE</Select.Option>
                      </Select>
                    </Col>
                  </Row>
                )}
              </Card>
            ))}
            <Button style={{ marginBottom: 32 }} danger onClick={addSeance}>+ Séance</Button>

            <Divider style={{ margin: "24px 0" }} />

            <Title level={5} style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <TeamOutlined style={{ color: "#d32f2f" }} /> Animateurs & Participants
            </Title>
            <Row gutter={[24, 24]}>
              <Col span={24}>
                <Text strong>🧑🏻‍🏫 Animateurs (Internes)</Text>
                <Select mode="multiple" disabled={typeFormation === "EXTERNE"} style={{ width: "100%" }} value={animSel.map(a => a.id)} onChange={(vals) => { setAnimSel(optionsAnim.filter(a => vals.includes(a.id))); }} optionFilterProp="label" options={optionsAnim.map(a => ({ value: a.id, label: getAnimateurLabel(a) }))} placeholder="Sélectionner Animateurs" />
              </Col>
              {(isAdmin || typeFormation === "EXTERNE") && (
                <Col span={24}>
                  <div style={{ padding: 16, background: "#f5f5f5", borderRadius: 8, border: "1px dashed #ccc" }}>
                    <Text strong style={{ color: "#1677ff" }}>🧑🏻‍💼 Animateur (Externe / Ajout Manuel) - Accès Admin</Text>
                    <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
                      <Col xs={24} sm={8}>
                        <Text type="secondary">Nom</Text>
                        <Input value={formNom} onChange={(e) => setFormNom(e.target.value)} />
                      </Col>
                      <Col xs={24} sm={8}>
                        <Text type="secondary">Prénom</Text>
                        <Input value={formPrenom} onChange={(e) => setFormPrenom(e.target.value)} />
                      </Col>
                      <Col xs={24} sm={8}>
                        <Text type="secondary">Email</Text>
                        <Input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
                      </Col>
                    </Row>
                  </div>
                </Col>
              )}
              <Col span={24}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <Text strong>🧑🏻‍💻 Participants</Text>
                  <Button size="small" icon={<UploadOutlined />} onClick={() => document.getElementById("excel-import").click()}>Excel Import</Button>
                  <input id="excel-import" hidden accept=".xlsx,.xls" type="file" onChange={handleExcelImportFile} />
                </div>
                <Select mode="multiple" style={{ width: "100%" }} value={partSel.map(p => p.id)} onChange={(vals) => { setPartSel(optionsPart.filter(p => vals.includes(p.id))); }} optionFilterProp="label" options={optionsPart.map(p => ({ value: p.id, label: getEnseignantLabel(p) }))} placeholder="Sélectionner Participants" />
              </Col>
            </Row>
            {overlapWarnings.length > 0 && (
              <AntAlert type="warning" showIcon style={{ marginTop: 16 }}>
                <strong>Chevauchements détectés:</strong>
                <ul style={{ margin: "8px 0 0 16px", padding: 0 }}>
                  {overlapWarnings.map((msg) => (
                    <li key={msg}>{msg}</li>
                  ))}
                </ul>
              </AntAlert>
            )}
          </div>
        );
      case 3: // Compétences
        return (
          <div>
            <Title level={5} style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <ReadOutlined style={{ color: "#d32f2f" }} /> Cartographie des Compétences (RICE)
            </Title>
            <Card style={{ padding: 16, background: "#fafafa" }}>
              {selectedCompLinks.map((link, idx) => (
                <Row gutter={[16, 16]} key={idx} style={{ marginBottom: 16, alignItems: "center" }}>
                  <Col xs={24} sm={6}>
                    <Text type="secondary">Domaine</Text>
                    <Select showSearch style={{ width: "100%" }} value={link.domaineId} onChange={(val) => { const u = [...selectedCompLinks]; u[idx] = { ...u[idx], domaineId: val }; setSelectedCompLinks(u); }}
                      options={compDomaines.map(d => ({ value: d.id, label: d.nom }))} placeholder="Domaine" />
                  </Col>
                  <Col xs={24} sm={6}>
                    <Text type="secondary">Compétence</Text>
                    <Select showSearch style={{ width: "100%" }} value={link.competenceId} onChange={(val) => handleCompetenceSelect(idx, val)}
                      options={getCompetenceOptions(link.domaineId)} placeholder="Compétence" />
                  </Col>
                  <Col xs={24} sm={6}>
                    <Text type="secondary">Savoir</Text>
                    <Select showSearch style={{ width: "100%" }} value={link.savoirId} onChange={(val) => handleSavoirSelect(idx, val)}
                      options={(rowSavoirs[idx] || []).map(s => ({ value: s.id, label: `${s.nom} (${s.type})` }))} placeholder="Savoir" />
                  </Col>
                  <Col span={4} sm={3}><Button type="text" danger onClick={() => handleRemoveCompetenceLink(idx)}><DeleteOutlined /></Button></Col>
                </Row>
              ))}
              <Button size="small" onClick={() => setSelectedCompLinks([...selectedCompLinks, { domaineId: null, competenceId: null, savoirId: null }])}>+ Ajouter Compétence</Button>
            </Card>
          </div>
        );
      case 4: // Coûts
        return (
          <div>
            <Title level={5} style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <DollarOutlined style={{ color: "#d32f2f" }} /> Budget & Coûts
            </Title>
            <Row gutter={[24, 24]}>
              {typeFormation === "EXTERNE" && (
                <>
                  <Col xs={24} sm={12}><Text type="secondary">Organisme Prestataire</Text><Input value={organisme} onChange={(e) => setOrganisme(e.target.value)} /></Col>
                  <Col xs={24} sm={12}><Text type="secondary">Frais de Formation</Text><InputNumber style={{ width: "100%" }} suffix="DT" value={cout} onChange={(val) => setCout(val)} /></Col>
                  <Col xs={24} sm={8}><Text type="secondary">Coût Transport</Text><InputNumber style={{ width: "100%" }} value={coutTransport} onChange={(val) => setCoutTransport(val)} /></Col>
                  <Col xs={24} sm={8}><Text type="secondary">Coût Hébergement</Text><InputNumber style={{ width: "100%" }} value={coutHebergement} onChange={(val) => setCoutHebergement(val)} /></Col>
                  <Col xs={24} sm={8}><Text type="secondary">Coût Repas</Text><InputNumber style={{ width: "100%" }} value={coutRepas} onChange={(val) => setCoutRepas(val)} /></Col>
                </>
              )}
              {typeFormation !== "EXTERNE" && (
                <Col span={24}>
                  <AntAlert type="info" showIcon>Pour les formations internes ou en ligne, les coûts directs sont généralement nuls (charge horaire uniquement).</AntAlert>
                </Col>
              )}
            </Row>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ width: "100%", padding: "16px 0" }}>
      <Steps current={activeStep} style={{ marginBottom: 32 }} items={STEPS.map((label) => ({ title: label }))} />

      <Card style={{ borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
        <div style={{ padding: 32 }}>
          {renderStepContent(activeStep)}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 32 }}>
            <Button disabled={activeStep === 0} onClick={handleBack}>Retour</Button>
            <Space>
              {activeStep === STEPS.length - 1 ? (
                <Button type="primary" danger size="large" onClick={handleSubmit}>
                  FINALISER & CRÉER
                </Button>
              ) : (
                <Button type="primary" size="large" onClick={handleNext} style={{ background: "#333" }}>
                  Suivant
                </Button>
              )}
            </Space>
          </div>
        </div>
      </Card>

      {showUpload && <DocumentUploadForm formationId={newFormationId} onClose={() => setShowUpload(false)} />}
    </div>
  );
}