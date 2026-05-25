import { defaultApi as axios } from "@/utils/helpers/httpClient";
import { config } from "@/config/env";
import type { BureauRequest } from "@/models/bureau";

const API_URL = `${config.FORMATION_URL}/formation/bureaux`;

function normalizeListResponse(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === "object") {
    const candidate = payload as { content?: unknown; data?: unknown; items?: unknown };
    if (Array.isArray(candidate.content)) {
      return candidate.content;
    }
    if (Array.isArray(candidate.data)) {
      return candidate.data;
    }
    if (Array.isArray(candidate.items)) {
      return candidate.items;
    }
  }

  return [];
}

const BureauService = {
  async getAllBureaux(): Promise<unknown[]> {
    const response = await axios.get(API_URL);
    return normalizeListResponse(response.data);
  },

  async getBureauById(id: number) {
    const response = await axios.get(`${API_URL}/${id}`);
    return response.data;
  },

  async createBureau(data: BureauRequest) {
    const response = await axios.post(API_URL, data);
    return response.data;
  },

  async updateBureau(id: number, data: BureauRequest) {
    const response = await axios.put(`${API_URL}/${id}`, data);
    return response.data;
  },

  async deleteBureau(id: number) {
    await axios.delete(`${API_URL}/${id}`);
  },
};

export default BureauService;
