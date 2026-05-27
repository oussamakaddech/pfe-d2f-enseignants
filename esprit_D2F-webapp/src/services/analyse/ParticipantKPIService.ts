import { defaultApi as axios } from "@/utils/helpers/httpClient";
import { config } from "@/config/env"; 

const API_URL = `${config.FORMATION_URL}/formation/kpi/participants`;

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

function isNotFoundError(error: unknown): boolean {
  return (error as { response?: { status?: number } })?.response?.status === 404;
}

const ParticipantKPIService = {
  async getFormationsParticipantKPIs(startDate: string, endDate: string) {
    try {
      const response = await axios.get(`${API_URL}/formations`, {
        params: { startDate, endDate },
      });
      return normalizeListResponse(response.data);
    } catch (error: unknown) {
      throw error;
    }
  },

  async getGlobalParticipantKPI(startDate: string, endDate: string) {
    try {
      const response = await axios.get(`${API_URL}/global`, {
        params: { startDate, endDate },
      });
      return response.data;
    } catch (error: unknown) {
      throw error;
    }
  },
};

export default ParticipantKPIService;




