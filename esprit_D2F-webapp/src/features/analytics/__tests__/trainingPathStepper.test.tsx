import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TrainingPathStepper from "../components/TrainingPathStepper";
import type { TrainingPath } from "../types";

const path: TrainingPath = {
  enseignant_id: "T1",
  competence_id: 1,
  competence_nom: "Python",
  niveau_depart: 2,
  niveau_vise: 4,
  nb_formations: 1,
  duree_totale_heures: 20,
  probabilite_reussite_globale: 0.8,
  statut: "OK",
  items: [
    {
      rang: 1,
      formation_id: 5,
      formation_titre: "Initiation Python",
      formation_type: "INTERNE",
      duree_heures: 20,
      est_obligatoire: true,
      prerequis_satisfaits: true,
      deja_suivie: false,
      niveau_avant: 2,
      niveau_apres: 4,
      probabilite_reussite: 0.8,
      justification: "Utile",
    },
  ],
};

describe("TrainingPathStepper", () => {
  it("affiche un message vide sans parcours", () => {
    render(<TrainingPathStepper path={undefined} />);
    expect(screen.getByText(/Aucun parcours défini/i)).toBeInTheDocument();
  });

  it("affiche les étapes du parcours", () => {
    render(<TrainingPathStepper path={path} />);
    expect(screen.getAllByText("Initiation Python").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/N2 → N4/).length).toBeGreaterThan(0);
  });
});
