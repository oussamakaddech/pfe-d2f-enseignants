// ═══════════════════════════════════════════════════════════════════════════
// Hook de normalisation — D2F Redesign.
//
// Prend les hooks existants (useAnalysePredictive / useDashboard) et produit
// le modèle unifié (contract.ts). C'est le SEUL endroit qui mappe les DTO
// backend -> modèle frontend. Les pages ne recalculent jamais de risque.
// ═══════════════════════════════════════════════════════════════════════════

import { useMemo } from "react";
import {
  useDashboardSummary, useRiskDistribution, useRiskEvolution, useSupplyDemand,
  useHeatmapDrilldown, usePriorityActions, useAlertsSummary, useDemandForecast,
  useOverview, useModelPerformance, useGapHeatmap,
} from "@/hooks/analyse/useAnalysePredictive";
import { useDashboard } from "@/hooks/analyse/useDashboard";
import type { DashboardData } from "@/models/analyse";
import { getRiskScore, riskLevel, riskPct, decodeSignals, type RiskLevelKey } from "./risk";
import type {
  UnifiedRiskTeacher, RiskDistribution, RiskTrendPoint, SupplyDemandItem,
  HeatmapCell, HeatmapDrillDown, HeatmapDrillTeacher, UnifiedAlert,
  TrainingEffectiveness, FormationReco, CompetencyPressure, ForecastView,
} from "./contract";

function toLevelOrNull(score: number | null): RiskLevelKey | null {
  return score == null ? null : riskLevel(score);
}

/** Enseignants à risque priorisés, modèle unique. */
export function useUnifiedRiskTeachers(limit = 7): {
  teachers: UnifiedRiskTeacher[];
  loading: boolean;
} {
  const { data: summary } = useDashboardSummary();
  const teachers = useMemo<UnifiedRiskTeacher[]>(() => {
    const list = summary?.teacher_risk_indicators ?? [];
    return [...list]
      .map((t): UnifiedRiskTeacher => {
        const score = getRiskScore(t);
        return {
          id: t.teacher_id,
          name: t.teacher_name ?? t.teacher_id,
          department: t.departement ?? null,
          riskScore: score,
          riskLevel: toLevelOrNull(score),
          signals: decodeSignals(t.disengagement_signals),
          trend: null,
          criticalGaps: 0,
          recommendedAction: t.recommendation ?? "—",
          recommendedTraining: null,
          openAlerts: 0,
        };
      })
      .sort((a, b) => (b.riskScore ?? -1) - (a.riskScore ?? -1))
      .slice(0, limit);
  }, [summary, limit]);

  return { teachers, loading: !summary };
}

/** Répartition du risque (donut + départements). */
export function useUnifiedRiskDistribution(): {
  distribution: RiskDistribution | null;
  loading: boolean;
} {
  const { data, isLoading } = useRiskDistribution();
  const distribution = useMemo<RiskDistribution | null>(() => {
    if (!data) return null;
    const byLevel: Record<RiskLevelKey, number> = {
      CRITIQUE: data.by_level?.CRITIQUE ?? 0,
      ELEVE: data.by_level?.ELEVE ?? 0,
      MODERE: data.by_level?.MODERE ?? 0,
      FAIBLE: data.by_level?.FAIBLE ?? 0,
    };
    return {
      total: data.total ?? 0,
      byLevel,
      byDepartment: (data.by_department ?? []).map((d) => ({
        department: d.departement,
        avgRiskPct: riskPct(d.score_risque_moyen),
        teachers: d.nb_enseignants,
      })),
    };
  }, [data]);
  return { distribution, loading: isLoading };
}

/** Tendance mensuelle du risque. */
export function useUnifiedRiskTrend(months = 6): {
  trend: RiskTrendPoint[];
  loading: boolean;
} {
  const { data, isLoading } = useRiskEvolution(months);
  const trend = useMemo<RiskTrendPoint[]>(
    () => (data ?? []).map((p) => ({
      month: p.month,
      critical: p.critical,
      elevated: p.high,
      averageRiskPct: null,
    })),
    [data],
  );
  return { trend, loading: isLoading };
}

/** Offre/demande (pression compétences). */
export function useUnifiedSupplyDemand(): {
  items: SupplyDemandItem[];
  loading: boolean;
} {
  const { data, isLoading } = useSupplyDemand();
  const items = useMemo<SupplyDemandItem[]>(
    () => (data ?? []).map((s) => ({
      competenceId: s.competence_id,
      competenceName: s.competence_nom,
      domain: s.domaine_nom,
      demandPct: Math.round((s.demand_score ?? 0) * 100),
      impactedTeachers: s.nb_enseignants,
      criticalCount: s.nb_critiques,
      urgency: (s.quadrant === "INVESTIR" || s.nb_critiques > 3)
        ? "CRITIQUE"
        : (() => {
            if (s.nb_critiques > 1) return "ELEVE" as const;
            if (s.nb_critiques > 0) return "MODERE" as const;
            return "FAIBLE" as const;
          })(),
      suggestedTraining: s.competence_nom,
      quadrant: (s.quadrant ?? "SURVEILLER") as SupplyDemandItem["quadrant"],
    })),
    [data],
  );
  return { items, loading: isLoading };
}

/** Heatmap (cells) depuis le hook existant (useGapHeatmap). */
export function useUnifiedHeatmap(): {
  cells: HeatmapCell[];
  loading: boolean;
} {
  const { data, isLoading } = useGapHeatmap();
  const cells = useMemo<HeatmapCell[]>(
    () => (data ?? []).map((c) => ({
      department: c.departement,
      competenceId: c.competence_id,
      competenceName: c.competence_nom,
      avgGap: c.avg_gap,
      teachersCount: c.enseignants_count,
    })),
    [data],
  );
  return { cells, loading: isLoading };
}

/** Drilldown heatmap normalisé. */
export function useUnifiedHeatmapDrilldown(department: string | null, competenceId: number | null): {
  data: HeatmapDrillDown | null;
  loading: boolean;
} {
  const { data, isLoading } = useHeatmapDrilldown(department, competenceId);
  const normalized = useMemo<HeatmapDrillDown | null>(() => {
    if (!data) return null;
    return {
      department: data.departement,
      competenceName: data.competence_nom ?? `Compétence ${data.competence_id}`,
      teachersCount: data.nb_enseignants,
      avgGap: data.avg_gap,
      teachers: data.enseignants.map((t): HeatmapDrillTeacher => {
        const score = getRiskScore(t);
        return {
          teacherId: t.enseignant_id,
          name: t.enseignant_id,
          currentLevel: t.niveau_actuel,
          requiredLevel: t.niveau_requis,
          gapScore: t.gap_score,
          urgency: toLevelOrNull(score),
          stagnationMonths: t.mois_stagnation,
          riskScore: score,
          riskLevel: toLevelOrNull(score),
        };
      }),
    };
  }, [data]);
  return { data: normalized, loading: isLoading };
}

/** Actions prioritaires -> enseignants unifiés (avec action recommandée + formation). */
export function useUnifiedPriorityActions(limit = 6): {
  teachers: UnifiedRiskTeacher[];
  loading: boolean;
} {
  const { data, isLoading } = usePriorityActions(limit);
  const teachers = useMemo<UnifiedRiskTeacher[]>(() => {
    const list = data ?? [];
    return [...list]
      .map((a): UnifiedRiskTeacher => {
        const score = getRiskScore({ score_risque: a.score_risque });
        return {
          id: a.enseignant_id,
          name: a.teacher_name ?? a.enseignant_id,
          department: a.competence_prioritaire?.competence_nom ?? null,
          riskScore: score,
          riskLevel: toLevelOrNull(score),
          signals: [],
          trend: (a.tendance ?? null) as UnifiedRiskTeacher["trend"],
          criticalGaps: a.nb_gaps_critiques,
          recommendedAction: a.action_recommandee ?? "—",
          recommendedTraining: a.meilleure_formation?.formation_titre ?? null,
          openAlerts: a.nb_alertes_ouvertes,
        };
      })
      .sort((a, b) => (b.riskScore ?? -1) - (a.riskScore ?? -1));
  }, [data]);
  return { teachers, loading: isLoading };
}

/** Alertes unifiées. */
export function useUnifiedAlerts(): {
  alerts: UnifiedAlert[];
  total: number;
  nouvelles: number;
  critiquesOuvertes: number;
  loading: boolean;
} {
  const { data, isLoading } = useAlertsSummary();
  const total = data?.total ?? 0;
  return {
    alerts: [],
    total,
    nouvelles: data?.nouvelles ?? 0,
    critiquesOuvertes: data?.critiques_ouvertes ?? 0,
    loading: isLoading,
  };
}

/** Prévision unifiée (demand ou risk) — l'horizon pilote réellement le hook. */
export function useUnifiedForecast(kind: "demand" | "risk", horizonMonths: number): {
  view: ForecastView | null;
  loading: boolean;
} {
  const demand = useDemandForecast(kind === "demand" ? horizonMonths : 6);
  const view = useMemo<ForecastView | null>(() => {
    if (kind !== "demand") return null;
    const d = demand.data;
    if (!d) return null;
    const series = [
      ...(d.history ?? []).map((p) => ({
        period: p.month,
        value: p.value,
        lower: p.lower,
        upper: p.upper,
        isProjection: false,
      })),
      ...(d.forecast ?? []).map((p) => ({
        period: p.month,
        value: p.value,
        lower: p.lower,
        upper: p.upper,
        isProjection: true,
      })),
    ];
    return { kind, horizonMonths, series, note: d.note };
  }, [demand.data, kind, horizonMonths]);
  return { view, loading: demand.isLoading };
}

/** KPIs de synthèse (Overview) — une seule source pour les deux pages. */
export function useUnifiedOverview() {
  const { data, isLoading, isError } = useOverview();
  const model = useModelPerformance();
  return { overview: data, model, loading: isLoading, error: isError };
}

/** Données globales du tableau de bord (couverture, efficacité, reclos). */
export function useUnifiedDashboard() {
  const { dashboard, loading, error, lastUpdate, refetch } = useDashboard();
  const d = dashboard as DashboardData | null;
  return { d, loading, error, lastUpdate, refetch };
}

/** Helpers de commodité pour la couverture + efficacité + reclos. */
export function selectCoverage(d: DashboardData | null): {
  global: number | null;
  byDept: Array<{ department: string; coveragePct: number | null; evaluated: number }>;
} {
  if (!d) return { global: null, byDept: [] };
  const rows = d.taux_couverture_departements ?? [];
  const totalEval = rows.reduce((s, r) => s + (r.nb_evalues ?? 0), 0);
  const global = totalEval === 0
    ? null
    : Math.round(rows.reduce((s, r) => s + r.taux_couverture, 0) / rows.length);
  return {
    global,
    byDept: rows.map((r) => ({
      department: r.departement,
      coveragePct: (r.nb_evalues ?? 0) === 0 ? null : r.taux_couverture,
      evaluated: r.nb_evalues ?? 0,
    })),
  };
}

export function selectTrainingEffectiveness(d: DashboardData | null): TrainingEffectiveness[] {
  return (d?.training_effectiveness ?? []).map((f) => ({
    formationId: f.formation_id,
    title: f.formation_titre,
    completionRate: f.completion_rate ?? 0,
    avgLevelGain: Number(f.avg_level_gain ?? 0),
  }));
}

export function selectFormationRecos(d: DashboardData | null): FormationReco[] {
  return (d?.top_formations_recommandees ?? []).map((f) => ({
    formationId: f.formation_id,
    title: f.formation_titre,
    recommendationCount: f.nb_recommandations,
    avgScore: f.score_moyen ?? null,
    successProb: f.proba_reussite_moy ?? 0,
  }));
}

export function selectDeclining(d: DashboardData | null): CompetencyPressure[] {
  return (d?.competences_en_declin ?? []).map((c) => ({
    competenceId: c.competence_id,
    name: c.competence_nom,
    domain: c.domaine_nom,
    delta: c.delta,
    demandScore: null,
    gaps: 0,
  }));
}

export function selectInDemand(d: DashboardData | null): CompetencyPressure[] {
  return (d?.competences_en_demande ?? []).map((c) => ({
    competenceId: c.competence_id,
    name: c.competence_nom,
    domain: c.domaine_nom,
    delta: null,
    demandScore: c.score_demande ?? null,
    gaps: c.nb_gaps,
  }));
}

export function selectRiskTeachersFromDashboard(d: DashboardData | null, limit = 6): UnifiedRiskTeacher[] {
  return (d?.enseignants_a_risque ?? []).slice(0, limit).map((t): UnifiedRiskTeacher => {
    const score = getRiskScore(t);
    return {
      id: t.enseignant_id,
      name: t.teacher_name ?? t.enseignant_id,
      department: null,
      riskScore: score,
      riskLevel: toLevelOrNull(score),
      signals: decodeSignals(t.facteurs_risque),
      trend: t.tendance ?? null,
      criticalGaps: t.nb_gaps_critiques,
      recommendedAction: "—",
      recommendedTraining: null,
      openAlerts: 0,
    };
  });
}
