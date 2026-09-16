import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AlertCenter from "@/components/analytics/AlertCenter";
import type { AlertEvent } from "@/models/analyse/analyticsFeature";

const alert: AlertEvent = {
  id: 1,
  type_alerte: "GAP_CRITIQUE",
  cible_type: "INDIVIDUEL",
  enseignant_id: "T1",
  departement_id: null,
  competence_id: null,
  severite: "CRITICAL",
  titre: "Alerte critique",
  message: "Un gap critique détecté",
  statut: "NOUVELLE",
  created_at: "2024-01-01T10:00:00Z",
};

describe("AlertCenter", () => {
  it("affiche un message vide sans alertes", () => {
    render(<AlertCenter alerts={[]} />);
    expect(screen.getByText(/Aucune alerte/i)).toBeInTheDocument();
  });

  it("affiche le titre et le message de l'alerte", () => {
    render(<AlertCenter alerts={[alert]} />);
    expect(screen.getByText("Alerte critique")).toBeInTheDocument();
    expect(screen.getByText(/Un gap critique détecté/)).toBeInTheDocument();
  });

  it("propose les actions de cycle de vie pour une alerte ouverte", () => {
    const onUpdate = vi.fn();
    render(<AlertCenter alerts={[alert]} onUpdate={onUpdate} />);
    screen.getByText("Planifier").click();
    expect(onUpdate).toHaveBeenCalledWith(1, { statut: "TRAITEE" });
  });
});
