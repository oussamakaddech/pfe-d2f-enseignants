// ── Types analytiques D2F ─────────────────────────────────

export type NiveauUrgence = "FAIBLE" | "MODEREE" | "HAUTE" | "CRITIQUE";
export type NiveauRisque  = "FAIBLE" | "MODERE" | "ELEVE" | "CRITIQUE";
export type StatutAlerte  = "NOUVELLE" | "LUE" | "TRAITEE" | "IGNOREE" | "ESCALADEE";
export type TypeAlerte    =
  | "GAP_CRITIQUE"
  | "STAGNATION"
  | "REGRESSION"
  | "TENDANCE_DEPARTEMENT"
  | "COMPLETION_FAIBLE"
  | "BESOIN_NON_COUVERT";
export type SeveriteAlerte = "INFO" | "WARNING" | "CRITICAL";
export type CibleType = "INDIVIDUEL" | "COLLECTIF";

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

export interface Recommendation {
  id:                   number;
  formation_id:         number;
  formation_titre:      string;
  formation_type:       string | null;
  competence_id:        number;
  score_global:         number;
  probabilite_reussite: number;
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

// ── Alertes ───────────────────────────────────────────────

export interface AlertEvent {
  id:              number;
  type_alerte:     TypeAlerte;
  cible_type:      CibleType;
  enseignant_id:   string | null;
  departement_id:  string | null;
  competence_id:   number | null;
  severite:        SeveriteAlerte;
  titre:           string;
  message:         string;
  statut:          StatutAlerte;
  created_at:      string;
}

export interface AlertsResponse {
  total:  number;
  page:   number;
  size:   number;
  alerts: AlertEvent[];
}

// ── Profil risque ─────────────────────────────────────────

export interface TeacherRiskProfile {
  enseignant_id:    string;
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
  enseignant_id:string | null;
  created_at:   string;
}

export interface DashboardData {
  competences_en_declin:        CompetenceDeclin[];
  competences_en_demande:       CompetenceDemande[];
  enseignants_a_risque:         TeacherRiskProfile[];
  taux_couverture_departements: { departement: string; taux_couverture: number; nb_evalues: number }[];
  top_formations_recommandees:  TopFormation[];
  alertes_recentes:             AlerteResumee[];
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
