import { defaultApi as axios } from '@/services/httpClient';
import { config } from '@/config/env';
import type { Id } from '@/models/common';
import type {
  Certificate,
  CertificateIndicators,
  CertificateVerification,
  CertificateRevocationPayload,
} from '@/models/certificat';

const API_URL = `${config.CERTF_URL}/certificat/certificates`;
const PDF_API_URL = `${config.CERTF_URL}/certificat/certificate-pdfs`;

function normalizeContent<T>(payload: T[] | { content?: T[] } | undefined): T[] {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.content)) return payload.content;
  return [];
}

const CertificateService = {
  async getAllCertificates(): Promise<Certificate[]> {
    const response = await axios.get<Certificate[]>(API_URL);
    return normalizeContent(response.data as Certificate[] | { content?: Certificate[] });
  },

  createCertificate(certificateData: Partial<Certificate>) {
    return axios.post<Certificate>(API_URL, certificateData);
  },

  async getCertificatesByFormation(formationId: Id): Promise<Certificate[]> {
    const response = await axios.get<Certificate[]>(`${API_URL}/formation/${formationId}`);
    return normalizeContent(response.data as Certificate[] | { content?: Certificate[] });
  },

  deliverCertificate(id: Id) {
    return axios.put<Certificate>(`${API_URL}/${id}/deliver`);
  },

  /** Révoque un certificat (motif obligatoire, réservé ADMIN). */
  async revokeCertificate(id: Id, reason: string): Promise<Certificate> {
    const payload: CertificateRevocationPayload = { reason };
    const response = await axios.put<Certificate>(`${API_URL}/${id}/revoke`, payload);
    return response.data;
  },

  /** Indicateurs de certification globaux (éligibles/délivrés/en attente/révoqués). */
  async getIndicators(): Promise<CertificateIndicators> {
    const response = await axios.get<CertificateIndicators>(`${API_URL}/indicators`);
    return response.data;
  },

  /** Indicateurs de certification filtrés par formation. */
  async getIndicatorsByFormation(formationId: Id): Promise<CertificateIndicators> {
    const response = await axios.get<CertificateIndicators>(
      `${API_URL}/indicators/formation/${formationId}`,
    );
    return response.data;
  },

  /** Vérification publique d'un certificat par son numéro. */
  async verifyCertificate(certificateNumber: string): Promise<CertificateVerification> {
    const response = await axios.get<CertificateVerification>(
      `${API_URL}/verify/${encodeURIComponent(certificateNumber)}`,
    );
    return response.data;
  },

  async getCertificatesByEmail(): Promise<Certificate[]> {
    const response = await axios.get<Certificate[]>(`${API_URL}/email`);
    return normalizeContent(response.data as Certificate[] | { content?: Certificate[] });
  },

  updateCertificate(id: Id, certificateData: Partial<Certificate>) {
    return axios.put<Certificate>(`${API_URL}/${id}`, certificateData);
  },

  async generateCertificates(formationId: Id): Promise<string[]> {
    const response = await axios.get<string[]>(`${PDF_API_URL}/generate/${formationId}`);
    return response.data;
  },
};

export default CertificateService;
