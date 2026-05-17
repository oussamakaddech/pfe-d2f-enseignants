import { defaultApi as axios } from "../utils/httpClient";
import { config } from "../config/env";
import type {
  AlertEvent, AlertsResponse, AnalyseResult, DashboardData,
  GapsResponse, HealthStatus, RecommendationsResponse,
  TeacherRiskProfile, TrainingPath,
} from "../models/analytics";

// Gateway: /api/analyse/** → /api/v1/** sur le service
const BASE = `${config.ANALYSE_URL}/analyse/v1/analytics`;

const AnalyticsService = {

  // ── Pipeline d'analyse ────────────────────────────────

  async analyzeEnseignant(enseignantId: string): Promise<AnalyseResult> {
    const res = await axios.post<AnalyseResult>(`${BASE}/analyze/${enseignantId}`);
    return res.data;
  },

  async triggerBatchAnalysis(): Promise<{ message: string; nb_queued: number }> {
    const res = await axios.post(`${BASE}/trigger-batch-analysis`);
    return res.data;
  },

  // ── Gaps ─────────────────────────────────────────────

  async getGaps(
    enseignantId: string,
    opts: { urgence?: string; page?: number; size?: number } = {}
  ): Promise<GapsResponse> {
    const res = await axios.get<GapsResponse>(`${BASE}/gaps/${enseignantId}`, {
      params: { urgence: opts.urgence, page: opts.page ?? 0, size: opts.size ?? 20 },
    });
    return res.data;
  },

  // ── Recommandations ───────────────────────────────────

  async getRecommendations(
    enseignantId: string,
    opts: { competence_id?: number; page?: number; size?: number } = {}
  ): Promise<RecommendationsResponse> {
    const res = await axios.get<RecommendationsResponse>(
      `${BASE}/recommendations/${enseignantId}`,
      { params: { competence_id: opts.competence_id, page: opts.page ?? 0, size: opts.size ?? 20 } }
    );
    return res.data;
  },

  // ── Parcours ─────────────────────────────────────────

  async getTrainingPath(enseignantId: string, competenceId: number): Promise<TrainingPath> {
    const res = await axios.get<TrainingPath>(
      `${BASE}/training-path/${enseignantId}/${competenceId}`
    );
    return res.data;
  },

  // ── Alertes ───────────────────────────────────────────

  async getAlerts(params: {
    type_alerte?: string;
    severite?: string;
    statut?: string;
    enseignant_id?: string;
    departement_id?: string;
    page?: number;
    size?: number;
  } = {}): Promise<AlertsResponse> {
    const res = await axios.get<AlertsResponse>(`${BASE}/alerts`, { params });
    return res.data;
  },

  async updateAlertStatus(
    alertId: number,
    statut: string,
    traitePar?: string,
    commentaire?: string
  ): Promise<{ id: number; statut: string }> {
    const res = await axios.patch(`${BASE}/alerts/${alertId}`, null, {
      params: { statut, traite_par: traitePar, commentaire },
    });
    return res.data;
  },

  // ── Dashboard ─────────────────────────────────────────

  async getDashboardGlobal(): Promise<DashboardData> {
    const res = await axios.get<DashboardData>(`${BASE}/dashboard/global`);
    return res.data;
  },

  async getCompetencesDeclining(): Promise<DashboardData["competences_en_declin"]> {
    const res = await axios.get(`${BASE}/dashboard/competences-declining`);
    return res.data;
  },

  async getTeachersAtRisk(seuil = 0.50): Promise<TeacherRiskProfile[]> {
    const res = await axios.get<TeacherRiskProfile[]>(
      `${BASE}/dashboard/teachers-at-risk`,
      { params: { seuil } }
    );
    return res.data;
  },

  // ── Health ────────────────────────────────────────────

  async getHealth(): Promise<HealthStatus> {
    const res = await axios.get<HealthStatus>(`${BASE}/health`);
    return res.data;
  },
};

export default AnalyticsService;
