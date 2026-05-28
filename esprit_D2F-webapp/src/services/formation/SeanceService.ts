import { defaultApi as axios } from "@/utils/helpers/httpClient";
import { config } from "@/config/env";
const API_URL = `${config.FORMATION_URL}/formation/seances`;

const SeanceService = {
  async createSeance(seanceData: Record<string, unknown>) {
    const response = await axios.post(API_URL, seanceData);
    return response.data;
  },

  async updateSeance(id: number | string, seanceData: Record<string, unknown>) {
    const response = await axios.put(`${API_URL}/${id}`, seanceData);
    return response.data;
  },

  async deleteSeance(id: number | string) {
    const response = await axios.delete(`${API_URL}/${id}`);
    return response.data;
  },

  async getSeanceById(id: number | string) {
    const response = await axios.get(`${API_URL}/${id}`);
    return response.data;
  },

  async getAllSeances() {
    const response = await axios.get(API_URL);
    return response.data;
  },
};

export default SeanceService;
