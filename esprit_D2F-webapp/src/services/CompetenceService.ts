import axios, { type AxiosResponse } from "axios";
import { config } from "../config/env";
import type { ApiListOrPage, Id } from "../models/common";
import type {
  Competence,
  Domaine,
  Savoir,
  SousCompetence,
} from "../models/competence";

const BASE = `${config.COMPETENCE_URL}/competence`;

const authHeader = (): Record<string, string> => {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const toList = <T>(payload: ApiListOrPage<T>): T[] =>
  Array.isArray(payload) ? payload : payload.content ?? [];

type TreeNode = Record<string, unknown>;
type NiveauDefinition = Record<string, unknown>;
type EnseignantCompetence = Record<string, unknown>;
type AssignRequest = Record<string, unknown>;

const DomaineAPI = {
  getAll: async (): Promise<Domaine[]> => {
    const res = await axios.get<ApiListOrPage<Domaine>>(
      `${BASE}/domaines?size=1000&page=0`,
      { headers: authHeader() }
    );
    return toList(res.data);
  },

  getActifs: async (): Promise<Domaine[]> => {
    const res = await axios.get<Domaine[]>(`${BASE}/domaines/actifs`, {
      headers: authHeader(),
    });
    return res.data;
  },

  getById: async (id: Id): Promise<Domaine> => {
    const res = await axios.get<Domaine>(`${BASE}/domaines/${id}`, {
      headers: authHeader(),
    });
    return res.data;
  },

  create: async (domaine: Partial<Domaine>): Promise<Domaine> => {
    const res = await axios.post<Domaine>(`${BASE}/domaines`, domaine, {
      headers: authHeader(),
    });
    return res.data;
  },

  update: async (id: Id, domaine: Partial<Domaine>): Promise<Domaine> => {
    const res = await axios.put<Domaine>(`${BASE}/domaines/${id}`, domaine, {
      headers: authHeader(),
    });
    return res.data;
  },

  delete: (id: Id): Promise<AxiosResponse<unknown>> =>
    axios.delete(`${BASE}/domaines/${id}`, { headers: authHeader() }),

  toggleActif: async (id: Id): Promise<Domaine> => {
    const res = await axios.patch<Domaine>(
      `${BASE}/domaines/${id}/toggle-actif`,
      {},
      { headers: authHeader() }
    );
    return res.data;
  },
};

const CompetenceAPI = {
  getAll: async (): Promise<Competence[]> => {
    const res = await axios.get<ApiListOrPage<Competence>>(
      `${BASE}/competences?size=1000&page=0`,
      { headers: authHeader() }
    );
    return toList(res.data);
  },

  getByDomaine: async (domaineId: Id): Promise<Competence[]> => {
    const res = await axios.get<Competence[]>(`${BASE}/competences/domaine/${domaineId}`, {
      headers: authHeader(),
    });
    return res.data;
  },

  getById: async (id: Id): Promise<Competence> => {
    const res = await axios.get<Competence>(`${BASE}/competences/${id}`, {
      headers: authHeader(),
    });
    return res.data;
  },

  create: async (
    domaineId: Id,
    competence: Partial<Competence>
  ): Promise<Competence> => {
    const res = await axios.post<Competence>(
      `${BASE}/competences/domaine/${domaineId}`,
      competence,
      { headers: authHeader() }
    );
    return res.data;
  },

  update: async (id: Id, competence: Partial<Competence>): Promise<Competence> => {
    const res = await axios.put<Competence>(`${BASE}/competences/${id}`, competence, {
      headers: authHeader(),
    });
    return res.data;
  },

  delete: (id: Id): Promise<AxiosResponse<unknown>> =>
    axios.delete(`${BASE}/competences/${id}`, { headers: authHeader() }),
};

const SousCompetenceAPI = {
  getAll: async (): Promise<SousCompetence[]> => {
    const res = await axios.get<ApiListOrPage<SousCompetence>>(
      `${BASE}/sous-competences?size=1000&page=0`,
      { headers: authHeader() }
    );
    return toList(res.data);
  },

  getByCompetence: async (competenceId: Id): Promise<SousCompetence[]> => {
    const res = await axios.get<SousCompetence[]>(
      `${BASE}/sous-competences/competence/${competenceId}`,
      { headers: authHeader() }
    );
    return res.data;
  },

  getById: async (id: Id): Promise<SousCompetence> => {
    const res = await axios.get<SousCompetence>(`${BASE}/sous-competences/${id}`, {
      headers: authHeader(),
    });
    return res.data;
  },

  create: async (
    competenceId: Id,
    sousCompetence: Partial<SousCompetence>
  ): Promise<SousCompetence> => {
    const res = await axios.post<SousCompetence>(
      `${BASE}/sous-competences/competence/${competenceId}`,
      sousCompetence,
      { headers: authHeader() }
    );
    return res.data;
  },

  createEnfant: async (
    parentId: Id,
    sousCompetence: Partial<SousCompetence>
  ): Promise<SousCompetence> => {
    const res = await axios.post<SousCompetence>(
      `${BASE}/sous-competences/${parentId}/enfants`,
      sousCompetence,
      { headers: authHeader() }
    );
    return res.data;
  },

  update: async (
    id: Id,
    sousCompetence: Partial<SousCompetence>
  ): Promise<SousCompetence> => {
    const res = await axios.put<SousCompetence>(
      `${BASE}/sous-competences/${id}`,
      sousCompetence,
      { headers: authHeader() }
    );
    return res.data;
  },

  delete: (id: Id): Promise<AxiosResponse<unknown>> =>
    axios.delete(`${BASE}/sous-competences/${id}`, { headers: authHeader() }),
};

const SavoirAPI = {
  getAll: async (): Promise<Savoir[]> => {
    const res = await axios.get<ApiListOrPage<Savoir>>(
      `${BASE}/savoirs?size=1000&page=0`,
      { headers: authHeader() }
    );
    return toList(res.data);
  },

  getBySousCompetence: async (sousCompetenceId: Id): Promise<Savoir[]> => {
    const res = await axios.get<Savoir[]>(
      `${BASE}/savoirs/sous-competence/${sousCompetenceId}`,
      { headers: authHeader() }
    );
    return res.data;
  },

  getByCompetence: async (competenceId: Id): Promise<Savoir[]> => {
    const res = await axios.get<Savoir[]>(`${BASE}/savoirs/competence/${competenceId}`, {
      headers: authHeader(),
    });
    return res.data;
  },

  getByType: async (type: string): Promise<Savoir[]> => {
    const res = await axios.get<Savoir[]>(`${BASE}/savoirs/type/${type}`, {
      headers: authHeader(),
    });
    return res.data;
  },

  search: async (keyword: string): Promise<Savoir[]> => {
    const res = await axios.get<Savoir[]>(
      `${BASE}/savoirs/search?keyword=${encodeURIComponent(keyword)}`,
      { headers: authHeader() }
    );
    return res.data;
  },

  getById: async (id: Id): Promise<Savoir> => {
    const res = await axios.get<Savoir>(`${BASE}/savoirs/${id}`, {
      headers: authHeader(),
    });
    return res.data;
  },

  create: async (sousCompetenceId: Id, savoir: Partial<Savoir>): Promise<Savoir> => {
    const res = await axios.post<Savoir>(
      `${BASE}/savoirs/sous-competence/${sousCompetenceId}`,
      savoir,
      { headers: authHeader() }
    );
    return res.data;
  },

  createForCompetence: async (
    competenceId: Id,
    savoir: Partial<Savoir>
  ): Promise<Savoir> => {
    const res = await axios.post<Savoir>(
      `${BASE}/savoirs/competence/${competenceId}`,
      savoir,
      { headers: authHeader() }
    );
    return res.data;
  },

  update: async (id: Id, savoir: Partial<Savoir>): Promise<Savoir> => {
    const res = await axios.put<Savoir>(`${BASE}/savoirs/${id}`, savoir, {
      headers: authHeader(),
    });
    return res.data;
  },

  delete: (id: Id): Promise<AxiosResponse<unknown>> =>
    axios.delete(`${BASE}/savoirs/${id}`, { headers: authHeader() }),
};

const EnseignantCompetenceAPI = {
  getAll: async (): Promise<EnseignantCompetence[]> => {
    const res = await axios.get<ApiListOrPage<EnseignantCompetence>>(
      `${BASE}/enseignant-competences?size=1000&page=0`,
      { headers: authHeader() }
    );
    return toList(res.data);
  },

  getByEnseignant: async (enseignantId: Id): Promise<EnseignantCompetence[]> => {
    const res = await axios.get<EnseignantCompetence[]>(
      `${BASE}/enseignant-competences/enseignant/${enseignantId}`,
      { headers: authHeader() }
    );
    return res.data;
  },

  getByEnseignantAndDomaine: async (
    enseignantId: Id,
    domaineId: Id
  ): Promise<EnseignantCompetence[]> => {
    const res = await axios.get<EnseignantCompetence[]>(
      `${BASE}/enseignant-competences/enseignant/${enseignantId}/domaine/${domaineId}`,
      { headers: authHeader() }
    );
    return res.data;
  },

  getByEnseignantAndNiveau: async (
    enseignantId: Id,
    niveau: string
  ): Promise<EnseignantCompetence[]> => {
    const res = await axios.get<EnseignantCompetence[]>(
      `${BASE}/enseignant-competences/enseignant/${enseignantId}/niveau/${niveau}`,
      { headers: authHeader() }
    );
    return res.data;
  },

  countByEnseignant: async (enseignantId: Id): Promise<number> => {
    const res = await axios.get<number>(
      `${BASE}/enseignant-competences/enseignant/${enseignantId}/count`,
      { headers: authHeader() }
    );
    return res.data;
  },

  assign: async (request: AssignRequest): Promise<EnseignantCompetence> => {
    const res = await axios.post<EnseignantCompetence>(
      `${BASE}/enseignant-competences`,
      request,
      { headers: authHeader() }
    );
    return res.data;
  },

  updateNiveau: async (id: Id, niveau: string): Promise<EnseignantCompetence> => {
    const res = await axios.patch<EnseignantCompetence>(
      `${BASE}/enseignant-competences/${id}/niveau?niveau=${niveau}`,
      {},
      { headers: authHeader() }
    );
    return res.data;
  },

  remove: (id: Id): Promise<AxiosResponse<unknown>> =>
    axios.delete(`${BASE}/enseignant-competences/${id}`, { headers: authHeader() }),
};

const NiveauDefinitionAPI = {
  getAll: async (): Promise<NiveauDefinition[]> => {
    const res = await axios.get<NiveauDefinition[]>(`${BASE}/niveaux`, {
      headers: authHeader(),
    });
    return res.data;
  },

  getByCompetence: async (competenceId: Id): Promise<NiveauDefinition[]> => {
    const res = await axios.get<NiveauDefinition[]>(
      `${BASE}/niveaux/competence/${competenceId}`,
      { headers: authHeader() }
    );
    return res.data;
  },

  getBySousCompetence: async (sousCompetenceId: Id): Promise<NiveauDefinition[]> => {
    const res = await axios.get<NiveauDefinition[]>(
      `${BASE}/niveaux/sous-competence/${sousCompetenceId}`,
      { headers: authHeader() }
    );
    return res.data;
  },

  getByCompetenceAndNiveau: async (
    competenceId: Id,
    niveau: string
  ): Promise<NiveauDefinition[]> => {
    const res = await axios.get<NiveauDefinition[]>(
      `${BASE}/niveaux/competence/${competenceId}/niveau/${niveau}`,
      { headers: authHeader() }
    );
    return res.data;
  },

  getBySousCompetenceAndNiveau: async (
    sousCompetenceId: Id,
    niveau: string
  ): Promise<NiveauDefinition[]> => {
    const res = await axios.get<NiveauDefinition[]>(
      `${BASE}/niveaux/sous-competence/${sousCompetenceId}/niveau/${niveau}`,
      { headers: authHeader() }
    );
    return res.data;
  },

  add: async (request: Record<string, unknown>): Promise<NiveauDefinition> => {
    const res = await axios.post<NiveauDefinition>(`${BASE}/niveaux`, request, {
      headers: authHeader(),
    });
    return res.data;
  },

  remove: (id: Id): Promise<AxiosResponse<unknown>> =>
    axios.delete(`${BASE}/niveaux/${id}`, { headers: authHeader() }),
};

const StructureAPI = {
  getArbreComplet: async (): Promise<TreeNode[]> => {
    const res = await axios.get<TreeNode[]>(`${BASE}/structure/arbre`, {
      headers: authHeader(),
    });
    return res.data;
  },

  getArbreDomaine: async (domaineId: Id): Promise<TreeNode[]> => {
    const res = await axios.get<TreeNode[]>(`${BASE}/structure/arbre/domaine/${domaineId}`, {
      headers: authHeader(),
    });
    return res.data;
  },

  rechercheGlobale: async (keyword: string): Promise<TreeNode[]> => {
    const res = await axios.get<TreeNode[]>(
      `${BASE}/structure/recherche?keyword=${encodeURIComponent(keyword)}`,
      { headers: authHeader() }
    );
    return res.data;
  },

  rechercheParDomaine: async (domaineId: Id, keyword: string): Promise<TreeNode[]> => {
    const res = await axios.get<TreeNode[]>(
      `${BASE}/structure/recherche/domaine/${domaineId}?keyword=${encodeURIComponent(keyword)}`,
      { headers: authHeader() }
    );
    return res.data;
  },
};

const CompetenceService = {
  domaine: DomaineAPI,
  competence: CompetenceAPI,
  sousCompetence: SousCompetenceAPI,
  savoir: SavoirAPI,
  enseignantCompetence: EnseignantCompetenceAPI,
  niveauDefinition: NiveauDefinitionAPI,
  structure: StructureAPI,
};

export default CompetenceService;
