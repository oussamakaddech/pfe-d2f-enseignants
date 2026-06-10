export type Gravite = "elevee" | "moyenne" | "faible";

export interface AnalyseGap {
  competenceCode: string;
  competenceLabel: string;
  niveauActuel: number;
  niveauCible: number;
  gap: number;
  gravite: Gravite;
  explication: string;
}

export interface AnalyseRecommandation {
  ordre: number;
  formationId: number;
  titre: string;
  competencesCiblees: string[];
  dureeEstimee: string;
  prerequisManquants: string[];
  probabiliteReussite: number;
  justification: string;
}

export interface AnalyseData {
  enseignantId: string;
  competenceAnalysee: string;
  gaps: AnalyseGap[];
  overallRiskScore: number;
  recommandationsFormations: AnalyseRecommandation[];
  isHeuristic: boolean;
  modelNeedsTraining: boolean;
}

export interface DecliningCompetency {
  competency_id: number;
  competency_name: string;
  domaine_name?: string;
  demand_3m?: number;
  demand_12m?: number;
}

export interface InDemandCompetency extends DecliningCompetency {
  trend?: "increasing" | "stable";
}

export interface TeacherRiskIndicator {
  teacher_id: string;
  teacher_name: string;
  attrition_risk_score: number;
  disengagement_signals: string[];
  competency_stagnation_rate: number;
  training_velocity: number;
  recommendation: string;
}

export interface GapHeatmapCell {
  departement: string;
  competence_id: number;
  competence_nom: string;
  avg_gap: number;
  enseignants_count: number;
}

export interface TrainingEffectiveness {
  formation_id: number;
  formation_titre: string;
  avg_level_gain: number;
  completion_rate: number;
  nb_recommandee: number;
}

export interface RiskEvolutionPoint {
  month: string;
  critical: number;
  high: number;
}

export interface ModelPerformance {
  gap_model_accuracy: number | null;
  recommendation_avg_proba: number | null;
  last_retrained: string | null;
  last_retrain_status: string | null;
}

export interface OverviewDeltas {
  nb_enseignants_suivis: number | null;
  score_risque_moyen: number | null;
  nb_gaps_critiques: number | null;
  nb_alertes_nouvelles: number | null;
  taux_couverture_global: number | null;
  precision_modele: number | null;
}

export interface OverviewKpis {
  nb_enseignants_suivis: number;
  score_risque_moyen: number;
  nb_gaps_critiques: number;
  nb_alertes_nouvelles: number;
  taux_couverture_global: number;
  precision_modele: number | null;
  deltas: OverviewDeltas;
  score_risque_moyen_precedent: number | null;
  generated_at: string;
}

export interface ForecastPoint {
  month: string;
  value: number;
  lower?: number;
  upper?: number;
}

export interface DemandForecast {
  method: string;
  slope_par_mois?: number;
  history: ForecastPoint[];
  forecast: ForecastPoint[];
  note?: string;
}

export interface DriftReport {
  drift_detected: boolean;
  message?: string;
  recommendation?: string | null;
  days_since_training?: number;
  checked_features?: Array<{
    feature: string;
    previous_importance: number;
    current_importance: number;
    relative_change: number;
    drift_flag: boolean;
  }>;
}
