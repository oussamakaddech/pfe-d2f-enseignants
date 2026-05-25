import { defaultApi as axios } from "@/utils/helpers/httpClient";
import { config } from "@/config/env"; 
const API_URL = `${config.FORMATION_URL}/formation/inscription`;

const InscriptionService = {
  async getFormationsAccessibles(enseignantId: string | number) {
    try {
      const response = await axios.get(`${API_URL}/formations/accessibles`, {
        params: { enseignantId },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async demanderInscription(formationId: string | number, enseignantId: string | number) {
    try {
      const response = await axios.post(`${API_URL}/inscriptions`, null, {
        params: { formationId, enseignantId },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

 async getInscriptionsByFormation(formationId: string | number) {
    try {
      const response = await axios.get(
        `${API_URL}/formations/${formationId}/inscriptions`
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async traiterDemande(id: string | number, approuver: boolean) {
    try {
      const response = await axios.put(
        `${API_URL}/inscriptions/${id}/traiter`,
        null,
        {
          params: { approuver },
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default InscriptionService;




