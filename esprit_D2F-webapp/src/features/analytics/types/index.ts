/**
 * Types DTO du module Analytics (alignés sur les schémas Pydantic du backend
 * esprit_D2F-predictive-analytics, routes /api/v1/analytics).
 *
 * Ces types sont la source de vérité côté UI. Ils sont volontairement proches
 * des modèles existants dans @/models/analyse mais regroupés ici pour le
 * feature-module demandé (séparation présentation/logique).
 */

// ── Énumérations métier ────────────────────────────────────
export type NiveauUrgence = "FAIBLE" | "MODEREE" | "HAUTE" | "CRITIQUE";
export type NiveauRisque = "FAIBLE" | "MODERE" | "ELEVE" | "CRITIQUE";
export type TypeAlerte =
  | "GAP_CRITIQUE"
  | "STAGNATION"
  | "REGRESSION"
  | "TENDANCE_DEPARTEMENT"
  | "COMPLETION_FAIBLE"
  | "BESOIN_NON_COUVERT";
export type SeveriteAlerte = "INFO" | "WARNING" | "CRITICAL";
export type StatutAlerte =
  | "NOUVELLE"
  | "LUE"
  | "TRAITEE"
  | "IGNOREE"
  | "ESCALADEE";

// ── Facteurs du score de risque (explicable) ───────────────
export interface RiskFactor {
  nom: string;
  valeur_brute: number;
  poids: number;
  contribution: number;
  explication: string;
}

export interface RiskScore {
  enseignant_id: string;
  score: number; // 0..1
  niveau: NiveauRisque;
  facteurs: RiskFactor[];
  tendance: "AMELIORATION" | "STABLE" | "DEGRADATION";
  precedent_score: number | null;
  computed_at: string;
}

// ── Historique du score de risque (F3) ───────────────
export interface RiskHistoryPoint {
  date: string;
  score: number; // 0..1
  niveau: NiveauRisque;
  tendance: string;
}

export interface RiskHistoryResponse {
  enseignant_id: string;
  points: RiskHistoryPoint[];
}

// ── Gaps de compétence ─────────────────────────────────────
export interface SkillGap {
  id: number;
  competence_id: number;
  competence_code: string;
  competence_nom: string;
  domaine_nom: string | null;
  niveau_actuel: number; // N1..N5
  niveau_requis: number;
  niveau_vise: number;
  gap_score: number; // 0..1
  priorite_score: number;
  niveau_urgence: NiveauUrgence;
  mois_stagnation: number;
  en_regression: boolean;
  nb_besoins_exprimes: number;
  justification: string | null;
  computed_at: string;
}

export interface GapsResponse {
  enseignant_id: string;
  total: number;
  page: number;
  size: number;
  gaps: SkillGap[];
}

// ── Recommandations ────────────────────────────────────────
export interface Recommendation {
  id: number;
  formation_id: number;
  formation_titre: string;
  formation_type: string | null;
  competence_id: number;
  competence_nom: string | null;
  score_global: number;
  score_pertinence: number;
  score_reussite: number;
  score_disponibilite: number;
  probabilite_reussite: number;
  rang_dans_parcours: number;
  est_prerequis: boolean;
  prerequis_satisfaits: boolean;
  niveau_apres: number | null;
  niveau_actuel: number | null;
  justification: string | null;
  statut: "PROPOSEE" | "ACCEPTEE" | "IGNOREE" | "OBSOLETE";
}

export interface RecommendationsResponse {
  enseignant_id: string;
  total: number;
  page: number;
  size: number;
  recommendations: Recommendation[];
}

// ── Parcours de formation ordonné ──────────────────────────
export interface TrainingPathItem {
  rang: number;
  formation_id: number;
  formation_titre: string;
  formation_type: string | null;
  duree_heures: number;
  est_obligatoire: boolean;
  prerequis_competences: Array<{ competence_id: number; niveau_requis: number }> | null;
  niveau_avant: number;
  niveau_apres: number;
  prerequis_satisfaits: boolean;
  deja_suivie: boolean;
  probabilite_reussite: number;
  justification: string | null;
}

export interface TrainingPath {
  enseignant_id: string;
  competence_id: number;
  competence_nom: string;
  niveau_depart: number;
  niveau_vise: number;
  nb_formations: number;
  duree_totale_heures: number;
  probabilite_reussite_globale: number;
  statut: string;
  items: TrainingPathItem[];
}

// ── Résultat d'analyse ─────────────────────────────────────
export interface AnalyseResult {
  enseignant_id: string;
  prediction_result_id: number;
  statut: "EN_COURS" | "TERMINE" | "ERREUR";
  nb_gaps_detectes: number;
  nb_gaps_critiques: number;
  nb_recommendations: number;
  nb_alertes_generees: number;
  duree_analyse_ms: number;
}

// ── Alertes ────────────────────────────────────────────────
export interface AlertEvent {
  id: number;
  type_alerte: TypeAlerte;
  cible_type: "INDIVIDUEL" | "DEPARTEMENT" | "GLOBAL";
  enseignant_id: string | null;
  departement_id: string | null;
  competence_id: number | null;
  severite: SeveriteAlerte;
  titre: string;
  message: string;
  statut: StatutAlerte;
  created_at: string;
}

export interface AlertListResponse {
  total: number;
  page: number;
  size: number;
  alerts: AlertEvent[];
}

/** Payload de mise à jour du cycle de vie d'une alerte (F5). */
export interface AlertUpdatePayload {
  statut: StatutAlerte;
  traite_par?: string;
  commentaire?: string;
}

// ── Dashboard global ──────────────────────────────────────
export interface AtRiskTeacher {
  enseignant_id: string;
  nom: string;
  departement: string | null;
  up: string | null;
  score_risque: number;
  niveau_risque: NiveauRisque;
  nb_gaps_critiques: number;
  tendance: string;
}

export interface DecliningSkill {
  competence_id: number;
  competence_nom: string;
  domaine_nom: string | null;
  variation_moyenne: number; // delta de niveau sur la période
  pct_enseignants_en_declin: number;
  nb_enseignants_concernes: number;
}

export interface HeatmapCell {
  departement: string;
  competence_id: number;
  competence_nom: string;
  avg_gap: number; // 0..1
  enseignants_count: number;
}

export interface RiskDistributionBucket {
  niveau: NiveauRisque;
  count: number;
}

export interface TrendPoint {
  month: string;
  nb_gaps_critiques: number;
  score_risque_moyen: number;
  nb_alertes: number;
}

export interface DashboardFilters {
  departement_id?: string;
  up_id?: string;
  periode_debut?: string; // ISO date
  periode_fin?: string;
  niveau_risque?: NiveauRisque;
}

export interface TopFormation {
  formation_id: number;
  formation_titre: string;
  nb_recommandations: number;
  score_moyen: number;
  proba_reussite_moy: number;
  enseignants_cibles: number;
  departements: string[];
  competences_couvertes: string[];
  impact_estime: number;
}

// ── Prévision institutionnelle (F9) ──────────────────────
export interface PilotageForecastKpis {
  horizon_mois: number;
  nb_enseignants: number;
  niveau_projet_moyen: number;
  pct_objectifs_atteignables: number;
  nb_competences_regression: number;
  nb_competences_suivies: number;
}

export interface PilotageBenchmarkDept {
  departement_id: string;
  niveau_moyen: number;
  ecart_vs_cohorte: number;
  nb_enseignants: number;
  position: "AU_DESSUS" | "EN_DECA";
}

export interface PilotageAnomalies {
  nb_anomalies_recentes: number;
  fenetre_jours: number;
  nb_nouvelles: number;
  alertes: AlertEvent[];
}

export interface PilotageCorrelation {
  coefficient_pearson: number | null;
  nb_competences: number;
  top_paires: Array<{ competence_id: number; nb_besoins: number; nb_gaps: number }>;
  interpretation: string;
}

export interface PilotageResponse {
  forecast_kpis: PilotageForecastKpis;
  benchmark_departements: PilotageBenchmarkDept[];
  anomalies_live: PilotageAnomalies;
  correlation_besoins_gaps: PilotageCorrelation;
  generated_at: string;
}

export interface DashboardResponse {
  generated_at: string;
  filtres: DashboardFilters;
  kpis: {
    nb_enseignants_suivis: number;
    score_risque_moyen: number;
    nb_gaps_critiques: number;
    nb_alertes_nouvelles: number;
    taux_couverture_global: number;
    nb_regression: number;
    nb_stagnation: number;
    besoins_critiques_non_satisfaits: number;
    alertes_critiques_ouvertes: number;
  };
  enseignants_a_risque: AtRiskTeacher[];
  competences_en_declin: DecliningSkill[];
  distribution_risques: RiskDistributionBucket[];
  tendances: TrendPoint[];
  alertes_recentes: AlertEvent[];
  heatmap: HeatmapCell[];
  top_formations: TopFormation[];
}

// ── Monitoring modèle ──────────────────────────────────────
export interface ModelStatus {
  version: string;
  entraîné_le: string | null;
  algorithme: string;
  features_count: number;
  accuracy: number | null;
  f1_score: number | null;
  drift_detected: boolean;
  derniere_verification_integrite: string | null;
  integrite_ok: boolean;
  source: "modele" | "heuristique";
  disponible: boolean;
}

export interface DriftReport {
  drift_detected: boolean;
  metric: string;
  valeur_actuelle: number;
  seuil: number;
  jours_depuis_entrainement: number;
  message: string;
  detected_at: string;
}

export interface RetrainResponse {
  job_id: string;
  statut: "DECLENCHE" | "EN_COURS" | "TERMINE" | "ECHEC" | "ROLLBACK";
  message: string;
  ancienne_version: string;
  nouvelle_version: string | null;
  accuracy_avant: number | null;
  accuracy_apres: number | null;
  rollback_effectue: boolean;
}

// ── Pagination générique ───────────────────────────────────
export interface PageQuery {
  page?: number;
  size?: number;
}

export interface DsiError {
  status: number;
  error_code: string;
  message: string;
  path: string;
  trace_id?: string;
}
