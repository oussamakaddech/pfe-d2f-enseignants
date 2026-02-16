// src/services/MailService.js
import axios from "axios";
import { config } from "../config/env"; 
// URL de base de votre API (même port que pour vos formations)
const MAIL_API_URL = `${config.FORMATION_URL}/formation/mail`;

// Si votre endpoint est protégé, récupérez le token depuis le localStorage
function getToken() {
  return localStorage.getItem("authToken");
}

const MailService = {
  /**
   * Envoie un e-mail via votre MailController Spring Boot.
   * @param {string} to      Adresse du destinataire
   * @param {string} subject Sujet de l'e-mail
   * @param {string} content Contenu de l'e-mail
   * @returns {Promise<string>} message de confirmation côté serveur
   */
  async sendEmail(to, subject, content) {
    try {
      const token = getToken(); // si nécessaire

      const response = await axios.post(
        `${MAIL_API_URL}/send`,
        null,
        {
          params: { to, subject, content },
          headers: token
            ? { Authorization: `Bearer ${token}` }
            : {}
        }
      );

      return response.data; // ex. "E-mail envoyé à xxx"
    } catch (error) {
      console.error("Erreur lors de l'envoi de l'e-mail :", error);
      throw error;
    }
  }
};

export default MailService;
