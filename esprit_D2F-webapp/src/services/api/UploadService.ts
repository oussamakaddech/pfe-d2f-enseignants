import { config } from "@/config/env";
import { defaultApi as axios } from "@/services/httpClient";

const API_URL = `${config.FORMATION_URL}/formation/ups`;

function isNotFoundError(error: unknown): boolean {
  return (error as { response?: { status?: number } })?.response?.status === 404;
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

const UpService = {
  async createUp(upData: Record<string, unknown>) {
    const response = await axios.post(API_URL, upData);
    return response.data;
  },

  async getAllUps() {
    try {
      const response = await axios.get(API_URL);
      return normalizeListResponse(response.data);
    } catch (error: unknown) {
      if (isNotFoundError(error)) {
        return [];
      }
      throw error;
    }
  },

  async getUpById(id: number | string) {
    const response = await axios.get(`${API_URL}/${id}`);
    return response.data;
  },

  async updateUp(id: number | string, upData: Record<string, unknown>) {
    const response = await axios.put(`${API_URL}/${id}`, upData);
    return response.data;
  },

  async deleteUp(id: number | string) {
    await axios.delete(`${API_URL}/${id}`);
  },

  async importUpsExcel(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const response = await axios.post(`${API_URL}/import-excel`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },
};

export default UpService;
