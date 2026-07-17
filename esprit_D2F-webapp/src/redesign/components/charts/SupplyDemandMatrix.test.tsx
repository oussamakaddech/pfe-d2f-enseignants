import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SupplyDemandMatrix from "@/redesign/components/charts/SupplyDemandMatrix";
import type { SupplyDemandItem } from "@/redesign/contract";

const items: SupplyDemandItem[] = [
  { competenceId: 1, competenceName: "Python", domain: "Info", demandPct: 82, impactedTeachers: 31, criticalCount: 9, urgency: "CRITIQUE", suggestedTraining: "P", quadrant: "INVESTIR" },
  { competenceId: 2, competenceName: "SQL", domain: "Info", demandPct: 40, impactedTeachers: 10, criticalCount: 0, urgency: "FAIBLE", suggestedTraining: "S", quadrant: "SURVEILLER" },
];

describe("SupplyDemandMatrix", () => {
  it("affiche le skeleton en loading sans items", () => {
    const { container } = render(<SupplyDemandMatrix items={[]} loading />);
    expect(container.querySelector(".rd-skel-block")).toBeInTheDocument();
  });
  it("affiche un message vide sans items", () => {
    render(<SupplyDemandMatrix items={[]} loading={false} />);
    expect(screen.getByText("Aucune pression compétence détectée")).toBeInTheDocument();
  });
  it("affiche compétences, demande, urgence et action", () => {
    render(<SupplyDemandMatrix items={items} loading={false} />);
    expect(screen.getByText("Python")).toBeInTheDocument();
    expect(screen.getByText("82 %")).toBeInTheDocument();
    expect(screen.getByText("Critique")).toBeInTheDocument();
    expect(screen.getByText("Investir")).toBeInTheDocument();
    expect(screen.getByText("Surveiller")).toBeInTheDocument();
  });
});
