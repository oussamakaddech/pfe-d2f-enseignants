// src/services/aiRecoService.js
import axios from "axios";
import { config } from "../config/env"; 
const API_URL = `${config.AI_URL}/ai`;


console.log("→ FastAPI URL utilisée :", API_URL);

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
      console.log("  • Axios POST vers :", url);
      console.log("  • Payload envoyé :", payload);

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
