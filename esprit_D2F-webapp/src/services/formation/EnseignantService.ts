import { defaultApi as axios } from "@/utils/helpers/httpClient";
import { config } from "@/config/env";
const API_URL = `${config.FORMATION_URL}/formation/enseignants`;

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

const EnseignantService = {
  async createEnseignant(enseignantData: Record<string, unknown>) {
    try {
      const response = await axios.post(API_URL, enseignantData);
      return response.data;
    } catch (error: unknown) {
      throw error;
    }
  },

  async getAllEnseignants() {
    try {
      const response = await axios.get(API_URL);
      return normalizeListResponse(response.data);
    } catch (error: unknown) {
      throw error;
    }
  },

  async getEnseignantById(id: number | string) {
    try {
      const response = await axios.get(`${API_URL}/${id}`);
      return response.data;
    } catch (error: unknown) {
      throw error;
    }
  },

  async updateEnseignant(id: number | string, enseignantData: Record<string, unknown>) {
    try {
      const response = await axios.put(`${API_URL}/${id}`, enseignantData);
      return response.data;
    } catch (error: unknown) {
      throw error;
    }
  },

  async deleteEnseignant(id: number | string) {
    try {
      await axios.delete(`${API_URL}/${id}`);
    } catch (error: unknown) {
      throw error;
    }
  },

  async uploadEnseignants(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(`${API_URL}/upload`, formData);
      return response.data;
    } catch (error: unknown) {
      throw error;
    }
  },
};

export default EnseignantService;




