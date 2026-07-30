/**
 * D2F Master Service - Frontend API client
 *
 * Single source of truth for the predictive analytics dashboard.
 * Consumes ONLY the /api/v1/d2f/* endpoints (master dataset).
 *
 * All values are computed server-side from the master dataset,
 * never hardcoded in the frontend.
 */

import { defaultApi as axios } from "@/services/httpClient";
import { config } from "@/config/env";

// ── Types ──────────────────────────────────────────────

export interface DashboardKPIs {
  total_teachers: number;
  enseignants_a_risque: number;
  enseignants_critiques: number;
  score_risque_moyen: number;
  taux_couverture_global: number;
  nb_gaps_critiques: number;
  nb_alertes_nouvelles: number;
  nb_recommandations: number;
  generated_at: string;
}

export interface TeacherSummary {
  teacher_id: string;
  full_name: string;
  department_code: string;
  department_nom: string;
  up_code: string;
  status_metier: string;
  risk_score: number;
  risk_level: "CRITIQUE" | "ELEVE" | "MODERE" | "FAIBLE";
}

export interface TeacherGap {
  teacher_id: string;
  competence_code: string;
  competence_nom: string;
  domaine: string;
  current_level: number;
  required_level: number;
  gap_value: number;
  is_critical_gap: boolean;
}

export interface D2FAlert {
  alert_id: string;
  teacher_id: string;
  type: string;
  severity: string;
  competence_code: string | null;
  message: string;
  created_at: string;
  status: string;
}

export interface D2FRecommendation {
  recommendation_id: string;
  teacher_id: string;
  training_code: string;
  training_title: string;
  target_competency_code: string;
  relevance_score: number;
  expected_risk_reduction: number;
  explanation_fr: string;
  priority: string;
}

export interface TeacherProfile {
  teacher: Record<string, unknown>;
  risk_profile: {
    teacher_id: string;
    risk_score: number;
    risk_level: string;
    avg_gap: number;
    n_critical_gaps: number;
    n_active_alerts: number;
  };
  gaps: TeacherGap[];
  alerts: D2FAlert[];
  recommendations: D2FRecommendation[];
}

export interface AtRiskTeacherRow {
  teacher_id: string;
  teacher_name: string;
  department: string;
  department_code: string;
  up_code: string;
  risk_score: number;
  risk_level: string;
  n_critical_gaps: number;
  top_gaps: { competence_nom: string; gap_value: number }[];
}

export interface TrainingCompletionResult {
  teacher_id: string;
  training_code: string;
  old_risk_score: number;
  old_risk_level: string;
  new_risk_score: number;
  new_risk_level: string;
  risk_reduction: number;
  impact_message: string;
  next_recommendations: string;
}

export interface TeacherMLSignal {
  /** true si une vraie prediction ML a pu etre faite ; false si fallback heuristic. */
  available: boolean;
  /** Gap predit par le modele pour 3 mois (anticipation temporelle). */
  predicted_gap_next_3m: number | null;
  /** Confiance calibree du modele (0..1). */
  confidence: number | null;
  /** Nom du modele (gradient_boosting, xgboost, mlp, heuristic...). */
  model_name: string;
  /** Version du modele (entraine le X, vYYYYMMDD). */
  model_version: string | null;
  /** Top features ayant contribue a la prediction (SHAP-like). */
  top_factors: Array<{ feature: string; importance: number }>;
  /** true si on a du basculer sur le fallback (modele absent, skew, etc.). */
  fallback_mode: boolean;
  /** Raison textuelle quand available=false (ex: "model_not_loaded", "feature_skew"). */
  reason: string | null;
}

// ── Service ────────────────────────────────────────────

const BASE = `${config.ANALYSE_URL}/analyse/v1/d2f`;

const D2FService = {
  async getKPIs(): Promise<DashboardKPIs> {
    const res = await axios.get<DashboardKPIs>(`${BASE}/kpis`);
    return res.data;
  },

  async listTeachers(opts: { risk_level?: string; limit?: number } = {}): Promise<{
    total: number;
    teachers: TeacherSummary[];
  }> {
    const res = await axios.get<{ total: number; teachers: TeacherSummary[] }>(
      `${BASE}/teachers`,
      { params: { risk_level: opts.risk_level, limit: opts.limit ?? 100 } }
    );
    return res.data;
  },

  async getTeacherProfile(teacherId: string): Promise<TeacherProfile> {
    const res = await axios.get<TeacherProfile>(`${BASE}/teachers/${teacherId}`);
    return res.data;
  },

  async getTeacherMLSignal(teacherId: string): Promise<TeacherMLSignal> {
    const res = await axios.get<TeacherMLSignal>(
      `${BASE}/teachers/${teacherId}/ml-signal`
    );
    return res.data;
  },

  async getAtRiskTeachers(): Promise<{
    total_at_risk: number;
    total_teachers: number;
    threshold: number;
    teachers: AtRiskTeacherRow[];
  }> {
    const res = await axios.get(`${BASE}/at-risk`);
    return res.data;
  },

  async getCriticalTeachers(): Promise<{
    total_critical: number;
    teachers: AtRiskTeacherRow[];
  }> {
    const res = await axios.get(`${BASE}/critical`);
    return res.data;
  },

  async listAlerts(status?: string): Promise<{ total: number; alerts: D2FAlert[] }> {
    const res = await axios.get<{ total: number; alerts: D2FAlert[] }>(
      `${BASE}/alerts`,
      { params: status ? { status } : {} }
    );
    return res.data;
  },

  async listRecommendations(priority?: string): Promise<{
    total: number;
    recommendations: D2FRecommendation[];
  }> {
    const res = await axios.get<{ total: number; recommendations: D2FRecommendation[] }>(
      `${BASE}/recommendations`,
      { params: priority ? { priority } : {} }
    );
    return res.data;
  },

  async markTrainingCompleted(
    teacherId: string,
    trainingCode: string
  ): Promise<TrainingCompletionResult> {
    const res = await axios.post<TrainingCompletionResult>(
      `${BASE}/teachers/${teacherId}/training-complete`,
      null,
      { params: { training_code: trainingCode } }
    );
    return res.data;
  },

  async getHeatmap(): Promise<{
    cells: Array<{
      competence_code: string;
      competence_nom: string;
      departement: string;
      departement_nom: string;
      avg_gap: number;
      enseignants_count: number;
    }>;
    n_competences: number;
    n_departements: number;
  }> {
    const res = await axios.get(`${BASE}/heatmap`);
    return res.data;
  },

  async getTopFormations(limit: number = 10): Promise<{
    total: number;
    formations: Array<{
      recommendation_id: string;
      training_code: string;
      training_title: string;
      target_competency_code: string;
      teacher_id: string;
      relevance_score: number;
      expected_risk_reduction: number;
      explanation_fr: string;
      priority: string;
    }>;
  }> {
    const res = await axios.get(`${BASE}/top-formations`, {
      params: { limit },
    });
    return res.data;
  },

  async getPlanActions(): Promise<{
    n_alertes_critiques: number;
    n_recommandations_haute: number;
    traiter_alertes_critiques: number;
    couvrir_besoins_critiques: number;
    relancer_stagnation: number;
    soutenir_regression: number;
  }> {
    const res = await axios.get(`${BASE}/plan-actions`);
    return res.data;
  },

  async getStats(): Promise<{
    en_regression: number;
    en_stagnation: number;
    alertes_critiques_ouvertes: number;
    alertes_ouvertes: number;
    enseignants_couvert: number;
    total_teachers: number;
  }> {
    const res = await axios.get(`${BASE}/stats`);
    return res.data;
  },

  async getRiskEvolution(months = 6): Promise<{
    month: string;
    critical: number;
    high: number;
    score_risque_moyen: number;
    total_enseignants: number;
  }[]> {
    const res = await axios.get(`${BASE}/risk-evolution`, { params: { months } });
    return res.data;
  },
};

export default D2FService;
