import { defaultApi as axios } from "@/utils/helpers/httpClient";
import { config } from "@/config/env";

const PREDICTIVE_API = `${config.ANALYSE_URL}/analyse`;

export type Gravite = "elevee" | "moyenne" | "faible";

export interface AnalyseGap {
  competenceCode: string;
  competenceLabel: string;
  niveauActuel: number;
  niveauCible: number;
  gap: number;
  gravite: Gravite;
  explication: string;
}

export interface AnalyseRecommandation {
  ordre: number;
  formationId: number;
  titre: string;
  competencesCiblees: string[];
  dureeEstimee: string;
  prerequisManquants: string[];
  probabiliteReussite: number;
  justification: string;
}

export interface AnalyseData {
  enseignantId: string;
  competenceAnalysee: string;
  gaps: AnalyseGap[];
  overallRiskScore: number;
  recommandationsFormations: AnalyseRecommandation[];
  isHeuristic: boolean;
  modelNeedsTraining: boolean;
}

export interface DecliningCompetency {
  competency_id: number;
  competency_name: string;
  domaine_name?: string;
  demand_3m?: number;
  demand_12m?: number;
}

export interface InDemandCompetency extends DecliningCompetency {
  trend?: "increasing" | "stable";
}

export interface TeacherRiskIndicator {
  teacher_id: string;
  teacher_name: string;
  attrition_risk_score: number;
  disengagement_signals: string[];
  competency_stagnation_rate: number;
  training_velocity: number;
  recommendation: string;
}

export interface DriftReport {
  drift_detected: boolean;
  message?: string;
  recommendation?: string | null;
  days_since_training?: number;
  checked_features?: Array<{
    feature: string;
    previous_importance: number;
    current_importance: number;
    relative_change: number;
    drift_flag: boolean;
  }>;
}

const AnalysePredictiveService = {
  // ── Prediction ─────────────────────────────────
  async predictGaps(enseignantId: string, horizonMonths = 6, topN = 10) {
    const res = await axios.post(
      `${PREDICTIVE_API}/predict/gaps/${enseignantId}`,
      { teacher_id: enseignantId, horizon_months: horizonMonths, top_n: topN }
    );
    return res.data;
  },

  async trainModel() {
    const res = await axios.post(`${PREDICTIVE_API}/predict/train`, {});
    return res.data;
  },

  async getDrift(): Promise<DriftReport> {
    const res = await axios.get(`${PREDICTIVE_API}/predict/drift`);
    return res.data;
  },

  // ── Recommendation ─────────────────────────────
  async recommendPath(teacherId: string, targetCompetencyId: number, targetLevel = 4, maxDurationHours?: number) {
    const res = await axios.post(`${PREDICTIVE_API}/recommend/path`, {
      teacher_id: teacherId,
      target_competency_id: targetCompetencyId,
      target_level: targetLevel,
      max_duration_hours: maxDurationHours ?? null,
    });
    return res.data;
  },

  // ── Detection ──────────────────────────────────
  async getAtRiskTeachers(threshold = 0.7) {
    const res = await axios.get(`${PREDICTIVE_API}/detect/at-risk-teachers`, {
      params: { threshold },
    });
    return res.data;
  },

  // ── Dashboard ──────────────────────────────────
  async getDashboardSummary() {
    const res = await axios.get(`${PREDICTIVE_API}/dashboard/summary`);
    return res.data;
  },

  async getDecliningCompetencies() {
    const res = await axios.get(`${PREDICTIVE_API}/dashboard/declining-competencies`);
    return res.data;
  },

  async getInDemandCompetencies() {
    const res = await axios.get(`${PREDICTIVE_API}/dashboard/in-demand-competencies`);
    return res.data;
  },

  async getTeacherRiskIndicators() {
    const res = await axios.get(`${PREDICTIVE_API}/dashboard/teacher-risk-indicators`);
    return res.data;
  },

  // ── Legacy adapters (used by existing page) ────
  async analyserEnseignant(
    enseignantId: string,
    competenceCible?: string,
    options?: { autoTrain?: boolean }
  ) {
    const autoTrain = options?.autoTrain ?? false;
    try {
      const gapsRes = await this.predictGaps(enseignantId, 6, 10);

      let recommendations: any[] = [];
      if (competenceCible) {
        try {
          const recoRes = await this.recommendPath(
            enseignantId,
            parseInt(competenceCible.replace(/\D/g, "") || "0"),
            4
          );
          recommendations = (recoRes.path || []).map((step: any) => ({
            ordre: step.step_number,
            formationId: step.formation_id,
            titre: step.formation_title,
            competencesCiblees: [step.competency_name],
            dureeEstimee: `${step.estimated_duration_hours}h`,
            prerequisManquants: step.missing_prerequisites || [],
            probabiliteReussite: step.success_probability,
            justification: "Basé sur votre profil et les prérequis de la formation.",
          }));
        } catch (e) {
          console.warn("Recommandations non disponibles pour cette compétence", e);
        }
      }

      // Check if result comes from heuristic fallback
      const isHeuristic = gapsRes.explanation?.method === "heuristic" || gapsRes.explanation?.model_trained === false;

      return {
        enseignantId,
        competenceAnalysee: competenceCible || "Toutes",
        gaps: (gapsRes.gaps || []).map((g: any) => ({
          competenceCode: `C${g.competency_id}`,
          competenceLabel: g.competency_name,
          niveauActuel: g.current_level,
          niveauCible: g.required_level,
          gap: g.predicted_gap,
          gravite: g.predicted_gap >= 2 ? "elevee" : g.predicted_gap >= 1 ? "moyenne" : "faible",
          explication: isHeuristic
            ? `Gap estimé (heuristique): ${g.predicted_gap.toFixed(1)} — Entraînez le modèle pour des prédictions plus précises`
            : `Gap prédit: ${g.predicted_gap.toFixed(1)} (confiance: ${(g.confidence * 100).toFixed(0)}%)`,
        })),
        overallRiskScore: gapsRes.overall_risk_score || 0,
        recommandationsFormations: recommendations,
        isHeuristic,
        modelNeedsTraining: isHeuristic,
      };
    } catch (error: any) {
      console.error("Erreur lors de l'analyse prédictive de l'enseignant :", error);
      // If 503 (model not trained) and caller has admin rights, try to auto-train and retry once.
      // Otherwise surface a clear actionable message — only admins can train the model.
      if (error?.response?.status === 503) {
        if (!autoTrain) {
          throw new Error(
            "Le modèle prédictif n'est pas encore entraîné. Veuillez demander à un administrateur de lancer l'entraînement."
          );
        }
        console.info("Modèle non entraîné — tentative d'entraînement automatique...");
        try {
          await this.trainModel();
          const gapsRes = await this.predictGaps(enseignantId, 6, 10);
          return {
            enseignantId,
            competenceAnalysee: competenceCible || "Toutes",
            gaps: (gapsRes.gaps || []).map((g: any) => ({
              competenceCode: `C${g.competency_id}`,
              competenceLabel: g.competency_name,
              niveauActuel: g.current_level,
              niveauCible: g.required_level,
              gap: g.predicted_gap,
              gravite: g.predicted_gap >= 2 ? "elevee" : g.predicted_gap >= 1 ? "moyenne" : "faible",
              explication: `Gap prédit: ${g.predicted_gap.toFixed(1)} (confiance: ${(g.confidence * 100).toFixed(0)}%)`,
            })),
            overallRiskScore: gapsRes.overall_risk_score || 0,
            recommandationsFormations: [],
            isHeuristic: false,
            modelNeedsTraining: false,
          };
        } catch (retryError: any) {
          console.error("Échec de l'entraînement automatique :", retryError);
          if (retryError?.response?.status === 403) {
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

  async analyserTendancesGlobales() {
    try {
      const data = await this.getDashboardSummary();
      return {
        dashboard: {
          competencesEnDeclin: (data.declining_competencies || []).map((c: any) => c.competency_name).filter(Boolean),
          competencesEnForteDemande: (data.in_demand_competencies || []).map((c: any) => c.competency_name).filter(Boolean),
          enseignantsARisque: (data.teacher_risk_indicators || [])
            .filter((r: any) => r.attrition_risk_score > 0.5)
            .map((r: any) => r.teacher_name),
        },
        rawDeclining: data.declining_competencies || [],
        rawInDemand: data.in_demand_competencies || [],
        rawRiskIndicators: data.teacher_risk_indicators || [],
      };
    } catch (error) {
      console.error("Erreur lors de l'analyse des tendances globales :", error);
      throw error;
    }
  },
};

export default AnalysePredictiveService;



