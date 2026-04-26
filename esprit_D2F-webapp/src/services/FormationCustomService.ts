import { defaultApi as axios } from "../utils/httpClient";
import { config } from "../config/env"; 
import { requireAuthHeader } from "./authHeaders";
// URL de votre back-end
const API_URL_CUSTOM =`${config.FORMATION_URL}/formation/formations-custom`;

const FormationCustomService = {
  /**
   * Appelle le PUT /formations-custom/{id}/generate-certificates
   * @param {number} formationId 
   * @param {string} typeCertif  ("CERTIF" par défaut)
   */
  async generateCertificates(formationId, typeCertif = "CERTIF") {
    try {
      const response = await axios.put(
        `${API_URL_CUSTOM}/${formationId}/generate-certificates`,
        null,
        {
          params: { typeCertif },
          headers: requireAuthHeader(),
        }
      );

      return response.data; // "Certificats générés pour formation X…"
    } catch (error) {
      console.error(
        `Erreur génération certificats (formation ${formationId}) :`,
        error
      );
      throw error;
    }
  }
};

export default FormationCustomService;
