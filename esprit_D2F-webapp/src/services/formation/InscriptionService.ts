import { defaultApi as axios } from "@/utils/helpers/httpClient";
import { config } from "@/config/env";
const API_URL = `${config.FORMATION_URL}/formation/inscription`;

const InscriptionService = {
  async getFormationsAccessibles(enseignantId: string | number) {
    const response = await axios.get(`${API_URL}/formations/accessibles`, {
      params: { enseignantId },
    });
    return response.data;
  },

  async demanderInscription(formationId: string | number, enseignantId: string | number) {
    const response = await axios.post(`${API_URL}/inscriptions`, null, {
      params: { formationId, enseignantId },
    });
    return response.data;
  },

  async getInscriptionsByFormation(formationId: string | number) {
    const response = await axios.get(
      `${API_URL}/formations/${formationId}/inscriptions`
    );
    return response.data;
  },

  async traiterDemande(id: string | number, approuver: boolean) {
    const response = await axios.put(
      `${API_URL}/inscriptions/${id}/traiter`,
      null,
      {
        params: { approuver },
      }
    );
    return response.data;
  },
};

export default InscriptionService;
