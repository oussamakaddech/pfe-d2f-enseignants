import { useState, useEffect, useContext } from "react";
import PropTypes from "prop-types";
import moment from "moment";
import { useNavigate } from "react-router-dom";
import {
  Grid,
  TextField,
  Autocomplete,
  Button,
  Snackbar,
  Alert,
  Typography,
  Box,
  IconButton,
  Collapse,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Divider,
  Switch,
  FormControlLabel,
  Paper,
  InputAdornment,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import GroupsIcon from "@mui/icons-material/Groups";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import SchoolIcon from "@mui/icons-material/School";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import LinkIcon from "@mui/icons-material/Link";
import * as XLSX from "xlsx";

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
  const [dateDebut, setDateDebut] = useState(initialDate ? moment(initialDate).format("YYYY-MM-DD") : "");
  const [dateFin, setDateFin] = useState(initialDate ? moment(initialDate).format("YYYY-MM-DD") : "");
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
      dateSeance: dateDebut || moment().format("YYYY-MM-DD"),
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

  const [snack, setSnack] = useState({ open: false, severity: "info", message: "" });
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
        
        if (Array.isArray(accountsData)) {
          const formateurs = accountsData
            .filter(a => {
              const r = (a.role || "").toUpperCase();
              return r === "FORMATEUR";
            })
            .map(a => {
              // Convert AuthUser to Enseignant-like object for the UI
              return {
                id: a.id,
                isAuthUser: true,
                userName: a.userName || a.username,
                nom: a.lastName || a.userName || a.username || "Formateur",
                prenom: a.firstName || "",
                mail: a.emailAddress || a.email || "",
                type: "V", // Default to vacataire to distinguish visually if needed
                etat: "A",
                cup: "N",
                chefDepartement: "N",
                upLibelle: "",
                deptLibelle: ""
              };
            });
          
          // Also include existing enseignants who are formateurs (just in case)
          const fIds = formateurs.map(f => f.userName);
          const existingFormateurs = e.filter(ex => {
             const prefix = ex.mail ? ex.mail.split('@')[0] : "";
             return fIds.includes(ex.id) || fIds.includes(ex.mail) || fIds.includes(prefix);
          });
          
          // Merge avoiding duplicates by username/mail
          const merged = [...formateurs];
          existingFormateurs.forEach(ex => {
             if (!merged.find(m => m.mail === ex.mail || m.userName === ex.id)) {
                 merged.push(ex);
             }
          });
          
          setFormateursList(merged.length > 0 ? merged : e); // Fallback to all enseignants if empty
        } else {
          setFormateursList(e);
        }
      } catch {
        setSnack({ open: true, severity: "error", message: "Échec chargement des données" });
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

  const handleSubmit = async () => {
    if (seances.length === 0) {
      setSnack({ open: true, severity: "warning", message: "Ajoutez au moins une séance." });
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

      if (blockingConflicts.length > 0) {
        setOverlapWarnings(blockingConflicts);
        setSnack({ open: true, severity: "error", message: "Conflits détectés: corrigez les dates/salles/personnes." });
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
        titreFormation: titre, dateDebut, dateFin, typeFormation, etatFormation, ouverte,
        coutFormation: parseFloat(cout), externeFormateurNom: formNom, externeFormateurPrenom: formPrenom, externeFormateurEmail: formEmail,
        organismeRefExterne: organisme, chargeHoraireGlobal: parseInt(chargeH, 10),
        upId: selectedUp?.id, departementId: selectedDept?.id,
        animateursIds: finalAnimIds, participantsIds: partSel.map(p => p.id),
        domaine, populationCible, objectifs, objectifsPedago, evalMethods,
        coutTransport, coutHebergement, coutRepas, periodCode, customPeriodLabel,
        seances: seances.map(s => ({
          dateSeance: s.dateSeance, heureDebut: s.heureDebut, heureFin: s.heureFin,
          salle: s.salle, onlineMeetingUrl: s.onlineMeetingUrl,
          typeSeance: s.typeSeance, contenus: s.contenus, methodes: s.methodes,
          dureeTheorique: s.dureeTheorique, dureePratique: s.dureePratique
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
      setSnack({ open: true, severity: "success", message: "Formation créée !" });
      onFormationCreated(newF);
      setTimeout(() => navigate("/home/ListeFormation"), 2000);
    } catch (err) {
      setSnack({ open: true, severity: "error", message: err.message });
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0: // Général
        return (
          <Grid container spacing={3}>
            {besoinInfo && (
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                  <Typography variant="subtitle2" fontWeight="bold">Contexte du Besoin :</Typography>
                  <Box sx={{ mt: 1, fontSize: "0.875rem" }}>
                    {besoinInfo.propositionAnimateur && <div>• <strong>Animateur proposé :</strong> {besoinInfo.propositionAnimateur}</div>}
                    {besoinInfo.horaireSouhaite && <div>• <strong>Horaire souhaité :</strong> {besoinInfo.horaireSouhaite}</div>}
                    {besoinInfo.periodeFormation && <div>• <strong>Période souhaitée :</strong> {besoinInfo.periodeFormation}</div>}
                    {besoinInfo.priorite && <div>• <strong>Priorité :</strong> {besoinInfo.priorite}</div>}
                    {besoinInfo.autresInformations && <div>• <strong>Notes :</strong> {besoinInfo.autresInformations}</div>}
                  </Box>
                </Alert>
              </Grid>
            )}
            <Grid item xs={12}>
              <TextField label="Titre de la Formation" fullWidth value={titre} onChange={(e) => setTitre(e.target.value)} required variant="outlined" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Type" select fullWidth SelectProps={{ native: true }} value={typeFormation} onChange={(e) => setTypeFormation(e.target.value)}>
                <option value="INTERNE">INTERNE (Esprit)</option>
                <option value="EXTERNE">EXTERNE (Prestataire)</option>
                <option value="EN_LIGNE">EN LIGNE (Teams)</option>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="État" select fullWidth SelectProps={{ native: true }} value={etatFormation} onChange={(e) => setEtatFormation(e.target.value)}>
                <option value="ENREGISTRE">ENREGISTRÉ</option>
                <option value="PLANIFIE">PLANIFIÉ</option>
                <option value="EN_COURS">EN COURS</option>
                <option value="ACHEVE">ACHEVÉ</option>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Date Début" type="date" fullWidth InputLabelProps={{ shrink: true }} value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Date Fin" type="date" fullWidth InputLabelProps={{ shrink: true }} value={dateFin} onChange={(e) => setDateFin(e.target.value)} required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete options={ups} getOptionLabel={(u) => u.libelle} value={selectedUp} onChange={(_, v) => setSelectedUp(v)} renderInput={(params) => <TextField {...params} label="UP" required />} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete options={depts} getOptionLabel={(d) => d.libelle} value={selectedDept} onChange={(_, v) => setSelectedDept(v)} renderInput={(params) => <TextField {...params} label="Département" required />} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Charge Horaire (h)" type="number" fullWidth value={chargeH} onChange={(e) => setChargeH(e.target.value)} />
            </Grid>
            <Grid item xs={6}>
              <FormControlLabel control={<Switch checked={ouverte} onChange={(e) => setOuverte(e.target.checked)} color="error" />} label="Inscriptions Ouvertes" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Période de Formation"
                select
                fullWidth
                SelectProps={{ native: true }}
                value={periodCode}
                onChange={(e) => setPeriodCode(e.target.value)}
              >
                {PERIOD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              {periodCode === "OTHER" && (
                <TextField
                  label="Précisez la période"
                  fullWidth
                  value={customPeriodLabel}
                  onChange={(e) => setCustomPeriodLabel(e.target.value)}
                  placeholder="Ex : Mai - Juin 2024"
                />
              )}
            </Grid>
          </Grid>
        );
      case 1: // Pédagogie
        return (
          <Grid container spacing={3}>
            {[
              { label: "Domaine", val: domaine, set: setDomaine },
              { label: "Population Cible", val: populationCible, set: setPopulationCible },
              { label: "Objectifs Généraux", val: objectifs, set: setObjectifs, multiline: true },
              { label: "Objectifs Pédagogiques", val: objectifsPedago, set: setObjectifsPedago, multiline: true },
              { label: "Méthodes d'Évaluation", val: evalMethods, set: setEvalMethods },
            ].map((f) => (
              <Grid item xs={12} sm={f.multiline ? 12 : 6} key={f.label}>
                <TextField label={f.label} fullWidth multiline={f.multiline} rows={f.multiline ? 3 : 1} value={f.val} onChange={(e) => f.set(e.target.value)} />
              </Grid>
            ))}
          </Grid>
        );
      case 2: // Planning & Acteurs
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
              <CalendarMonthIcon color="error" /> Séances de Formation
            </Typography>
            {seances.map((s, i) => (
              <Card key={s.id} sx={{ mb: 2, borderLeft: "5px solid #d32f2f", boxShadow: 3 }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle1" fontWeight="bold">Séance #{i + 1}</Typography>
                    <Box>
                      <IconButton onClick={() => toggleSeance(i)}>{s.expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}</IconButton>
                      <IconButton onClick={() => removeSeance(i)} color="error"><DeleteIcon /></IconButton>
                    </Box>
                  </Box>
                  <Collapse in={s.expanded}>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid item xs={12} sm={4}><TextField label="Date" type="date" fullWidth InputLabelProps={{ shrink: true }} value={s.dateSeance} onChange={(e) => updateSeance(i, "dateSeance", e.target.value)} /></Grid>
                      <Grid item xs={6} sm={4}><TextField label="Début" type="time" fullWidth InputLabelProps={{ shrink: true }} value={s.heureDebut} onChange={(e) => updateSeance(i, "heureDebut", e.target.value)} /></Grid>
                      <Grid item xs={6} sm={4}><TextField label="Fin" type="time" fullWidth InputLabelProps={{ shrink: true }} value={s.heureFin} onChange={(e) => updateSeance(i, "heureFin", e.target.value)} /></Grid>
                      <Grid item xs={12} sm={6}>
                        {typeFormation === "EN_LIGNE" ? (
                          <TextField
                            label="Lien Réunion (Teams)"
                            fullWidth
                            value={s.onlineMeetingUrl}
                            onChange={(e) => updateSeance(i, "onlineMeetingUrl", e.target.value)}
                            InputProps={{ startAdornment: <InputAdornment position="start"><LinkIcon color="primary" /></InputAdornment> }}
                            placeholder="https://teams.microsoft.com/..."
                          />
                        ) : (
                          <TextField label="Salle / Lieu" fullWidth value={s.salle} onChange={(e) => updateSeance(i, "salle", e.target.value)} />
                        )}
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField select label="Type Séance" fullWidth SelectProps={{ native: true }} value={s.typeSeance} onChange={(e) => updateSeance(i, "typeSeance", e.target.value)}>
                          <option value="THEORIQUE">THÉORIQUE</option>
                          <option value="PRATIQUE">PRATIQUE</option>
                        </TextField>
                      </Grid>
                    </Grid>
                  </Collapse>
                </CardContent>
              </Card>
            ))}
            <Button variant="outlined" onClick={addSeance} sx={{ mb: 4 }} color="error">+ Séance</Button>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
              <GroupsIcon color="error" /> Animateurs & Participants
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>🧑🏻‍🏫 Animateurs (Internes)</Typography>
                <Autocomplete multiple disabled={typeFormation === "EXTERNE"} options={optionsAnim} getOptionLabel={getAnimateurLabel} value={animSel} onChange={(_, v) => { setAnimSel(v); }} renderInput={(params) => <TextField {...params} label="Sélectionner Animateurs" />} />
              </Grid>
              {(isAdmin || typeFormation === "EXTERNE") && (
                <Grid item xs={12}>
                  <Box sx={{ p: 2, bgcolor: "#f5f5f5", borderRadius: 2, border: "1px dashed #ccc" }}>
                    <Typography variant="subtitle2" gutterBottom color="primary">🧑🏻‍💼 Animateur (Externe / Ajout Manuel) - Accès Admin</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={4}>
                        <TextField size="small" label="Nom" fullWidth value={formNom} onChange={(e) => setFormNom(e.target.value)} />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField size="small" label="Prénom" fullWidth value={formPrenom} onChange={(e) => setFormPrenom(e.target.value)} />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField size="small" label="Email" type="email" fullWidth value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
                      </Grid>
                    </Grid>
                  </Box>
                </Grid>
              )}
              <Grid item xs={12}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="subtitle2">🧑🏻‍💻 Participants</Typography>
                  <Button size="small" startIcon={<UploadFileIcon />} component="label" color="success">
                    Excel Import <input hidden accept=".xlsx,.xls" type="file" onChange={(e) => {
                      const file = e.target.files[0];
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const wb = XLSX.read(ev.target.result, { type: "binary" });
                        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
                        const mails = rows.map(r => r.Email || r.email || r.Mail).filter(Boolean);
                        setPartSel(enseignants.filter(ex => mails.includes(ex.mail)));
                      };
                      reader.readAsBinaryString(file);
                    }} />
                  </Button>
                </Box>
                <Autocomplete multiple options={optionsPart} getOptionLabel={getEnseignantLabel} value={partSel} onChange={(_, v) => { setPartSel(v); }} renderInput={(params) => <TextField {...params} label="Sélectionner Participants" />} />
              </Grid>
            </Grid>
            {overlapWarnings.length > 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                <strong>Chevauchements détectés:</strong>
                <ul style={{ margin: "8px 0 0 16px", padding: 0 }}>
                  {overlapWarnings.map((msg) => (
                    <li key={msg}>{msg}</li>
                  ))}
                </ul>
              </Alert>
            )}
          </Box>
        );
      case 3: // Compétences
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
              <SchoolIcon color="error" /> Cartographie des Compétences (RICE)
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, bgcolor: "#fafafa" }}>
              {selectedCompLinks.map((link, idx) => (
                <Grid container spacing={2} key={idx} sx={{ mb: 2, alignItems: "center" }}>
                  <Grid item xs={12} sm={3}>
                    <Autocomplete size="small" options={compDomaines} getOptionLabel={(d) => d.nom || ""} value={compDomaines.find(d => d.id === link.domaineId) || null}
                      onChange={(_, v) => { const u = [...selectedCompLinks]; u[idx] = { ...u[idx], domaineId: v?.id || null }; setSelectedCompLinks(u); }}
                      renderInput={(p) => <TextField {...p} label="Domaine" />} />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Autocomplete size="small" options={compCompetences.filter(c => !link.domaineId || c.domaineId === link.domaineId)} getOptionLabel={(c) => c.nom || ""} value={compCompetences.find(c => c.id === link.competenceId) || null}
                      onChange={(_, v) => handleCompetenceChange(idx, v)}
                      renderInput={(p) => <TextField {...p} label="Compétence" />} />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Autocomplete size="small" options={rowSavoirs[idx] || []} getOptionLabel={(s) => `${s.nom} (${s.type})`} value={(rowSavoirs[idx] || []).find(s => s.id === link.savoirId) || null}
                      onChange={(_, v) => { const u = [...selectedCompLinks]; u[idx] = { ...u[idx], savoirId: v?.id || null, savoirNom: v?.nom || "" }; setSelectedCompLinks(u); }}
                      renderInput={(p) => <TextField {...p} label="Savoir" />} />
                  </Grid>
                  <Grid item xs={4} sm={1}><IconButton onClick={() => setSelectedCompLinks(selectedCompLinks.filter((_, i) => i !== idx))} color="error"><DeleteIcon /></IconButton></Grid>
                </Grid>
              ))}
              <Button size="small" onClick={() => setSelectedCompLinks([...selectedCompLinks, { domaineId: null, competenceId: null, savoirId: null }])}>+ Ajouter Compétence</Button>
            </Paper>
          </Box>
        );
      case 4: // Coûts
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
              <MonetizationOnIcon color="error" /> Budget & Coûts
            </Typography>
            <Grid container spacing={3}>
              {typeFormation === "EXTERNE" && (
                <>
                  <Grid item xs={12} sm={6}><TextField label="Organisme Prestataire" fullWidth value={organisme} onChange={(e) => setOrganisme(e.target.value)} /></Grid>
                  <Grid item xs={12} sm={6}><TextField label="Frais de Formation" type="number" fullWidth value={cout} onChange={(e) => setCout(e.target.value)} InputProps={{ endAdornment: <InputAdornment position="end">DT</InputAdornment> }} /></Grid>
                  <Grid item xs={12} sm={4}><TextField label="Coût Transport" type="number" fullWidth value={coutTransport} onChange={(e) => setCoutTransport(e.target.value)} /></Grid>
                  <Grid item xs={12} sm={4}><TextField label="Coût Hébergement" type="number" fullWidth value={coutHebergement} onChange={(e) => setCoutHebergement(e.target.value)} /></Grid>
                  <Grid item xs={12} sm={4}><TextField label="Coût Repas" type="number" fullWidth value={coutRepas} onChange={(e) => setCoutRepas(e.target.value)} /></Grid>
                </>
              )}
              {typeFormation !== "EXTERNE" && (
                <Grid item xs={12}>
                  <Alert severity="info">Pour les formations internes ou en ligne, les coûts directs sont généralement nuls (charge horaire uniquement).</Alert>
                </Grid>
              )}
            </Grid>
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Box sx={{ width: "100%", py: 2 }}>
      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel StepIconProps={{ sx: { "&.Mui-active, &.Mui-completed": { color: "#d32f2f" } } }}>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Card sx={{ borderRadius: 3, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
        <CardContent sx={{ p: 4 }}>
          {renderStepContent(activeStep)}

          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 4 }}>
            <Button disabled={activeStep === 0} onClick={handleBack} variant="outlined" sx={{ borderRadius: 2 }}>Retour</Button>
            <Box>
              {activeStep === STEPS.length - 1 ? (
                <Button variant="contained" color="error" onClick={handleSubmit} sx={{ borderRadius: 2, px: 4, fontWeight: "bold" }}>
                  FINALISER & CRÉER
                </Button>
              ) : (
                <Button variant="contained" onClick={handleNext} sx={{ bgcolor: "#333", "&:hover": { bgcolor: "#000" }, borderRadius: 2, px: 4 }}>
                  Suivant
                </Button>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Snackbar open={snack.open} autoHideDuration={6000} onClose={() => setSnack({ ...snack, open: false })}>
        <Alert severity={snack.severity} variant="filled" sx={{ width: "100%" }}>{snack.message}</Alert>
      </Snackbar>

      {showUpload && <DocumentUploadForm formationId={newFormationId} onClose={() => setShowUpload(false)} />}
    </Box>
  );
}

FormationWorkflowForm.propTypes = {
  initialDate: PropTypes.instanceOf(Date),
  onFormationCreated: PropTypes.func.isRequired,
  besoinInfo: PropTypes.object,
};