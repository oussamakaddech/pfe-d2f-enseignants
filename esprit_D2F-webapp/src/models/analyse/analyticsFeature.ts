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

// ── Modes d'exécution du modèle (backend app/core/ml_status.py) ──
export type ModelMode = 'PRODUCTION_ML' | 'DEMO_ML' | 'HEURISTIC_FALLBACK' | 'ML' | 'HEURISTIC';

// ── Facteurs du score de risque (explicable) ───────────────
export interface RiskFactor {
  nom: string;
  /** Code technique du facteur (ex : `critical_gaps`), aligné sur le backend. */
  code: string;
  /** Valeur brute de la métrique (ex : 12 gaps critiques). */
  valeur_brute: number;
  /** Valeur normalisée dans [0, 1] (bornée par un cap documenté côté backend). */
  valeur_normalisee: number;
  /** Poids du facteur dans [0, 1] (fourni par le backend). */
  poids: number;
  /** Contribution au score = valeur_normalisee * poids, toujours dans [0, 1]. */
  contribution: number;
  /** Contribution en pourcentage (0..100) — jamais > 100 même pour un gros volume de gaps. */
  contribution_percent: number;
  explication: string;
  /**
   * Catégorie du facteur renseignée par le mapper du service :
   * - `PROBABILITE_ML` : probabilité de classe renvoyée par le classifier
   *   (feature backend `*_proba`) — jamais à confondre avec une contribution.
   * - `FACTEUR` : variable métier pondérée qui contribue au score de risque.
   */
  categorie?: 'PROBABILITE_ML' | 'FACTEUR';
  /**
   * Périmètre des gaps comptés dans ce facteur (fourni par le backend) :
   * - `TEACHER` : référentiel personnel (pas de rattachement ou périmètre global) ;
   * - `DEPARTMENT` : gaps du périmètre départemental/UP de l'enseignant.
   */
  scope?: string;
  /** Type du scope (TEACHER / DEPARTMENT / UP), fourni par le backend. */
  scope_type?: string;
  /** Identifiant du scope (ex : ENS024, DEP_RESEAUX), fourni par le backend. */
  scope_id?: string | null;
  /** Libellé affichable du scope (ex : « Département Réseaux »), fourni par le backend. */
  scope_label?: string | null;
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
  /** Score de risque en pourcentage (0..100), dérivé par le mapper du service. */
  score_percent: number;
  /** Libellé du niveau de risque, dérivé par le mapper depuis level. */
  level_label: string;
  niveau: NiveauRisque;
  facteurs: RiskFactor[];
  tendance: 'AMELIORATION' | 'STABLE' | 'DEGRADATION';
  precedent_score: number | null;
  computed_at: string;
  warnings?: string[];
  model_mode?: ModelMode;
  model_version?: string | null;
  /** Nom de l'artefact du modèle (ex : `gap_predictor_temporal`), fourni par l'API. */
  model_name?: string | null;
  /** Algorithme du modèle (ex : `Gradient Boosting temporel`), fourni par l'API. */
  model_algorithm?: string | null;
  /** Validité de la cible prédictive (EXTRAPOLATED_TARGET | REAL_VALIDATED_TARGET | OBSERVED_IN_SIMULATION). */
  target_validity?: string | null;
  validation_scope?: string | null;
  data_origin?: string | null;
  /** Type de score : WEIGHTED_HEURISTIC_INDEX (indice pondéré, pas une probabilité). */
  score_type?: string | null;
  /** Statut de calibration de l'indice : NOT_CALIBRATED tant qu'aucune étude n'est faite. */
  calibration_status?: string | null;
  /** Vrai si la somme des contributions a été plafonnée à 1.0. */
  is_capped?: boolean;
  /** Somme brute des contributions avant plafonnement (peut dépasser 1.0). */
  uncapped_score?: number;
  /** Moteur ayant RÉELLEMENT servi le score : 'ML' (modèle calibré) | 'HEURISTIC' (repli fail-closed). */
  mode?: 'ML' | 'HEURISTIC';
  /** Classe de risque prédite par le modèle (LOW | MEDIUM | HIGH | CRITICAL). */
  risk_class?: string | null;
  /** Probabilité calibrée de la classe prédite (0..1) — modèle ML uniquement. */
  probability_calibrated?: number | null;
  /** Probabilités calibrées par classe (somme = 1) — modèle ML uniquement. */
  probabilities?: Record<string, number> | null;
  /** Top contributions du modèle (SHAP / méthode étiquetée) — modèle ML uniquement. */
  contributions?: RiskContribution[] | null;
  /** Méthode d'explication (shap.TreeExplainer, logistic_coefficients...). */
  explanation_method?: string | null;
  /** Raison explicite du repli heuristique (fail-closed) — mode HEURISTIC uniquement. */
  fallback_reason?: string | null;
  /** Décomposition heuristique de référence (0,50/0,12/0,40) conservée comme vue secondaire. */
  heuristic_reference?: {
    description?: string;
    weights?: Record<string, number>;
    factors?: RiskFactor[];
  } | null;
}

/** Contribution individuelle du modèle de risque (top-k SHAP ou proxy étiqueté). */
export interface RiskContribution {
  feature: string;
  value: number;
  impact: number;
  method: string;
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

export type ScopeType = 'GLOBAL' | 'DEPARTMENT' | 'UP';

/** Périmètre de l'analyse contextuelle, rendu explicite par le backend. */
export interface TeacherScope {
  type: ScopeType;
  is_global: boolean;
  /** Libellé affichable : « Périmètre global », « Département … », « Unité pédagogique … ». */
  label: string;
}

export interface TeacherScopeAnalysis {
  context: TeacherContextInfo;
  gaps: SkillGap[];
  recommendations: Recommendation[];
  scoped_competencies_count: number;
  total_competencies_count: number;
  scope: TeacherScope;
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
  tendance?: string | null;
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
  /** Classe de risque servie (mode ML) — optionnel. */
  risk_class?: string | null;
  /** Probabilité calibrée (mode ML) — optionnel. */
  probability_calibrated?: number | null;
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
  observed_result: number; // Résultat réel observé de l'enseignant
  knowledge_difficulty_level: number; // Niveau de difficulté du savoir (référentiel)
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
  /**
   * Compteurs agrégés sur l'ensemble des gaps de l'enseignant (calculés par le
   * mapper du service, indépendants du filtre d'urgence et de la pagination).
   */
  gaps_summary: {
    total: number;
    critical: number;
    high: number;
    stagnant: number;
    declining: number;
  };
  /** Métadonnées du modèle telles que renvoyées par l'API (uniquement si présentes). */
  model?: {
    model_mode?: ModelMode;
    model_version?: string;
    fallback_reason?: string;
    dataset_version?: string;
    prediction_horizon?: string;
    synthetic_share_pct?: number;
    total_rows?: number;
    real_rows?: number;
    target_validity?: string | null;
    target_validity_label?: string | null;
    data_origin?: string | null;
    validation_scope?: string | null;
    /** Avertissement de proximité des bornes d'entraînement (limite 4.2). */
    near_boundary_warning?: {
      code: string;
      message: string;
      features: string[];
    } | null;
  };
  /** Validité de la cible prédictive (EXTRAPOLATED_TARGET | REAL_VALIDATED_TARGET | OBSERVED_IN_SIMULATION). */
  target_validity?: string | null;
  validation_scope?: string | null;
  data_origin?: string | null;
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
