import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import RecommendationsList from "@/components/analytics/RecommendationsList";
import type { Recommendation } from "@/models/analyse/analyticsFeature";

const reco: Recommendation = {
  id: 1,
  formation_id: 5,
  formation_titre: "Formation Python",
  formation_type: "INTERNE",
  competence_id: 10,
  competence_nom: "Python",
  score_global: 0.85,
  score_pertinence: 0.8,
  score_reussite: 0.9,
  score_disponibilite: 0.7,
  probabilite_reussite: 0.8,
  rang_dans_parcours: 1,
  est_prerequis: false,
  prerequis_satisfaits: true,
  niveau_apres: 4,
  niveau_actuel: 2,
  justification: "Recommandé",
  statut: "PROPOSEE",
};

describe("RecommendationsList", () => {
  it("affiche un message vide sans recommandations", () => {
    render(<RecommendationsList recommendations={[]} />);
    expect(screen.getByText(/Aucune recommandation/i)).toBeInTheDocument();
  });

  it("affiche le titre et le score", () => {
    render(<RecommendationsList recommendations={[reco]} />);
    expect(screen.getByText("Formation Python")).toBeInTheDocument();
    expect(screen.getByText(/score 0.85/)).toBeInTheDocument();
  });

  it("affiche les boutons accepter/ignorer pour une reco PROPOSEE", () => {
    const onAccept = vi.fn();
    const onReject = vi.fn();
    render(<RecommendationsList recommendations={[reco]} onAccept={onAccept} onReject={onReject} />);
    screen.getByText("Accepter").click();
    screen.getByText("Ignorer").click();
    expect(onAccept).toHaveBeenCalledWith(1);
    expect(onReject).toHaveBeenCalledWith(1);
  });
});
