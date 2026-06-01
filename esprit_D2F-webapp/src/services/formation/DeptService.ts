import { defaultApi as axios } from "@/services/httpClient";
import { config } from "@/config/env";
import type { Departement } from "@/models/formation";
const API_URL = `${config.FORMATION_URL}/formation/departements`;

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
  return (error as { isAxiosError?: boolean; response?: { status?: number } })?.isAxiosError === true
    && (error as { response?: { status?: number } })?.response?.status === 404;
}

const DeptService = {
  async createDept(deptData: Record<string, unknown>): Promise<Departement> {
    const response = await axios.post(API_URL, deptData);
    return response.data;
  },

  async getAllDepts(): Promise<Departement[]> {
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

  async getDeptById(id: number | string): Promise<Departement> {
    const response = await axios.get(`${API_URL}/${id}`);
    return response.data;
  },

  async updateDept(id: number | string, deptData: Record<string, unknown>): Promise<Departement> {
    const response = await axios.put(`${API_URL}/${id}`, deptData);
    return response.data;
  },

  async deleteDept(id: number | string): Promise<void> {
    await axios.delete(`${API_URL}/${id}`);
  },

  async importDeptsExcel(file: File): Promise<{ count: number }> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await axios.post(`${API_URL}/import-excel`, formData);
    return response.data;
  },
};

export default DeptService;
