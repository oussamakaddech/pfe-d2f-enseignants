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
import DeptService from "../services/DeptService";
import EnseignantService from "../services/EnseignantService";
import { RadioGroup, FormControlLabel, Radio } from "@mui/material";
import UpService from "../services/upService";

export default function FormationWorkflowEditForm({ formation, onFormationUpdated }) {
  /* -------------------- états principaux -------------------- */
  const [titre, setTitre] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [typeFormation, setTypeFormation] = useState("INTERNE");
  const [etatFormation, setEtatFormation] = useState("ENREGISTRE");
  const [cout, setCout] = useState(0);
  const [organisme, setOrganisme] = useState("");
  const [chargeH, setChargeH] = useState(40);

  /* formateur externe */
  const [formNom, setFormNom] = useState("");
  const [formPrenom, setFormPrenom] = useState("");
  const [formEmail, setFormEmail] = useState("");

  /* UP & Département */
  const [ups, setUps] = useState([]);
  const [depts, setDepts] = useState([]);
  const [selectedUp, setSelectedUp] = useState(null);
  const [selectedDept, setSelectedDept] = useState(null);

  /* enseignants + filtres */
  const [ens, setEns] = useState([]);
  const [animSel, setAnimSel] = useState([]);
  const [partSel, setPartSel] = useState([]);
  const [animFilterUp, setAnimFilterUp] = useState(null);
  const [animFilterDept, setAnimFilterDept] = useState(null);
  const [partFilterUp, setPartFilterUp] = useState(null);
  const [partFilterDept, setPartFilterDept] = useState(null);

  /* “plus d’infos” */
  const [domaine, setDomaine] = useState("");
  const [populationCible, setPopulationCible] = useState("");
  const [objectifs, setObjectifs] = useState("");
  const [objectifsPedago, setObjectifsPedago] = useState("");
  const [evalMethods, setEvalMethods] = useState("");
  const [prerequis, setPrerequis] = useState("");
  const [acquis, setAcquis] = useState("");
  const [indicateurs, setIndicateurs] = useState("");

  /* frais annexes (EXTERNE) */
  const [coutTransport, setCoutTransport] = useState(0);
  const [coutHebergement, setCoutHebergement] = useState(0);
  const [coutRepas, setCoutRepas] = useState(0);

  /* séances */
  const [seances, setSeances] = useState([]);
  const [ouverte, setOuverte] = useState(false);

  /* UI */
  const [showMore, setShowMore] = useState(false);
  const [snack, setSnack] = useState({ open: false, severity: "info", message: "" });

  /* ---------- chargement de la formation à éditer ---------- */
  useEffect(() => {
    if (!formation) return;

    setTitre(formation.titreFormation);
    setDateDebut(moment(formation.dateDebut).format("YYYY-MM-DD"));
    setDateFin(moment(formation.dateFin).format("YYYY-MM-DD"));
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

    /* séances complètes (avec animateurs) */
    setSeances(
      (formation.seances || []).map((s) => ({
        idSeance: s.idSeance,
        dateSeance: moment(s.dateSeance).format("YYYY-MM-DD"),
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
      }))
    );

    /* sélection animateurs / participants global */
    const amap = {},
      pmap = {};
    (formation.seances || []).forEach((s) => {
      (s.animateurs || []).forEach((a) => (amap[a.id] = a));
      (s.participants || []).forEach((p) => (pmap[p.id] = p));
    });
    setAnimSel(Object.values(amap));
    setPartSel(Object.values(pmap));
  }, [formation]);

  /* ---------- chargement des listes de référence ---------- */
  useEffect(() => {
    (async () => {
      try {
        const [u, d, e] = await Promise.all([
          UpService.getAllUps(),
          DeptService.getAllDepts(),
          EnseignantService.getAllEnseignants(),
        ]);
        setUps(u);
        setDepts(d);
        setEns(e);
      } catch {
        setSnack({ open: true, severity: "error", message: "Échec du chargement des données externes" });
      }
    })();
  }, []);

  /* ---------- filtres animateurs / participants ---------- */
  const optionsAnim = ens.filter(
    (x) =>
      (!animFilterUp || x.upLibelle === animFilterUp.libelle) &&
      (!animFilterDept || x.deptLibelle === animFilterDept.libelle)
  );
  const optionsPart = ens.filter(
    (x) =>
      (!partFilterUp || x.upLibelle === partFilterUp.libelle) &&
      (!partFilterDept || x.deptLibelle === partFilterDept.libelle)
  );

  /* ---------- helpers séances ---------- */
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
      s.map((se, idx) => (idx === i ? { ...se, expanded: !se.expanded } : se))
    );

  /* ---------- import Excel participants ---------- */
  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
      if (rows.length < 2)
        return setSnack({ open: true, severity: "warning", message: "Excel vide ou mal formaté" });
      const hdr = rows[0].map((h) => String(h).toLowerCase().trim());
      const idx = hdr.findIndex((h) => h === "email" || h === "mail");
      if (idx < 0)
        return setSnack({ open: true, severity: "warning", message: "Colonne Email introuvable" });
      const mails = rows.slice(1).map((r) => r[idx]).filter(Boolean);
      const matched = ens.filter((x) => mails.includes(x.mail));
      setPartSel(matched);
      setSnack({ open: true, severity: "success", message: `${matched.length} participants importés` });
    };
    reader.readAsBinaryString(f);
  };

  /* ---------- soumission ---------- */
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
      upId: !ouverte ? selectedUp?.id : null,
      departementId: !ouverte ? selectedDept?.id : null,
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
      seances: seances.map((s) => ({
        idSeance: s.idSeance,
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
    try {
      const res = await FormationWorkflowService.updateFormationWorkflow(
        formation.idFormation,
        payload
      );
      setSnack({ open: true, severity: "success", message: "Formation mise à jour !" });
      onFormationUpdated(res);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message;
      setSnack({ open: true, severity: "error", message: msg });
    }
  };

  /* ======================= RENDER ======================= */
  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 900, margin: "0 auto" }}>
      <Typography variant="h5" gutterBottom>
        Modifier Formation (Workflow)
      </Typography>

      <Grid container spacing={2}>
        {/* ----------- infos de base ----------- */}
        <Grid item xs={12}>
          <TextField
            label="Titre Formation"
            fullWidth
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            required
          />
        </Grid>
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
        <Grid item xs={6}>
          <TextField
            select
            label="Type Formation"
            SelectProps={{ native: true }}
            fullWidth
            value={typeFormation}
            onChange={(e) => setTypeFormation(e.target.value)}
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
            <option value="VISIBLE">VISIBLE</option>
          </TextField>
        </Grid>

        {/* ----------- formateur externe + coûts ----------- */}
        {typeFormation === "EXTERNE" && (
          <>
            <Grid item xs={4}>
              <TextField
                label="Nom Formateur Ext."
                fullWidth
                value={formNom}
                onChange={(e) => setFormNom(e.target.value)}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="Prénom Formateur Ext."
                fullWidth
                value={formPrenom}
                onChange={(e) => setFormPrenom(e.target.value)}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="Email Formateur Ext."
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

        <Grid item xs={12} sm={3}>
          <Typography>Formation ouverte ?</Typography>
          <RadioGroup
            row
            value={ouverte ? "oui" : "non"}
            onChange={(e) => {
              const isOpen = e.target.value === "oui";
              setOuverte(isOpen);
              if (isOpen) {
                setSelectedUp(null);
                setSelectedDept(null);
              }
            }}
          >
            <FormControlLabel value="oui" control={<Radio />} label="Oui" />
            <FormControlLabel value="non" control={<Radio />} label="Non" />
          </RadioGroup>
        </Grid>

        {/* ----------- charge & rattachement ----------- */}
        <Grid item xs={4}>
          <Autocomplete
            options={ups}
            getOptionLabel={(u) => u.libelle}
            value={selectedUp}
            onChange={(_, v) => setSelectedUp(v)}
            disabled={ouverte}
            renderInput={(params) => <TextField {...params} label="UP" required />}
          />
        </Grid>
        <Grid item xs={4}>
          <Autocomplete
            options={depts}
            getOptionLabel={(d) => d.libelle}
            value={selectedDept}
            onChange={(_, v) => setSelectedDept(v)}
            disabled={ouverte}
            renderInput={(params) => <TextField {...params} label="Département" required />}
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

        {/* ----------- bouton collapse “plus d’infos” ----------- */}
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

        {/* ----------- séances complètes ----------- */}
        {seances.map((s, i) => (
          <Grid item xs={12} key={s.idSeance || s.id}>
            <Box
              sx={{
                mb: 2,
                p: 2,
                border: "1px solid #ddd",
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

              {/* ligne principale */}
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

                {/* animateurs séance */}
                <Grid item xs={12} sx={{ mt: 2 }}>
                  <Autocomplete
                    multiple
                    disabled={typeFormation === "EXTERNE"}
                    options={optionsAnim}
                    getOptionLabel={(o) => `${o.nom} ${o.prenom} (${o.mail})`}
                    isOptionEqualToValue={(o, v) => o.id === v?.id}
                    value={s.animateurs}
                    onChange={(_, v) => updateSeance(i, "animateurs", v)}
                    renderInput={(params) => <TextField {...params} label="Animateurs" />}
                  />
                </Grid>
              </Grid>

              {/* champs avancés séance */}
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
        <Grid item xs={12}>
          <Button variant="outlined" color="error" onClick={addSeance}>
            + Ajouter Séance
          </Button>
        </Grid>

        {/* ----------- import Excel participants ----------- */}
        <input
          accept=".xls,.xlsx"
          style={{ display: "none" }}
          id="upload-participants"
          type="file"
          onChange={handleFile}
        />
        <Grid item xs={12}>
          <label htmlFor="upload-participants">
            <Button component="span" startIcon={<UploadFileIcon />} color="error" variant="contained">
              Importer Participants (Excel)
            </Button>
          </label>
        </Grid>

        {/* ----------- participants filtrables ----------- */}
        <Grid item xs={12} sx={{ mt: 3 }}>
          <Typography variant="h6">Participants</Typography>
          <Grid container spacing={2} sx={{ mb: 1 }}>
            <Grid item xs={6}>
              <Autocomplete
                options={ups}
                getOptionLabel={(u) => u.libelle}
                value={partFilterUp}
                onChange={(_, v) => setPartFilterUp(v)}
                renderInput={(params) => <TextField {...params} label="Filtrer UP" placeholder="Toutes" />}
              />
            </Grid>
            <Grid item xs={6}>
              <Autocomplete
                options={depts}
                getOptionLabel={(d) => d.libelle}
                value={partFilterDept}
                onChange={(_, v) => setPartFilterDept(v)}
                renderInput={(params) => <TextField {...params} label="Filtrer Département" placeholder="Tous" />}
              />
            </Grid>
          </Grid>
          <Autocomplete
            multiple
            options={optionsPart}
            getOptionLabel={(o) => `${o.nom} ${o.prenom} (${o.mail})`}
            isOptionEqualToValue={(o, v) => o.id === v?.id}
            value={partSel}
            onChange={(_, v) => setPartSel(v)}
            renderInput={(params) => <TextField {...params} label="Sélectionner Participants" />}
          />
        </Grid>

        {/* ----------- submit ----------- */}
        <Grid item xs={12} sx={{ textAlign: "right", mt: 4 }}>
          <Button type="submit" variant="contained" color="error">
            ✔️ Mettre à jour
          </Button>
        </Grid>
      </Grid>

      {/* snackbar */}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
          {snack.message}
        </Alert>
      </Snackbar>
    </form>
  );
}

FormationWorkflowEditForm.propTypes = {
  formation: PropTypes.object.isRequired,
  onFormationUpdated: PropTypes.func.isRequired,
};