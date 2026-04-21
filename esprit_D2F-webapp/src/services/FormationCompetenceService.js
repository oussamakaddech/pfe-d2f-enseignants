import axios from "axios";
import { config } from "../config/env";
import { optionalAuthHeader } from "./authHeaders";

const API_URL = `${config.FORMATION_URL}/formation/formation-competences`;

const FormationCompetenceService = {
  /** Récupérer les liaisons pour une formation */
  async getByFormation(formationId) {
    const response = await axios.get(`${API_URL}/formation/${formationId}`, {
      headers: optionalAuthHeader(),
    });
    return response.data;
  },

  /** Ajouter une liaison formation-compétence */
  async addFormationCompetence(formationId, fc) {
    const response = await axios.post(`${API_URL}/formation/${formationId}`, fc, {
      headers: optionalAuthHeader(),
    });
    return response.data;
  },

  /** Mettre à jour une liaison */
  async updateFormationCompetence(id, fc) {
    const response = await axios.put(`${API_URL}/${id}`, fc, {
      headers: optionalAuthHeader(),
    });
    return response.data;
  },

  /** Supprimer une liaison */
  async deleteFormationCompetence(id) {
    await axios.delete(`${API_URL}/${id}`, {
      headers: optionalAuthHeader(),
    });
  },

  /** Remplacer toutes les liaisons pour une formation */
  async replaceAllForFormation(formationId, newLinks) {
    const response = await axios.put(`${API_URL}/formation/${formationId}/replace-all`, newLinks, {
      headers: optionalAuthHeader(),
    });
    return response.data;
  },

  /** Récupérer les formations liées à une compétence */
  async getByCompetence(competenceId) {
    const response = await axios.get(`${API_URL}/competence/${competenceId}`, {
      headers: optionalAuthHeader(),
    });
    return response.data;
  },

  /** Récupérer les formations liées à un domaine */
  async getByDomaine(domaineId) {
    const response = await axios.get(`${API_URL}/domaine/${domaineId}`, {
      headers: optionalAuthHeader(),
    });
    return response.data;
  },
};

export default FormationCompetenceService;