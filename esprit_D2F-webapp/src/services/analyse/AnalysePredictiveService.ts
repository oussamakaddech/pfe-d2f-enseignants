import { defaultApi as axios } from '@/services/httpClient';
import { config } from '@/config/env';

// Base legacy du service d'analyse prédictive: /api/analyse/**
const PREDICTIVE_API = `${config.ANALYSE_URL}/analyse`;
// Endpoints du pipeline analytics v1: /api/analyse/v1/analytics/**
const ANALYTICS_V1 = `${config.ANALYSE_URL}/analyse/v1/analytics`;

import type {
  Gravite,
  AnalyseGap,
  AnalyseRecommandation,
  AnalyseData,
  DriftReport,
  DecliningCompetency,
  InDemandCompetency,
  TeacherRiskIndicator,
  GapHeatmapCell,
  TrainingEffectiveness,
  RiskEvolutionPoint,
  ModelPerformance,
  OverviewKpis,
  DemandForecast,
  TrainingNeedsForecast,
  AlertSummary,
  BulkAlertUpdateRequest,
  BulkAlertUpdateResponse,
  PriorityAction,
  BatchRecommendationRequest,
  BatchRecommendationResponse,
  SupplyDemandItem,
  RiskDistribution,
  HeatmapDrilldown,
  TopFormation,
} from '@/models/analyse';
export type { Gravite, AnalyseGap, AnalyseRecommandation, AnalyseData, DriftReport };

interface RawGapItem {
  competency_id: number;
  competency_name: string;
  current_level: number;
  required_level: number;
  predicted_gap: number;
  confidence?: number;
  explanation?: { method?: string; model_trained?: boolean };
}

interface RawPathStep {
  step_number: number;
  formation_id: number;
  formation_title: string;
  competency_name: string;
  estimated_duration_hours: number;
  missing_prerequisites?: string[];
  success_probability: number;
}

interface PredictGapsResponse {
  gaps: RawGapItem[];
  overall_risk_score: number;
  explanation?: { method?: string; model_trained?: boolean };
}

interface RecommendPathResponse {
  path: RawPathStep[];
}

interface DashboardSummaryResponse {
  declining_competencies: DecliningCompetency[];
  in_demand_competencies: InDemandCompetency[];
  teacher_risk_indicators: TeacherRiskIndicator[];
}

function mapGapItem(g: RawGapItem, isHeuristic: boolean): AnalyseGap {
  let gravite: Gravite = 'faible';
  if (g.predicted_gap >= 2) gravite = 'elevee';
  else if (g.predicted_gap >= 1) gravite = 'moyenne';
  return {
    competenceCode: `C${g.competency_id}`,
    competenceLabel: g.competency_name,
    niveauActuel: g.current_level,
    niveauCible: g.required_level,
    gap: g.predicted_gap,
    gravite,
    explication: isHeuristic
      ? `Gap estimé (heuristique): ${g.predicted_gap.toFixed(1)} — Entraînez le modèle pour des prédictions plus précises`
      : `Gap prédit: ${g.predicted_gap.toFixed(1)} (confiance: ${((g.confidence ?? 0) * 100).toFixed(0)}%)`,
  };
}

const AnalysePredictiveService = {
  // ── Prediction ─────────────────────────────────
  async predictGaps(
    enseignantId: string,
    horizonMonths = 6,
    topN = 10,
  ): Promise<PredictGapsResponse> {
    const res = await axios.post(`${PREDICTIVE_API}/predict/gaps/${enseignantId}`, {
      teacher_id: enseignantId,
      horizon_months: horizonMonths,
      top_n: topN,
    });
    return res.data;
  },

  async trainModel(): Promise<{
    status?: string;
    message?: string;
    hint?: string;
    metrics?: { cv_rmse?: number; test_r2?: number };
  }> {
    const res = await axios.post(`${PREDICTIVE_API}/predict/train`, {});
    return res.data;
  },

  async getDrift(): Promise<DriftReport> {
    const res = await axios.get(`${PREDICTIVE_API}/predict/drift`);
    return res.data;
  },

  // ── Recommendation ─────────────────────────────
  async recommendPath(
    teacherId: string,
    targetCompetencyId: number,
    targetLevel = 4,
    maxDurationHours?: number,
  ): Promise<RecommendPathResponse> {
    const res = await axios.post(`${PREDICTIVE_API}/recommend/path`, {
      teacher_id: teacherId,
      target_competency_id: targetCompetencyId,
      target_level: targetLevel,
      max_duration_hours: maxDurationHours ?? null,
    });
    return res.data;
  },

  // ── Detection ──────────────────────────────────
  async getAtRiskTeachers(threshold = 0.5): Promise<TeacherRiskIndicator[]> {
    const res = await axios.get<{
      teachers: Array<{
        teacher_id: string;
        teacher_name: string;
        email: string;
        department?: string;
        risk_score: number;
        risk_factors: string[];
        top_gaps: unknown[];
        last_training_date?: string;
        engagement_score: number;
      }>;
    }>(`${PREDICTIVE_API}/detect/at-risk-teachers`, {
      params: { threshold },
    });
    const riskRecommendation = (score: number): string => {
      if (score >= 0.75) return 'Planifier entretien';
      if (score >= 0.5) return 'Proposer formation';
      return 'OK';
    };
    return (res.data.teachers || []).map((t) => {
      const recommendation = riskRecommendation(t.risk_score);
      return {
        teacher_id: t.teacher_id,
        teacher_name: t.teacher_name,
        attrition_risk_score: t.risk_score,
        disengagement_signals: t.risk_factors,
        competency_stagnation_rate: 1.0 - t.engagement_score,
        training_velocity: 0,
        // Aligné sur le moteur (app/routers/all.py::_risk_recommendation) :
        // >=0.75 -> Planifier entretien, >=0.50 -> Proposer formation, sinon OK.
        recommendation,
        departement: t.department,
      };
    });
  },

  // ── Dashboard ──────────────────────────────────
  async getDashboardSummary(): Promise<DashboardSummaryResponse> {
    const res = await axios.get(`${PREDICTIVE_API}/dashboard/summary`);
    const data = res.data as unknown as {
      declining_competencies?: unknown[];
      in_demand_competencies?: unknown[];
      teacher_risk_indicators?: Array<Record<string, unknown>>;
    };
    // Le backend renvoie `department` ; on normalise en `departement` (contrat front).
    (data.teacher_risk_indicators ?? []).forEach((t) => {
      if (t.department != null && t.departement == null) t.departement = t.department;
    });
    return data as unknown as DashboardSummaryResponse;
  },

  async getDecliningCompetencies(): Promise<DecliningCompetency[]> {
    const res = await axios.get(`${ANALYTICS_V1}/dashboard/competences-declining`);
    return res.data;
  },

  async getInDemandCompetencies(): Promise<InDemandCompetency[]> {
    const res = await axios.get(`${PREDICTIVE_API}/dashboard/in-demand-competencies`);
    return res.data;
  },

  async getTeacherRiskIndicators(): Promise<TeacherRiskIndicator[]> {
    const res = await axios.get(`${PREDICTIVE_API}/dashboard/teacher-risk-indicators`);
    const data = res.data as unknown as Array<Record<string, unknown>>;
    // Le backend renvoie `department` ; on normalise en `departement` (contrat front).
    data.forEach((t) => {
      if (t.department != null && t.departement == null) t.departement = t.department;
    });
    return data as unknown as TeacherRiskIndicator[];
  },

  // ── Dashboard prédictif avancé (analytics v1) ──────────────
  async getGapHeatmap(): Promise<GapHeatmapCell[]> {
    const res = await axios.get(`${ANALYTICS_V1}/dashboard/gap-heatmap`);
    // Le backend enveloppe parfois le tableau dans `{ value: [...] }`.
    const data = res.data as GapHeatmapCell[] | { value?: GapHeatmapCell[] };
    return Array.isArray(data) ? data : (data.value ?? []);
  },

  async getTrainingEffectiveness(): Promise<TrainingEffectiveness[]> {
    const res = await axios.get(`${ANALYTICS_V1}/dashboard/training-effectiveness`);
    return res.data;
  },

  async getTopFormationsRecommandees(): Promise<TopFormation[]> {
    const res = await axios.get(`${ANALYTICS_V1}/dashboard/top-formations`);
    const data = res.data as TopFormation[] | { value?: TopFormation[] };
    return Array.isArray(data) ? data : (data.value ?? []);
  },

  async getRiskEvolution(months = 6): Promise<RiskEvolutionPoint[]> {
    const res = await axios.get(`${ANALYTICS_V1}/dashboard/risk-evolution`, {
      params: { months },
    });
    const data = res.data as RiskEvolutionPoint[] | { value?: RiskEvolutionPoint[] };
    return Array.isArray(data) ? data : (data.value ?? []);
  },

  async getModelPerformance(): Promise<ModelPerformance> {
    const res = await axios.get(`${ANALYTICS_V1}/dashboard/model-performance`);
    return res.data;
  },

  // ── Tuiles d'en-tête (KPIs + deltas) ───────────────────────
  async getOverview(): Promise<OverviewKpis> {
    const res = await axios.get(`${ANALYTICS_V1}/dashboard/overview`);
    return res.data;
  },

  // ── Prévision de la demande (série + projection) ───────────
  async getDemandForecast(months = 6): Promise<DemandForecast> {
    const res = await axios.get(`${ANALYTICS_V1}/dashboard/demand-forecast`, {
      params: { months },
    });
    return res.data;
  },

  // ── Prévision des besoins de formation par département ─────
  async getTrainingNeedsForecast(months = 6, historyMonths = 12): Promise<TrainingNeedsForecast> {
    const res = await axios.get(`${ANALYTICS_V1}/dashboard/training-needs-forecast`, {
      params: { months, history_months: historyMonths },
    });
    return res.data;
  },

  // ── Ré-entraînement avec rollback (ADMIN) ──────────────────
  async retrainModel(): Promise<{ message: string }> {
    const res = await axios.post(`${ANALYTICS_V1}/admin/retrain`, {});
    return res.data;
  },

  // ── Legacy adapters (used by existing page) ────
  async analyserEnseignant(
    enseignantId: string,
    competenceCible?: string,
    options?: { autoTrain?: boolean },
  ): Promise<AnalyseData> {
    const autoTrain = options?.autoTrain ?? false;
    try {
      const gapsRes = await this.predictGaps(enseignantId, 6, 10);

      const recommendations = await fetchRecommendations(this, enseignantId, competenceCible);

      // Check if result comes from heuristic fallback (model not trained yet).
      const isHeuristic =
        gapsRes.explanation?.method === 'heuristic' || gapsRes.explanation?.model_trained === false;

      // B8 fix : auto-train pour les admins quand le backend renvoie un fallback
      // heuristique au lieu d'un 503. Le backend ne renvoie jamais 503 car il
      // dégrade gracieusement vers l'heuristique — on détecte donc ici.
      if (isHeuristic && autoTrain) {
        const trained = await autoTrainAndRetry(this, enseignantId, competenceCible, recommendations);
        if (trained) return trained;
      }

      return buildAnalyseResult(
        enseignantId,
        competenceCible,
        gapsRes.gaps || [],
        recommendations,
        isHeuristic,
        gapsRes.overall_risk_score || 0,
      );
    } catch (error: unknown) {
      // If 503 (model not trained) and caller has admin rights, try to auto-train and retry once.
      // Otherwise surface a clear actionable message — only admins can train the model.
      const axiosError = error as { response?: { status: number; data?: { message?: string } } };
      if (axiosError?.response?.status === 503) {
        return retryWithAutoTrain(this, enseignantId, competenceCible, autoTrain);
      }
      throw error;
    }
  },

  async analyserTendancesGlobales(): Promise<{
    dashboard: {
      competencesEnDeclin: string[];
      competencesEnForteDemande: string[];
      enseignantsARisque: string[];
    };
    rawDeclining: DecliningCompetency[];
    rawInDemand: InDemandCompetency[];
    rawRiskIndicators: TeacherRiskIndicator[];
  }> {
    try {
      const data = await this.getDashboardSummary();
      return {
        dashboard: {
          competencesEnDeclin: (data.declining_competencies || [])
            .map((c: DecliningCompetency) => c.competency_name)
            .filter(Boolean),
          competencesEnForteDemande: (data.in_demand_competencies || [])
            .map((c: InDemandCompetency) => c.competency_name)
            .filter(Boolean),
          enseignantsARisque: (data.teacher_risk_indicators || [])
            .filter((r: TeacherRiskIndicator) => r.attrition_risk_score > 0.5)
            .map((r: TeacherRiskIndicator) => r.teacher_name),
        },
        rawDeclining: data.declining_competencies || [],
        rawInDemand: data.in_demand_competencies || [],
        rawRiskIndicators: data.teacher_risk_indicators || [],
      };
    } catch {
      throw new Error('Erreur lors du chargement du tableau de bord');
    }
  },

  // ── Centre d'Action — Alertes ───────────────────────────────
  async getAlertsSummary(): Promise<AlertSummary> {
    const res = await axios.get(`${ANALYTICS_V1}/alerts/summary`);
    return res.data;
  },

  async bulkUpdateAlerts(payload: BulkAlertUpdateRequest): Promise<BulkAlertUpdateResponse> {
    const res = await axios.patch(`${ANALYTICS_V1}/alerts/bulk`, payload);
    return res.data;
  },

  // ── Centre d'Action — Actions prioritaires ────────────────
  async getPriorityActions(limit = 20, departementId?: string): Promise<PriorityAction[]> {
    const res = await axios.get(`${ANALYTICS_V1}/actions/priority`, {
      params: { limit, departement_id: departementId },
    });
    return res.data;
  },

  // ── Centre d'Action — Recommandations par cohorte ───────────
  async getBatchRecommendations(
    payload: BatchRecommendationRequest,
  ): Promise<BatchRecommendationResponse> {
    const res = await axios.post(`${ANALYTICS_V1}/recommendations/batch`, payload);
    return res.data;
  },

  // ── Visualisations avancées ────────────────────────────────
  async getSupplyDemand(): Promise<SupplyDemandItem[]> {
    const res = await axios.get(`${ANALYTICS_V1}/dashboard/supply-demand`);
    const data = res.data as SupplyDemandItem[] | { value?: SupplyDemandItem[] };
    return Array.isArray(data) ? data : (data.value ?? []);
  },

  async getRiskDistribution(): Promise<RiskDistribution> {
    const res = await axios.get(`${ANALYTICS_V1}/dashboard/risk-distribution`);
    return res.data;
  },

  async getHeatmapDrilldown(departement: string, competenceId: number): Promise<HeatmapDrilldown> {
    const res = await axios.get(
      `${ANALYTICS_V1}/dashboard/gap-heatmap/${departement}/${competenceId}`,
    );
    return res.data;
  },

  // ── Nouvelles fonctionnalités : impact des formations & simulation what-if ──
  async getTrainingImpact(): Promise<{
    nb_enseignants_suivis: number;
    nb_chemins_termines: number;
    nb_formations_suivies: number;
    gain_niveau_moyen: number;
    reduction_risque_moyenne: number;
    nb_risque_reduit: number;
    nb_risque_augmente: number;
  }> {
    const res = await axios.get(`${ANALYTICS_V1}/dashboard/training-impact`);
    return res.data;
  },

  async getTrainingImpactFormations(
    page = 0,
    size = 20,
  ): Promise<{
    total: number;
    page: number;
    size: number;
    formations: Array<{
      formation_id: number;
      formation_titre: string;
      formation_type?: string;
      nb_enseignants: number;
      gain_niveau_moyen: number;
      niveau_moyen_avant: number;
      niveau_moyen_apres: number;
    }>;
  }> {
    const res = await axios.get(`${ANALYTICS_V1}/dashboard/training-impact/formations`, {
      params: { page, size },
    });
    return res.data;
  },

  async simulateWhatIf(payload: {
    enseignant_id: string;
    plan: Array<{ competence_id: number; niveau_vise: number; formation_id?: number }>;
    horizon_mois?: number;
  }): Promise<{
    enseignant_id: string;
    risk_before: { score: number; niveau: string };
    risk_after: { score: number; niveau: string };
    risk_reduction: number;
    nb_gaps_before: number;
    nb_gaps_after: number;
    nb_gaps_resolus: number;
    details: Array<{
      competence_id: number;
      formation_id?: number;
      niveau_actuel: number;
      niveau_requis: number;
      niveau_vise: number;
      gap_avant: number;
      gap_apres: number;
      urgence_apres: string;
      resolu: boolean;
    }>;
  }> {
    const res = await axios.post(`${ANALYTICS_V1}/simulate/what-if`, payload);
    return res.data;
  },
};

function mapRecommendations(path: RawPathStep[] | undefined): AnalyseRecommandation[] {
  return (path || []).map((step: RawPathStep) => ({
    ordre: step.step_number,
    formationId: step.formation_id,
    titre: step.formation_title,
    competencesCiblees: [step.competency_name],
    dureeEstimee: `${step.estimated_duration_hours}h`,
    prerequisManquants: step.missing_prerequisites || [],
    probabiliteReussite: step.success_probability,
    justification: 'Basé sur votre profil et les prérequis de la formation.',
  }));
}

async function fetchRecommendations(
  service: typeof AnalysePredictiveService,
  enseignantId: string,
  competenceCible: string | undefined,
): Promise<AnalyseRecommandation[]> {
  if (!competenceCible) return [];
  const extractedId = Number.parseInt(competenceCible.replaceAll(/\D/g, '') || '0', 10);
  if (extractedId <= 0) return [];
  const recoRes = await service.recommendPath(enseignantId, extractedId, 4).catch(() => null);
  if (!recoRes) return [];
  return mapRecommendations(recoRes.path);
}

function buildAnalyseResult(
  enseignantId: string,
  competenceCible: string | undefined,
  gaps: RawGapItem[],
  recommendations: AnalyseRecommandation[],
  isHeuristic: boolean,
  overallRiskScore: number,
): AnalyseData {
  return {
    enseignantId,
    competenceAnalysee: competenceCible || 'Toutes',
    gaps: (gaps || []).map((g: RawGapItem) => mapGapItem(g, isHeuristic)),
    overallRiskScore: overallRiskScore || 0,
    recommandationsFormations: recommendations,
    isHeuristic,
    modelNeedsTraining: isHeuristic,
  };
}

async function autoTrainAndRetry(
  service: typeof AnalysePredictiveService,
  enseignantId: string,
  competenceCible: string | undefined,
  recommendations: AnalyseRecommandation[],
): Promise<AnalyseData | undefined> {
  try {
    const trainRes = await service.trainModel();
    if (trainRes.status === 'trained' || trainRes.metrics) {
      // Retry with the freshly trained model
      const retried = await service.predictGaps(enseignantId, 6, 10);
      const stillHeuristic = retried.explanation?.method === 'heuristic';
      return buildAnalyseResult(
        enseignantId,
        competenceCible,
        retried.gaps || [],
        recommendations,
        stillHeuristic,
        retried.overall_risk_score || 0,
      );
    }
    return undefined;
  } catch {
    // Auto-train failed — fall through to return heuristic results
    return undefined;
  }
}

async function retryWithAutoTrain(
  service: typeof AnalysePredictiveService,
  enseignantId: string,
  competenceCible: string | undefined,
  autoTrain: boolean,
): Promise<AnalyseData> {
  if (!autoTrain) {
    throw new Error(
      "Le modèle prédictif n'est pas encore entraîné. Veuillez demander à un administrateur de lancer l'entraînement.",
    );
  }
  try {
    await service.trainModel();
    const gapsRes = await service.predictGaps(enseignantId, 6, 10);
    return buildAnalyseResult(
      enseignantId,
      competenceCible,
      gapsRes.gaps || [],
      [],
      false,
      gapsRes.overall_risk_score || 0,
    );
  } catch (retryError: unknown) {
    const retryAxiosError = retryError as { response?: { status: number } };
    if (retryAxiosError?.response?.status === 403) {
      throw new Error(
        "Le modèle n'est pas entraîné et l'entraînement automatique a été refusé (403). Contactez un administrateur.",
      );
    }
    throw new Error(
      "Le modèle prédictif n'est pas encore entraîné et l'entraînement automatique a échoué. Veuillez contacter l'administrateur.",
    );
  }
}

export default AnalysePredictiveService;
