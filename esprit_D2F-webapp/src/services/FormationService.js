import axios from "axios";
import { config } from "../config/env"; 
const API_URL =  `${config.FORMATION_URL}/formation/formations`;

const FormationService = {
  async createFormation(formationData) {
    try {
      const response = await axios.post(API_URL, formationData);
      return response.data;
    } catch (error) {
      console.error("Erreur lors de la création de la formation :", error);
      throw error;
    }
  },

  async getAllFormations() {
    try {
      const response = await axios.get(API_URL);
      return response.data;
    } catch (error) {
      console.error("Erreur lors de la récupération des formations :", error);
      throw error;
    }
  },

  async getFormationById(id) {
    try {
      const response = await axios.get(`${API_URL}/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la récupération de la formation ${id} :`, error);
      throw error;
    }
  },

  async updateFormation(id, formationData) {
    try {
      const response = await axios.put(`${API_URL}/${id}`, formationData);
      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la mise à jour de la formation ${id} :`, error);
      throw error;
    }
  },

  async deleteFormation(id) {
    try {
      await axios.delete(`${API_URL}/${id}`);
    } catch (error) {
      console.error(`Erreur lors de la suppression de la formation ${id} :`, error);
      throw error;
    }
  },



};

export default FormationService;
