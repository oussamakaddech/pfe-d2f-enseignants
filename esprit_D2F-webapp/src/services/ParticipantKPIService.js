import axios from "axios";
import { config } from "../config/env"; 

const API_URL = `${config.FORMATION_URL}/formation/kpi/participants`;

const ParticipantKPIService = {

  // Récupère les KPIs détaillés par formation sur une période donnée
  async getFormationsParticipantKPIs(startDate, endDate) {
    try {
      const response = await axios.get(`${API_URL}/formations`, {
        params: { startDate, endDate },
      });
      return response.data;
    } catch (error) {
      console.error("Erreur lors de la récupération des KPIs participants par formation :", error);
      throw error;
    }
  },

  // Récupère le KPI global des participants sur une période donnée
  async getGlobalParticipantKPI(startDate, endDate) {
    try {
      const response = await axios.get(`${API_URL}/global`, {
        params: { startDate, endDate },
      });
      return response.data;
    } catch (error) {
      console.error("Erreur lors de la récupération du KPI global des participants :", error);
      throw error;
    }
  },
};

export default ParticipantKPIService;
