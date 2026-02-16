import axios from "axios";
import { config } from "../config/env"; 
// URL de votre API Spring Boot
const API_URL = `${config.FORMATION_URL}/formation/formation-report`;

function formatDate(date) {
  // Accepte une Date JS ou une chaîne "YYYY-MM-DD"
  if (date instanceof Date) {
    return date.toISOString().split("T")[0];
  }
  return date;
}

const FormationReportService = {
  /**
   * Récupère la liste des formations pour un enseignant et une période donnée,
   * selon qu'il soit animateur ou participant.
   *
   * @param {string} role           "animateur" ou "participant"
   * @param {string} enseignantId   id de l'enseignant
   * @param {Date|string} start     date de début (Date ou "YYYY-MM-DD")
   * @param {Date|string} end       date de fin   (Date ou "YYYY-MM-DD")
   * @returns {Promise<Array>}      tableau de DTO renvoyés par le back
   */
  async getFormationsParRoleEtPeriode(role, enseignantId, start, end) {
    try {
      const params = {
        role,
        enseignantId,
        start: formatDate(start),
        end:   formatDate(end),
      };
      const response = await axios.get(API_URL, { params });
      return response.data;
    } catch (error) {
      console.error("Erreur lors de la récupération du rapport de formations :", error);
      throw error;
    }
  }
};

export default FormationReportService;
