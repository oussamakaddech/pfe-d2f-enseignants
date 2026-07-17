import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Heatmap from "@/redesign/components/charts/Heatmap";
import type { GapHeatmapCell } from "@/models/analyse";

function cell(departement: string, competence_id: number, competence_nom: string, avg_gap: number): GapHeatmapCell {
  return { departement, competence_id, competence_nom, avg_gap, enseignants_count: 5 } as GapHeatmapCell;
}

const cells = [
  cell("Info", 1, "Python", 2.1),
  cell("Info", 2, "SQL", 0.5),
  cell("Math", 1, "Python", 1.0),
];

describe("Heatmap", () => {
  it("affiche le skeleton en loading sans données", () => {
    const { container } = render(<Heatmap cells={[]} loading />);
    expect(container.querySelector(".rd-skel-block")).toBeInTheDocument();
  });
  it("affiche un message vide sans cellules", () => {
    render(<Heatmap cells={[]} loading={false} />);
    expect(screen.getByText("Aucun écart de compétence calculé")).toBeInTheDocument();
  });
  it("affiche les départements et compétences", () => {
    render(<Heatmap cells={cells} loading={false} />);
    expect(screen.getByText("Info")).toBeInTheDocument();
    expect(screen.getByText("Math")).toBeInTheDocument();
    expect(screen.getByText("Python")).toBeInTheDocument();
    expect(screen.getByText("SQL")).toBeInTheDocument();
  });
  it("déclenche onSelectDept au clic sur un département", () => {
    const onSelectDept = vi.fn();
    render(<Heatmap cells={cells} loading={false} onSelectDept={onSelectDept} />);
    fireEvent.click(screen.getByText("Info"));
    expect(onSelectDept).toHaveBeenCalledWith("Info");
  });
  it("dimme les autres départements quand highlightDept fourni", () => {
    render(<Heatmap cells={cells} loading={false} highlightDept="Math" onSelectDept={vi.fn()} />);
    expect(screen.getByText("Info").className).toContain("dim");
    expect(screen.getByText("Math").className).not.toContain("dim");
  });
});
