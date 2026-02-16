import axios from "axios";
import { config } from "../config/env"; 
const API_URL =`${config.FORMATION_URL}/formation/documents`;

const DocumentService = {
  // Création d'un document
  async createDocument({ formationId, pathType, nomDocument, obligation, file }) {
    const formData = new FormData();
    formData.append("formationId", formationId);
    formData.append("pathType",    pathType);
    formData.append("nomDocument", nomDocument);
    formData.append("obligation",  obligation);
    formData.append("file",        file);

    const { data } = await axios.post(API_URL, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data; // DocumentDTO
  },

  // Récupérer tous les documents
  async getAllDocuments() {
    const { data } = await axios.get(API_URL);
    return data; // Array<DocumentDTO>
  },

  // Récupérer un document par son id
  async getDocumentById(id) {
    const { data } = await axios.get(`${API_URL}/${id}`);
    return data; // DocumentDTO
  },

  // Mise à jour d'un document
  async updateDocument(id, { pathType, nomDocument, obligation, file }) {
    const formData = new FormData();
    formData.append("pathType",    pathType);
    formData.append("nomDocument", nomDocument);
    formData.append("obligation",  obligation);
    if (file) {
      formData.append("file", file); // facultatif
    }

    const { data } = await axios.put(`${API_URL}/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data; // DocumentDTO
  },

  // Suppression
  async deleteDocument(id) {
    await axios.delete(`${API_URL}/${id}`);
  },

  // Téléchargement avec nom de fichier dynamique
  async downloadDocument(id) {
    const response = await axios.get(`${API_URL}/download/${id}`, {
      responseType: "blob",
    });

    // Extraction du filename depuis le header
    const disposition = response.headers["content-disposition"];
    let filename = "document";
    if (disposition) {
      const match = disposition.match(/filename="?(.+?)"?$/);
      if (match) filename = match[1];
    }

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },
};

export default DocumentService;
