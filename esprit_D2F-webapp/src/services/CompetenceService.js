// src/services/CompetenceService.js
import axios from "axios";
import { config } from "../config/env";

const BASE = `${config.COMPETENCE_URL}/competence`;

const authHeader = () => {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ─── Domaines ──────────────────────────────────────────────────────────────

const DomaineAPI = {
  getAll: () =>
    axios.get(`${BASE}/domaines`, { headers: authHeader() }).then((r) => r.data),

  getActifs: () =>
    axios.get(`${BASE}/domaines/actifs`, { headers: authHeader() }).then((r) => r.data),

  getById: (id) =>
    axios.get(`${BASE}/domaines/${id}`, { headers: authHeader() }).then((r) => r.data),

  create: (domaine) =>
    axios.post(`${BASE}/domaines`, domaine, { headers: authHeader() }).then((r) => r.data),

  update: (id, domaine) =>
    axios.put(`${BASE}/domaines/${id}`, domaine, { headers: authHeader() }).then((r) => r.data),

  delete: (id) =>
    axios.delete(`${BASE}/domaines/${id}`, { headers: authHeader() }),

  toggleActif: (id) =>
    axios.patch(`${BASE}/domaines/${id}/toggle-actif`, {}, { headers: authHeader() }).then((r) => r.data),
};

// ─── Compétences ───────────────────────────────────────────────────────────

const CompetenceAPI = {
  getAll: () =>
    axios.get(`${BASE}/competences`, { headers: authHeader() }).then((r) => r.data),

  getByDomaine: (domaineId) =>
    axios.get(`${BASE}/competences/domaine/${domaineId}`, { headers: authHeader() }).then((r) => r.data),

  getById: (id) =>
    axios.get(`${BASE}/competences/${id}`, { headers: authHeader() }).then((r) => r.data),

  create: (domaineId, competence) =>
    axios
      .post(`${BASE}/competences/domaine/${domaineId}`, competence, { headers: authHeader() })
      .then((r) => r.data),

  update: (id, competence) =>
    axios.put(`${BASE}/competences/${id}`, competence, { headers: authHeader() }).then((r) => r.data),

  delete: (id) =>
    axios.delete(`${BASE}/competences/${id}`, { headers: authHeader() }),
};

// ─── Sous-Compétences ──────────────────────────────────────────────────────

const SousCompetenceAPI = {
  getAll: () =>
    axios.get(`${BASE}/sous-competences`, { headers: authHeader() }).then((r) => r.data),

  getByCompetence: (competenceId) =>
    axios
      .get(`${BASE}/sous-competences/competence/${competenceId}`, { headers: authHeader() })
      .then((r) => r.data),

  getById: (id) =>
    axios.get(`${BASE}/sous-competences/${id}`, { headers: authHeader() }).then((r) => r.data),

  create: (competenceId, sousCompetence) =>
    axios
      .post(`${BASE}/sous-competences/competence/${competenceId}`, sousCompetence, {
        headers: authHeader(),
      })
      .then((r) => r.data),

  update: (id, sousCompetence) =>
    axios
      .put(`${BASE}/sous-competences/${id}`, sousCompetence, { headers: authHeader() })
      .then((r) => r.data),

  delete: (id) =>
    axios.delete(`${BASE}/sous-competences/${id}`, { headers: authHeader() }),
};

// ─── Savoirs ───────────────────────────────────────────────────────────────

const SavoirAPI = {
  getAll: () =>
    axios.get(`${BASE}/savoirs`, { headers: authHeader() }).then((r) => r.data),

  getBySousCompetence: (sousCompetenceId) =>
    axios
      .get(`${BASE}/savoirs/sous-competence/${sousCompetenceId}`, { headers: authHeader() })
      .then((r) => r.data),

  getByType: (type) =>
    axios.get(`${BASE}/savoirs/type/${type}`, { headers: authHeader() }).then((r) => r.data),

  getById: (id) =>
    axios.get(`${BASE}/savoirs/${id}`, { headers: authHeader() }).then((r) => r.data),

  create: (sousCompetenceId, savoir) =>
    axios
      .post(`${BASE}/savoirs/sous-competence/${sousCompetenceId}`, savoir, {
        headers: authHeader(),
      })
      .then((r) => r.data),

  update: (id, savoir) =>
    axios.put(`${BASE}/savoirs/${id}`, savoir, { headers: authHeader() }).then((r) => r.data),

  delete: (id) =>
    axios.delete(`${BASE}/savoirs/${id}`, { headers: authHeader() }),
};

// ─── EnseignantCompétences ─────────────────────────────────────────────────

const EnseignantCompetenceAPI = {
  getByEnseignant: (enseignantId) =>
    axios
      .get(`${BASE}/enseignant-competences/enseignant/${enseignantId}`, { headers: authHeader() })
      .then((r) => r.data),

  getByEnseignantAndDomaine: (enseignantId, domaineId) =>
    axios
      .get(`${BASE}/enseignant-competences/enseignant/${enseignantId}/domaine/${domaineId}`, {
        headers: authHeader(),
      })
      .then((r) => r.data),

  getByEnseignantAndNiveau: (enseignantId, niveau) =>
    axios
      .get(`${BASE}/enseignant-competences/enseignant/${enseignantId}/niveau/${niveau}`, {
        headers: authHeader(),
      })
      .then((r) => r.data),

  countByEnseignant: (enseignantId) =>
    axios
      .get(`${BASE}/enseignant-competences/enseignant/${enseignantId}/count`, {
        headers: authHeader(),
      })
      .then((r) => r.data),

  assign: (request) =>
    axios
      .post(`${BASE}/enseignant-competences`, request, { headers: authHeader() })
      .then((r) => r.data),

  updateNiveau: (id, niveau) =>
    axios
      .patch(`${BASE}/enseignant-competences/${id}/niveau?niveau=${niveau}`, {}, {
        headers: authHeader(),
      })
      .then((r) => r.data),

  remove: (id) =>
    axios.delete(`${BASE}/enseignant-competences/${id}`, { headers: authHeader() }),
};

const CompetenceService = {
  domaine: DomaineAPI,
  competence: CompetenceAPI,
  sousCompetence: SousCompetenceAPI,
  savoir: SavoirAPI,
  enseignantCompetence: EnseignantCompetenceAPI,
};

export default CompetenceService;
