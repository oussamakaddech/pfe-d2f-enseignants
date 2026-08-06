import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Heatmap, { gapColor, gapSeverityLabel } from "@/components/analytics/Heatmap";
import type { HeatmapCell } from "@/models/analyse/analyticsFeature";

describe("gapColor", () => {
  it("rouge ≥ 0,75", () => expect(gapColor(0.8)).toBe("#f5222d"));
  it("orange ≥ 0,5", () => expect(gapColor(0.6)).toBe("#fa8c16"));
  it("jaune ≥ 0,25", () => expect(gapColor(0.3)).toBe("#faad14"));
  it("vert > 0", () => expect(gapColor(0.1)).toBe("#a0d911"));
  it("gris à 0", () => expect(gapColor(0)).toBe("#f5f5f5"));
});

describe("gapSeverityLabel", () => {
  it("mapping des seuils", () => {
    expect(gapSeverityLabel(0.8)).toBe("Critique");
    expect(gapSeverityLabel(0.6)).toBe("Élevé");
    expect(gapSeverityLabel(0.3)).toBe("Moyen");
    expect(gapSeverityLabel(0.1)).toBe("Faible");
    expect(gapSeverityLabel(0)).toBe("Nul");
  });
});

const cell: HeatmapCell = {
  departement: "DEPT_INFO",
  competence_id: 1,
  competence_nom: "Python",
  avg_gap: 0.6,
  enseignants_count: 5,
};

describe("Heatmap", () => {
  it("affiche les cellules de la heatmap (libellé département)", () => {
    render(<Heatmap cells={[cell]} />);
    expect(screen.getByText("Informatique")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
  });

  it("appelle onCellClick au clic sur une cellule", () => {
    const onClick = vi.fn();
    render(<Heatmap cells={[cell]} onCellClick={onClick} />);
    screen.getByText("60%").click();
    expect(onClick).toHaveBeenCalledWith("DEPT_INFO", 1, "Python");
  });
});
