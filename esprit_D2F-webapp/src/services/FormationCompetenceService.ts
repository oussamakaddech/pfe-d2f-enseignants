import { defaultApi as api } from "../utils/httpClient";
import { config } from "../config/env";

const API_URL = `${config.FORMATION_URL}/formation/formation-competences`;

const FormationCompetenceService = {
  async getByFormation(formationId) {
    const response = await api.get(`${API_URL}/formation/${formationId}`);
    return response.data;
  },

  async addFormationCompetence(formationId, fc) {
    const response = await api.post(`${API_URL}/formation/${formationId}`, fc);
    return response.data;
  },

  async updateFormationCompetence(id, fc) {
    const response = await api.put(`${API_URL}/${id}`, fc);
    return response.data;
  },

  async deleteFormationCompetence(id) {
    await api.delete(`${API_URL}/${id}`);
  },

  async replaceAllForFormation(formationId, newLinks) {
    const response = await api.put(`${API_URL}/formation/${formationId}/replace-all`, newLinks);
    return response.data;
  },

  async getByCompetence(competenceId) {
    const response = await api.get(`${API_URL}/competence/${competenceId}`);
    return response.data;
  },

  async getByDomaine(domaineId) {
    const response = await api.get(`${API_URL}/domaine/${domaineId}`);
    return response.data;
  },
};

export default FormationCompetenceService;