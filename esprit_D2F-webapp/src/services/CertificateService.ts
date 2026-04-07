import { defaultApi as axios } from "../utils/httpClient";
import type { AxiosResponse } from "axios";
import { config } from "../config/env";
import type { Id } from "../models/common";
import type { Certificate } from "../models/certificate";

const API_URL = `${config.CERTF_URL}/certificat/certificates`;
const PDF_API_URL = `${config.CERTF_URL}/certificat/certificate-pdfs`;

function getToken(): string | null {
  return localStorage.getItem("authToken");
}

function requireToken(): string {
  const token = getToken();
  if (!token) {
    throw new Error("Authentication token is missing.");
  }
  return token;
}

const CertificateService = {
  getAllCertificates(): Promise<AxiosResponse<Certificate[]>> {
    return axios.get<Certificate[]>(API_URL);
  },

  createCertificate(
    certificateData: Partial<Certificate>
  ): Promise<AxiosResponse<Certificate>> {
    return axios.post<Certificate>(API_URL, certificateData);
  },

  getCertificatesByFormation(
    formationId: Id
  ): Promise<AxiosResponse<Certificate[]>> {
    return axios.get<Certificate[]>(`${API_URL}/formation/${formationId}`);
  },

  deliverCertificate(id: Id): Promise<AxiosResponse<Certificate>> {
    return axios.put<Certificate>(`${API_URL}/${id}/deliver`);
  },

  getCertificatesByEmail(): Promise<AxiosResponse<Certificate[]>> {
    const token = requireToken();
    return axios.get<Certificate[]>(`${API_URL}/email`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  updateCertificate(
    id: Id,
    certificateData: Partial<Certificate>
  ): Promise<AxiosResponse<Certificate>> {
    return axios.put<Certificate>(`${API_URL}/${id}`, certificateData);
  },

  async generateCertificates(formationId: Id): Promise<string[]> {
    const response = await axios.get<string[]>(`${PDF_API_URL}/generate/${formationId}`);
    return response.data;
  },
};

export default CertificateService;
