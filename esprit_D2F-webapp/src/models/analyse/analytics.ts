import type {
  GapHeatmapCell, TrainingEffectiveness, RiskEvolutionPoint, ModelPerformance,
} from "./predictive";

export type NiveauUrgence = "FAIBLE" | "MODEREE" | "HAUTE" | "CRITIQUE";
export type NiveauRisque  = "FAIBLE" | "MODERE" | "ELEVE" | "CRITIQUE";
export type TypeAlerte    =
  | "GAP_CRITIQUE"
  | "STAGNATION"
  | "REGRESSION"
  | "TENDANCE_DEPARTEMENT"
  | "COMPLETION_FAIBLE"
  | "BESOIN_NON_COUVERT";
export type SeveriteAlerte = "INFO" | "WARNING" | "CRITICAL";

// ── Analyse ───────────────────────────────────────────────

export interface AnalyseResult {
  enseignant_id:        string;
  prediction_result_id: number;
  statut:               "EN_COURS" | "TERMINE" | "ERREUR";
  nb_gaps_detectes:     number;
  nb_gaps_critiques:    number;
  nb_recommendations:   number;
  nb_alertes_generees:  number;
  duree_analyse_ms:     number;
}

// ── Gaps ─────────────────────────────────────────────────

export interface SkillGap {
  id:              number;
  competence_id:   number;
  competence_nom:  string;
  domaine_nom:     string | null;
  niveau_actuel:   number;
  niveau_requis:   number;
  niveau_vise:     number;
  gap_score:       number;
  priorite_score:  number;
  niveau_urgence:  NiveauUrgence;
  mois_stagnation: number;
  en_regression:   boolean;
  justification:   string | null;
  computed_at:     string;
}

export interface GapsResponse {
  enseignant_id: string;
  total:         number;
  page:          number;
  size:          number;
  gaps:          SkillGap[];
}

// ── Recommandations ───────────────────────────────────────

export interface RecoScoreFactors {
  pertinence?:            number;
  reussite?:              number;
  disponibilite?:         number;
  pairs?:                 number | null;
  nb_pairs_ayant_suivi?:  number;
  [key: string]:          unknown;
}

export interface Recommendation {
  id:                   number;
  formation_id:         number;
  formation_titre:      string;
  formation_type:       string | null;
  competence_id:        number;
  competence_nom?:      string | null;
  score_global:         number;
  // Scoring avancé (MSAS) — détail du score global.
  score_pertinence:     number;
  score_reussite:       number;
  score_disponibilite:  number;
  probabilite_reussite: number;
  facteurs_score?:      RecoScoreFactors;
  rang_dans_parcours:   number;
  justification:        string | null;
  statut:               "PROPOSEE" | "ACCEPTEE" | "IGNOREE" | "OBSOLETE";
}

export interface RecommendationsResponse {
  enseignant_id:    string;
  total:            number;
  page:             number;
  size:             number;
  recommendations:  Recommendation[];
}

// ── Regroupement des recommandations ────────────────────────

export type RecoGroupBy = "competence" | "type" | "urgence";

export interface RecommendationGroup {
  group_key:     string;
  group_label:   string;
  nb:            number;
  score_moyen:   number;
  score_max:     number;
  nb_acceptees:  number;
  items:         Recommendation[];
}

export interface GroupedRecommendationsResponse {
  enseignant_id:  string;
  group_by:       RecoGroupBy;
  total:          number;
  groups:         RecommendationGroup[];
}

// ── Simulation what-if (impact d'un plan de formation) ───────

export interface WhatIfAction {
  competence_id: number;
  niveau_vise:   number;
  formation_id?: number;
}

export interface WhatIfDetail {
  competence_id:   number;
  formation_id?:   number | null;
  niveau_actuel:  number;
  niveau_requis:  number;
  niveau_vise:    number;
  gap_avant:      number;
  gap_apres:      number;
  urgence_apres:  string;
  resolu:         boolean;
}

export interface WhatIfResponse {
  enseignant_id:      string;
  horizon_mois:       number;
  risk_before:        { score: number; niveau: string };
  risk_after:         { score: number; niveau: string };
  risk_reduction:     number;
  nb_gaps_before:     number;
  nb_gaps_after:      number;
  nb_gaps_resolus:    number;
  details:            WhatIfDetail[];
}

// ── Parcours de formation ─────────────────────────────────

export interface TrainingPathItem {
  rang:                number;
  formation_id:        number;
  formation_titre:     string;
  formation_type:      string | null;
  duree_heures:        number;
  niveau_avant:        number;
  niveau_apres:        number;
  est_obligatoire:     boolean;
  prerequis_satisfaits:boolean;
  deja_suivie:         boolean;
  score_formation:     number;
  justification:       string | null;
}

export interface TrainingPath {
  training_path_id:              number;
  enseignant_id:                 string;
  competence_id:                 number;
  competence_nom:                string;
  niveau_depart:                 number;
  niveau_vise:                   number;
  nb_formations:                 number;
  duree_totale_heures:           number;
  probabilite_reussite_globale:  number;
  statut:                        string;
  etapes:                        TrainingPathItem[];
}

// ── Profil risque ─────────────────────────────────────────

export interface TeacherRiskProfile {
  enseignant_id:    string;
  teacher_name:     string;
  score_risque:     number;
  niveau_risque:    NiveauRisque;
  tendance:         "PROGRESSION" | "STABLE" | "REGRESSION";
  nb_gaps_critiques:number;
  facteurs_risque:  string[] | null;
}

// ── Dashboard ─────────────────────────────────────────────

export interface CompetenceDeclin {
  competence_id:  number;
  competence_nom: string;
  domaine_nom:    string;
  niveau_actuel:  number;
  niveau_ancien:  number;
  delta:          number;
}

export interface CompetenceDemande {
  competence_id:  number;
  competence_nom: string;
  domaine_nom:    string;
  nb_gaps:        number;
  nb_critiques:   number;
  score_demande:  number;
}

export interface TopFormation {
  formation_id:        number;
  formation_titre:     string;
  nb_recommandations:  number;
  score_moyen:         number;
  proba_reussite_moy:  number;
}

export interface AlerteResumee {
  id:           number;
  type_alerte:  TypeAlerte;
  severite:     SeveriteAlerte;
  titre:        string;
  message?:     string | null;
  enseignant_id:string | null;
  created_at:   string;
}

export interface CouvertureDepartement {
  departement:     string;
  taux_couverture: number;
  nb_evalues:      number;
}

export interface DashboardData {
  competences_en_declin:        CompetenceDeclin[];
  competences_en_demande:       CompetenceDemande[];
  enseignants_a_risque:         TeacherRiskProfile[];
  taux_couverture_departements: CouvertureDepartement[];
  top_formations_recommandees:  TopFormation[];
  alertes_recentes:             AlerteResumee[];
  // ── KPIs avancés (déjà calculés par DashboardEngine.compute_all) ──────────
  // Optionnels pour rester compatible avec un backend antérieur.
  department_gap_heatmap?:      GapHeatmapCell[];
  training_effectiveness?:      TrainingEffectiveness[];
  monthly_risk_evolution?:      RiskEvolutionPoint[];
  model_performance?:           ModelPerformance;
  generated_at:                 string;
}

// ── Health ────────────────────────────────────────────────

export interface HealthStatus {
  status:         "healthy" | "degraded";
  service:        string;
  db:             "ok" | "error";
  nb_gaps_stored: number;
  nb_alerts_new:  number;
  timestamp:      string;
}

// ── Nouvelles fonctionnalités PFE ──────────────────────────

// 1) Prévision temporelle des niveaux de compétence
export interface SkillForecastPoint {
  mois:         number;
  date:         string;
  niveau_prevu: number;
  borne_basse:  number;
  borne_haute:  number;
}

export interface ForecastCompetence {
  competence_id:       number;
  competence_nom:      string;
  niveau_actuel:       number;
  niveau_requis:       number;
  niveau_prevu_final:  number;
  ecart_restant:       number;
  comblera_objectif:   boolean;
  en_regression:       boolean;
  points:              SkillForecastPoint[];
}

export interface SkillForecast {
  enseignant_id:       string;
  horizon_mois:        number;
  date_depart:         string;
  niveau_depart:       number;
  pente_mensuelle:     number;
  incertitude_sigma:   number;
  nb_points_historiques: number;
  global:              SkillForecastPoint[];
  competences:         ForecastCompetence[];
}

// 2) Benchmark vs pairs
export interface BenchmarkMetric {
  self:        number;
  pairs_moyen: number;
  percentile:  number;
}

export interface PeerBenchmark {
  enseignant_id: string;
  disponible:    boolean;
  raison?:       string;
  scope:         "DEPARTEMENT" | "UP";
  departement_id: string | null;
  up_id:         string | null;
  pairs:         number;
  niveau_moyen:  BenchmarkMetric;
  taux_completion: BenchmarkMetric;
  score_risque:  BenchmarkMetric;
  gaps_critiques: BenchmarkMetric;
}

// 3) Détection d'anomalies
export interface AnomalyItem {
  type:          string;
  severite:      SeveriteAlerte;
  titre:         string;
  message:       string;
  competence_id: number | null;
}

export interface AnomalyDetectionResult {
  enseignant_id: string;
  nb_anomalies:  number;
  anomalies:     AnomalyItem[];
}

export interface DepartmentAnomalyResult {
  departement_id:        string;
  nb_enseignants_scannes: number;
  nb_anomalies:          number;
  details:               AnomalyDetectionResult[];
}

// ── Dashboard de pilotage (nouveau, PFE) ────────────────────

export interface PilotageForecastKpis {
  horizon_mois:             number;
  nb_enseignants:           number;
  niveau_projet_moyen:      number;
  pct_objectifs_atteignables: number;
  nb_competences_regression: number;
  nb_competences_suivies:   number;
}

export interface PilotageDeptBenchmark {
  departement_id:    string;
  niveau_moyen:      number;
  ecart_vs_cohorte:  number;
  nb_enseignants:    number;
  position:          "AU_DESSUS" | "EN_DECA";
}

export interface PilotageAnomalyLive {
  nb_anomalies_recentes: number;
  fenetre_jours:         number;
  nb_nouvelles:          number;
  alertes:               AlerteResumee[];
}

export interface PilotageCorrelation {
  coefficient_pearson: number | null;
  nb_competences:      number;
  top_paires:          {
    competence_id: number;
    nb_besoins:    number;
    nb_gaps:       number;
  }[];
  interpretation:       string;
}

export interface PilotageDashboard {
  forecast_kpis:           PilotageForecastKpis;
  benchmark_departements: PilotageDeptBenchmark[];
  anomalies_live:         PilotageAnomalyLive;
  correlation_besoins_gaps: PilotageCorrelation;
  generated_at:           string;
}




