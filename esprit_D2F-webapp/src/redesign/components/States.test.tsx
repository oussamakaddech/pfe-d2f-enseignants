import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { KpiSkeleton, ChartSkeleton, ListSkeleton, EmptyState, ErrorState } from "@/redesign/components/States";

describe("States skeletons", () => {
  it("KpiSkeleton rend le nombre de squelettes", () => {
    const { container } = render(<KpiSkeleton count={3} />);
    expect(container.querySelectorAll(".rd-skel-kpi")).toHaveLength(3);
  });
  it("ChartSkeleton rend un bloc", () => {
    const { container } = render(<ChartSkeleton height={200} />);
    expect(container.querySelector(".rd-skel-block")).toBeInTheDocument();
  });
  it("ListSkeleton rend le nombre de lignes", () => {
    const { container } = render(<ListSkeleton rows={2} />);
    expect(container.querySelectorAll(".rd-list-item")).toHaveLength(2);
  });
});

describe("EmptyState", () => {
  it("affiche la description par défaut", () => {
    render(<EmptyState />);
    expect(screen.getByText("Aucune donnée")).toBeInTheDocument();
  });
  it("affiche une description personnalisée et enfants", () => {
    render(<EmptyState description="Rien ici">enfant</EmptyState>);
    expect(screen.getByText("Rien ici")).toBeInTheDocument();
    expect(screen.getByText("enfant")).toBeInTheDocument();
  });
});

describe("ErrorState", () => {
  it("affiche le message et le bouton retry", () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Erreur" onRetry={onRetry} />);
    expect(screen.getByText("Erreur")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /réessayer/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
  it("n'affiche pas de bouton sans onRetry", () => {
    render(<ErrorState message="Erreur" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
