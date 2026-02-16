import axios from "axios";
import { config } from "../config/env"; 
// URL de votre back-end
const API_URL_CUSTOM =`${config.FORMATION_URL}/formation/formations-custom`;

// Récupération du token depuis le localStorage
function getToken() {
  return localStorage.getItem("authToken");
}

const FormationCustomService = {
  /**
   * Appelle le PUT /formations-custom/{id}/generate-certificates
   * @param {number} formationId 
   * @param {string} typeCertif  ("CERTIF" par défaut)
   */
  async generateCertificates(formationId, typeCertif = "CERTIF") {
    try {
      const token = getToken();
      console.log("Appel génération certificats, token =", token);

      const response = await axios.put(
        `${API_URL_CUSTOM}/${formationId}/generate-certificates`,
        null,
        {
          params: { typeCertif },
          headers: {
            Authorization: `Bearer ${token}`,
          },
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
