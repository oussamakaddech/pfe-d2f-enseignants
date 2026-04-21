import { defaultApi as axios } from "../utils/httpClient";
import { config } from "../config/env";

const API_URL = `${config.EVALUATION_URL}/evaluation/evaluations-globales`;

const EvaluationGlobaleService = {
  async createEvaluationGlobale(data) {
    try {
      const response = await axios.post(API_URL, data);
      return response.data;
    } catch (error) {
      console.error("Erreur lors de la création de l'évaluation globale :", error);
      throw error;
    }
  },

  async getAllEvaluationGlobales() {
    try {
      const response = await axios.get(API_URL);
      return response.data;
    } catch (error) {
      console.error("Erreur lors de la récupération des évaluations globales :", error);
      throw error;
    }
  },

  async getEvaluationGlobaleById(id) {
    try {
      const response = await axios.get(`${API_URL}/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la récupération de l'évaluation globale ${id} :`, error);
      throw error;
    }
  },

  async getEvaluationGlobaleByFormationId(formationId) {
    try {
      const response = await axios.get(`${API_URL}/formation/${formationId}`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la récupération de l'évaluation globale pour la formation ${formationId} :`, error);
      throw error;
    }
  },

  async updateEvaluationGlobale(id, data) {
    try {
      const response = await axios.put(`${API_URL}/${id}`, data);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la mise à jour de l'évaluation globale ${id} :`, error);
      throw error;
    }
  },

  async deleteEvaluationGlobale(id) {
    try {
      await axios.delete(`${API_URL}/${id}`);
    } catch (error) {
      console.error(`Erreur lors de la suppression de l'évaluation globale ${id} :`, error);
      throw error;
    }
  },
};

export default EvaluationGlobaleService;