import { defaultApi as api } from "@/utils/helpers/httpClient";
import { config } from "@/config/env";

const API_URL = `${config.FORMATION_URL}/formation/formation-competences`;

const FormationCompetenceService = {
  async getByFormation(formationId: number | string) {
    const response = await api.get(`${API_URL}/formation/${formationId}`);
    return response.data;
  },

  async addFormationCompetence(formationId: number | string, fc: Record<string, unknown>) {
    const response = await api.post(`${API_URL}/formation/${formationId}`, fc);
    return response.data;
  },

  async updateFormationCompetence(id: number | string, fc: Record<string, unknown>) {
    const response = await api.put(`${API_URL}/${id}`, fc);
    return response.data;
  },

  async deleteFormationCompetence(id: number | string) {
    await api.delete(`${API_URL}/${id}`);
  },

  async replaceAllForFormation(formationId: number | string, newLinks: Record<string, unknown>) {
    const response = await api.put(`${API_URL}/formation/${formationId}/replace-all`, newLinks);
    return response.data;
  },

  async getByCompetence(competenceId: number | string) {
    const response = await api.get(`${API_URL}/competence/${competenceId}`);
    return response.data;
  },

  async getByDomaine(domaineId: number | string) {
    const response = await api.get(`${API_URL}/domaine/${domaineId}`);
    return response.data;
  },
};

export default FormationCompetenceService;



