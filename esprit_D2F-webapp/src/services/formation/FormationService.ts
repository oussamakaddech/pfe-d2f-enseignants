import { defaultApi as axios } from "@/utils/helpers/httpClient";
import { config } from "@/config/env";
const API_URL = `${config.FORMATION_URL}/formation/formations`;

const FormationService = {
  async createFormation(formationData: Record<string, unknown>) {
    const response = await axios.post(API_URL, formationData);
    return response.data;
  },

  async getAllFormations() {
    const response = await axios.get(API_URL);
    return response.data;
  },

  async getFormationById(id: number | string) {
    const response = await axios.get(`${API_URL}/${id}`);
    return response.data;
  },

  async updateFormation(id: number | string, formationData: Record<string, unknown>) {
    const response = await axios.put(`${API_URL}/${id}`, formationData);
    return response.data;
  },

  async deleteFormation(id: number | string) {
    await axios.delete(`${API_URL}/${id}`);
  },
};

export default FormationService;
