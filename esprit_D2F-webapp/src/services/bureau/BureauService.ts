import { defaultApi as axios } from "@/services/httpClient";
import { config } from "@/config/env";
import type { Bureau, BureauRequest } from "@/models/bureau";

const API_URL = `${config.FORMATION_URL}/formation/bureaux`;

function normalizeListResponse<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (payload && typeof payload === "object") {
    const candidate = payload as { content?: unknown; data?: unknown; items?: unknown };
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

const BureauService = {
  async getAllBureaux(): Promise<Bureau[]> {
    const response = await axios.get(API_URL);
    return normalizeListResponse<Bureau>(response.data);
  },

  async getBureauById(id: number): Promise<Bureau> {
    const response = await axios.get(`${API_URL}/${id}`);
    return response.data;
  },

  async createBureau(data: BureauRequest): Promise<Bureau> {
    const response = await axios.post(API_URL, data);
    return response.data;
  },

  async updateBureau(id: number, data: BureauRequest): Promise<Bureau> {
    const response = await axios.put(`${API_URL}/${id}`, data);
    return response.data;
  },

  async deleteBureau(id: number) {
    await axios.delete(`${API_URL}/${id}`);
  },
};

export default BureauService;
