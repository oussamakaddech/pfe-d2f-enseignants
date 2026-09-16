import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ModelStatusPanel from "@/components/analytics/ModelStatusPanel";
import type { ModelStatus } from "@/models/analyse/analyticsFeature";

const status: ModelStatus = {
  version: "v2",
  entraîné_le: "2024-01-01",
  algorithme: "GradientBoosting",
  features_count: 12,
  accuracy: 0.91,
  f1_score: null,
  drift_detected: false,
  derniere_verification_integrite: null,
  integrite_ok: true,
  source: "modele",
  disponible: true,
};

describe("ModelStatusPanel", () => {
  it("affiche une alerte si statut absent", () => {
    render(<ModelStatusPanel status={undefined} />);
    expect(screen.getByText(/Statut du modèle indisponible/i)).toBeInTheDocument();
  });

  it("affiche version, algorithme et accuracy", () => {
    render(<ModelStatusPanel status={status} />);
    expect(screen.getByText("GradientBoosting")).toBeInTheDocument();
    expect(screen.getByText("v2")).toBeInTheDocument();
  });
});
