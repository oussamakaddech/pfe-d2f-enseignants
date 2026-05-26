import { defaultApi as axios } from "@/utils/helpers/httpClient";
import { config } from "@/config/env";

const API_URL = `${config.FORMATION_URL}/formation/ups`;

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
    const response = await axios.get(API_URL);
    return normalizeListResponse(response.data);
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
