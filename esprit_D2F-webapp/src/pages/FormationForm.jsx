import  { useState } from "react";
import PropTypes from "prop-types"; // ✅ Importer PropTypes
import FormationService from "../services/FormationService";

function FormationForm({ initialDate, onFormationCreated }) {
  const [titreFormation, setTitreFormation] = useState("");
  const [dateDebut, setDateDebut] = useState(
    initialDate ? initialDate.toISOString().split("T")[0] : ""
  );
  const [dateFin, setDateFin] = useState(
    initialDate ? initialDate.toISOString().split("T")[0] : ""
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formationData = {
        titreFormation,
        dateDebut,
        dateFin,
      };

      const newFormation = await FormationService.createFormation(formationData);
      onFormationCreated(newFormation);
    } catch (error) {
      console.error("Erreur lors de la création de la formation :", error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-3">
        <label>Titre :</label>
        <input
          type="text"
          className="form-control"
          value={titreFormation}
          onChange={(e) => setTitreFormation(e.target.value)}
          required
        />
      </div>

      <div className="mb-3">
        <label>Date début :</label>
        <input
          type="date"
          className="form-control"
          value={dateDebut}
          onChange={(e) => setDateDebut(e.target.value)}
          required
        />
      </div>

      <div className="mb-3">
        <label>Date fin :</label>
        <input
          type="date"
          className="form-control"
          value={dateFin}
          onChange={(e) => setDateFin(e.target.value)}
          required
        />
      </div>

      <button type="submit" className="btn btn-primary">Créer la formation</button>
    </form>
  );
}

// ✅ Ajouter la validation des props
FormationForm.propTypes = {
  initialDate: PropTypes.instanceOf(Date), // Objet Date
  onFormationCreated: PropTypes.func.isRequired, // Fonction obligatoire
};

export default FormationForm;
