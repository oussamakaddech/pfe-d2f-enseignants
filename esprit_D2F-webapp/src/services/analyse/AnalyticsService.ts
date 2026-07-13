import { defaultApi as axios } from "@/services/httpClient";
import { config } from "@/config/env";
import type {
  AnalyseResult, DashboardData,
  GapsResponse, HealthStatus, RecommendationsResponse,
  TeacherRiskProfile, TrainingPath,
  GroupedRecommendationsResponse, RecoGroupBy,
  WhatIfAction, WhatIfResponse,
} from "@/models/analyse";
import type {
  AnalyticsDepartementResponse, AnalyticsUP,
  EnseignantsInactifsParams, EnseignantsInactifsResponse,
  ExportExcelType, ExportPdfType,
  FormationsParPeriodeParams, FormationsParPeriodeResponse,
} from "@/models/analyse/reporting";

// Gateway: /api/analyse/** → /api/v1/** sur le service
const BASE = `${config.ANALYSE_URL}/analyse/v1/analytics`;

const AnalyticsService = {

  // ── Pipeline d'analyse ────────────────────────────────

  async analyzeEnseignant(enseignantId: string): Promise<AnalyseResult> {
    const res = await axios.post<AnalyseResult>(`${BASE}/analyze/${enseignantId}`);
    return res.data;
  },

  async triggerBatchAnalysis(): Promise<{ message: string; nb_queued: number }> {
    const res = await axios.post<{ message: string; nb_queued: number }>(`${BASE}/trigger-batch-analysis`);
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

  async getGroupedRecommendations(
    enseignantId: string,
    groupBy: RecoGroupBy = "competence",
  ): Promise<GroupedRecommendationsResponse> {
    const res = await axios.get<GroupedRecommendationsResponse>(
      `${BASE}/recommendations/${enseignantId}/grouped`,
      { params: { group_by: groupBy } }
    );
    return res.data;
  },

  async simulateWhatIf(payload: {
    enseignant_id: string;
    plan: WhatIfAction[];
    horizon_mois?: number;
  }): Promise<WhatIfResponse> {
    const res = await axios.post<WhatIfResponse>(
      `${BASE}/simulate/what-if`,
      payload
    );
    return res.data;
  },

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

  // ── Dashboard ─────────────────────────────────────────

  async getDashboardGlobal(): Promise<DashboardData> {
    const res = await axios.get<DashboardData>(`${BASE}/dashboard/global`);
    return res.data;
  },

  async getCompetencesDeclining(): Promise<DashboardData["competences_en_declin"]> {
    const res = await axios.get<DashboardData["competences_en_declin"]>(`${BASE}/dashboard/competences-declining`);
    return res.data;
  },

  async getTeachersAtRisk(seuil = 0.5): Promise<TeacherRiskProfile[]> {
    const res = await axios.get<TeacherRiskProfile[]>(
      `${BASE}/dashboard/teachers-at-risk`,
      { params: { seuil } }
    );
    return res.data;
  },

  // ── Recommandations — gestion du statut ────────────────

  async updateRecommendationStatus(
    recommendationId: number,
    statut: "ACCEPTEE" | "IGNOREE",
  ): Promise<{ id: number; statut: string; formation_titre: string }> {
    const res = await axios.patch<{ id: number; statut: string; formation_titre: string }>(
      `${BASE}/recommendations/${recommendationId}/status`,
      null,
      { params: { statut } },
    );
    return res.data;
  },

  // ── Reporting descriptif (features 1-4) ───────────────

  async getEnseignantsSansFormation(
    params: EnseignantsInactifsParams = {}
  ): Promise<EnseignantsInactifsResponse> {
    const res = await axios.get<EnseignantsInactifsResponse>(
      `${BASE}/enseignants-sans-formation`,
      {
        params: {
          mois: params.mois,
          departement: params.departement,
          up: params.up,
          page: params.page ?? 0,
          size: params.size ?? 20,
        },
      }
    );
    return res.data;
  },

  async getFormationsParPeriode(
    params: FormationsParPeriodeParams = {}
  ): Promise<FormationsParPeriodeResponse> {
    const res = await axios.get<FormationsParPeriodeResponse>(
      `${BASE}/formations-par-periode`,
      {
        params: {
          granularite: params.granularite ?? "MOIS",
          debut: params.debut,
          fin: params.fin,
          departement: params.departement,
          up: params.up,
        },
      }
    );
    return res.data;
  },

  async getFormationsParUp(
    opts: { annee?: number; departement?: string } = {}
  ): Promise<{ items: AnalyticsUP[] }> {
    const res = await axios.get<{ items: AnalyticsUP[] }>(
      `${BASE}/formations-par-up`,
      { params: { annee: opts.annee, departement: opts.departement } }
    );
    return res.data;
  },

  async getFormationsParDepartement(
    opts: { annee?: number } = {}
  ): Promise<AnalyticsDepartementResponse> {
    const res = await axios.get<AnalyticsDepartementResponse>(
      `${BASE}/formations-par-departement`,
      { params: { annee: opts.annee } }
    );
    return res.data;
  },

  // ── Export (téléchargement de fichier binaire) ────────

  async exportExcel(
    type: ExportExcelType,
    opts: { mois?: number; annee?: number; departement?: string; up?: string } = {}
  ): Promise<Blob> {
    const res = await axios.get<Blob>(`${BASE}/export/excel`, {
      params: { type, ...opts },
      responseType: "blob",
    });
    return res.data;
  },

  async exportPdf(type: ExportPdfType, opts: { annee?: number } = {}): Promise<Blob> {
    const res = await axios.get<Blob>(`${BASE}/export/pdf`, {
      params: { type, ...opts },
      responseType: "blob",
    });
    return res.data;
  },

  // ── Health ────────────────────────────────────────────

  async getHealth(): Promise<HealthStatus> {
    const res = await axios.get<HealthStatus>(`${BASE}/health`);
    return res.data;
  },
};

export default AnalyticsService;




