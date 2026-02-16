// src/services/DeptService.js

import axios from "axios";
import { config } from "../config/env";

const API_URL = `${config.FORMATION_URL}/formation/departements`;

const DeptService = {
  async createDept(deptData) {
    try {
      const response = await axios.post(API_URL, deptData);
      return response.data;
    } catch (error) {
      console.error("Erreur lors de la création du département :", error);
      throw error;
    }
  },

  async getAllDepts() {
    try {
      const response = await axios.get(API_URL);
      // Retourner un array, même s'il est vide
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      if (error.response?.status === 404) {
        console.warn("Aucun département trouvé");
        return [];
      }
      console.error("Erreur lors de la récupération des départements :", error);
      return []; // Retourner array vide en cas d'erreur
    }
  },

  async getDeptById(id) {
    try {
      const response = await axios.get(`${API_URL}/${id}`);
      return response.data;
    } catch (error) {
      console.error(
        `Erreur lors de la récupération du département ${id} :`,
        error
      );
      throw error;
    }
  },

  async updateDept(id, deptData) {
    try {
      const response = await axios.put(`${API_URL}/${id}`, deptData);
      return response.data;
    } catch (error) {
      console.error(
        `Erreur lors de la mise à jour du département ${id} :`,
        error
      );
      throw error;
    }
  },

  async deleteDept(id) {
    try {
      await axios.delete(`${API_URL}/${id}`);
    } catch (error) {
      console.error(
        `Erreur lors de la suppression du département ${id} :`,
        error
      );
      throw error;
    }
  },

  async importDeptsExcel(file) {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await axios.post(`${API_URL}/import-excel`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    } catch (error) {
      console.error("Erreur lors de l'import des départements :", error);
      throw error;
    }
  },
};

export default DeptService;
