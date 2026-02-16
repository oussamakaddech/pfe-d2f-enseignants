// OneDriveService.js
import axios from "axios";
import { config } from "../config/env"; 
// URL de base pour les opérations OneDrive sur votre back-end
const API_URL = `${config.FORMATION_URL}/formation/onedrive`;

// Service OneDrive (front-end) : appels aux endpoints définis côté back-end
const OneDriveService = {
  // Récupère l'arborescence complète des dossiers et fichiers depuis OneDrive
  async getDriveHierarchy() {
    try {
      const response = await axios.get(`${API_URL}/hierarchy`);
      return response.data;
    } catch (error) {
      console.error("Erreur lors de la récupération de l'arborescence OneDrive :", error);
      throw error;
    }
  },

  // Télécharge un fichier depuis OneDrive
  // Les paramètres nomFormation, nomDocument, originalFileName sont utilisés par le back-end pour construire le chemin complet
  async downloadFile(nomFormation, nomDocument, originalFileName) {
    try {
      const response = await axios.get(`${API_URL}/download`, {
        params: { nomFormation, nomDocument, originalFileName },
        responseType: "blob", // Pour récupérer le fichier sous forme de blob
      });
      return response.data;
    } catch (error) {
      console.error("Erreur lors du téléchargement du fichier OneDrive :", error);
      throw error;
    }
  },

  // Supprime un fichier sur OneDrive en appelant l'endpoint dédié
  async deleteFile(nomFormation, nomDocument, originalFileName) {
    try {
      const response = await axios.delete(`${API_URL}/delete`, {
        params: { nomFormation, nomDocument, originalFileName },
      });
      return response.data;
    } catch (error) {
      console.error("Erreur lors de la suppression du fichier OneDrive :", error);
      throw error;
    }
  },
  async getEmbedLink(nomFormation, nomDocument) {
    try {
      const response = await axios.get(`${API_URL}/embed-link`, {
        params: { formation: nomFormation, document: nomDocument },
      });
      return response.data;
    } catch (error) {
      console.error("Erreur lors de la génération du lien embed OneDrive :", error);
      throw error;
    }
  },
  async getFormationHierarchy(idFormation) {
    try {
      //  GET /onedrive/formations/{id}/hierarchy
      const { data } = await axios.get(
        `${API_URL}/formations/${idFormation}/hierarchy`
      );
      return data;                            //   →  List<OneDriveItemDTO>
    } catch (err) {
      console.error(
        "Erreur lors de la récupération de l’arborescence OneDrive :", err
      );
      throw err;
    }
  },
  
};

export default OneDriveService;
