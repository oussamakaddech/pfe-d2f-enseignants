import { defaultApi as axios } from "../utils/httpClient";
import { config } from "../config/env";

const API_URL = `${config.ANALYSE_URL}/analyse/analyse-predictive`;

const AnalysePredictiveService = {
  async analyserEnseignant(enseignantId) {
    try {
      const response = await axios.get(`${API_URL}/enseignant/${enseignantId}`);
      return response.data;
    } catch (error) {
      console.error("Erreur lors de l'analyse prédictive de l'enseignant :", error);
      throw error;
    }
  },

  async analyserTendancesGlobales() {
    try {
      const response = await axios.get(`${API_URL}/tendances`);
      return response.data;
    } catch (error) {
      console.error("Erreur lors de l'analyse des tendances globales :", error);
      throw error;
    }
  },
};

export default AnalysePredictiveService;