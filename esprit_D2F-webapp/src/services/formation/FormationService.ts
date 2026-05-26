import { defaultApi as axios } from "@/utils/helpers/httpClient";
import { config } from "@/config/env"; 
const API_URL =  `${config.FORMATION_URL}/api/v1/formations`;

const FormationService = {
  async createFormation(formationData: Record<string, unknown>) {
    try {
      const response = await axios.post(API_URL, formationData);
      return response.data;
    } catch (error: unknown) {
      throw error;
    }
  },

  async getAllFormations() {
    try {
      const response = await axios.get(API_URL);
      return response.data;
    } catch (error: unknown) {
      throw error;
    }
  },

  async getFormationById(id: number | string) {
    try {
      const response = await axios.get(`${API_URL}/${id}`);
      return response.data;
    } catch (error: unknown) {
      throw error;
    }
  },

  async updateFormation(id: number | string, formationData: Record<string, unknown>) {
    try {
      const response = await axios.put(`${API_URL}/${id}`, formationData);
      return response.data;
    } catch (error: unknown) {
      throw error;
    }
  },

  async deleteFormation(id: number | string) {
    try {
      await axios.delete(`${API_URL}/${id}`);
    } catch (error: unknown) {
      throw error;
    }
  },
};

export default FormationService;




