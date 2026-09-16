import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PriorityAlerts from "@/redesign/components/charts/PriorityAlerts";
import type { AlertSummary } from "@/models/analyse";

const summary: AlertSummary = {
  total: 20,
  nouvelles: 5,
  critiques_ouvertes: 3,
  by_severite: [],
  by_type: [
    { key: "GAP_CRITIQUE", count: 8 },
    { key: "STAGNATION", count: 4 },
  ],
  top_competences: [{ competence_id: 1, competence_nom: "Python", count: 6 }],
  top_departements: [{ departement_id: "d1", departement_nom: "Info", count: 5 }],
  trend_30j: [],
} as AlertSummary;

describe("PriorityAlerts", () => {
  it("affiche le skeleton en loading sans données", () => {
    const { container } = render(<PriorityAlerts summary={null} loading />);
    expect(container.querySelector(".rd-skel-block")).toBeInTheDocument();
  });
  it("affiche un message vide sans summary", () => {
    render(<PriorityAlerts summary={null} loading={false} />);
    expect(screen.getByText("Aucune alerte")).toBeInTheDocument();
  });
  it("affiche un message vide si pas d'alertes ouvertes", () => {
    render(<PriorityAlerts summary={{ ...summary, by_type: [] } as AlertSummary} loading={false} />);
    expect(screen.getByText("Aucune alerte ouverte")).toBeInTheDocument();
  });
  it("affiche les totaux et les types triés", () => {
    render(<PriorityAlerts summary={summary} loading={false} />);
    expect(screen.getByText("20 alertes au total")).toBeInTheDocument();
    expect(screen.getByText("3 critiques ouvertes")).toBeInTheDocument();
    expect(screen.getByText("Écart critique")).toBeInTheDocument();
    expect(screen.getByText("Stagnation")).toBeInTheDocument();
    expect(screen.getByText("Python")).toBeInTheDocument();
    expect(screen.getByText("Info")).toBeInTheDocument();
  });
});
