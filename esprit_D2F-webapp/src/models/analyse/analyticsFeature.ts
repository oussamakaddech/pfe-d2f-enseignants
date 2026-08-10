/**
 * Types DTO du module Analytics (alignés sur les schémas Pydantic du backend
 * esprit_D2F-predictive-analytics, routes /api/v1/analytics).
 *
 * Ces types sont la source de vérité côté UI. Ils sont volontairement proches
 * des modèles existants dans @/models/analyse mais regroupés ici pour le
 * feature-module demandé (séparation présentation/logique).
 */

// ── Énumérations métier ────────────────────────────────────
export type NiveauUrgence = 'FAIBLE' | 'MODEREE' | 'HAUTE' | 'CRITIQUE';
export type NiveauRisque = 'FAIBLE' | 'MODERE' | 'ELEVE' | 'CRITIQUE';
export type TypeAlerte =
  | 'GAP_CRITIQUE'
  | 'STAGNATION'
  | 'REGRESSION'
  | 'TENDANCE_DEPARTEMENT'
  | 'COMPLETION_FAIBLE'
  | 'BESOIN_NON_COUVERT';
export type SeveriteAlerte = 'INFO' | 'WARNING' | 'CRITICAL';
export type StatutAlerte = 'NOUVELLE' | 'LUE' | 'TRAITEE' | 'IGNOREE' | 'ESCALADEE';

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
  enseignant_nom: string | null;
  analysis_status?:
    | 'READY'
    | 'DATA_INCOMPLETE'
    | 'NOT_FOUND'
    | 'STALE_DATA'
    | 'COMPUTATION_FAILED'
    | 'MODEL_FALLBACK';
  data_source?: 'db' | 'csv_fallback' | 'cache' | 'heuristic' | 'ml_model';
  score: number; // 0..1
  niveau: NiveauRisque;
  facteurs: RiskFactor[];
  tendance: 'AMELIORATION' | 'STABLE' | 'DEGRADATION';
  precedent_score: number | null;
  computed_at: string;
  warnings?: string[];
  model_mode?: 'ML' | 'HEURISTIC_FALLBACK';
  model_version?: string | null;
}

// ── Analyse contextuelle par spécialité/UP/département (scope-analysis) ──
export interface TeacherContextInfo {
  teacher_id: string;
  nom_complet: string;
  mail: string;
  specialite: string | null;
  grade: string | null;
  up_id: string | null;
  up_libelle: string | null;
  dept_id: string | null;
  dept_libelle: string | null;
}

export interface TeacherScopeAnalysis {
  context: TeacherContextInfo;
  gaps: SkillGap[];
  recommendations: Recommendation[];
  scoped_competencies_count: number;
  total_competencies_count: number;
  is_fallback_global: boolean;
  computed_at: string;
}

// ── Dashboard impact reel (donnees base) ────────────────────
export interface RealDashboardKpis {
  nb_enseignants: number;
  nb_enseignants_avec_gaps: number;
  nb_gaps_critiques: number;
  nb_gaps_haute: number;
  nb_gaps_total: number;
  avg_gap_score: number;
  nb_alertes_non_traitees: number;
  nb_alertes_critiques: number;
  avg_risk_score: number;
  taux_couverture_pct: number;
  /** Statut du modèle de risque renvoyé dans kpis par /dashboard/real/impact. */
  model?: { name: string; mode: string; version?: string };
}

export interface RealHeatmapRow {
  dept_id: string | null;
  dept_libelle: string | null;
  competence_id: number;
  competence_code: string;
  competence_nom: string;
  avg_gap_score: number;
  nb_occurrences: number;
  nb_critiques: number;
  nb_haute: number;
  nb_enseignants_touches: number;
}

export interface RealAtRiskTeacher {
  enseignant_id: string;
  nom: string;
  prenom: string;
  specialite: string | null;
  grade: string | null;
  up_id: string | null;
  dept_id: string | null;
  up_libelle: string | null;
  dept_libelle: string | null;
  score_risque: number;
  niveau_risque: string;
  snapshot_date: string;
  nb_gaps_persistes: number;
  nb_gaps_critiques: number;
  max_gap_score: number;
}

export interface RealTopFormation {
  formation_id: number;
  titre_formation: string | null;
  competence_id: number | null;
  competence_nom: string | null;
  nb_recommandations: number;
  nb_enseignants: number;
  score_moyen: number;
  score_max: number;
  en_attente: number;
}

export interface RealCoverageByDept {
  dept_id: string | null;
  dept_libelle: string | null;
  nb_enseignants: number;
  nb_enseignants_avec_competences: number;
  nb_affectations: number;
  niveau_moyen: number;
}

export interface RealDashboardImpact {
  kpis: RealDashboardKpis;
  heatmap: RealHeatmapRow[];
  at_risk_teachers: RealAtRiskTeacher[];
  top_formations: RealTopFormation[];
  coverage_by_dept: RealCoverageByDept[];
  model?: { name: string; mode: string; version?: string };
  data_source: 'database' | 'csv';
  note?: string;
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
  statut: 'PROPOSEE' | 'ACCEPTEE' | 'IGNOREE' | 'OBSOLETE';
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
  statut: 'EN_COURS' | 'TERMINE' | 'ERREUR';
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
  cible_type: 'INDIVIDUEL' | 'DEPARTEMENT' | 'GLOBAL';
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
  /** Alertes ouvertes réelles par sévérité (backend, même filtre). */
  severity_open?: { CRITICAL: number; WARNING: number; INFO: number };
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
  position: 'AU_DESSUS' | 'EN_DECA';
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
    nb_profils_risque: number;
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
  source: 'modele' | 'heuristique';
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
  statut: 'DECLENCHE' | 'EN_COURS' | 'TERMINE' | 'ECHEC' | 'ROLLBACK';
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

// ── Impact d'une formation recommandée (F8) ────────────────
export interface TrainingImpactResponse {
  nb_enseignants_suivis: number;
  nb_chemins_termines: number;
  nb_formations_suivies: number;
  gain_niveau_moyen: number;
  reduction_risque_moyenne: number;
  nb_risque_reduit: number;
  nb_risque_augmente: number;
}

export interface FormationImpactRow {
  formation_id: number;
  formation_titre: string;
  formation_type: string | null;
  nb_enseignants: number;
  gain_niveau_moyen: number;
  niveau_moyen_avant: number;
  niveau_moyen_apres: number;
}

export interface TrainingImpactTopFormationsResponse {
  total: number;
  page: number;
  size: number;
  formations: FormationImpactRow[];
}

export interface WhatIfRiskSummary {
  score: number;
  niveau: string;
  tendance?: string;
}

export interface WhatIfDetail {
  competence_id: number;
  formation_id: number | null;
  niveau_actuel: number;
  niveau_requis: number;
  niveau_vise: number;
  gap_avant: number;
  gap_apres: number;
  urgence_apres: string;
  resolu: boolean;
}

export interface WhatIfResponse {
  enseignant_id: string;
  horizon_mois: number;
  risk_before: WhatIfRiskSummary;
  risk_after: WhatIfRiskSummary;
  risk_reduction: number;
  nb_gaps_before: number;
  nb_gaps_after: number;
  nb_gaps_resolus: number;
  details: WhatIfDetail[];
}

export interface WhatIfActionPayload {
  competence_id: number;
  niveau_vise: number;
  formation_id?: number | null;
}

export interface WhatIfRequestPayload {
  enseignant_id: string;
  plan: WhatIfActionPayload[];
  horizon_mois?: number;
}

export interface DsiError {
  status: number;
  error_code: string;
  message: string;
  path: string;
  trace_id?: string;
}

/**
 * Formes libres renvoyées par le backend predictive-analytics.
 * Volontairement permissives (champs optionnels) mais TYPÉES :
 * on interdit l'usage de `any` côté service (conformité DSI, audit TypeScript).
 */
export interface RawRiskTeacher {
  enseignant_id?: string;
  teacher_name?: string;
  departement?: string | null;
  up?: string | null;
  score_risque?: number;
  niveau_risque?: string;
  nb_gaps_critiques?: number;
  tendance?: string;
}

export interface RawDecliningSkill {
  competence_id?: string;
  competence_nom?: string;
  domaine_nom?: string | null;
  variation_moyenne?: number;
  pct_enseignants_en_declin?: number;
  nb_enseignants_concernes?: number;
}

export interface RawRiskTrendPoint {
  month?: string;
  critical?: number;
  high?: number;
  score_risque_moyen?: number;
}

export interface RawRiskDistribution {
  niveau?: string;
  count?: number;
}

export interface RawAlertEvent {
  id?: string;
  type_alerte?: string;
  enseignant_id?: string | null;
  departement_id?: string | null;
  competence_id?: number | string | null;
  severite?: string;
  titre?: string;
  message?: string;
  statut?: string;
  created_at?: string;
}

export interface RawHeatmapCell {
  departement?: string;
  competence_id?: string;
  competence_nom?: string;
  avg_gap?: number;
  enseignants_count?: number;
}

export interface RawDashboard {
  generated_at?: string;
  enseignants_a_risque?: RawRiskTeacher[];
  competences_en_declin?: RawDecliningSkill[];
  distribution_risques?: RawRiskDistribution[];
  monthly_risk_evolution?: RawRiskTrendPoint[];
  alertes_recentes?: RawAlertEvent[];
  department_gap_heatmap?: RawHeatmapCell[];
  top_formations_recommandees?: TopFormation[];
  kpis?: Record<string, unknown>;
  [key: string]: unknown;
}
