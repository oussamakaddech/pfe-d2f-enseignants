import { describe, it, expect, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useTrainingImpact: vi.fn(),
  useTrainingImpactFormations: vi.fn(),
}));

vi.mock("../hooks/useAnalyticsQueries", () => ({
  useTrainingImpact: mocks.useTrainingImpact,
  useTrainingImpactFormations: mocks.useTrainingImpactFormations,
}));

import { render, screen } from "@testing-library/react";
import TrainingImpactPanel from "../components/TrainingImpactPanel";

describe("TrainingImpactPanel", () => {
  beforeEach(() => vi.clearAllMocks());

  it("affiche un spinner pendant le chargement", () => {
    mocks.useTrainingImpact.mockReturnValue({ isLoading: true, data: undefined });
    mocks.useTrainingImpactFormations.mockReturnValue({ isLoading: true, data: undefined });
    const { container } = render(<TrainingImpactPanel />);
    expect(container.querySelector(".ant-spin")).toBeTruthy();
  });

  it("affiche un message vide sans données", () => {
    mocks.useTrainingImpact.mockReturnValue({ isLoading: false, data: undefined });
    mocks.useTrainingImpactFormations.mockReturnValue({ isLoading: false, data: undefined });
    render(<TrainingImpactPanel />);
    expect(screen.getByText(/Aucune donnée d'impact disponible/i)).toBeInTheDocument();
  });

  it("affiche les statistiques d'impact", () => {
    mocks.useTrainingImpact.mockReturnValue({
      isLoading: false,
      data: {
        nb_enseignants_suivis: 10,
        nb_chemins_termines: 4,
        nb_formations_suivies: 8,
        gain_niveau_moyen: 0.5,
        reduction_risque_moyenne: 0.3,
        nb_risque_reduit: 6,
        nb_risque_augmente: 1,
      },
    });
    mocks.useTrainingImpactFormations.mockReturnValue({
      isLoading: false,
      data: { total: 1, page: 0, size: 10, formations: [] },
    });
    render(<TrainingImpactPanel />);
    expect(screen.getByText("Enseignants suivis")).toBeInTheDocument();
    expect(screen.getByText("Formations suivies")).toBeInTheDocument();
  });
});
