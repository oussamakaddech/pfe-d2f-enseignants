// src/services/DeptService.js

import { defaultApi as axios } from "../utils/httpClient";
import { config } from "../config/env";
import { optionalAuthHeader } from "./authHeaders";

const API_URL = `${config.FORMATION_URL}/formation/departements`;

function isNotFoundError(error) {
  return error?.isAxiosError === true && error.response?.status === 404;
}

const DeptService = {
  async createDept(deptData) {
    try {
      const response = await axios.post(API_URL, deptData, {
        headers: optionalAuthHeader(),
      });
      return response.data;
    } catch (error) {
      console.error("Erreur lors de la création du département :", error);
      throw error;
    }
  },

  async getAllDepts() {
    try {
      const response = await axios.get(API_URL, {
        headers: optionalAuthHeader(),
      });
      // Retourner un array, même s'il est vide
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      if (isNotFoundError(error)) {
        console.warn("Aucun département trouvé");
        return [];
      }
      console.error("Erreur lors de la récupération des départements :", error);
      throw error;
    }
  },

  async getDeptById(id) {
    try {
      const response = await axios.get(`${API_URL}/${id}`, {
        headers: optionalAuthHeader(),
      });
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
      const response = await axios.put(`${API_URL}/${id}`, deptData, {
        headers: optionalAuthHeader(),
      });
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
      await axios.delete(`${API_URL}/${id}`, {
        headers: optionalAuthHeader(),
      });
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
        headers: {
          ...optionalAuthHeader(),
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    } catch (error) {
      console.error("Erreur lors de l'import des départements :", error);
      throw error;
    }
  },
};

export default DeptService;
