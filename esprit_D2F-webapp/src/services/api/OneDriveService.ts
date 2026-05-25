import { defaultApi as axios } from "@/utils/helpers/httpClient";
import { config } from "@/config/env";
const API_URL = `${config.FORMATION_URL}/formation/onedrive`;

const OneDriveService = {
  async getDriveHierarchy() {
    try {
      const response = await axios.get(`${API_URL}/hierarchy`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async downloadFile(nomFormation: string, nomDocument: string, originalFileName: string) {
    try {
      const response = await axios.get(`${API_URL}/download`, {
        params: { nomFormation, nomDocument, originalFileName },
        responseType: "blob",
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async deleteFile(nomFormation: string, nomDocument: string, originalFileName: string) {
    try {
      const response = await axios.delete(`${API_URL}/delete`, {
        params: { nomFormation, nomDocument, originalFileName },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  async getEmbedLink(nomFormation: string, nomDocument: string) {
    try {
      const response = await axios.get(`${API_URL}/embed-link`, {
        params: { formation: nomFormation, document: nomDocument },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  async getFormationHierarchy(idFormation: number | string) {
    try {
      const { data } = await axios.get(
        `${API_URL}/formations/${idFormation}/hierarchy`
      );
      return data;
    } catch (error) {
      throw error;
    }
  },

};

export default OneDriveService;




