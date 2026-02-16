// src/services/UpService.js

import axios from "axios";
import { config } from "../config/env";

const API_URL = `${config.FORMATION_URL}/formation/ups`;

const UpService = {
  async createUp(upData) {
    try {
      const response = await axios.post(API_URL, upData);
      return response.data;
    } catch (error) {
      console.error("Erreur lors de la création de l'UP :", error);
      throw error;
    }
  },

  async getAllUps() {
    try {
      const response = await axios.get(API_URL);
      // Retourner un array, même s'il est vide
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      if (error.response?.status === 404) {
        console.warn("Aucune UP trouvée");
        return [];
      }
      console.error("Erreur lors de la récupération des UPs :", error);
      return []; // Retourner array vide en cas d'erreur
    }
  },

  async getUpById(id) {
    try {
      const response = await axios.get(`${API_URL}/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la récupération de l'UP ${id} :`, error);
      throw error;
    }
  },

  async updateUp(id, upData) {
    try {
      const response = await axios.put(`${API_URL}/${id}`, upData);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la mise à jour de l'UP ${id} :`, error);
      throw error;
    }
  },

  async deleteUp(id) {
    try {
      await axios.delete(`${API_URL}/${id}`);
    } catch (error) {
      console.error(`Erreur lors de la suppression de l'UP ${id} :`, error);
      throw error;
    }
  },

  async importUpsExcel(file) {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await axios.post(`${API_URL}/import-excel`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    } catch (error) {
      console.error("Erreur lors de l'import des UPs :", error);
      throw error;
    }
  },
};

export default UpService;
