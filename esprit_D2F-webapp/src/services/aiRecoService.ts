// src/services/aiRecoService.js
import { defaultApi as axios } from "../utils/httpClient";
import { config } from "../config/env"; 
const API_URL = `${config.AI_URL}/ai`;

const AIRecoService = {
  async recommend(data) {
    try {
      const payload = {
        domaine: data.domaine === "" ? null : data.domaine,
        objectif: data.objectif,
        objectifPedagogique: data.objectifPedagogique,
        topN: Number(data.topN),
      };

      // Construction de l’URL complète
      const url = `${API_URL}/recommend`;

      const response = await axios.post(url, payload, {
        headers: { "Content-Type": "application/json" },
      });
      return response.data;
    } catch (error) {
      console.error("Erreur /recommend :", error);
      throw error;
    }
  },
};

export default AIRecoService;
