import axios from "axios";
import { config } from "../config/env"; 
const API_URL = `${config.FORMATION_URL}/formation/seances`;

const SeanceService = {
  async createSeance(seanceData) {
    try {
      const response = await axios.post(API_URL, seanceData);
      return response.data;
    } catch (error) {
      console.error("Erreur lors de la création de la séance :", error);
      throw error;
    }
  },

  async updateSeance(id, seanceData) {
    try {
      const response = await axios.put(`${API_URL}/${id}`, seanceData);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la mise à jour de la séance ${id} :`, error);
      throw error;
    }
  },

  async deleteSeance(id) {
    try {
      const response = await axios.delete(`${API_URL}/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la suppression de la séance ${id} :`, error);
      throw error;
    }
  },

  async getSeanceById(id) {
    try {
      const response = await axios.get(`${API_URL}/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la récupération de la séance ${id} :`, error);
      throw error;
    }
  },

  async getAllSeances() {
    try {
      const response = await axios.get(API_URL);
      return response.data;
    } catch (error) {
      console.error("Erreur lors de la récupération des séances :", error);
      throw error;
    }
  },
};

export default SeanceService;
