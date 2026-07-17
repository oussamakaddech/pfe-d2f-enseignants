import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TrendChart from "@/redesign/components/charts/TrendChart";
import type { RiskTrendPoint } from "@/redesign/contract";

const data: RiskTrendPoint[] = [
  { month: "Jan", critical: 3, elevated: 5, averageRiskPct: null },
  { month: "Fév", critical: 1, elevated: 2, averageRiskPct: null },
];

describe("TrendChart", () => {
  it("affiche le skeleton en loading sans données", () => {
    const { container } = render(<TrendChart data={[]} loading />);
    expect(container.querySelector(".rd-skel-block")).toBeInTheDocument();
  });
  it("affiche un message vide sans données", () => {
    render(<TrendChart data={[]} loading={false} />);
    expect(screen.getByText("Pas d'historique de risque")).toBeInTheDocument();
  });
  it("affiche le svg et la légende", () => {
    const { container } = render(<TrendChart data={data} loading={false} />);
    expect(container.querySelector("svg[aria-label='Tendance du risque']")).toBeInTheDocument();
    expect(screen.getByText("Critique")).toBeInTheDocument();
    expect(screen.getByText("Élevé")).toBeInTheDocument();
  });
  it("affiche le tooltip au survol", () => {
    const { container } = render(<TrendChart data={data} loading={false} />);
    const svg = container.querySelector("svg")!;
    svg.getBoundingClientRect = () => ({ width: 600, height: 244, top: 0, left: 0, right: 600, bottom: 244, x: 0, y: 0, toJSON: () => {} }) as DOMRect;
    fireEvent.mouseMove(svg, { clientX: 40 });
    expect(container.textContent).toContain("3");
  });
});
