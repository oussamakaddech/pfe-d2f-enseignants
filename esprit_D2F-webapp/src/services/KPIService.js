import { defaultApi as axios } from "../utils/httpClient";
import { config } from "../config/env";

const API_URL = `${config.FORMATION_URL}/formation/kpi`;

function isNotFoundError(error) {
  return error?.isAxiosError === true && error.response?.status === 404;
}

const KPIService = {
  // Récupère le nombre total de formations sur une période donnée
  async getTotalFormations(start, end) {
    try {
      const response = await axios.get(`${API_URL}/formations`, {
        params: { start, end },
      });
      return response.data || 0;
    } catch (error) {
      if (isNotFoundError(error)) {
        console.warn("Aucune formation trouvée");
        return 0;
      }
      console.error("Erreur lors de la récupération du nombre total de formations :", error);
      throw error;
    }
  },

  // Récupère le total des heures de formation sur une période donnée
  async getTotalHeures(start, end) {
    try {
      const response = await axios.get(`${API_URL}/heures`, {
        params: { start, end },
      });
      return response.data || 0;
    } catch (error) {
      if (isNotFoundError(error)) {
        console.warn("Aucune heure trouvée");
        return 0;
      }
      console.error("Erreur lors de la récupération du total des heures :", error);
      throw error;
    }
  },

  // Récupère le nombre de participants uniques sur une période donnée
  async getUniqueParticipants(start, end) {
    try {
      const response = await axios.get(`${API_URL}/participants`, {
        params: { start, end },
      });
      return response.data || 0;
    } catch (error) {
      if (isNotFoundError(error)) {
        console.warn("Aucun participant trouvé");
        return 0;
      }
      console.error("Erreur lors de la récupération du nombre de participants uniques :", error);
      throw error;
    }
  },

  // Récupère la répartition des formations par état sur une période donnée
  async getFormationsByEtat(start, end) {
    try {
      const response = await axios.get(`${API_URL}/formations-by-etat`, {
        params: { start, end },
      });
      return response.data || {
        enregistre: 0,
        planifie: 0,
        enCours: 0,
        acheve: 0,
        annule: 0,
        total: 0,
      };
    } catch (error) {
      if (isNotFoundError(error)) {
        console.warn("Aucune formation par état trouvée");
        return {
          enregistre: 0,
          planifie: 0,
          enCours: 0,
          acheve: 0,
          annule: 0,
          total: 0,
        };
      }
      console.error("Erreur lors de la récupération des formations par état :", error);
      throw error;
    }
  },

  // Top des enseignants les plus assidus sur les formations achevées
  async getTopParticipants(start, end, upId = null, deptId = null) {
    try {
      const params = { start, end };
      if (upId) params.upId = upId;
      if (deptId) params.deptId = deptId;

      const response = await axios.get(`${API_URL}/top-participants`, {
        params,
      });
      return response.data || [];
    } catch (error) {
      if (isNotFoundError(error)) {
        console.warn("Aucun top participant trouvé");
        return [];
      }
      console.error("Erreur lors de la récupération du top participants :", error);
      throw error;
    }
  },

  // Top des enseignants les plus absents sur les formations achevées
  async getTopAbsentees(start, end, upId = null, deptId = null) {
    try {
      const params = { start, end };
      if (upId) params.upId = upId;
      if (deptId) params.deptId = deptId;

      const response = await axios.get(`${API_URL}/top-absentees`, {
        params,
      });
      return response.data || [];
    } catch (error) {
      if (isNotFoundError(error)) {
        console.warn("Aucun top absentee trouvé");
        return [];
      }
      console.error("Erreur lors de la récupération du top absentees :", error);
      throw error;
    }
  },

  // Enseignants non affectés à aucune séance sur la période donnée
  async getEnseignantsNonAffectes(start, end) {
    try {
      const response = await axios.get(`${API_URL}/enseignants-non-affectes`, {
        params: { start, end },
      });
      return response.data || [];
    } catch (error) {
      if (isNotFoundError(error)) {
        console.warn("Aucun enseignant non affecté trouvé");
        return [];
      }
      console.error("Erreur lors de la récupération des enseignants non affectés :", error);
      throw error;
    }
  },

  // Récupère le count et les heures totales avec filtres
  async getCountAndHeures({
    domaine = null,
    upId = null,
    deptId = null,
    ouverte = null,
    start = null,
    end = null,
    etat = null,
  } = {}) {
    try {
      const params = {};
      if (domaine !== null) params.domaine = domaine;
      if (upId !== null) params.upId = upId;
      if (deptId !== null) params.deptId = deptId;
      if (ouverte !== null) params.ouverte = ouverte;
      if (start !== null) params.start = start;
      if (end !== null) params.end = end;
      if (etat !== null) params.etat = etat;

      const response = await axios.get(`${API_URL}/count-heures`, { params });
      return response.data || { count: 0, totalHeures: 0 };
    } catch (error) {
      if (isNotFoundError(error)) {
        console.warn("Aucune formation filtrée trouvée");
        return { count: 0, totalHeures: 0 };
      }
      console.error(
        "Erreur lors de la récupération du count & totalHeures de formations filtrées :",
        error
      );
      throw error;
    }
  },

  // Récupère les formations par type avec filtres
  async getFormationsByTypeFiltered({
    domaine = null,
    upId = null,
    deptId = null,
    ouverte = null,
    start = null,
    end = null,
    etat = null,
  } = {}) {
    try {
      const params = {};
      if (domaine !== null) params.domaine = domaine;
      if (upId !== null) params.upId = upId;
      if (deptId !== null) params.deptId = deptId;
      if (ouverte !== null) params.ouverte = ouverte;
      if (start !== null) params.start = start;
      if (end !== null) params.end = end;
      if (etat !== null) params.etat = etat;

      const response = await axios.get(
        `${API_URL}/formations-by-type-filtered`,
        { params }
      );
      return response.data || { interne: 0, externe: 0, enLigne: 0 };
    } catch (error) {
      if (isNotFoundError(error)) {
        console.warn("Aucune formation par type filtrée trouvée");
        return { interne: 0, externe: 0, enLigne: 0 };
      }
      console.error(
        "Erreur lors de la récupération des formations par type filtré :",
        error
      );
      throw error;
    }
  },

  // Récupère le count par type de formateur avec IDs
  async getCountByTrainerTypeWithIds(filters = {}) {
    try {
      const response = await axios.get(
        `${API_URL}/count-by-trainer-type-with-ids`,
        { params: filters }
      );
      return response.data || [];
    } catch (error) {
      if (isNotFoundError(error)) {
        console.warn("Aucune donnée count-by-trainer-type trouvée");
        return [];
      }
      console.error("Erreur récupération count-by-trainer-type-with-ids :", error);
      throw error;
    }
  },
};

export default KPIService;
