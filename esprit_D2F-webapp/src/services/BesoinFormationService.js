// src/services/BesoinFormationService.js

import axios from "axios";
import { config } from "../config/env"; 
const API_URL = `${config.Besoin_URL}/besoinsformation/besoinsFormations`


// Si vous protégez certains endpoints, décommentez et utilisez getToken()
// function getToken() {
//   return localStorage.getItem("authToken");
// }

const BesoinFormationService = {
  /** 1. Récupérer tous les besoins de formation */
  async getAllBesoinFormations() {
    try {
      const response = await axios.get(`${API_URL}/retrieve-all-BesoinFormations`);
      return response.data;
    } catch (error) {
      console.error("Erreur lors de la récupération des besoins de formation :", error);
      throw error;
    }
  },

  /** 2. Récupérer un besoin de formation par son id */
  async getBesoinFormation(id) {
    try {
      const response = await axios.get(`${API_URL}/retrieve-BesoinFormation/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la récupération du besoin n°${id} :`, error);
      throw error;
    }
  },

  /** 3. Créer un nouveau besoin de formation */
  async addBesoinFormation(besoin) {
    try {
      const response = await axios.post(`${API_URL}/add-BesoinFormation`, besoin);
      return response.data;
    } catch (error) {
      console.error("Erreur lors de l'ajout d'un nouveau besoin :", error);
      throw error;
    }
  },

  /** 4. Supprimer un besoin de formation */
  async removeBesoinFormation(id) {
    try {
      const response = await axios.delete(`${API_URL}/remove-BesoinFormation/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la suppression du besoin n°${id} :`, error);
      throw error;
    }
  },

  /** 5. Mettre à jour un besoin de formation (avec commentaire de modification) */
  async modifyBesoinFormation(besoinFormation, commentaire) {
    try {
      const payload = { 
        besoinFormation: besoinFormation,
        commentaire: commentaire
      };
      const response = await axios.put(`${API_URL}/modify-BesoinFormation`, payload);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la modification du besoin n°${besoinFormation.id} :`, error);
      throw error;
    }
  },

  /** 6. Récupérer tous les besoins approuvés */
  async getApprovedBesoinFormations() {
    try {
      const response = await axios.get(`${API_URL}/retrieve-approved-BesoinFormations`);
      return response.data;
    } catch (error) {
      console.error("Erreur lors de la récupération des besoins approuvés :", error);
      throw error;
    }
  },

  /** 7. Approuver un besoin (change son état côté back) */
  async approveBesoin(id) {
    try {
      const response = await axios.put(`${API_URL}/${id}/approve`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de l'approbation du besoin n°${id} :`, error);
      throw error;
    }
  },

  /** 8. Récupérer les notifications pour un utilisateur */
  async getUserNotifications(username) {
    try {
      const response = await axios.get(`${API_URL}/notifications/${username}`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la récupération des notifications pour ${username} :`, error);
      throw error;
    }
  },
};

export default BesoinFormationService;
