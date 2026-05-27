import { defaultApi as axios } from "@/utils/helpers/httpClient";
import { config } from "@/config/env";
const API_URL =`${config.FORMATION_URL}/formation/documents`;

interface DocumentCreatePayload {
  formationId: string | number;
  pathType: string;
  nomDocument: string;
  obligation: string;
  file: File;
}

interface DocumentUpdatePayload {
  pathType: string;
  nomDocument: string;
  obligation: string;
  file?: File;
}

const DocumentService = {
  async createDocument({ formationId, pathType, nomDocument, obligation, file }: DocumentCreatePayload) {
    const formData = new FormData();
    formData.append("formationId", String(formationId));
    formData.append("pathType",    pathType);
    formData.append("nomDocument", nomDocument);
    formData.append("obligation",  obligation);
    formData.append("file",        file);

    const { data } = await axios.post(API_URL, formData);
    return data;
  },

  async getAllDocuments() {
    const { data } = await axios.get(API_URL);
    return data;
  },

  async getDocumentById(id: number | string) {
    const { data } = await axios.get(`${API_URL}/${id}`);
    return data;
  },

  async updateDocument(id: number | string, { pathType, nomDocument, obligation, file }: DocumentUpdatePayload) {
    const formData = new FormData();
    formData.append("pathType",    pathType);
    formData.append("nomDocument", nomDocument);
    formData.append("obligation",  obligation);
    if (file) {
      formData.append("file", file);
    }

    const { data } = await axios.put(`${API_URL}/${id}`, formData);
    return data;
  },

  async deleteDocument(id: number | string) {
    await axios.delete(`${API_URL}/${id}`);
  },

  async downloadDocument(id: number | string) {
    const response = await axios.get(`${API_URL}/download/${id}`, {
      responseType: "blob",
    });

    const disposition = response.headers["content-disposition"];
    let filename = "document";
    if (disposition) {
      const match = disposition.match(/filename="?(.+?)"?$/);
      if (match) filename = match[1];
    }

    const url = globalThis.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    try {
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
    } finally {
      link.remove();
      globalThis.URL.revokeObjectURL(url);
    }
  },
};

export default DocumentService;




