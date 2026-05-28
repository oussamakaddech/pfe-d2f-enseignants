import { defaultApi as axios } from "@/utils/helpers/httpClient";
import { config } from "@/config/env";
const API_URL_CUSTOM = `${config.FORMATION_URL}/formation/formations-custom`;

const FormationCustomService = {
  async generateCertificates(formationId: number, typeCertif = "CERTIF") {
    const response = await axios.put(
      `${API_URL_CUSTOM}/${formationId}/generate-certificates`,
      null,
      { params: { typeCertif } }
    );
    return response.data;
  }
};

export default FormationCustomService;
