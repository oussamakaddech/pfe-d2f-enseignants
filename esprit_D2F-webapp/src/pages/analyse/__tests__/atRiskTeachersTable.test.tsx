import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AtRiskTeachersTable from "@/components/analytics/AtRiskTeachersTable";
import type { AtRiskTeacher } from "@/models/analyse/analyticsFeature";

const teacher: AtRiskTeacher = {
  enseignant_id: "T1",
  nom: "Alice Dupont",
  departement: "DEPT_INFO",
  up: "UP_1",
  score_risque: 0.8,
  niveau_risque: "CRITIQUE",
  nb_gaps_critiques: 2,
  tendance: "DEGRADATION",
};

describe("AtRiskTeachersTable", () => {
  it("affiche un message vide sans enseignants", () => {
    render(<AtRiskTeachersTable teachers={[]} />);
    expect(screen.getByText(/Aucun enseignant à risque/i)).toBeInTheDocument();
  });

  it("affiche le nom et le département formaté", () => {
    render(<AtRiskTeachersTable teachers={[teacher]} />);
    expect(screen.getByText("Alice Dupont")).toBeInTheDocument();
    expect(screen.getByText("Informatique")).toBeInTheDocument();
    expect(screen.getByText("UP 1")).toBeInTheDocument();
  });
});
