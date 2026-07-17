import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { App } from "antd";
import RecommandationsPlus from "@/redesign/components/RecommandationsPlus";

vi.mock("@/hooks/analyse/useAnalytics", () => ({
  useGroupedRecommendations: vi.fn(() => ({ data: { total: 0, groups: [] }, isLoading: false, isError: false })),
  useSimulateWhatIf: vi.fn(() => ({ data: null, isError: false, isPending: false, mutateAsync: vi.fn(async () => ({})) })),
}));

vi.mock("antd", async () => {
  const actual = await vi.importActual<typeof import("antd")>("antd");
  return { ...actual, message: { success: vi.fn(), error: vi.fn() } };
});

import { useGroupedRecommendations, useSimulateWhatIf } from "@/hooks/analyse/useAnalytics";

beforeEach(() => {
  vi.clearAllMocks();
  (useGroupedRecommendations as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ data: { total: 0, groups: [] }, isLoading: false, isError: false });
  (useSimulateWhatIf as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ data: null, isError: false, isPending: false, mutateAsync: vi.fn(async () => ({})) });
});

function renderReco(enseignantId: string | null) {
  return render(
    <MemoryRouter>
      <App>
        <RecommandationsPlus enseignantId={enseignantId} />
      </App>
    </MemoryRouter>,
  );
}

describe("RecommandationsPlus", () => {
  it("demande de sélectionner un enseignant sans id", () => {
    renderReco(null);
    expect(screen.getByText(/Sélectionnez un enseignant/i)).toBeInTheDocument();
  });
  it("rend les sections Regroupement et What-if", () => {
    renderReco("ENS-1");
    expect(screen.getByText("Regroupement des recommandations")).toBeInTheDocument();
    expect(screen.getByText("Simulation what-if — impact d'un plan de formation")).toBeInTheDocument();
  });
  it("affiche un message quand aucune recommandation", () => {
    renderReco("ENS-1");
    expect(screen.getByText(/Aucune recommandation à regrouper/i)).toBeInTheDocument();
  });
  it("change le regroupement via les segments", () => {
    renderReco("ENS-1");
    const btn = screen.getByRole("button", { name: "Urgence" });
    fireEvent.click(btn);
    expect(btn.className).toContain("active");
  });
  it("ajoute et retire des lignes d'action dans le what-if", () => {
    renderReco("ENS-1");
    const add = screen.getByRole("button", { name: /\+ Ajouter une action/ });
    fireEvent.click(add);
    expect(screen.getAllByPlaceholderText("ID")).toHaveLength(2);
    const removeButtons = screen.getAllByRole("button", { name: "Retirer" });
    fireEvent.click(removeButtons[0]);
    expect(screen.getAllByPlaceholderText("ID")).toHaveLength(1);
  });
});
