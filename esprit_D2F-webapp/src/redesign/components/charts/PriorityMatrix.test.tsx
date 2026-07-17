import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PriorityMatrix from "@/redesign/components/charts/PriorityMatrix";

describe("PriorityMatrix", () => {
  it("affiche un message vide sans items", () => {
    render(<PriorityMatrix items={[]} />);
    expect(screen.getByText("Aucun besoin à prioriser")).toBeInTheDocument();
  });
  it("affiche la légende des quadrants et le svg", () => {
    const { container } = render(<PriorityMatrix items={[{ id: 1, label: "Python", urgency: 4, impact: 4, count: 12 }]} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(screen.getByText("Action immédiate")).toBeInTheDocument();
    expect(screen.getByText("Planifier")).toBeInTheDocument();
    expect(screen.getByText("Surveiller")).toBeInTheDocument();
    expect(screen.getByText("Réalisable")).toBeInTheDocument();
  });
  it("affiche la valeur count dans la bulle", () => {
    render(<PriorityMatrix items={[{ id: 1, label: "Python", urgency: 4, impact: 4, count: 12 }]} />);
    expect(screen.getByText("12")).toBeInTheDocument();
  });
});
