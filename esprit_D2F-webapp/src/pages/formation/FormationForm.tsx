import { useState } from "react";
import { useCreateFormation } from "@/hooks/formation/useFormations";

interface FormationFormProps {
  initialDate?: Date;
  onFormationCreated: (data: unknown) => void;
}

function FormationForm({ initialDate, onFormationCreated }: Readonly<FormationFormProps>) {
  const [titreFormation, setTitreFormation] = useState("");
  const [dateDebut, setDateDebut] = useState(
    initialDate ? initialDate.toISOString().split("T")[0] : ""
  );
  const [dateFin, setDateFin] = useState(
    initialDate ? initialDate.toISOString().split("T")[0] : ""
  );

  const { mutateAsync: createFormation } = useCreateFormation();

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
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
        <label htmlFor="ff-titre">Titre :</label>
        <input
          id="ff-titre"
          type="text"
          className="form-control"
          value={titreFormation}
          onChange={(e) => setTitreFormation(e.target.value)}
          required
        />
      </div>

      <div className="mb-3">
        <label htmlFor="ff-date-debut">Date début :</label>
        <input
          id="ff-date-debut"
          type="date"
          className="form-control"
          value={dateDebut}
          onChange={(e) => setDateDebut(e.target.value)}
          required
        />
      </div>

      <div className="mb-3">
        <label htmlFor="ff-date-fin">Date fin :</label>
        <input
          id="ff-date-fin"
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








