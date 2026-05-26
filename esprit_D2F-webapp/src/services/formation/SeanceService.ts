import { defaultApi as axios } from "@/utils/helpers/httpClient";
import { config } from "@/config/env"; 
const API_URL = `${config.FORMATION_URL}/api/v1/seances`;

const SeanceService = {
  async createSeance(seanceData: Record<string, unknown>) {
    try {
      const response = await axios.post(API_URL, seanceData);
      return response.data;
    } catch (error: unknown) {
      throw error;
    }
  },

  async updateSeance(id: number | string, seanceData: Record<string, unknown>) {
    try {
      const response = await axios.put(`${API_URL}/${id}`, seanceData);
      return response.data;
    } catch (error: unknown) {
      throw error;
    }
  },

  async deleteSeance(id: number | string) {
    try {
      const response = await axios.delete(`${API_URL}/${id}`);
      return response.data;
    } catch (error: unknown) {
      throw error;
    }
  },

  async getSeanceById(id: number | string) {
    try {
      const response = await axios.get(`${API_URL}/${id}`);
      return response.data;
    } catch (error: unknown) {
      throw error;
    }
  },

  async getAllSeances() {
    try {
      const response = await axios.get(API_URL);
      return response.data;
    } catch (error: unknown) {
      throw error;
    }
  },
};

export default SeanceService;




