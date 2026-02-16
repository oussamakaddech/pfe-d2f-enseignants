import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import moment from "moment";
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
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import * as XLSX from "xlsx";

import FormationWorkflowService from "../services/FormationWorkflowService";
import UpService from "../services/upService";
import DeptService from "../services/DeptService";
import EnseignantService from "../services/EnseignantService";
import CompetenceService from "../services/CompetenceService"; // ← Ajout de l’import
import DocumentUploadForm from "./documentFormation/DocumentUploadForm";
import { RadioGroup, FormControlLabel, Radio } from "@mui/material";

export default function FormationWorkflowForm({ initialDate, onFormationCreated }) {
  // États principaux
  const [titre, setTitre] = useState("");
  const [dateDebut, setDateDebut] = useState(
    initialDate ? moment(initialDate).format("YYYY-MM-DD") : ""
  );
  const [dateFin, setDateFin] = useState(
    initialDate ? moment(initialDate).format("YYYY-MM-DD") : ""
  );
  const [typeFormation, setTypeFormation] = useState("INTERNE");
  const [etatFormation, setEtatFormation] = useState("ENREGISTRE");
  const [cout, setCout] = useState(0);
  const [organisme, setOrganisme] = useState("");
  const [chargeH, setChargeH] = useState(40);

  // Formateur externe
  const [formNom, setFormNom] = useState("");
  const [formPrenom, setFormPrenom] = useState("");
  const [formEmail, setFormEmail] = useState("");

  // UP & Dept
  const [ups, setUps] = useState([]);
  const [depts, setDepts] = useState([]);
  const [selectedUp, setSelectedUp] = useState(null);
  const [selectedDept, setSelectedDept] = useState(null);

  // Enseignants + filtre animateurs
  const [enseignants, setEnseignants] = useState([]);
  const [animFilterUp, setAnimFilterUp] = useState(null);
  const [animFilterDept, setAnimFilterDept] = useState(null);

  const optionsAnim = enseignants.filter(
    (x) =>
      (!animFilterUp || x.upLibelle === animFilterUp.libelle) &&
      (!animFilterDept || x.deptLibelle === animFilterDept.libelle)
  );

  const [partFilterUp, setPartFilterUp] = useState(null);
  const [partFilterDept, setPartFilterDept] = useState(null);

  const optionsPart = enseignants.filter(
    (x) =>
      (!partFilterUp || x.upLibelle === partFilterUp.libelle) &&
      (!partFilterDept || x.deptLibelle === partFilterDept.libelle)
  );

  // Participants
  const [partSel, setPartSel] = useState([]);

  // Champs “plus d’infos”
  const [domaine, setDomaine] = useState("");
  const [populationCible, setPopulationCible] = useState("");
  const [objectifs, setObjectifs] = useState("");
  const [objectifsPedago, setObjectifsPedago] = useState("");
  const [evalMethods, setEvalMethods] = useState("");
  const [prerequis, setPrerequis] = useState("");
  const [acquis, setAcquis] = useState("");
  const [indicateurs, setIndicateurs] = useState("");

  // Coûts hors collapse pour EXTERNE
  const [coutTransport, setCoutTransport] = useState(0);
  const [coutHebergement, setCoutHebergement] = useState(0);
  const [coutRepas, setCoutRepas] = useState(0);

  // COMPÉTENCES
  const [competences, setCompetences] = useState([]);
  const [selectedCompetence, setSelectedCompetence] = useState(null);

  // Séances (expanded: false par défaut pour cacher les champs optionnels)
  const [seances, setSeances] = useState([
    {
      id: Date.now(),
      dateSeance: dateDebut || moment().format("YYYY-MM-DD"),
      heureDebut: "08:00:00",
      heureFin: "10:00:00",
      salle: "",
      animateurs: [],
      typeSeance: "THEORIQUE",
      contenus: "",
      methodes: "",
      dureeTheorique: 0,
      dureePratique: 0,
      expanded: false,
    },
  ]);
  const [ouverte, setOuverte] = useState(false);

  // UI
  const [snack, setSnack] = useState({ open: false, severity: "info", message: "" });
  const [showUpload, setShowUpload] = useState(false);
  const [newFormationId, setNewFormationId] = useState(null);
  const [showMore, setShowMore] = useState(false);

  // Chargement UP/Dept/Enseignants/Compétences
  useEffect(() => {
    (async () => {
      try {
        const [u, d, e, c] = await Promise.all([
          UpService.getAllUps(),
          DeptService.getAllDepts(),
          EnseignantService.getAllEnseignants(),
          CompetenceService.getAllCompetences(), // ← Récupération des compétences
        ]);
        setUps(u);
        setDepts(d);
        setEnseignants(e);
        setCompetences(c);
      } catch {
        setSnack({ open: true, severity: "error", message: "Échec chargement externes" });
      }
    })();
  }, [initialDate]);

  // Séance handlers
  const addSeance = () =>
    setSeances((s) => [
      ...s,
      {
        id: Date.now(),
        dateSeance: dateDebut || moment().format("YYYY-MM-DD"),
        heureDebut: "08:00:00",
        heureFin: "10:00:00",
        salle: "",
        animateurs: [],
        typeSeance: "THEORIQUE",
        contenus: "",
        methodes: "",
        dureeTheorique: 0,
        dureePratique: 0,
        expanded: false,
      },
    ]);

  const updateSeance = (i, f, v) =>
    setSeances((s) => {
      const a = [...s];
      a[i] = { ...a[i], [f]: v };
      return a;
    });

  const removeSeance = (i) => setSeances((s) => s.filter((_, idx) => idx !== i));

  const toggleSeance = (i) =>
    setSeances((s) =>
      s.map((seance, index) =>
        index === i ? { ...seance, expanded: !seance.expanded } : seance
      )
    );

  // Import Excel participants
  const handleParticipantsFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
      if (rows.length < 2)
        return setSnack({
          open: true,
          severity: "warning",
          message: "Excel vide ou mal formaté",
        });
      const hdr = rows[0].map((h) => String(h).toLowerCase().trim());
      const idx = hdr.findIndex((h) => h === "email" || h === "mail");
      if (idx < 0)
        return setSnack({
          open: true,
          severity: "warning",
          message: "Colonne Email introuvable",
        });
      const mails = rows.slice(1).map((r) => r[idx]).filter(Boolean);
      const matched = enseignants.filter((x) => mails.includes(x.mail));
      setPartSel(matched);
      setSnack({
        open: true,
        severity: "success",
        message: `${matched.length} participants importés`,
      });
    };
    reader.readAsBinaryString(file);
  };


  const handleTypeFormationChange = (newType) => {
    setTypeFormation(newType);
    if (newType === "EXTERNE") {
      const clearedSeances = seances.map((s) => ({ ...s, animateurs: [] }));
      setSeances(clearedSeances);
    }
  };

  // Soumission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (seances.length === 0) {
      setSnack({
        open: true,
        severity: "warning",
        message: "Veuillez ajouter au moins une séance.",
      });
      return;
    }
    try {
      const payload = {
        titreFormation: titre,
        dateDebut,
        dateFin,
        typeFormation,
        etatFormation,
        ouverte,
        coutFormation: parseFloat(cout),
        externeFormateurNom: formNom,
        externeFormateurPrenom: formPrenom,
        externeFormateurEmail: formEmail,
        organismeRefExterne: organisme,
        chargeHoraireGlobal: parseInt(chargeH, 10),
        upId: selectedUp?.id,
        departementId: selectedDept?.id,
        participantsIds: partSel.map((p) => p.id),
        domaine,
        populationCible,
        objectifs,
        objectifsPedago,
        evalMethods,
        prerequis,
        acquis,
        indicateurs,
        coutTransport,
        coutHebergement,
        coutRepas,
        competance: selectedCompetence?.nomCompetence || null, // ← Ajout du champ compétence
        seances: seances.map((s) => ({
          dateSeance: s.dateSeance,
          heureDebut: s.heureDebut,
          heureFin: s.heureFin,
          salle: s.salle,
          animateursIds: s.animateurs.map((a) => a.id),
          typeSeance: s.typeSeance,
          contenus: s.contenus,
          methodes: s.methodes,
          dureeTheorique: s.dureeTheorique,
          dureePratique: s.dureePratique,
        })),
      };

      const newF = await FormationWorkflowService.createFormationWorkflow(payload);
      setNewFormationId(newF.idFormation || newF.id);
      setShowUpload(true);
      onFormationCreated(newF);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message;
      setSnack({ open: true, severity: "error", message: msg });
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 900, margin: "0 auto" }}>
      <Typography variant="h5" gutterBottom>
        Créer une Formation (Workflow)
      </Typography>
      <Grid container spacing={2}>
        {/* Titre */}
        <Grid item xs={12}>
          <TextField
            label="Titre Formation"
            fullWidth
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            required
          />
        </Grid>

        {/* Dates */}
        <Grid item xs={6}>
          <TextField
            label="Date Début"
            type="date"
            InputLabelProps={{ shrink: true }}
            fullWidth
            value={dateDebut}
            onChange={(e) => setDateDebut(e.target.value)}
            required
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            label="Date Fin"
            type="date"
            InputLabelProps={{ shrink: true }}
            fullWidth
            value={dateFin}
            onChange={(e) => setDateFin(e.target.value)}
            required
          />
        </Grid>

        {/* Type / État */}
        <Grid item xs={6}>
          <TextField
            select
            label="Type Formation"
            SelectProps={{ native: true }}
            fullWidth
            value={typeFormation}
            onChange={(e) => handleTypeFormationChange(e.target.value)}
          >
            <option value="INTERNE">INTERNE</option>
            <option value="EXTERNE">EXTERNE</option>
            <option value="EN_LIGNE">EN_LIGNE</option>
          </TextField>
        </Grid>
        <Grid item xs={6}>
          <TextField
            select
            label="État Formation"
            SelectProps={{ native: true }}
            fullWidth
            value={etatFormation}
            onChange={(e) => setEtatFormation(e.target.value)}
          >
            <option value="ENREGISTRE">ENREGISTRE</option>
            <option value="PLANIFIE">PLANIFIE</option>
            <option value="EN_COURS">EN_COURS</option>
            <option value="ACHEVE">ACHEVE</option>
            <option value="ANNULE">ANNULE</option>
          </TextField>
        </Grid>

        {/* Formateur Externe + Coût + Organisme */}
        {typeFormation === "EXTERNE" && (
          <>
            <Grid item xs={4}>
              <TextField
                label="Nom Formateur Externe"
                fullWidth
                value={formNom}
                onChange={(e) => setFormNom(e.target.value)}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="Prénom Formateur Externe"
                fullWidth
                value={formPrenom}
                onChange={(e) => setFormPrenom(e.target.value)}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="Email Formateur Externe"
                type="email"
                fullWidth
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="Coût Formation"
                type="number"
                fullWidth
                value={cout}
                onChange={(e) => setCout(e.target.value)}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="Organisme Externe"
                fullWidth
                value={organisme}
                onChange={(e) => setOrganisme(e.target.value)}
              />
            </Grid>
            {/* Coûts transport / hébergement / repas */}
            <Grid item xs={4}>
              <TextField
                label="Coût Transport"
                type="number"
                fullWidth
                value={coutTransport}
                onChange={(e) => setCoutTransport(e.target.value)}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="Coût Hébergement"
                type="number"
                fullWidth
                value={coutHebergement}
                onChange={(e) => setCoutHebergement(e.target.value)}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="Coût Repas"
                type="number"
                fullWidth
                value={coutRepas}
                onChange={(e) => setCoutRepas(e.target.value)}
              />
            </Grid>
          </>
        )}

        {/* Ouverte ? */}
        <Grid item xs={6} sm={3}>
          <Typography>Formation ouverte ?</Typography>
          <RadioGroup
            row
            sx={{ flexDirection: "column" }}
            value={ouverte ? "oui" : "non"}
            onChange={(e) => setOuverte(e.target.value === "oui")}
          >
            <FormControlLabel value="oui" control={<Radio />} label="Oui" />
            <FormControlLabel value="non" control={<Radio />} label="Non" />
          </RadioGroup>
        </Grid>

        {/* Charge / UP / Dept */}
        <Grid item xs={6} sm={4}>
          <Autocomplete
            options={ups}
            getOptionLabel={(u) => u.libelle}
            value={selectedUp}
            onChange={(_, v) => setSelectedUp(v)}
            disabled={ouverte}
            renderInput={(params) => <TextField {...params} label="UP" required={!ouverte} />}
          />
        </Grid>
        <Grid item xs={6} sm={4}>
          <Autocomplete
            options={depts}
            getOptionLabel={(d) => d.libelle}
            value={selectedDept}
            onChange={(_, v) => setSelectedDept(v)}
            disabled={ouverte}
            renderInput={(params) => (
              <TextField {...params} label="Département" required={!ouverte} />
            )}
          />
        </Grid>
        <Grid item xs={4}>
          <TextField
            label="Charge Horaire"
            type="number"
            fullWidth
            value={chargeH}
            onChange={(e) => setChargeH(e.target.value)}
          />
        </Grid>

        {/* Sélecteur de compétence (nouveau) */}
        <Grid item xs={12} sm={6}>
          <Autocomplete
            options={competences}
            getOptionLabel={(c) => c.nomCompetence}                              
            
            isOptionEqualToValue={(opt, val) => opt.idCompetence === val?.idCompetence}
            value={selectedCompetence}
            onChange={(_, v) => setSelectedCompetence(v)}
            renderInput={(params) => (
              <TextField {...params} label="Compétence" placeholder="Choisir une compétence" />
            )}
          />
        </Grid>

        {/* Plus d’infos global */}
        <Grid item xs={12}>
          <Button
            startIcon={showMore ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            onClick={() => setShowMore((m) => !m)}
          >
            {showMore ? "Moins d’infos" : "Plus d’infos"}
          </Button>
          <Collapse in={showMore}>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {[
                ["Domaine", domaine, setDomaine],
                ["Pop. Cible", populationCible, setPopulationCible],
                ["Objectifs", objectifs, setObjectifs],
                ["Obj. Pédago", objectifsPedago, setObjectifsPedago],
                ["Eval Methods", evalMethods, setEvalMethods],
                ["Prérequis", prerequis, setPrerequis],
                ["Acquis", acquis, setAcquis],
                ["Indicateurs", indicateurs, setIndicateurs],
              ].map(([lbl, val, setVal]) => (
                <Grid item xs={12} sm={6} key={lbl}>
                  <TextField
                    label={lbl}
                    fullWidth
                    value={val}
                    onChange={(e) => setVal(e.target.value)}
                  />
                </Grid>
              ))}
            </Grid>
          </Collapse>
        </Grid>

        {/* Séances */}
        {seances.map((s, i) => (
          <Grid item xs={12} key={s.id}>
            <Box
              sx={{
                mb: 2,
                p: 2,
                border: "1px solid #ff0000",
                borderRadius: 1,
                position: "relative",
              }}
            >
              <IconButton
                size="small"
                onClick={() => removeSeance(i)}
                sx={{ position: "absolute", top: 4, right: 4 }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
              <Box display="flex" alignItems="center" mb={1}>
                <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                  Séance #{i + 1}
                </Typography>
                <IconButton size="small" onClick={() => toggleSeance(i)}>
                  {s.expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={3}>
                  <TextField
                    label="Date"
                    type="date"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={s.dateSeance}
                    onChange={(e) => updateSeance(i, "dateSeance", e.target.value)}
                  />
                </Grid>
                <Grid item xs={3}>
                  <TextField
                    label="Heure Début"
                    type="time"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={s.heureDebut}
                    onChange={(e) => updateSeance(i, "heureDebut", e.target.value)}
                  />
                </Grid>
                <Grid item xs={3}>
                  <TextField
                    label="Heure Fin"
                    type="time"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={s.heureFin}
                    onChange={(e) => updateSeance(i, "heureFin", e.target.value)}
                  />
                </Grid>
                <Grid item xs={3}>
                  <TextField
                    label="Salle"
                    fullWidth
                    value={s.salle}
                    onChange={(e) => updateSeance(i, "salle", e.target.value)}
                  />
                </Grid>

                {/* Animateurs */}
                <Grid item xs={12} sx={{ mt: 3 }}>
                  <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                    🧑🏻‍🏫 Animateurs
                  </Typography>
                  <Grid container spacing={2} sx={{ mb: 1 }}>
                    <Grid item xs={6}>
                      <Autocomplete
                        options={ups}
                        getOptionLabel={(u) => u.libelle}
                        value={animFilterUp}
                        isOptionEqualToValue={(o, v) => o.id === v?.id}
                        onChange={(_, v) => setAnimFilterUp(v)}
                        renderInput={(params) => (
                          <TextField {...params} label="Filtrer UP" placeholder="Toutes" />
                        )}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <Autocomplete
                        options={depts}
                        getOptionLabel={(d) => d.libelle}
                        value={animFilterDept}
                        isOptionEqualToValue={(o, v) => o.id === v?.id}
                        onChange={(_, v) => setAnimFilterDept(v)}
                        renderInput={(params) => (
                          <TextField {...params} label="Filtrer Département" placeholder="Tous" />
                        )}
                      />
                    </Grid>
                  </Grid>
                  <Autocomplete
                    multiple
                    disabled={typeFormation === "EXTERNE"}
                    options={optionsAnim}
                    getOptionLabel={(opt) => `${opt.nom} ${opt.prenom} (${opt.mail})`}
                    value={s.animateurs}
                    onChange={(_, v) => updateSeance(i, "animateurs", v)}
                    renderInput={(params) => (
                      <TextField {...params} label="Sélectionner Animateurs" />
                    )}
                  />
                </Grid>
              </Grid>

              <Collapse in={s.expanded}>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={3}>
                    <TextField
                      select
                      label="Type"
                      fullWidth
                      SelectProps={{ native: true }}
                      value={s.typeSeance}
                      onChange={(e) => updateSeance(i, "typeSeance", e.target.value)}
                    >
                      <option value="THEORIQUE">THEORIQUE</option>
                      <option value="PRATIQUE">PRATIQUE</option>
                    </TextField>
                  </Grid>
                  <Grid item xs={3}>
                    <TextField
                      label="Durée théo (h)"
                      type="number"
                      fullWidth
                      value={s.dureeTheorique}
                      onChange={(e) => updateSeance(i, "dureeTheorique", e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <TextField
                      label="Durée prat (h)"
                      type="number"
                      fullWidth
                      value={s.dureePratique}
                      onChange={(e) => updateSeance(i, "dureePratique", e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <TextField
                      label="Contenus"
                      fullWidth
                      value={s.contenus}
                      onChange={(e) => updateSeance(i, "contenus", e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Méthodes"
                      fullWidth
                      value={s.methodes}
                      onChange={(e) => updateSeance(i, "methodes", e.target.value)}
                    />
                  </Grid>
                </Grid>
              </Collapse>
            </Box>
          </Grid>
        ))}

        {/* Ajouter séance */}
        <Grid item xs={12}>
          <Button variant="outlined" color="error" onClick={addSeance}>
            + Ajouter Séance
          </Button>
        </Grid>

        {/* Import Excel Participants */}
        <Grid item xs={12}>
          <input
            accept=".xls,.xlsx"
            style={{ display: "none" }}
            id="upload-participants"
            type="file"
            onChange={handleParticipantsFile}
          />
          <label htmlFor="upload-participants">
            <Button component="span" startIcon={<UploadFileIcon />} color="error" variant="contained">
              Importer Participants (Excel)
            </Button>
          </label>
        </Grid>

        {/* Participants */}
        <Grid item xs={12} sx={{ mt: 3 }}>
          <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
            🧑🏻‍💻 Participants
          </Typography>
          <Grid container spacing={2} sx={{ mb: 1 }}>
            <Grid item xs={6}>
              <Autocomplete
                options={ups}
                getOptionLabel={(u) => u.libelle}
                value={partFilterUp}
                isOptionEqualToValue={(o, v) => o.id === v?.id}
                onChange={(_, v) => setPartFilterUp(v)}
                renderInput={(params) => <TextField {...params} label="Filtrer UP" placeholder="Toutes" />}
              />
            </Grid>
            <Grid item xs={6}>
              <Autocomplete
                options={depts}
                getOptionLabel={(d) => d.libelle}
                value={partFilterDept}
                isOptionEqualToValue={(o, v) => o.id === v?.id}
                onChange={(_, v) => setPartFilterDept(v)}
                renderInput={(params) => <TextField {...params} label="Filtrer Département" placeholder="Tous" />}
              />
            </Grid>
          </Grid>
          <Autocomplete
            multiple
            options={optionsPart}
            getOptionLabel={(opt) => `${opt.nom} ${opt.prenom} (${opt.mail})`}
            value={partSel}
            onChange={(_, v) => setPartSel(v)}
            renderInput={(params) => <TextField {...params} label="Sélectionner Participants" />}
          />
        </Grid>

        {/* Submit */}
        <Grid item xs={12} sx={{ textAlign: "right" }}>
          <Button type="submit" variant="contained" color="error">
            ✔️ Créer Formation
          </Button>
        </Grid>
      </Grid>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={snack.severity}
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
        >
          {snack.message}
        </Alert>
      </Snackbar>

      {showUpload && (
        <DocumentUploadForm formationId={newFormationId} onClose={() => setShowUpload(false)} />
      )}
    </form>
  );
}

FormationWorkflowForm.propTypes = {
  initialDate: PropTypes.instanceOf(Date),
  onFormationCreated: PropTypes.func.isRequired,
};
