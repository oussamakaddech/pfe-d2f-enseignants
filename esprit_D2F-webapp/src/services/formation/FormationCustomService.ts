import { defaultApi as axios } from '@/services/httpClient';
import { config } from '@/config/env';
const API_URL_CUSTOM = `${config.FORMATION_URL}/formation/formations-custom`;

/** Types de documents délivrables (parité backend FormationCustomController). */
export type DocumentType = 'CERTIF' | 'ATTESTATION' | 'BADGE';

const FormationCustomService = {
  /**
   * Crée les documents éligibles d'une formation achevée.
   * CERTIF : présence ≥ 80% + post-test ≥ 50% + évaluation formateur.
   * ATTESTATION / BADGE : présence ≥ 80% (participation).
   */
  async generateCertificates(formationId: number, typeCertif: DocumentType = 'CERTIF') {
    const response = await axios.put(
      `${API_URL_CUSTOM}/${formationId}/generate-certificates`,
      null,
      { params: { typeCertif } },
    );
    return response.data;
  },
};

export default FormationCustomService;
