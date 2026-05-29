import { defaultApi as axios } from "@/utils/helpers/httpClient";
import { config } from "@/config/env";
import type { Enseignant } from "@/models/enseignant";
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
  async createEnseignant(enseignantData: Record<string, unknown>): Promise<Enseignant> {
    const response = await axios.post(API_URL, enseignantData);
    return response.data;
  },

  async getAllEnseignants(): Promise<Enseignant[]> {
    const response = await axios.get(API_URL);
    return normalizeListResponse<Enseignant>(response.data);
  },

  async getEnseignantById(id: number | string): Promise<Enseignant> {
    const response = await axios.get(`${API_URL}/${id}`);
    return response.data;
  },

  async updateEnseignant(id: number | string, enseignantData: Record<string, unknown>): Promise<Enseignant> {
    const response = await axios.put(`${API_URL}/${id}`, enseignantData);
    return response.data;
  },

  async deleteEnseignant(id: number | string): Promise<void> {
    await axios.delete(`${API_URL}/${id}`);
  },

  async uploadEnseignants(file: File): Promise<{ count: number }> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await axios.post(`${API_URL}/upload`, formData);
    return response.data;
  },
};

export default EnseignantService;
