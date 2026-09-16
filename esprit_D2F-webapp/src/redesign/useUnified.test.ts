import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("@/hooks/analyse/useAnalysePredictive", () => ({
  useDashboardSummary: vi.fn(() => ({ data: undefined })),
  useRiskDistribution: vi.fn(() => ({ data: undefined, isLoading: false })),
  useRiskEvolution: vi.fn(() => ({ data: undefined, isLoading: false })),
  useSupplyDemand: vi.fn(() => ({ data: undefined, isLoading: false })),
  useHeatmapDrilldown: vi.fn(() => ({ data: undefined, isLoading: false })),
  usePriorityActions: vi.fn(() => ({ data: undefined, isLoading: false })),
  useAlertsSummary: vi.fn(() => ({ data: undefined, isLoading: false })),
  useDemandForecast: vi.fn(() => ({ data: undefined, isLoading: false })),
  useOverview: vi.fn(() => ({ data: undefined, isLoading: false, isError: false })),
  useModelPerformance: vi.fn(() => ({ data: undefined, isLoading: false })),
  useGapHeatmap: vi.fn(() => ({ data: undefined, isLoading: false })),
}));

vi.mock("@/hooks/analyse/useDashboard", () => ({
  useDashboard: vi.fn(() => ({ dashboard: null, loading: false, error: null, lastUpdate: null, refetch: vi.fn() })),
}));

import {
  useUnifiedRiskTeachers, useUnifiedRiskDistribution, useUnifiedRiskTrend,
  useUnifiedSupplyDemand, useUnifiedHeatmap, useUnifiedPriorityActions,
  useUnifiedAlerts, useUnifiedForecast, useUnifiedOverview, useUnifiedDashboard,
  selectCoverage, selectTrainingEffectiveness, selectFormationRecos,
  selectDeclining, selectInDemand, selectRiskTeachersFromDashboard,
} from "@/redesign/useUnified";

import {
  useDashboardSummary, useRiskDistribution, useRiskEvolution, useSupplyDemand,
  useHeatmapDrilldown, usePriorityActions, useAlertsSummary, useDemandForecast,
  useOverview, useModelPerformance, useGapHeatmap,
} from "@/hooks/analyse/useAnalysePredictive";
import { useDashboard } from "@/hooks/analyse/useDashboard";

const ap = {
  useDashboardSummary, useRiskDistribution, useRiskEvolution, useSupplyDemand,
  useHeatmapDrilldown, usePriorityActions, useAlertsSummary, useDemandForecast,
  useOverview, useModelPerformance, useGapHeatmap,
} as Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => {
  Object.values(ap).forEach((m) => m.mockClear());
  (useDashboard as unknown as ReturnType<typeof vi.fn>).mockClear();
  ap.useDashboardSummary.mockReturnValue({ data: undefined });
  ap.useRiskDistribution.mockReturnValue({ data: undefined, isLoading: false });
  ap.useRiskEvolution.mockReturnValue({ data: undefined, isLoading: false });
  ap.useSupplyDemand.mockReturnValue({ data: undefined, isLoading: false });
  ap.useHeatmapDrilldown.mockReturnValue({ data: undefined, isLoading: false });
  ap.usePriorityActions.mockReturnValue({ data: undefined, isLoading: false });
  ap.useAlertsSummary.mockReturnValue({ data: undefined, isLoading: false });
  ap.useDemandForecast.mockReturnValue({ data: undefined, isLoading: false });
  ap.useOverview.mockReturnValue({ data: undefined, isLoading: false, isError: false });
  ap.useModelPerformance.mockReturnValue({ data: undefined, isLoading: false });
  ap.useGapHeatmap.mockReturnValue({ data: undefined, isLoading: false });
  (useDashboard as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    dashboard: null, loading: false, error: null, lastUpdate: null, refetch: vi.fn(),
  });
});

describe("useUnifiedRiskTeachers", () => {
  it("normalise et trie par score décroissant, limité", () => {
    ap.useDashboardSummary.mockReturnValue({
      data: {
        teacher_risk_indicators: [
          { teacher_id: "T1", teacher_name: "A", score_risque: 0.8, disengagement_signals: ["stagnation"] },
          { teacher_id: "T2", teacher_name: "B", score_risque: 0.2 },
          { teacher_id: "T3", teacher_name: "C", score_risque: 0.5 },
        ],
      },
    });
    const { result } = renderHook(() => useUnifiedRiskTeachers(2));
    expect(result.current.teachers).toHaveLength(2);
    expect(result.current.teachers[0].name).toBe("A");
    expect(result.current.teachers[1].name).toBe("C");
    expect(result.current.loading).toBe(false);
  });
  it("loading quand pas de données", () => {
    const { result } = renderHook(() => useUnifiedRiskTeachers());
    expect(result.current.loading).toBe(true);
  });
});

describe("useUnifiedRiskDistribution", () => {
  it("mappe le DTO backend", () => {
    ap.useRiskDistribution.mockReturnValue({
      data: { total: 100, by_level: { CRITIQUE: 5, ELEVE: 10, MODERE: 20, FAIBLE: 65 }, by_department: [{ departement: "Info", score_risque_moyen: 0.4, nb_enseignants: 12 }] },
      isLoading: false,
    });
    const { result } = renderHook(() => useUnifiedRiskDistribution());
    expect(result.current.distribution!.total).toBe(100);
    expect(result.current.distribution!.byLevel.CRITIQUE).toBe(5);
    expect(result.current.distribution!.byDepartment[0].avgRiskPct).toBe(40);
    expect(result.current.distribution!.byDepartment[0].teachers).toBe(12);
  });
});

describe("useUnifiedRiskTrend", () => {
  it("mappe les points", () => {
    ap.useRiskEvolution.mockReturnValue({
      data: [{ month: "Jan", critical: 3, high: 5 }, { month: "Fév", critical: 1, high: 2 }],
      isLoading: false,
    });
    const { result } = renderHook(() => useUnifiedRiskTrend());
    expect(result.current.trend).toHaveLength(2);
    expect(result.current.trend[0]).toMatchObject({ month: "Jan", critical: 3, elevated: 5 });
  });
});

describe("useUnifiedSupplyDemand", () => {
  it("calcule l'urgence selon les critiques", () => {
    ap.useSupplyDemand.mockReturnValue({
      data: [
        { competence_id: 1, competence_nom: "Python", domaine_nom: "Info", demand_score: 0.8, nb_enseignants: 20, nb_critiques: 5, quadrant: "INVESTIR" },
        { competence_id: 2, competence_nom: "SQL", domaine_nom: "Info", demand_score: 0.5, nb_enseignants: 10, nb_critiques: 0, quadrant: "SURVEILLER" },
      ],
      isLoading: false,
    });
    const { result } = renderHook(() => useUnifiedSupplyDemand());
    expect(result.current.items[0].urgency).toBe("CRITIQUE");
    expect(result.current.items[0].demandPct).toBe(80);
    expect(result.current.items[1].urgency).toBe("FAIBLE");
  });
});

describe("useUnifiedHeatmap", () => {
  it("mappe les cells", () => {
    ap.useGapHeatmap.mockReturnValue({
      data: [{ departement: "Info", competence_id: 1, competence_nom: "Python", avg_gap: 2.1, enseignants_count: 9 }],
      isLoading: false,
    });
    const { result } = renderHook(() => useUnifiedHeatmap());
    expect(result.current.cells).toHaveLength(1);
    expect(result.current.cells[0].avgGap).toBe(2.1);
  });
});

describe("useUnifiedPriorityActions", () => {
  it("normalise les actions prioritaires", () => {
    ap.usePriorityActions.mockReturnValue({
      data: [
        { enseignant_id: "E1", teacher_name: "A", score_risque: 0.9, competence_prioritaire: { competence_nom: "Python" }, nb_gaps_critiques: 2, action_recommandee: "Former", nb_alertes_ouvertes: 1 },
      ],
      isLoading: false,
    });
    const { result } = renderHook(() => useUnifiedPriorityActions());
    expect(result.current.teachers[0].riskScore).toBe(0.9);
    expect(result.current.teachers[0].recommendedAction).toBe("Former");
  });
});

describe("useUnifiedAlerts", () => {
  it("expose les totaux", () => {
    ap.useAlertsSummary.mockReturnValue({
      data: { total: 12, nouvelles: 3, critiques_ouvertes: 2 },
      isLoading: false,
    });
    const { result } = renderHook(() => useUnifiedAlerts());
    expect(result.current.total).toBe(12);
    expect(result.current.nouvelles).toBe(3);
    expect(result.current.critiquesOuvertes).toBe(2);
  });
});

describe("useUnifiedForecast", () => {
  it("retourne null pour kind=risk", () => {
    const { result } = renderHook(() => useUnifiedForecast("risk", 6));
    expect(result.current.view).toBeNull();
  });
  it("construit la vue pour kind=demand", () => {
    ap.useDemandForecast.mockReturnValue({
      data: {
        history: [{ month: "Jan", value: 40, lower: 38, upper: 42 }],
        forecast: [{ month: "Fév", value: 50, lower: 45, upper: 55 }],
        note: "ok",
      },
      isLoading: false,
    });
    const { result } = renderHook(() => useUnifiedForecast("demand", 6));
    expect(result.current.view!.kind).toBe("demand");
    expect(result.current.view!.series).toHaveLength(2);
    expect(result.current.view!.series[0].isProjection).toBe(false);
    expect(result.current.view!.series[1].isProjection).toBe(true);
    expect(result.current.view!.note).toBe("ok");
  });
});

describe("useUnifiedOverview / useUnifiedDashboard", () => {
  it("expose overview + model", () => {
    const { result } = renderHook(() => useUnifiedOverview());
    expect(result.current.model).toBeDefined();
  });
  it("expose le dashboard", () => {
    (useDashboard as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      dashboard: { taux_couverture_departements: [] }, loading: false, error: null, lastUpdate: "2024", refetch: vi.fn(),
    });
    const { result } = renderHook(() => useUnifiedDashboard());
    expect(result.current.d).toBeDefined();
  });
});

describe("selectCoverage", () => {
  it("retourne global null sans données", () => {
    expect(selectCoverage(null).global).toBeNull();
  });
  it("calcule la couverture globale et par dept", () => {
    const d = {
      taux_couverture_departements: [
        { departement: "Info", taux_couverture: 80, nb_evalues: 10 },
        { departement: "Math", taux_couverture: 60, nb_evalues: 10 },
        { departement: "Z", taux_couverture: 50, nb_evalues: 0 },
      ],
    } as never;
    const r = selectCoverage(d);
    expect(r.global).toBe(63);
    expect(r.byDept.find((x) => x.department === "Z")!.coveragePct).toBeNull();
    expect(r.byDept.find((x) => x.department === "Info")!.evaluated).toBe(10);
  });
});

describe("selectTrainingEffectiveness / selectFormationRecos / selectDeclining / selectInDemand", () => {
  it("mappe l'efficacité formation", () => {
    const r = selectTrainingEffectiveness({ training_effectiveness: [{ formation_id: 1, formation_titre: "F", completion_rate: 0.5, avg_level_gain: 1.2 }] } as never);
    expect(r[0]).toMatchObject({ formationId: 1, title: "F", completionRate: 0.5, avgLevelGain: 1.2 });
  });
  it("mappe les recos formation", () => {
    const r = selectFormationRecos({ top_formations_recommandees: [{ formation_id: 1, formation_titre: "F", nb_recommandations: 5, score_moyen: 4, proba_reussite_moy: 0.9 }] } as never);
    expect(r[0].recommendationCount).toBe(5);
    expect(r[0].successProb).toBe(0.9);
  });
  it("mappe les compétences en déclin", () => {
    const r = selectDeclining({ competences_en_declin: [{ competence_id: 1, competence_nom: "C", domaine_nom: "D", delta: -0.5 }] } as never);
    expect(r[0].delta).toBe(-0.5);
  });
  it("mappe les compétences en demande", () => {
    const r = selectInDemand({ competences_en_demande: [{ competence_id: 2, competence_nom: "C", domaine_nom: "D", score_demande: 70, nb_gaps: 3 }] } as never);
    expect(r[0].demandScore).toBe(70);
    expect(r[0].gaps).toBe(3);
  });
});

describe("selectRiskTeachersFromDashboard", () => {
  it("normalise les enseignants à risque du dashboard", () => {
    const d = {
      enseignants_a_risque: [
        { enseignant_id: "E1", teacher_name: "A", score_risque: 0.7, facteurs_risque: ["stagnation"], tendance: "REGRESSION", nb_gaps_critiques: 1 },
      ],
    } as never;
    const r = selectRiskTeachersFromDashboard(d, 6);
    expect(r[0].name).toBe("A");
    expect(r[0].riskScore).toBe(0.7);
    expect(r[0].signals).toContain("Stagnation des compétences");
  });
});
