import axios from "axios";
import { config } from "../config/env"; 
const API_URL = `${config.URL_ACCOUNT}/auth/user/account`;


const api = axios.create({
  baseURL: API_URL,
});

// ✅ Ajouter automatiquement le token JWT à toutes les requêtes
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken"); // Récupérer le token JWT
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
 
  return config;
});

// ✅ Récupérer tous les comptes utilisateurs
export async function getAllAccounts() {
  try {
    const response = await api.get("/list-accounts");
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération des comptes :", error);
    throw error;
  }
}

// ✅ Récupérer le profil de l'utilisateur connecté
export async function getProfile() {
  const response = await api.get("/profile");
   console.log("Token stocké:", localStorage.getItem("authToken"));
  console.log(response);
  return response.data;
}

// ✅ Modifier le profil
export async function editProfile(editProfileRequest) {
  const response = await api.post("/edit-profile", editProfileRequest);
  return response.data;
}

export async function updatePassword(request) {
  try {
    const res = await api.post("/update-password", request);
    return res.data;
  } catch (err) {
    // 🔍 Log complet pour diagnostiquer le 400
    console.error("updatePassword error →", {
      status:  err.response?.status,
      data:    err.response?.data,
      request,                // payload envoyé
    });
    throw err;               // ⬅️ n’oubliez pas de relancer l’erreur !
  }
}

// ✅ Bannir un utilisateur
export async function banAccount(userName) {
  const response = await api.post("/ban-account", null, { params: { userName } });
  return response.data;
}

// ✅ Activer un utilisateur
export async function enableAccount(userName) {
  const response = await api.post("/enable-account", null, { params: { userName } });
  return response.data;
}

export default {
  getAllAccounts,
  getProfile,
  editProfile,
  updatePassword,
  banAccount,
  enableAccount
};
