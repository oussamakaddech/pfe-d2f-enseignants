import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AtRiskTeachersTable from "@/redesign/components/AtRiskTeachersTable";
import type { PriorityAction } from "@/models/analyse";

const teachers: PriorityAction[] = [
  {
    enseignant_id: "ENS-1", teacher_name: "Amel Benali", score_risque: 0.86, tendance: "REGRESSION",
    nb_gaps_critiques: 3, nb_alertes_ouvertes: 2,
    competence_prioritaire: { competence_id: 1, competence_nom: "Python" },
    action_recommandee: "Former Python", meilleure_formation: null, impact_estime_niveaux: null,
    historique: { score_precedent: 0.7, taux_completion: 50, nb_mois_stagnation: 6, tendance: null, analyse_le: null },
    derniere_formation: { formation_titre: "Intro Python", date: "2024-01-10", statut: "DONE" },
  },
  {
    enseignant_id: "ENS-2", teacher_name: "Karim Haddad", score_risque: 0.3, tendance: null,
    nb_gaps_critiques: 0, nb_alertes_ouvertes: 0,
    competence_prioritaire: null, action_recommandee: "—", meilleure_formation: null, impact_estime_niveaux: null,
  },
];

describe("AtRiskTeachersTable", () => {
  it("affiche le skeleton en loading sans données", () => {
    const { container } = render(<AtRiskTeachersTable teachers={[]} loading />);
    expect(container.querySelector(".rd-list-item")).toBeInTheDocument();
  });
  it("affiche un message vide sans enseignants", () => {
    render(<AtRiskTeachersTable teachers={[]} loading={false} />);
    expect(screen.getByText("Aucun enseignant à risque détecté")).toBeInTheDocument();
  });
  it("affiche les en-têtes et les lignes", () => {
    render(<AtRiskTeachersTable teachers={teachers} loading={false} />);
    expect(screen.getByText("Enseignant")).toBeInTheDocument();
    expect(screen.getByText("Amel Benali")).toBeInTheDocument();
    expect(screen.getByText("ENS-1")).toBeInTheDocument();
    expect(screen.getByText("Python")).toBeInTheDocument();
    expect(screen.getByText("Former Python")).toBeInTheDocument();
  });
  it("affiche le score et le niveau de risque", () => {
    const { container } = render(<AtRiskTeachersTable teachers={teachers} loading={false} />);
    expect(container.textContent).toContain("86 %");
    expect(container.textContent).toContain("Critique");
  });
  it("affiche les gaps critiques et alertes", () => {
    render(<AtRiskTeachersTable teachers={teachers} loading={false} />);
    expect(screen.getByText(/3 critiques/)).toBeInTheDocument();
    expect(screen.getByText(/2 alertes/)).toBeInTheDocument();
  });
  it("affiche l'historique et la dernière formation", () => {
    const { container } = render(<AtRiskTeachersTable teachers={teachers} loading={false} />);
    expect(container.textContent).toContain("70% → 86%");
    expect(container.textContent).toContain("Intro Python");
    expect(container.textContent).toMatch(/10 janv/);
  });
});
