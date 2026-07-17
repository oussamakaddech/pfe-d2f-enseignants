import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import FormationRecoList from "@/redesign/components/FormationRecoList";
import type { FormationReco } from "@/redesign/contract";

const recos: FormationReco[] = [
  { formationId: 101, title: "Python", recommendationCount: 31, avgScore: 4.4, successProb: 0.86 },
  { formationId: 102, title: "SQL", recommendationCount: 18, avgScore: 3.9, successProb: 0.4 },
];

describe("FormationRecoList", () => {
  it("affiche le skeleton en loading sans données", () => {
    const { container } = render(<FormationRecoList recos={[]} loading />);
    expect(container.querySelector(".rd-list-item")).toBeInTheDocument();
  });
  it("affiche un message vide sans recos", () => {
    render(<FormationRecoList recos={[]} loading={false} />);
    expect(screen.getByText("Aucune recommandation de formation")).toBeInTheDocument();
  });
  it("trie par recommendationCount décroissant", () => {
    render(<FormationRecoList recos={recos} loading={false} />);
    const titles = screen.getAllByText(/Python|SQL/);
    expect(titles[0].textContent).toBe("Python");
  });
  it("affiche le pourcentage de réussite et le score", () => {
    render(<FormationRecoList recos={recos} loading={false} />);
    expect(screen.getByText("86%")).toBeInTheDocument();
    expect(screen.getByText(/Score 4\.4/)).toBeInTheDocument();
  });
});
