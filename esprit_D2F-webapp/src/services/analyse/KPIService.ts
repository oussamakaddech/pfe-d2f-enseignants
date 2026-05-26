import { defaultApi as axios } from "@/utils/helpers/httpClient";
import { config } from "@/config/env";

const API_URL = `${config.FORMATION_URL}/formation/kpi`;

function isNotFoundError(error: unknown): boolean {
  return (error as { isAxiosError?: boolean; response?: { status?: number } })?.isAxiosError === true
    && (error as { response?: { status?: number } })?.response?.status === 404;
}

function normalizeListResponse<T>(payload: T[] | { content?: T[]; data?: T[]; items?: T[] }): T[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === "object") {
    const candidate = payload as { content?: unknown[]; data?: unknown[]; items?: unknown[] };
    if (Array.isArray(candidate.content)) {
      return candidate.content as T[];
    }
    if (Array.isArray(candidate.data)) {
      return candidate.data as T[];
    }
    if (Array.isArray(candidate.items)) {
      return candidate.items as T[];
    }
  }

  return [];
}

const KPIService = {
  async getTotalFormations(start: string, end: string) {
    try {
      const response = await axios.get(`${API_URL}/formations`, {
        params: { start, end },
      });
      return response.data || 0;
    } catch (error: unknown) {
      if (isNotFoundError(error)) {
        return 0;
      }
      throw error;
    }
  },

  async getTotalHeures(start: string, end: string) {
    try {
      const response = await axios.get(`${API_URL}/heures`, {
        params: { start, end },
      });
      return response.data || 0;
    } catch (error: unknown) {
      if (isNotFoundError(error)) {
        return 0;
      }
      throw error;
    }
  },

  async getUniqueParticipants(start: string, end: string) {
    try {
      const response = await axios.get(`${API_URL}/participants`, {
        params: { start, end },
      });
      return response.data || 0;
    } catch (error: unknown) {
      if (isNotFoundError(error)) {
        return 0;
      }
      throw error;
    }
  },

  async getFormationsByEtat(start: string, end: string) {
    try {
      const response = await axios.get(`${API_URL}/formations-by-etat`, {
        params: { start, end },
      });
      return response.data || { enregistre: 0, planifie: 0, enCours: 0, acheve: 0, annule: 0, total: 0 };
    } catch (error: unknown) {
      if (isNotFoundError(error)) {
        return { enregistre: 0, planifie: 0, enCours: 0, acheve: 0, annule: 0, total: 0 };
      }
      throw error;
    }
  },

  async getTopParticipants(start: string, end: string, upId: string | null = null, deptId: string | null = null) {
    try {
      const params: Record<string, unknown> = { start, end };
      if (upId) params.upId = upId;
      if (deptId) params.deptId = deptId;

      const response = await axios.get(`${API_URL}/top-participants`, { params });
      return response.data || [];
    } catch (error: unknown) {
      if (isNotFoundError(error)) {
        return [];
      }
      throw error;
    }
  },

  async getTopAbsentees(start: string, end: string, upId: string | null = null, deptId: string | null = null) {
    try {
      const params: Record<string, unknown> = { start, end };
      if (upId) params.upId = upId;
      if (deptId) params.deptId = deptId;

      const response = await axios.get(`${API_URL}/top-absentees`, { params });
      return response.data || [];
    } catch (error: unknown) {
      if (isNotFoundError(error)) {
        return [];
      }
      throw error;
    }
  },

  async getEnseignantsNonAffectes(start: string, end: string) {
    try {
      const response = await axios.get(`${API_URL}/enseignants-non-affectes`, {
        params: { start, end },
      });
      return normalizeListResponse(response.data);
    } catch (error: unknown) {
      if (isNotFoundError(error)) {
        return [];
      }
      throw error;
    }
  },

  async getCountAndHeures({
    domaine = null,
    upId = null,
    deptId = null,
    ouverte = null,
    start = null,
    end = null,
    etat = null,
  }: {
    domaine?: string | null;
    upId?: string | null;
    deptId?: string | null;
    ouverte?: boolean | null;
    start?: string | null;
    end?: string | null;
    etat?: string | null;
  } = {}) {
    try {
      const params: Record<string, unknown> = {};
      if (domaine !== null) params.domaine = domaine;
      if (upId !== null) params.upId = upId;
      if (deptId !== null) params.deptId = deptId;
      if (ouverte !== null) params.ouverte = ouverte;
      if (start !== null) params.start = start;
      if (end !== null) params.end = end;
      if (etat !== null) params.etat = etat;

      const response = await axios.get(`${API_URL}/count-heures`, { params });
      return response.data || { count: 0, totalHeures: 0 };
    } catch (error: unknown) {
      if (isNotFoundError(error)) {
        return { count: 0, totalHeures: 0 };
      }
      throw error;
    }
  },

  async getFormationsByTypeFiltered({
    domaine = null,
    upId = null,
    deptId = null,
    ouverte = null,
    start = null,
    end = null,
    etat = null,
  }: {
    domaine?: string | null;
    upId?: string | null;
    deptId?: string | null;
    ouverte?: boolean | null;
    start?: string | null;
    end?: string | null;
    etat?: string | null;
  } = {}) {
    try {
      const params: Record<string, unknown> = {};
      if (domaine !== null) params.domaine = domaine;
      if (upId !== null) params.upId = upId;
      if (deptId !== null) params.deptId = deptId;
      if (ouverte !== null) params.ouverte = ouverte;
      if (start !== null) params.start = start;
      if (end !== null) params.end = end;
      if (etat !== null) params.etat = etat;

      const response = await axios.get(`${API_URL}/formations-by-type-filtered`, { params });
      return response.data || { interne: 0, externe: 0, enLigne: 0 };
    } catch (error: unknown) {
      if (isNotFoundError(error)) {
        return { interne: 0, externe: 0, enLigne: 0 };
      }
      throw error;
    }
  },

  async getCountByTrainerTypeWithIds(filters: Record<string, unknown> = {}) {
    try {
      const response = await axios.get(`${API_URL}/count-by-trainer-type-with-ids`, { params: filters });
      return response.data || [];
    } catch (error: unknown) {
      if (isNotFoundError(error)) {
        return [];
      }
      throw error;
    }
  },
};

export default KPIService;




