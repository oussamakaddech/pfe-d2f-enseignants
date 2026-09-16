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

const PAGE_SIZE = 100;

const BureauService = {
  async getAllBureaux(): Promise<Bureau[]> {
    // L'endpoint backend est paginé (@PageableDefault size=20, sort=id). On
    // parcourt les pages (taille 100) jusqu'à épuisement pour récupérer TOUS les
    // bureaux sans jamais charger 1000+ enregistrements en un seul appel
    // (conformité DSI §2.2 : pagination obligatoire sur les listes volumineuses).
    const first = await axios.get<{ content: Bureau[]; totalPages: number }>(API_URL, {
      params: { page: 0, size: PAGE_SIZE, sort: "id,desc" },
    });
    const all: Bureau[] = [...normalizeListResponse<Bureau>(first.data)];
    const totalPages = first.data?.totalPages ?? 1;
    for (let page = 1; page < totalPages; page += 1) {
      const next = await axios.get<{ content: Bureau[] }>(API_URL, {
        params: { page, size: PAGE_SIZE, sort: "id,desc" },
      });
      all.push(...normalizeListResponse<Bureau>(next.data));
    }
    return all;
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
