import { defaultApi as axios } from "@/utils/helpers/httpClient";
import { config } from "@/config/env";

const API_URL = `${config.EVALUATION_URL}/evaluation/evaluations-globales`;

const EvaluationGlobaleService = {
  async createEvaluationGlobale(data: Record<string, unknown>) {
    const response = await axios.post(API_URL, data);
    return response.data;
  },

  async getAllEvaluationGlobales() {
    const response = await axios.get(API_URL);
    const body = response.data;
    if (Array.isArray(body)) return body;
    if (body && Array.isArray(body.content)) return body.content;
    return [];
  },

  async getEvaluationGlobaleById(id: number | string) {
    const response = await axios.get(`${API_URL}/${id}`);
    return response.data;
  },

  async getEvaluationGlobaleByFormationId(formationId: number | string) {
    const response = await axios.get(`${API_URL}/formation/${formationId}`);
    return response.data;
  },

  async updateEvaluationGlobale(id: number | string, data: Record<string, unknown>) {
    const response = await axios.put(`${API_URL}/${id}`, data);
    return response.data;
  },

  async deleteEvaluationGlobale(id: number | string) {
    await axios.delete(`${API_URL}/${id}`);
  },
};

export default EvaluationGlobaleService;
