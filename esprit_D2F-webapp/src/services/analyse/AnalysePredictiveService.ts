import { defaultApi as axios } from "@/utils/helpers/httpClient";
import { config } from "@/config/env";

// Base legacy du service d'analyse prédictive: /api/analyse/**
const PREDICTIVE_API = `${config.ANALYSE_URL}/analyse`;
// Endpoints du pipeline analytics v1: /api/analyse/v1/analytics/**
const ANALYTICS_V1 = `${config.ANALYSE_URL}/analyse/v1/analytics`;

import type {
  Gravite, AnalyseGap, AnalyseRecommandation, AnalyseData, DriftReport,
  DecliningCompetency, InDemandCompetency, TeacherRiskIndicator,
  GapHeatmapCell, TrainingEffectiveness, RiskEvolutionPoint, ModelPerformance,
} from "@/models/analyse";
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

interface DashboardData {
  declining_competencies?: Array<{
    competency_id: number;
    competency_name: string;
    domaine_name?: string;
    demand_3m?: number;
    demand_12m?: number;
  }>;
  in_demand_competencies?: Array<{
    competency_id: number;
    competency_name: string;
    domaine_name?: string;
    demand_3m?: number;
    demand_12m?: number;
    trend?: "increasing" | "stable";
  }>;
  teacher_risk_indicators?: Array<{
    teacher_id: string;
    teacher_name: string;
    attrition_risk_score: number;
    disengagement_signals?: string[];
    competency_stagnation_rate?: number;
    training_velocity?: number;
    recommendation?: string;
  }>;
}

type DecliningCompetency = NonNullable<DashboardData['declining_competencies']>[number];
type InDemandCompetency = NonNullable<DashboardData['in_demand_competencies']>[number];
type TeacherRiskIndicator = NonNullable<DashboardData['teacher_risk_indicators']>[number];

interface PredictGapsResponse {
  gaps: RawGapItem[];
  overall_risk_score: number;
  explanation?: { method?: string; model_trained?: boolean };
}

interface RecommendPathResponse {
  path: RawPathStep[];
}

interface DashboardSummaryResponse {
  declining_competencies: DashboardData['declining_competencies'];
  in_demand_competencies: DashboardData['in_demand_competencies'];
  teacher_risk_indicators: DashboardData['teacher_risk_indicators'];
}

function mapGapItem(g: RawGapItem, isHeuristic: boolean): AnalyseGap {
  let gravite: Gravite = "faible";
  if (g.predicted_gap >= 2) gravite = "elevee";
  else if (g.predicted_gap >= 1) gravite = "moyenne";
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
  async predictGaps(enseignantId: string, horizonMonths = 6, topN = 10): Promise<PredictGapsResponse> {
    const res = await axios.post(
      `${PREDICTIVE_API}/predict/gaps/${enseignantId}`,
      { teacher_id: enseignantId, horizon_months: horizonMonths, top_n: topN }
    );
    return res.data;
  },

  async trainModel(): Promise<{ message: string }> {
    const res = await axios.post(`${PREDICTIVE_API}/predict/train`, {});
    return res.data;
  },

  async getDrift(): Promise<DriftReport> {
    const res = await axios.get(`${PREDICTIVE_API}/predict/drift`);
    return res.data;
  },

  // ── Recommendation ─────────────────────────────
  async recommendPath(teacherId: string, targetCompetencyId: number, targetLevel = 4, maxDurationHours?: number): Promise<RecommendPathResponse> {
    const res = await axios.post(`${PREDICTIVE_API}/recommend/path`, {
      teacher_id: teacherId,
      target_competency_id: targetCompetencyId,
      target_level: targetLevel,
      max_duration_hours: maxDurationHours ?? null,
    });
    return res.data;
  },

  // ── Detection ──────────────────────────────────
  async getAtRiskTeachers(threshold = 0.7): Promise<TeacherRiskIndicator[]> {
    const res = await axios.get(`${PREDICTIVE_API}/detect/at-risk-teachers`, {
      params: { threshold },
    });
    return res.data;
  },

  // ── Dashboard ──────────────────────────────────
  async getDashboardSummary(): Promise<DashboardSummaryResponse> {
    const res = await axios.get(`${PREDICTIVE_API}/dashboard/summary`);
    return res.data;
  },

  async getDecliningCompetencies(): Promise<DecliningCompetency[]> {
    const res = await axios.get(`${PREDICTIVE_API}/dashboard/declining-competencies`);
    return res.data;
  },

  async getInDemandCompetencies(): Promise<InDemandCompetency[]> {
    const res = await axios.get(`${PREDICTIVE_API}/dashboard/in-demand-competencies`);
    return res.data;
  },

  async getTeacherRiskIndicators(): Promise<TeacherRiskIndicator[]> {
    const res = await axios.get(`${PREDICTIVE_API}/dashboard/teacher-risk-indicators`);
    return res.data;
  },

  // ── Dashboard prédictif avancé (analytics v1) ──────────────
  async getGapHeatmap(): Promise<GapHeatmapCell[]> {
    const res = await axios.get(`${ANALYTICS_V1}/dashboard/gap-heatmap`);
    return res.data;
  },

  async getTrainingEffectiveness(): Promise<TrainingEffectiveness[]> {
    const res = await axios.get(`${ANALYTICS_V1}/dashboard/training-effectiveness`);
    return res.data;
  },

  async getRiskEvolution(months = 6): Promise<RiskEvolutionPoint[]> {
    const res = await axios.get(`${ANALYTICS_V1}/dashboard/risk-evolution`, {
      params: { months },
    });
    return res.data;
  },

  async getModelPerformance(): Promise<ModelPerformance> {
    const res = await axios.get(`${ANALYTICS_V1}/dashboard/model-performance`);
    return res.data;
  },

  // ── Ré-entraînement avec rollback (ADMIN) ──────────────────
  async retrainModel(): Promise<{ message: string }> {
    const res = await axios.post(`${ANALYTICS_V1}/admin/retrain`, {});
    return res.data;
  },

  // ── Legacy adapters (used by existing page) ────
  async analyserEnseignant( // NOSONAR — nested try-catch for auto-train retry is intentional
    enseignantId: string,
    competenceCible?: string,
    options?: { autoTrain?: boolean }
  ): Promise<AnalyseData> {
    const autoTrain = options?.autoTrain ?? false;
    try {
      const gapsRes = await this.predictGaps(enseignantId, 6, 10);

      let recommendations: AnalyseRecommandation[] = [];
      if (competenceCible) {
        try {
          const recoRes = await this.recommendPath(
            enseignantId,
            Number.parseInt(competenceCible.replaceAll(/\D/g, "") || "0"),
            4
          );
          recommendations = (recoRes.path || []).map((step: RawPathStep) => ({
            ordre: step.step_number,
            formationId: step.formation_id,
            titre: step.formation_title,
            competencesCiblees: [step.competency_name],
            dureeEstimee: `${step.estimated_duration_hours}h`,
            prerequisManquants: step.missing_prerequisites || [],
            probabiliteReussite: step.success_probability,
            justification: "Basé sur votre profil et les prérequis de la formation.",
          }));
        } catch (e: unknown) {
          // Recommandations non disponibles — continue sans
        }
      }

      // Check if result comes from heuristic fallback
      const isHeuristic = gapsRes.explanation?.method === "heuristic" || gapsRes.explanation?.model_trained === false;

      return {
        enseignantId,
        competenceAnalysee: competenceCible || "Toutes",
        gaps: (gapsRes.gaps || []).map((g: RawGapItem) => mapGapItem(g, isHeuristic)),
        overallRiskScore: gapsRes.overall_risk_score || 0,
        recommandationsFormations: recommendations,
        isHeuristic,
        modelNeedsTraining: isHeuristic,
      };
    } catch (error: unknown) {
      // If 503 (model not trained) and caller has admin rights, try to auto-train and retry once.
      // Otherwise surface a clear actionable message — only admins can train the model.
      const axiosError = error as { response?: { status: number; data?: { message?: string } } };
      if (axiosError?.response?.status === 503) {
        if (!autoTrain) {
          throw new Error(
            "Le modèle prédictif n'est pas encore entraîné. Veuillez demander à un administrateur de lancer l'entraînement."
          );
        }
        try {
          await this.trainModel();
          const gapsRes = await this.predictGaps(enseignantId, 6, 10);
          return {
            enseignantId,
            competenceAnalysee: competenceCible || "Toutes",
            gaps: (gapsRes.gaps || []).map((g: RawGapItem) => mapGapItem(g, false)),
            overallRiskScore: gapsRes.overall_risk_score || 0,
            recommandationsFormations: [],
            isHeuristic: false,
            modelNeedsTraining: false,
          };
        } catch (retryError: unknown) {
          const retryAxiosError = retryError as { response?: { status: number } };
          if (retryAxiosError?.response?.status === 403) {
            throw new Error(
              "Le modèle n'est pas entraîné et l'entraînement automatique a été refusé (403). Contactez un administrateur."
            );
          }
          throw new Error(
            "Le modèle prédictif n'est pas encore entraîné et l'entraînement automatique a échoué. Veuillez contacter l'administrateur."
          );
        }
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
          competencesEnDeclin: (data.declining_competencies || []).map((c: DecliningCompetency) => c.competency_name).filter(Boolean),
          competencesEnForteDemande: (data.in_demand_competencies || []).map((c: InDemandCompetency) => c.competency_name).filter(Boolean),
          enseignantsARisque: (data.teacher_risk_indicators || [])
            .filter((r: TeacherRiskIndicator) => r.attrition_risk_score > 0.5)
            .map((r: TeacherRiskIndicator) => r.teacher_name),
        },
        rawDeclining: data.declining_competencies || [],
        rawInDemand: data.in_demand_competencies || [],
        rawRiskIndicators: data.teacher_risk_indicators || [],
      };
    } catch (error: unknown) {
      throw error;
    }
  },
};

export default AnalysePredictiveService;



