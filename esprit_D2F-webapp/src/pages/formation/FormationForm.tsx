import { useState } from "react";
import { useCreateFormation } from "@/hooks/formation/useFormations";

interface FormationFormProps {
  initialDate?: Date;
  onFormationCreated: (data: unknown) => void;
}

function FormationForm({ initialDate, onFormationCreated }: FormationFormProps) {
  const [titreFormation, setTitreFormation] = useState("");
  const [dateDebut, setDateDebut] = useState(
    initialDate ? initialDate.toISOString().split("T")[0] : ""
  );
  const [dateFin, setDateFin] = useState(
    initialDate ? initialDate.toISOString().split("T")[0] : ""
  );

  const { mutateAsync: createFormation } = useCreateFormation();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const newFormation = await createFormation({ titreFormation, dateDebut, dateFin });
      onFormationCreated(newFormation);
    } catch {
      // silently handle
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



export default FormationForm;








