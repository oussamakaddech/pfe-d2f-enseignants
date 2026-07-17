import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import FactorsExplanationPanel from "../components/FactorsExplanationPanel";
import type { RiskFactor } from "../types";

describe("FactorsExplanationPanel", () => {
  it("affiche un message quand aucun facteur", () => {
    render(<FactorsExplanationPanel facteurs={[]} />);
    expect(screen.getByText(/Aucun facteur disponible/i)).toBeInTheDocument();
  });

  it("affiche le nom et le poids de chaque facteur", () => {
    const facteurs: RiskFactor[] = [
      { nom: "Stagnation", valeur_brute: 1, poids: 0.4, contribution: 0.2, explication: "expl" },
    ];
    render(<FactorsExplanationPanel facteurs={facteurs} />);
    expect(screen.getByText("Stagnation")).toBeInTheDocument();
    expect(screen.getByText(/poids 40%/)).toBeInTheDocument();
  });
});
