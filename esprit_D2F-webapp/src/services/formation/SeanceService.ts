import { defaultApi as axios } from "@/services/httpClient";
import { config } from "@/config/env";
import type { Seance } from "@/models/formation";
const API_URL = `${config.FORMATION_URL}/formation/seances`;

const SeanceService = {
  async createSeance(seanceData: Record<string, unknown>): Promise<Seance> {
    const response = await axios.post(API_URL, seanceData);
    return response.data;
  },

  async updateSeance(id: number | string, seanceData: Record<string, unknown>): Promise<Seance> {
    const response = await axios.put(`${API_URL}/${id}`, seanceData);
    return response.data;
  },

  async deleteSeance(id: number | string): Promise<void> {
    const response = await axios.delete(`${API_URL}/${id}`);
    return response.data;
  },

  async getSeanceById(id: number | string): Promise<Seance> {
    const response = await axios.get(`${API_URL}/${id}`);
    return response.data;
  },

  async getAllSeances(): Promise<Seance[]> {
    const response = await axios.get(API_URL);
    return response.data;
  },
};

export default SeanceService;
