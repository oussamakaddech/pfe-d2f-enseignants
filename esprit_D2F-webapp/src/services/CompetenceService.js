// src/services/CompetenceService.js

import axios from "axios";
import { config } from "../config/env";

const API_URL = `${config.COMPETENCE_URL}/competence/competences/retrieve-all-Competences`;

const CompetenceService = {
  async getAllCompetences() {
    try {
      console.log("🔍 URL appelée:", API_URL);
      console.log("🔍 Config:", config.COMPETENCE_URL);

      const response = await axios.get(API_URL);
      
      // ✅ DEBUG: Voir exactement ce qui revient
      console.log("✅ Réponse complète:", response);
      console.log("✅ response.data:", response.data);
      console.log("✅ response.data type:", typeof response.data);
      console.log("✅ Array.isArray(response.data):", Array.isArray(response.data));
      
      // Vérifier si c'est vraiment un array
      if (Array.isArray(response.data)) {
        console.log("✅ C'est un array avec", response.data.length, "éléments");
        return response.data;
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        // ⚠️ Souvent la réponse est { data: [...] } au lieu de [...]
        console.log("⚠️ Les données sont dans response.data.data");
        return response.data.data;
      } else if (response.data && typeof response.data === 'object') {
        // Retourner l'objet wrappé dans un array
        console.warn("⚠️ response.data n'est pas un array, on le wrappe:", response.data);
        return [response.data];
      }
      
      return [];
    } catch (error) {
      console.error("❌ Erreur complète:", error);
      console.error("❌ Error response:", error.response);
      console.error("❌ Error message:", error.message);
      console.error("❌ Error status:", error.response?.status);
      
      if (error.response?.status === 404) {
        console.warn("⚠️ Endpoint 404 - vérifiez l'URL");
        return [];
      }
      
      // Ne pas retourner silencieusement, afficher l'erreur
      return [];
    }
  },
};

export default CompetenceService;
