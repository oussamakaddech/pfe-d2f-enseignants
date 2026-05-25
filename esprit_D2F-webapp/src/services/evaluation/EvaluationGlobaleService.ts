import { defaultApi as axios } from "@/utils/helpers/httpClient";
import { config } from "@/config/env";

const API_URL = `${config.EVALUATION_URL}/evaluation/evaluations-globales`;

const EvaluationGlobaleService = {
  async createEvaluationGlobale(data: Record<string, unknown>) {
    try {
      const response = await axios.post(API_URL, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getAllEvaluationGlobales() {
    try {
      const response = await axios.get(API_URL);
      const body = response.data;
      if (Array.isArray(body)) return body;
      if (body && Array.isArray(body.content)) return body.content;
      return [];
    } catch (error) {
      throw error;
    }
  },

  async getEvaluationGlobaleById(id: number | string) {
    try {
      const response = await axios.get(`${API_URL}/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getEvaluationGlobaleByFormationId(formationId: number | string) {
    try {
      const response = await axios.get(`${API_URL}/formation/${formationId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async updateEvaluationGlobale(id: number | string, data: Record<string, unknown>) {
    try {
      const response = await axios.put(`${API_URL}/${id}`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async deleteEvaluationGlobale(id: number | string) {
    try {
      await axios.delete(`${API_URL}/${id}`);
    } catch (error) {
      throw error;
    }
  },
};

export default EvaluationGlobaleService;



