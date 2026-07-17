import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import StackedProgress from "@/redesign/components/charts/StackedProgress";

describe("StackedProgress", () => {
  it("affiche un message vide sans items", () => {
    render(<StackedProgress items={[]} />);
    expect(screen.getByText("Aucune donnée")).toBeInTheDocument();
  });
  it("affiche le label, le total et les segments", () => {
    render(
      <StackedProgress
        items={[{
          label: "Info",
          segments: [
            { label: "Critique", value: 9, color: "#ef4444" },
            { label: "Faible", value: 1, color: "#10b981" },
          ],
        }]}
      />,
    );
    expect(screen.getByText("Info")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText(/Critique 90%/)).toBeInTheDocument();
    expect(screen.getByText(/Faible 10%/)).toBeInTheDocument();
  });
  it("ignore un item à total 0", () => {
    const { container } = render(
      <StackedProgress items={[{ label: "Vide", segments: [{ label: "A", value: 0, color: "#000" }] }]} />,
    );
    expect(container.querySelectorAll(".sp-row")).toHaveLength(0);
  });
});
