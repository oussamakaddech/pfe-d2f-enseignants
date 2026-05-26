import { defaultApi as axios } from "@/utils/helpers/httpClient";
import { config } from "@/config/env";
const API_URL = `${config.FORMATION_URL}/formation/onedrive`;

const OneDriveService = {
  async getDriveHierarchy() {
    const response = await axios.get(`${API_URL}/hierarchy`);
    return response.data;
  },

  async downloadFile(nomFormation: string, nomDocument: string, originalFileName: string) {
    const response = await axios.get(`${API_URL}/download`, {
      params: { nomFormation, nomDocument, originalFileName },
      responseType: "blob",
    });
    return response.data;
  },

  async deleteFile(nomFormation: string, nomDocument: string, originalFileName: string) {
    const response = await axios.delete(`${API_URL}/delete`, {
      params: { nomFormation, nomDocument, originalFileName },
    });
    return response.data;
  },

  async getEmbedLink(nomFormation: string, nomDocument: string) {
    const response = await axios.get(`${API_URL}/embed-link`, {
      params: { formation: nomFormation, document: nomDocument },
    });
    return response.data;
  },

  async getFormationHierarchy(idFormation: number | string) {
    const { data } = await axios.get(
      `${API_URL}/formations/${idFormation}/hierarchy`
    );
    return data;
  },
};

export default OneDriveService;
