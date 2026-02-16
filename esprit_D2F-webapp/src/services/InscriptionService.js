import axios from "axios";
import { config } from "../config/env"; 
const API_URL = `${config.FORMATION_URL}/formation/inscription`;

// Si certains endpoints sont sécurisés, décommentez et utilisez cette fonction :
// function getToken() {
//   return localStorage.getItem("authToken");
// }

const InscriptionService = {
  /**
   * 1. Récupérer les formations accessibles pour un enseignant
   * GET /inscription/formations/accessibles?enseignantId=…
   */
  async getFormationsAccessibles(enseignantId) {
    try {
      const response = await axios.get(`${API_URL}/formations/accessibles`, {
        
        params: { enseignantId },
        
        // headers: { Authorization: `Bearer ${getToken()}` }
      });
      return response.data; // Liste de Formation
     
    } catch (error) {
      console.error("Erreur fetch formations accessibles :", error);
      throw error;
    }
  },

  /**
   * 2. Demander une inscription
   * POST /inscription/inscriptions?formationId=…&enseignantId=…
   */
  async demanderInscription(formationId, enseignantId) {
    try {
      const response = await axios.post(`${API_URL}/inscriptions`, null, {
        params: { formationId, enseignantId },
        // headers: { Authorization: `Bearer ${getToken()}` }
      });
      return response.data; // Objet Inscription créé
    } catch (error) {
      console.error("Erreur lors de la demande d'inscription :", error);
      throw error;
    }
  },

  /**
   * 3. Lister les demandes en attente
   * GET /inscription/inscriptions/demandes?userId=…&isD2F=…
   */
 async getInscriptionsByFormation(formationId) {
    try {
      const response = await axios.get(
        `${API_URL}/formations/${formationId}/inscriptions`
      );
      return response.data; // Liste de Inscription
    } catch (error) {
      console.error(
        "Erreur fetch inscriptions par formation :",
        error
      );
      throw error;
    }
  },


  /**
   * 4. Approuver ou rejeter une demande
   * PUT /inscription/inscriptions/{id}/traiter?approuver=…
   */
  async traiterDemande(id, approuver) {
    try {
      const response = await axios.put(
        `${API_URL}/inscriptions/${id}/traiter`,
        null,
        {
          params: { approuver },
          // headers: { Authorization: `Bearer ${getToken()}` }
        }
      );
      return response.data; // Objet Inscription mis à jour
    } catch (error) {
      console.error(`Erreur traitement demande ${id} :`, error);
      throw error;
    }
  },
};

export default InscriptionService;
