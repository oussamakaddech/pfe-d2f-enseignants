// ═══════════════════════════════════════════════════════════════════════════
// Contrat frontend unifié — D2F Redesign.
//
// Toutes les pages consomment ces types normalisés. Ils sont dérivés des hooks
// existants (useAnalysePredictive / useDashboard) et des modèles backend. Le
// but : un seul modèle de risque, une seule source de vérité, zéro logique
// dupliquée côté rendu.
// ═══════════════════════════════════════════════════════════════════════════

import type { RiskLevelKey } from "./risk";

// ── Enseignant à risque (une seule forme, partagée par les 2 pages) ─────────
export interface UnifiedRiskTeacher {
  readonly id: string;
  readonly name: string; // nom complet réel (jamais l'id)
  readonly department: string | null;
  /** Score unique normalisé [0,1]. */
  readonly riskScore: number | null;
  readonly riskLevel: RiskLevelKey | null;
  readonly signals: string[]; // libellés FR décodés
  readonly trend: "PROGRESSION" | "STABLE" | "REGRESSION" | null;
  readonly criticalGaps: number;
  readonly recommendedAction: string;
  readonly recommendedTraining: string | null;
  readonly openAlerts: number;
}

// ── Couverture compétence par département ───────────────────────────────────
export interface DeptCoverage {
  readonly department: string;
  /** null = non calculable (aucune évaluation). */
  readonly coveragePct: number | null;
  readonly evaluated: number;
}

// ── Écart compétence (heatmap) ──────────────────────────────────────────────
export interface HeatmapCell {
  readonly department: string;
  readonly competenceId: number;
  readonly competenceName: string;
  readonly avgGap: number;
  readonly teachersCount: number;
}

export interface HeatmapDrillTeacher {
  readonly teacherId: string;
  readonly name: string;
  readonly currentLevel: number;
  readonly requiredLevel: number;
  readonly gapScore: number;
  readonly urgency: RiskLevelKey | null;
  readonly stagnationMonths: number;
  readonly riskScore: number | null;
  readonly riskLevel: RiskLevelKey | null;
}

export interface HeatmapDrillDown {
  readonly department: string;
  readonly competenceName: string;
  readonly teachersCount: number;
  readonly avgGap: number;
  readonly teachers: HeatmapDrillTeacher[];
}

// ── Pression offre/demande (supply vs demand) ───────────────────────────────
export interface SupplyDemandItem {
  readonly competenceId: number;
  readonly competenceName: string;
  readonly domain: string;
  readonly demandPct: number; // part de demande 0–100
  readonly impactedTeachers: number;
  readonly criticalCount: number;
  readonly urgency: RiskLevelKey;
  readonly suggestedTraining: string;
  readonly quadrant: "INVESTIR" | "MAINTENIR" | "SURPLUS" | "SURVEILLER";
}

// ── Prévision (historique + projeté + intervalle) ───────────────────────────
export interface ForecastSeriesPoint {
  readonly period: string;
  readonly value: number;
  readonly lower?: number;
  readonly upper?: number;
  readonly isProjection: boolean;
}

export type ForecastKind = "demand" | "risk";

export interface ForecastView {
  readonly kind: ForecastKind;
  readonly horizonMonths: number;
  readonly series: ForecastSeriesPoint[];
  readonly note?: string;
}

// ── Répartition du risque ───────────────────────────────────────────────────
export interface RiskDistribution {
  readonly total: number;
  readonly byLevel: Record<RiskLevelKey, number>;
  readonly byDepartment: Array<{ department: string; avgRiskPct: number; teachers: number }>;
}

// ── Distribution mensuelle du risque (tendance) ──────────────────────────────
export interface RiskTrendPoint {
  readonly month: string;
  readonly critical: number;
  readonly elevated: number;
  readonly averageRiskPct: number | null;
}

// ── Alerte ─────────────────────────────────────────────────────────────────
export type AlertSeverity = "CRITICAL" | "WARNING" | "INFO";

export interface UnifiedAlert {
  readonly id: string;
  readonly severity: AlertSeverity;
  readonly title: string;
  readonly teacherId: string | null;
  readonly createdAt: string; // ISO
}

// ── Efficacité formation ───────────────────────────────────────────────────
export interface TrainingEffectiveness {
  readonly formationId: number;
  readonly title: string;
  readonly completionRate: number; // 0–1
  readonly avgLevelGain: number;
}

// ── Recommandation formation ───────────────────────────────────────────────
export interface FormationReco {
  readonly formationId: number;
  readonly title: string;
  readonly recommendationCount: number;
  readonly avgScore: number | null;
  readonly successProb: number; // 0–1
}

// ── Compétence en déclin / demande ──────────────────────────────────────────
export interface CompetencyPressure {
  readonly competenceId: number;
  readonly name: string;
  readonly domain: string;
  readonly delta: number | null; // variation de niveau (déclin négatif)
  readonly demandScore: number | null;
  readonly gaps: number;
}
