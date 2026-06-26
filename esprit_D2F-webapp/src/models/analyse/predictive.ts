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
  disengagement_signals?: string[];
  competency_stagnation_rate: number;
  training_velocity: number;
  recommendation: string;
  departement?: string;
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

/* ── Centre d'Action — Alertes ──────────────────────────────── */

export interface AlertSummaryCount {
  key: string;
  count: number;
}

export interface AlertTrendPoint {
  date: string;
  total: number;
  critiques: number;
}

export interface AlertSummary {
  by_type: AlertSummaryCount[];
  by_severite: AlertSummaryCount[];
  by_statut: AlertSummaryCount[];
  total: number;
  nouvelles: number;
  critiques_ouvertes: number;
  top_competences: Array<{ competence_id: number; count: number }>;
  top_departements: Array<{ departement_id: string; count: number }>;
  trend_30j: AlertTrendPoint[];
}

export interface BulkAlertUpdateRequest {
  alert_ids: number[];
  statut: string;
  traite_par?: string;
  commentaire?: string;
}

export interface BulkAlertUpdateResponse {
  statut: string;
  nb_demande: number;
  nb_modifie: number;
  introuvables: number[];
}

/* ── Centre d'Action — Actions prioritaires ────────────────── */

export interface PriorityActionCompetence {
  competence_id: number;
  competence_nom: string;
  niveau_actuel: number;
  niveau_requis: number;
}

export interface PriorityActionFormation {
  formation_id: number;
  formation_titre: string;
  probabilite_reussite: number;
  score_global: number;
}

export interface PriorityAction {
  enseignant_id: string;
  score_action: number;
  score_risque: number;
  niveau_risque: string | null;
  tendance: string | null;
  nb_gaps_critiques: number;
  nb_alertes_ouvertes: number;
  competence_prioritaire: PriorityActionCompetence | null;
  action_recommandee: string;
  meilleure_formation: PriorityActionFormation | null;
  impact_estime_niveaux: number | null;
}

/* ── Centre d'Action — Recommandations par cohorte ────────── */

export interface BatchRecommendationRequest {
  teacher_ids?: string[];
  departement_id?: string;
  top_n?: number;
}

export interface CohortRecommendation {
  formation_id: number;
  formation_titre: string;
  formation_type: string | null;
  nb_enseignants_concernes: number;
  probabilite_reussite_moyenne: number;
  score_global_moyen: number;
  competences_ciblees: number[];
}

export interface BatchRecommendationResponse {
  nb_enseignants: number;
  recommendations: CohortRecommendation[];
}

/* ── Visualisations avancées ────────────────────────────────── */

export interface SupplyDemandItem {
  competence_id: number;
  competence_nom: string;
  domaine_nom: string;
  demand_score: number;
  supply_ratio: number;
  nb_enseignants: number;
  nb_critiques: number;
  quadrant: string;
}

export interface RiskDistributionBucket {
  range: string;
  count: number;
}

export interface RiskDistributionDeptRow {
  departement: string;
  score_risque_moyen: number;
  nb_enseignants: number;
}

export interface RiskDistribution {
  histogram: RiskDistributionBucket[];
  by_level: Record<string, number>;
  by_department: RiskDistributionDeptRow[];
  total: number;
}

export interface HeatmapDrilldownTeacher {
  enseignant_id: string;
  niveau_actuel: number;
  niveau_requis: number;
  gap_score: number;
  niveau_urgence: string;
  mois_stagnation: number;
  score_risque: number | null;
  niveau_risque: string | null;
}

export interface HeatmapDrilldown {
  departement: string;
  competence_id: number;
  competence_nom: string | null;
  nb_enseignants: number;
  avg_gap: number;
  enseignants: HeatmapDrilldownTeacher[];
}
