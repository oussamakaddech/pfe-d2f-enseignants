// src/services/CertificateService.js
import axios from "axios";
import { config } from "../config/env"; 
const API_URL = `${config.CERTF_URL}/certificat/certificates`;


// Fonction utilitaire pour récupérer le token depuis le localStorage
function getToken() {
  return localStorage.getItem("authToken");
}



const CertificateService = {
  // Récupérer tous les certificats (sans token)
  getAllCertificates() {
    return axios.get(API_URL);
  },

  // Créer un nouveau certificat
  createCertificate(certificateData) {
    return axios.post(`${API_URL}`, certificateData);
  },
  // Récupérer la liste des certificats pour une formation donnée (sans token)
  getCertificatesByFormation(formationId) {
    return axios.get(`${API_URL}/formation/${formationId}`);
  },

  // Marquer un certificat comme délivré (sans token)
  deliverCertificate(id) {
    return axios.put(`${API_URL}/${id}/deliver`);
  },

  // Récupérer les certificats pour l'utilisateur connecté par email (token requis)
  getCertificatesByEmail() {
    const token = getToken();
    return axios.get(`${API_URL}/email`, {
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
      },
    });
  },

  // Mise à jour simple d'un certificat (sans token)
  updateCertificate(id, certificateData) {
    return axios.put(`${API_URL}/${id}`, certificateData);
  },
};

export default CertificateService;
