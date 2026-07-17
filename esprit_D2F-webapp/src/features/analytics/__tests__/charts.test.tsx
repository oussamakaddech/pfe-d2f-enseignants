import { describe, it, expect, vi } from "vitest";

vi.mock("react-chartjs-2", () => ({
  Bar: () => null,
  Line: () => null,
  Doughnut: () => null,
}));

import { render, screen } from "@testing-library/react";
import DecliningSkillsChart from "../components/DecliningSkillsChart";
import RiskDistributionChart from "../components/RiskDistributionChart";
import TrendChart from "../components/TrendChart";
import RiskHistoryChart from "../components/RiskHistoryChart";
import type { DecliningSkill, RiskDistributionBucket, TrendPoint, RiskHistoryPoint } from "../types";

describe("DecliningSkillsChart", () => {
  it("affiche le chargement", () => {
    render(<DecliningSkillsChart skills={[]} loading />);
    expect(screen.getByText(/Chargement/i)).toBeInTheDocument();
  });
  it("rend sans erreur avec des données", () => {
    const skills: DecliningSkill[] = [
      { competence_id: 1, competence_nom: "Python", domaine_nom: null, variation_moyenne: -0.2, pct_enseignants_en_declin: 3, nb_enseignants_concernes: 5 },
    ];
    const { container } = render(<DecliningSkillsChart skills={skills} />);
    expect(container).toBeTruthy();
  });
});

describe("RiskDistributionChart", () => {
  it("affiche le chargement", () => {
    render(<RiskDistributionChart distribution={[]} loading />);
    expect(screen.getByText(/Chargement/i)).toBeInTheDocument();
  });
  it("rend sans erreur avec des données", () => {
    const dist: RiskDistributionBucket[] = [
      { niveau: "CRITIQUE", count: 2 },
      { niveau: "FAIBLE", count: 5 },
    ];
    const { container } = render(<RiskDistributionChart distribution={dist} />);
    expect(container).toBeTruthy();
  });
});

describe("TrendChart", () => {
  it("affiche le chargement", () => {
    render(<TrendChart trends={[]} loading />);
    expect(screen.getByText(/Chargement/i)).toBeInTheDocument();
  });
  it("rend sans erreur avec des données", () => {
    const trends: TrendPoint[] = [
      { month: "2024-01", nb_gaps_critiques: 1, score_risque_moyen: 0.3, nb_alertes: 2 },
    ];
    const { container } = render(<TrendChart trends={trends} />);
    expect(container).toBeTruthy();
  });
});

describe("RiskHistoryChart", () => {
  it("affiche un message vide sans points", () => {
    render(<RiskHistoryChart points={[]} />);
    expect(screen.getByText(/Aucun historique disponible/i)).toBeInTheDocument();
  });
  it("affiche la tendance avec des points", () => {
    const points: RiskHistoryPoint[] = [
      { date: "2024-01", score: 0.5, niveau: "MODERE", tendance: "STABLE" },
      { date: "2024-02", score: 0.3, niveau: "FAIBLE", tendance: "STABLE" },
    ];
    const { container } = render(<RiskHistoryChart points={points} />);
    expect(screen.getByText(/Variation sur la periode/i)).toBeInTheDocument();
    expect(container).toBeTruthy();
  });
});
