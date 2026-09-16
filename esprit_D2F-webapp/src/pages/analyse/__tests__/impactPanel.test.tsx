import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactElement } from "react";

const mocks = vi.hoisted(() => ({
  useWhatIfSimulation: vi.fn(),
}));

vi.mock("@/hooks/analytics/useAnalyticsQueries", () => ({
  useWhatIfSimulation: mocks.useWhatIfSimulation,
}));

import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ImpactPanel from "@/components/analytics/ImpactPanel";
import type { Recommendation, SkillGap } from "@/models/analyse/analyticsFeature";

const gap: SkillGap = {
  id: 1,
  competence_id: 10,
  competence_code: "C1",
  competence_nom: "Python",
  domaine_nom: null,
  niveau_actuel: 2,
  niveau_requis: 4,
  niveau_vise: 4,
  gap_score: 0.5,
  priorite_score: 1,
  niveau_urgence: "HAUTE",
  mois_stagnation: 0,
  en_regression: false,
  nb_besoins_exprimes: 0,
  justification: null,
  computed_at: "2024-01-01",
};

const reco: Recommendation = {
  id: 1,
  formation_id: 5,
  formation_titre: "Formation Python",
  formation_type: "INTERNE",
  competence_id: 10,
  competence_nom: "Python",
  score_global: 0.8,
  score_pertinence: 0.8,
  score_reussite: 0.8,
  score_disponibilite: 0.8,
  probabilite_reussite: 0.8,
  rang_dans_parcours: 1,
  est_prerequis: false,
  prerequis_satisfaits: true,
  niveau_apres: 4,
  niveau_actuel: 2,
  justification: null,
  statut: "PROPOSEE",
};

const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: { children: ReactElement }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

describe("ImpactPanel", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("affiche un message vide sans gaps", () => {
    mocks.useWhatIfSimulation.mockReturnValue({ mutate: vi.fn(), isPending: false, isError: false, data: undefined });
    render(<ImpactPanel enseignantId="T1" gaps={[]} recommendations={[]} />, { wrapper: createWrapper() });
    expect(screen.getByText(/Aucun gap — lancez une analyse/i)).toBeInTheDocument();
  });

  it("affiche le bouton de simulation et lance la mutation", async () => {
    const mutate = vi.fn();
    mocks.useWhatIfSimulation.mockReturnValue({ mutate, isPending: false, isError: false, data: undefined });
    render(<ImpactPanel enseignantId="T1" gaps={[gap]} recommendations={[reco]} />, { wrapper: createWrapper() });
    const btn = screen.getByText(/Simuler l'impact/i);
    btn.click();
    await waitFor(() =>
      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({ enseignant_id: "T1", horizon_mois: 6 }),
      ),
    );
  });

  it("affiche le résultat de la simulation", () => {
    mocks.useWhatIfSimulation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      data: {
        enseignant_id: "T1",
        horizon_mois: 6,
        risk_before: { score: 0.8, niveau: "CRITIQUE" },
        risk_after: { score: 0.4, niveau: "MODERE" },
        risk_reduction: 0.4,
        nb_gaps_before: 1,
        nb_gaps_after: 0,
        nb_gaps_resolus: 1,
        details: [
          { competence_id: 10, formation_id: 5, niveau_actuel: 2, niveau_requis: 4, niveau_vise: 4, gap_avant: 0.5, gap_apres: 0, urgence_apres: "FAIBLE", resolu: true },
        ],
      },
    });
    render(<ImpactPanel enseignantId="T1" gaps={[gap]} recommendations={[reco]} />, { wrapper: createWrapper() });
    expect(screen.getByText(/Risque avant/i)).toBeInTheDocument();
    expect(screen.getByText(/Résultat de la simulation/i)).toBeInTheDocument();
  });
});
