import  { useState, useEffect } from "react";
import PropTypes from "prop-types";
import moment from "moment";
import { TextField, Button } from "@mui/material";
import FormationWorkflowService from "../services/FormationWorkflowService";

function FormationEditForm({ formation, onUpdate, onCancel }) {
  // Champs généraux de la formation
  const [titreFormation, setTitreFormation] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [typeFormation, setTypeFormation] = useState("");
  const [coutFormation, setCoutFormation] = useState(0);
  const [organismeRefExterne, setOrganismeRefExterne] = useState("");
  const [chargeHoraireGlobal, setChargeHoraireGlobal] = useState(0);

  // Pour les séances, on copie la liste existante
  const [seances, setSeances] = useState([]);

  // Lors du chargement du composant, pré-remplir les champs
  useEffect(() => {
    if (formation) {
      setTitreFormation(formation.titreFormation);
      setDateDebut(moment(formation.dateDebut).format("YYYY-MM-DD"));
      setDateFin(moment(formation.dateFin).format("YYYY-MM-DD"));
      setTypeFormation(formation.typeFormation);
      setCoutFormation(formation.coutFormation);
      setOrganismeRefExterne(formation.organismeRefExterne);
      setChargeHoraireGlobal(formation.chargeHoraireGlobal);
      // On suppose que formation.seances est déjà une liste
      setSeances(
        formation.seances.map((s) => ({
          idSeance: s.idSeance,
          dateSeance: moment(s.dateSeance).format("YYYY-MM-DD"),
          heureDebut: s.heureDebut, // Format HH:mm:ss
          heureFin: s.heureFin,
        }))
      );
    }
  }, [formation]);

  // Fonction de modification d'une séance dans la liste
  const handleSeanceChange = (index, field, value) => {
    const newSeances = [...seances];
    newSeances[index][field] = value;
    setSeances(newSeances);
  };

  // Ajouter une nouvelle séance (optionnel)
  const handleAddSeance = () => {
    setSeances([
      ...seances,
      {
        dateSeance: dateDebut,
        heureDebut: "08:00:00",
        heureFin: "10:00:00",
      },
    ]);
  };

  // Suppression d'une séance (optionnel)
  const handleDeleteSeance = (index) => {
    const newSeances = seances.filter((_, i) => i !== index);
    setSeances(newSeances);
  };

  // Envoi de la modification
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (seances.length === 0) {
      alert("Veuillez ajouter au moins une séance.");
      return;
    }
    const updatedFormation = {
      titreFormation,
      dateDebut,
      dateFin,
      typeFormation,
      coutFormation: parseFloat(coutFormation),
      organismeRefExterne,
      chargeHoraireGlobal: parseInt(chargeHoraireGlobal),
      // Ici, vous devez également gérer la mise à jour des animateurs/participants si besoin.
      // Pour cet exemple, nous nous concentrons sur les séances.
      seances,
    };
    try {
      const updated = await FormationWorkflowService.updateFormationWorkflow(
        formation.idFormation,
        updatedFormation
      );
      onUpdate(updated);
    } catch (error) {
      console.error("Erreur lors de la modification de la formation :", error);
      // Vous pouvez ajouter ici une gestion d'erreur via Snackbar ou autre.
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: "600px", margin: "0 auto" }}>
      <h3>Modifier la Formation</h3>
      <TextField
        label="Titre Formation"
        fullWidth
        margin="normal"
        value={titreFormation}
        onChange={(e) => setTitreFormation(e.target.value)}
        required
      />
      <TextField
        label="Date Début"
        type="date"
        fullWidth
        margin="normal"
        value={dateDebut}
        onChange={(e) => setDateDebut(e.target.value)}
        InputLabelProps={{ shrink: true }}
        required
      />
      <TextField
        label="Date Fin"
        type="date"
        fullWidth
        margin="normal"
        value={dateFin}
        onChange={(e) => setDateFin(e.target.value)}
        InputLabelProps={{ shrink: true }}
        required
      />
      <TextField
        label="Type Formation"
        fullWidth
        margin="normal"
        value={typeFormation}
        onChange={(e) => setTypeFormation(e.target.value)}
        required
      />
      <TextField
        label="Coût Formation"
        type="number"
        fullWidth
        margin="normal"
        value={coutFormation}
        onChange={(e) => setCoutFormation(e.target.value)}
      />
      <TextField
        label="Organisme Réf Externe"
        fullWidth
        margin="normal"
        value={organismeRefExterne}
        onChange={(e) => setOrganismeRefExterne(e.target.value)}
      />
      <TextField
        label="Charge Horaire Global"
        type="number"
        fullWidth
        margin="normal"
        value={chargeHoraireGlobal}
        onChange={(e) => setChargeHoraireGlobal(e.target.value)}
      />

      <h4>Les Séances</h4>
      {seances.map((s, index) => (
        <div key={index} style={{ border: "1px solid #ccc", padding: "1rem", marginBottom: "1rem" }}>
          <TextField
            label="Date de séance"
            type="date"
            fullWidth
            margin="normal"
            value={s.dateSeance}
            onChange={(e) => handleSeanceChange(index, "dateSeance", e.target.value)}
            InputLabelProps={{ shrink: true }}
            required
          />
          <TextField
            label="Heure début"
            type="time"
            fullWidth
            margin="normal"
            value={s.heureDebut}
            onChange={(e) => handleSeanceChange(index, "heureDebut", e.target.value)}
            required
          />
          <TextField
            label="Heure fin"
            type="time"
            fullWidth
            margin="normal"
            value={s.heureFin}
            onChange={(e) => handleSeanceChange(index, "heureFin", e.target.value)}
            required
          />
          <Button variant="outlined" color="secondary" onClick={() => handleDeleteSeance(index)}>
            Supprimer cette séance
          </Button>
        </div>
      ))}
      <Button variant="outlined" onClick={handleAddSeance} style={{ marginBottom: "1rem" }}>
        + Ajouter une séance
      </Button>
      <div style={{ display: "flex", gap: "1rem" }}>
        <Button variant="contained" color="primary" type="submit">
          Enregistrer les modifications
        </Button>
        <Button variant="outlined" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </form>
  );
}

FormationEditForm.propTypes = {
  formation: PropTypes.object.isRequired,
  onUpdate: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default FormationEditForm;
