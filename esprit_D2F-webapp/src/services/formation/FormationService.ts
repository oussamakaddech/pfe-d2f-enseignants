import { defaultApi as axios } from "@/utils/helpers/httpClient";
import { config } from "@/config/env";
import type { Formation } from "@/models/formation";
const API_URL = `${config.FORMATION_URL}/formation/formations`;

const FormationService = {
  async createFormation(formationData: Record<string, unknown>): Promise<Formation> {
    const response = await axios.post(API_URL, formationData);
    return response.data;
  },

  async getAllFormations(): Promise<Formation[]> {
    const response = await axios.get(API_URL);
    return response.data;
  },

  async getFormationById(id: number | string): Promise<Formation> {
    const response = await axios.get(`${API_URL}/${id}`);
    return response.data;
  },

  async updateFormation(id: number | string, formationData: Record<string, unknown>): Promise<Formation> {
    const response = await axios.put(`${API_URL}/${id}`, formationData);
    return response.data;
  },

  async deleteFormation(id: number | string): Promise<void> {
    await axios.delete(`${API_URL}/${id}`);
  },
};

export default FormationService;
