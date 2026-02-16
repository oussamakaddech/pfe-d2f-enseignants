// src/services/FormationWorkflowService.js

import axios from "axios";
import { config } from "../config/env";

const API_URL = `${config.FORMATION_URL}/formation/formations-workflow`;

function getToken() {
  return localStorage.getItem("authToken");
}

const FormationWorkflowService = {
  async createFormationWorkflow(formationData) {
    try {
      const response = await axios.post(API_URL, formationData);
      return response.data;
    } catch (error) {
      console.error("❌ Erreur création workflow:", error);
      throw error;
    }
  },

  // ✅ CORRIGÉ: updateFormationWorkflow avec gestion des séances
  async updateFormationWorkflow(id, formationData) {
    try {
      console.log("📤 Envoi update formation id=" + id);
      console.log("📊 Payload seances count:", formationData.seances?.length || 0);

      const response = await axios.put(`${API_URL}/${id}`, formationData);

      console.log("✅ Réponse serveur:", response.data);
      return response.data;
    } catch (error) {
      console.error(`❌ Erreur mise à jour formation ${id}:`, error);
      console.error("Response data:", error.response?.data);
      throw error;
    }
  },

  async deleteFormationWorkflow(id) {
    try {
      const response = await axios.delete(`${API_URL}/${id}`);
      return response.data;
    } catch (error) {
      console.error(`❌ Erreur suppression formation ${id}:`, error);
      throw error;
    }
  },

  async getFormationWorkflowById(id) {
    try {
      const response = await axios.get(`${API_URL}/${id}`);
      return response.data;
    } catch (error) {
      console.error(`❌ Erreur récupération formation ${id}:`, error);
      throw error;
    }
  },

  async getAllFormationWorkflows() {
    try {
      const response = await axios.get(API_URL);
      return response.data;
    } catch (error) {
      console.error("❌ Erreur récupération formations:", error);
      throw error;
    }
  },

  async updatePresence(id, isPresent, commentaire) {
    try {
      const response = await axios.put(`${API_URL}/presence/${id}`, null, {
        params: { present: isPresent, commentaire: commentaire },
      });
      return response.data;
    } catch (error) {
      console.error(`❌ Erreur update présence ${id}:`, error);
      throw error;
    }
  },

  async getPresencesBySeance(seanceId) {
    try {
      const response = await axios.get(`${API_URL}/seances/${seanceId}/presences`);
      return response.data;
    } catch (error) {
      console.error(`❌ Erreur récupération présences séance ${seanceId}:`, error);
      throw error;
    }
  },

  async getFormationsByAnimateur() {
    try {
      const token = getToken();
      const response = await axios.get(`${API_URL}/animateur`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (error) {
      console.error("❌ Erreur récupération formations animateur:", error);
      throw error;
    }
  },

  async getFormationsAchevees() {
    try {
      const response = await axios.get(`${API_URL}/achevees`);
      return response.data;
    } catch (error) {
      console.error("❌ Erreur récupération formations achevées:", error);
      throw error;
    }
  },

  async getAllFormationWithDocuments() {
    try {
      const response = await axios.get(`${API_URL}/with-documents`);
      return response.data;
    } catch (error) {
      console.error("❌ Erreur récupération formations avec documents:", error);
      throw error;
    }
  },

  async getFormationsForCalendar(enseignantId) {
    try {
      const token = getToken();
      const response = await axios.get(
        `${API_URL}/enseignants/${enseignantId}/calendar`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error("❌ Erreur récupération formations calendrier:", error);
      throw error;
    }
  },

  async updateInscriptionsOuvertes(id, ouvert) {
    try {
      const response = await axios.put(
        `${API_URL}/${id}/inscriptionsOuvertes`,
        null,
        { params: { ouvert } }
      );
      return response.data;
    } catch (error) {
      console.error(`❌ Erreur updateInscriptionsOuvertes ${id}:`, error);
      throw error;
    }
  },

  async getFormationsVisibles() {
    try {
      const response = await axios.get(`${API_URL}/visibles`);
      return response.data;
    } catch (error) {
      console.error("❌ Erreur formations visibles:", error);
      throw error;
    }
  },

  async getFormationsParUp(upId) {
    try {
      const response = await axios.get(`${API_URL}/par-up`, {
        params: { upId },
      });
      return response.data;
    } catch (error) {
      console.error(`❌ Erreur formations par UP ${upId}:`, error);
      throw error;
    }
  },

  async exportFormations(start, end) {
    try {
      const response = await axios.get(`${API_URL}/export/excel`, {
        responseType: "blob",
        params: { start, end },
      });
      return response;
    } catch (error) {
      console.error("❌ Erreur export formations:", error);
      throw error;
    }
  },
};

export default FormationWorkflowService;
