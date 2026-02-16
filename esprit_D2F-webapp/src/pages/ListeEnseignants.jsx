import { useState, useEffect } from "react";
import EnseignantService from "../services/EnseignantService";

function ListeEnseignants() {
  const [enseignants, setEnseignants] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadEnseignants();
  }, []);

  const loadEnseignants = async () => {
    try {
      const data = await EnseignantService.getAllEnseignants();
      setEnseignants(data);
    } catch (error) {
      console.error("Erreur lors de la récupération des enseignants :", error);
    }
  };

  return (
    <div>
      <input
        type="text"
        className="form-control"
        placeholder="Rechercher un enseignant..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <ul>
        {enseignants
          .filter((ens) => ens.nom.toLowerCase().includes(search.toLowerCase()))
          .map((ens) => (
            <li key={ens.id}>{ens.nom} {ens.prenom}</li>
          ))}
      </ul>
    </div>
  );
}

export default ListeEnseignants;
