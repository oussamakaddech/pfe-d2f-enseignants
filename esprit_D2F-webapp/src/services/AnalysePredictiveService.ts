import { defaultApi as axios } from "../utils/httpClient";
import { config } from "../config/env";

const PREDICTIVE_API = `${config.ANALYSE_URL}/analyse`;

const AnalysePredictiveService = {
  async analyserEnseignant(enseignantId: string, competenceCible?: string) {
    try {
      const response = await axios.post(
        `${PREDICTIVE_API}/predict/gaps/${enseignantId}`,
        { horizon_months: 6, top_n: 10 }
      );
      return {
        enseignantId,
        competenceAnalysee: competenceCible || "Toutes",
        gaps: (response.data.gaps || []).map((g) => ({
          competenceCode: `C${g.competency_id}`,
          competenceLabel: g.competency_name,
          niveauActuel: g.current_level,
          niveauCible: g.required_level,
          gap: g.predicted_gap,
          gravite: g.predicted_gap >= 2 ? "elevee" : g.predicted_gap >= 1 ? "moyenne" : "faible",
          explication: `Gap prédit: ${g.predicted_gap} (confiance: ${(g.confidence * 100).toFixed(0)}%)`,
        })),
        recommandationsFormations: [],
        besoinsDetectes: [],
        dashboard: {
          competencesEnDeclin: [],
          competencesEnForteDemande: [],
          enseignantsARisque: [],
        },
      };
    } catch (error) {
      console.error("Erreur lors de l'analyse prédictive de l'enseignant :", error);
      throw error;
    }
  },

  async analyserTendancesGlobales() {
    try {
      const [declining, demand, risk] = await Promise.all([
        axios.get(`${PREDICTIVE_API}/dashboard/declining-competencies`),
        axios.get(`${PREDICTIVE_API}/dashboard/in-demand-competencies`),
        axios.get(`${PREDICTIVE_API}/dashboard/teacher-risk-indicators`),
      ]);
      return {
        statistiques: { totalEvaluations: 0, noteMoyenne: 0, formationsEvaluees: 0 },
        dashboard: {
          competencesEnDeclin: (declining.data || []).map((c) => c.competency_name).filter(Boolean),
          competencesEnForteDemande: (demand.data || []).map((c) => c.competency_name).filter(Boolean),
          enseignantsARisque: (risk.data || []).filter((r) => r.attrition_risk_score > 0.5).map((r) => r.teacher_name),
        },
      };
    } catch (error) {
      console.error("Erreur lors de l'analyse des tendances globales :", error);
      throw error;
    }
  },
};

export default AnalysePredictiveService;