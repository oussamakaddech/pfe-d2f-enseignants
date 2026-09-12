import { defaultApi as axios } from '@/services/httpClient';
import { config } from '@/config/env';
import type { EvaluationEnseignant, EvaluationFormateur } from '@/models/evaluation';
const EVALUATION_API_URL = `${config.EVALUATION_URL}/evaluation/evaluations`;

const EvaluationFormateurService = {
  async listAll(): Promise<EvaluationFormateur[]> {
    const response = await axios.get(EVALUATION_API_URL);
    const body = response.data;
    if (Array.isArray(body)) return body;
    if (body && Array.isArray(body.content)) return body.content;
    return [];
  },

  async getById(id: number | string): Promise<EvaluationFormateur> {
    const response = await axios.get(`${EVALUATION_API_URL}/${id}`);
    return response.data;
  },

  async create(data: Record<string, unknown>): Promise<EvaluationFormateur> {
    const response = await axios.post(EVALUATION_API_URL, data);
    return response.data;
  },

  async update(id: number | string, data: Record<string, unknown>): Promise<EvaluationFormateur> {
    const response = await axios.put(`${EVALUATION_API_URL}/${id}`, data);
    return response.data;
  },

  async remove(id: number | string): Promise<void> {
    await axios.delete(`${EVALUATION_API_URL}/${id}`);
  },

  async validerCompetences(id: number | string): Promise<void> {
    await axios.post(`${EVALUATION_API_URL}/${id}/valider-competences`);
  },

  async listEvaluationsEnrichedByFormation(
    formationId: number | string,
  ): Promise<EvaluationEnseignant[]> {
    const response = await axios.get(`${EVALUATION_API_URL}/formation/${formationId}/enriched`);
    return response.data;
  },

  async updateEvaluationsBulkByFormation(
    formationId: number | string,
    evaluationsDtoList: Record<string, unknown>[],
  ): Promise<EvaluationFormateur[]> {
    const response = await axios.post(
      `${EVALUATION_API_URL}/formation/${formationId}/bulk/update`,
      evaluationsDtoList,
    );
    return response.data;
  },
};

export default EvaluationFormateurService;
