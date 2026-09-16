import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ForecastChart from "@/redesign/components/charts/ForecastChart";
import type { ForecastView } from "@/redesign/contract";

const view: ForecastView = {
  kind: "demand",
  horizonMonths: 6,
  note: "note indicative",
  series: [
    { period: "Jan", value: 40, isProjection: false },
    { period: "Fév", value: 47, isProjection: false },
    { period: "Mar", value: 60, lower: 54, upper: 67, isProjection: true },
  ],
};

describe("ForecastChart", () => {
  it("affiche le skeleton en loading sans vue", () => {
    const { container } = render(<ForecastChart view={null} loading />);
    expect(container.querySelector(".rd-skel-block")).toBeInTheDocument();
  });
  it("affiche un message vide sans série", () => {
    render(<ForecastChart view={{ kind: "demand", horizonMonths: 6, series: [] } as ForecastView} loading={false} />);
    expect(screen.getByText("Aucune prévision disponible")).toBeInTheDocument();
  });
  it("affiche l'historique, la projection et la note", () => {
    const { container } = render(<ForecastChart view={view} loading={false} />);
    expect(container.querySelector("svg[aria-label='Prévision de la demande']")).toBeInTheDocument();
    expect(screen.getByText("Historique")).toBeInTheDocument();
    expect(screen.getByText(/Projection \(1 mois\)/)).toBeInTheDocument();
    expect(screen.getByText("note indicative")).toBeInTheDocument();
  });
  it("affiche le tooltip au survol", () => {
    const { container } = render(<ForecastChart view={view} loading={false} />);
    const svg = container.querySelector("svg")!;
    svg.getBoundingClientRect = () => ({ width: 600, height: 244, top: 0, left: 0, right: 600, bottom: 244, x: 0, y: 0, toJSON: () => {} }) as DOMRect;
    fireEvent.mouseMove(svg, { clientX: 600 });
    expect(container.textContent).toContain("Mar · projection");
  });
});
