import axios from "axios";
import { config } from "../config/env"; 
const API_URL =  `${config.FORMATION_URL}/formation/enseignants`;

const EnseignantService = {
  async createEnseignant(enseignantData) {
    try {
      const response = await axios.post(API_URL, enseignantData);
      return response.data;
    } catch (error) {
      console.error("Erreur lors de la création de l'enseignant :", error);
      throw error;
    }
  },

  async getAllEnseignants() {
    try {
      const response = await axios.get(API_URL);
      return response.data;
    } catch (error) {
      console.error("Erreur lors de la récupération des enseignants :", error);
      throw error;
    }
  },

  async getEnseignantById(id) {
    try {
      const response = await axios.get(`${API_URL}/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la récupération de l'enseignant ${id} :`, error);
      throw error;
    }
  },

  async updateEnseignant(id, enseignantData) {
    try {
      const response = await axios.put(`${API_URL}/${id}`, enseignantData);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la mise à jour de l'enseignant ${id} :`, error);
      throw error;
    }
  },

  async deleteEnseignant(id) {
    try {
      await axios.delete(`${API_URL}/${id}`);
    } catch (error) {
      console.error(`Erreur lors de la suppression de l'enseignant ${id} :`, error);
      throw error;
    }
  },
  async uploadEnseignants(file) {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(
        `${API_URL}/upload`, 
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" }
        }
      );
      return response.data;
    } catch (error) {
      console.error("Erreur lors de l'upload Excel :", error);
      throw error;
    }
  },
};

export default EnseignantService;
