import { defaultApi as axios } from "../utils/httpClient";
import type { AxiosResponse } from "axios";
import { config } from "../config/env";
import type { ApiListOrPage, Id } from "../models/common";
import type {
  Competence,
  Domaine,
  Savoir,
  SousCompetence,
} from "../models/competence";

const BASE = `${config.COMPETENCE_URL}/competence`;



const toList = <T>(payload: ApiListOrPage<T>): T[] =>
  Array.isArray(payload) ? payload : payload.content ?? [];

type TreeNode = Record<string, unknown>;
type NiveauDefinition = Record<string, unknown>;
type EnseignantCompetence = Record<string, unknown>;
type AssignRequest = Record<string, unknown>;
type PrerequisiteRequest = Record<string, unknown>;

const DomaineAPI = {
  getAll: async (): Promise<Domaine[]> => {
    const res = await axios.get<ApiListOrPage<Domaine>>(
      `${BASE}/domaines?size=1000&page=0`,
      
    );
    return toList(res.data);
  },

  getActifs: async (): Promise<Domaine[]> => {
    const res = await axios.get<Domaine[]>(`${BASE}/domaines/actifs`);
    return res.data;
  },

  getById: async (id: Id): Promise<Domaine> => {
    const res = await axios.get<Domaine>(`${BASE}/domaines/${id}`);
    return res.data;
  },

  create: async (domaine: Partial<Domaine>): Promise<Domaine> => {
    const res = await axios.post<Domaine>(`${BASE}/domaines`, domaine);
    return res.data;
  },

  update: async (id: Id, domaine: Partial<Domaine>): Promise<Domaine> => {
    const res = await axios.put<Domaine>(`${BASE}/domaines/${id}`, domaine);
    return res.data;
  },

  delete: (id: Id): Promise<AxiosResponse<unknown>> =>
    axios.delete(`${BASE}/domaines/${id}`),

  toggleActif: async (id: Id): Promise<Domaine> => {
    const res = await axios.patch<Domaine>(
      `${BASE}/domaines/${id}/toggle-actif`,
      {},
      
    );
    return res.data;
  },
};

const CompetenceAPI = {
  getAll: async (): Promise<Competence[]> => {
    const res = await axios.get<ApiListOrPage<Competence>>(
      `${BASE}/competences?size=1000&page=0`,
      
    );
    return toList(res.data);
  },

  getByDomaine: async (domaineId: Id): Promise<Competence[]> => {
    const res = await axios.get<Competence[]>(`${BASE}/competences/domaine/${domaineId}`);
    return res.data;
  },

  getById: async (id: Id): Promise<Competence> => {
    const res = await axios.get<Competence>(`${BASE}/competences/${id}`);
    return res.data;
  },

  create: async (
    domaineId: Id,
    competence: Partial<Competence>
  ): Promise<Competence> => {
    const res = await axios.post<Competence>(
      `${BASE}/competences/domaine/${domaineId}`,
      competence,
      
    );
    return res.data;
  },

  update: async (id: Id, competence: Partial<Competence>): Promise<Competence> => {
    const res = await axios.put<Competence>(`${BASE}/competences/${id}`, competence);
    return res.data;
  },

  delete: (id: Id): Promise<AxiosResponse<unknown>> =>
    axios.delete(`${BASE}/competences/${id}`),
};

const SousCompetenceAPI = {
  getAll: async (): Promise<SousCompetence[]> => {
    const res = await axios.get<ApiListOrPage<SousCompetence>>(
      `${BASE}/sous-competences?size=1000&page=0`,
      
    );
    return toList(res.data);
  },

  getByCompetence: async (competenceId: Id): Promise<SousCompetence[]> => {
    const res = await axios.get<SousCompetence[]>(
      `${BASE}/sous-competences/competence/${competenceId}`,
      
    );
    return res.data;
  },

  getById: async (id: Id): Promise<SousCompetence> => {
    const res = await axios.get<SousCompetence>(`${BASE}/sous-competences/${id}`);
    return res.data;
  },

  create: async (
    competenceId: Id,
    sousCompetence: Partial<SousCompetence>
  ): Promise<SousCompetence> => {
    const res = await axios.post<SousCompetence>(
      `${BASE}/sous-competences/competence/${competenceId}`,
      sousCompetence,
      
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
      
    );
    return res.data;
  },

  delete: (id: Id): Promise<AxiosResponse<unknown>> =>
    axios.delete(`${BASE}/sous-competences/${id}`),
};

const SavoirAPI = {
  getAll: async (): Promise<Savoir[]> => {
    const res = await axios.get<ApiListOrPage<Savoir>>(
      `${BASE}/savoirs?size=1000&page=0`,
      
    );
    return toList(res.data);
  },

  getBySousCompetence: async (sousCompetenceId: Id): Promise<Savoir[]> => {
    const res = await axios.get<Savoir[]>(
      `${BASE}/savoirs/sous-competence/${sousCompetenceId}`,
      
    );
    return res.data;
  },

  getByCompetence: async (competenceId: Id): Promise<Savoir[]> => {
    const res = await axios.get<Savoir[]>(`${BASE}/savoirs/competence/${competenceId}`);
    return res.data;
  },

  getByType: async (type: string): Promise<Savoir[]> => {
    const res = await axios.get<Savoir[]>(`${BASE}/savoirs/type/${type}`);
    return res.data;
  },

  search: async (keyword: string): Promise<Savoir[]> => {
    const res = await axios.get<Savoir[]>(
      `${BASE}/savoirs/search?keyword=${encodeURIComponent(keyword)}`,
      
    );
    return res.data;
  },

  getById: async (id: Id): Promise<Savoir> => {
    const res = await axios.get<Savoir>(`${BASE}/savoirs/${id}`);
    return res.data;
  },

  create: async (sousCompetenceId: Id, savoir: Partial<Savoir>): Promise<Savoir> => {
    const res = await axios.post<Savoir>(
      `${BASE}/savoirs/sous-competence/${sousCompetenceId}`,
      savoir,
      
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
      
    );
    return res.data;
  },

  update: async (id: Id, savoir: Partial<Savoir>): Promise<Savoir> => {
    const res = await axios.put<Savoir>(`${BASE}/savoirs/${id}`, savoir);
    return res.data;
  },

  delete: (id: Id): Promise<AxiosResponse<unknown>> =>
    axios.delete(`${BASE}/savoirs/${id}`),
};

const EnseignantCompetenceAPI = {
  getAll: async (): Promise<EnseignantCompetence[]> => {
    const res = await axios.get<ApiListOrPage<EnseignantCompetence>>(
      `${BASE}/enseignant-competences?size=1000&page=0`,
      
    );
    return toList(res.data);
  },

  getByEnseignant: async (enseignantId: Id): Promise<EnseignantCompetence[]> => {
    const res = await axios.get<EnseignantCompetence[]>(
      `${BASE}/enseignant-competences/enseignant/${enseignantId}`,
      
    );
    return res.data;
  },

  getByEnseignantAndDomaine: async (
    enseignantId: Id,
    domaineId: Id
  ): Promise<EnseignantCompetence[]> => {
    const res = await axios.get<EnseignantCompetence[]>(
      `${BASE}/enseignant-competences/enseignant/${enseignantId}/domaine/${domaineId}`,
      
    );
    return res.data;
  },

  getByEnseignantAndNiveau: async (
    enseignantId: Id,
    niveau: string
  ): Promise<EnseignantCompetence[]> => {
    const res = await axios.get<EnseignantCompetence[]>(
      `${BASE}/enseignant-competences/enseignant/${enseignantId}/niveau/${niveau}`,
      
    );
    return res.data;
  },

  countByEnseignant: async (enseignantId: Id): Promise<number> => {
    const res = await axios.get<number>(
      `${BASE}/enseignant-competences/enseignant/${enseignantId}/count`,
      
    );
    return res.data;
  },

  assign: async (request: AssignRequest): Promise<EnseignantCompetence> => {
    const res = await axios.post<EnseignantCompetence>(
      `${BASE}/enseignant-competences`,
      request,
      
    );
    return res.data;
  },

  updateNiveau: async (id: Id, niveau: string): Promise<EnseignantCompetence> => {
    const res = await axios.patch<EnseignantCompetence>(
      `${BASE}/enseignant-competences/${id}/niveau?niveau=${niveau}`,
      {},
      
    );
    return res.data;
  },

  remove: (id: Id): Promise<AxiosResponse<unknown>> =>
    axios.delete(`${BASE}/enseignant-competences/${id}`),
};

const NiveauDefinitionAPI = {
  getAll: async (): Promise<NiveauDefinition[]> => {
    const res = await axios.get<NiveauDefinition[]>(`${BASE}/niveaux`);
    return res.data;
  },

  getByCompetence: async (competenceId: Id): Promise<NiveauDefinition[]> => {
    const res = await axios.get<NiveauDefinition[]>(
      `${BASE}/niveaux/competence/${competenceId}`,
      
    );
    return res.data;
  },

  getBySousCompetence: async (sousCompetenceId: Id): Promise<NiveauDefinition[]> => {
    const res = await axios.get<NiveauDefinition[]>(
      `${BASE}/niveaux/sous-competence/${sousCompetenceId}`,
      
    );
    return res.data;
  },

  getByCompetenceAndNiveau: async (
    competenceId: Id,
    niveau: string
  ): Promise<NiveauDefinition[]> => {
    const res = await axios.get<NiveauDefinition[]>(
      `${BASE}/niveaux/competence/${competenceId}/niveau/${niveau}`,
      
    );
    return res.data;
  },

  getBySousCompetenceAndNiveau: async (
    sousCompetenceId: Id,
    niveau: string
  ): Promise<NiveauDefinition[]> => {
    const res = await axios.get<NiveauDefinition[]>(
      `${BASE}/niveaux/sous-competence/${sousCompetenceId}/niveau/${niveau}`,
      
    );
    return res.data;
  },

  add: async (request: Record<string, unknown>): Promise<NiveauDefinition> => {
    const res = await axios.post<NiveauDefinition>(`${BASE}/niveaux`, request);
    return res.data;
  },

  remove: (id: Id): Promise<AxiosResponse<unknown>> =>
    axios.delete(`${BASE}/niveaux/${id}`),
};

const StructureAPI = {
  getArbreComplet: async (): Promise<TreeNode[]> => {
    const res = await axios.get<TreeNode[]>(`${BASE}/structure/arbre`);
    return res.data;
  },

  getArbreDomaine: async (domaineId: Id): Promise<TreeNode[]> => {
    const res = await axios.get<TreeNode[]>(`${BASE}/structure/arbre/domaine/${domaineId}`);
    return res.data;
  },

  rechercheGlobale: async (keyword: string): Promise<TreeNode[]> => {
    const res = await axios.get<TreeNode[]>(
      `${BASE}/structure/recherche?keyword=${encodeURIComponent(keyword)}`,
      
    );
    return res.data;
  },

  rechercheParDomaine: async (domaineId: Id, keyword: string): Promise<TreeNode[]> => {
    const res = await axios.get<TreeNode[]>(
      `${BASE}/structure/recherche/domaine/${domaineId}?keyword=${encodeURIComponent(keyword)}`,
      
    );
    return res.data;
  },
};

const PrerequisiteAPI = {
  getByCompetence: async (competenceId: Id): Promise<Record<string, unknown>[]> => {
    const res = await axios.get<Record<string, unknown>[]>(
      `${BASE}/competences/${competenceId}/prerequisite`,
      
    );
    return res.data;
  },

  check: async (competenceId: Id, enseignantId: Id): Promise<Record<string, unknown>> => {
    const res = await axios.get<Record<string, unknown>>(
      `${BASE}/competences/${competenceId}/prerequisite/check/${enseignantId}`,
      
    );
    return res.data;
  },

  add: async (competenceId: Id, data: PrerequisiteRequest): Promise<Record<string, unknown>> => {
    // Validation pour s'assurer que prerequisiteId n'est pas null
    if (!data.prerequisiteId) {
      throw new Error("prerequisiteId est requis et ne peut pas être null");
    }
    
    const res = await axios.post<Record<string, unknown>>(
      `${BASE}/competences/${competenceId}/prerequisite`,
      data,
      
    );
    return res.data;
  },

  updateNiveau: async (
    competenceId: Id,
    id: Id,
    niveauMinimum: string
  ): Promise<Record<string, unknown>> => {
    const res = await axios.patch<Record<string, unknown>>(
      `${BASE}/competences/${competenceId}/prerequisite/${id}/niveau`,
      null,
      { params: { niveauMinimum } }
    );
    return res.data;
  },

  remove: (competenceId: Id, id: Id): Promise<AxiosResponse<unknown>> =>
    axios.delete(`${BASE}/competences/${competenceId}/prerequisite/${id}`),
};

const CompetenceService = {
  domaine: DomaineAPI,
  competence: CompetenceAPI,
  sousCompetence: SousCompetenceAPI,
  savoir: SavoirAPI,
  enseignantCompetence: EnseignantCompetenceAPI,
  niveauDefinition: NiveauDefinitionAPI,
  structure: StructureAPI,
  prerequisite: PrerequisiteAPI,
};

export default CompetenceService;
