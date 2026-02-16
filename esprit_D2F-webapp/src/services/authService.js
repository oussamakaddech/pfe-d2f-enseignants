import axios from "axios";
import { jwtDecode } from "jwt-decode";

import { config } from "../config/env"; 
const api = axios.create({
  baseURL:`${config.URL_ACCOUNT}/auth`
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) {
    try {
      const decodedToken = jwtDecode(token);
      const currentTime = Date.now() / 1000;

      console.log("🔍 Token décodé :", decodedToken);
      console.log("⏳ Expiration du token :", decodedToken.exp);
      console.log("🕒 Temps actuel :", currentTime);

      if (decodedToken.exp < currentTime) {
        console.warn("⚠️ Token expiré, suppression !");
        localStorage.removeItem("authToken");
        return Promise.reject(new Error("Token expiré"));
      } else {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error("🚨 Erreur lors du décodage du token", error);
      localStorage.removeItem("authToken");
    }
  } else {
    console.warn("⚠️ Aucun token trouvé !");
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// 1) Login
export async function login({ username, password }) {
  const url = `/user/auth/login?username=${username}&password=${password}`;
  const response = await api.post(url);

  if (response.data.accessToken) {
    localStorage.setItem("authToken", response.data.accessToken); // 🔥 Stocker le token
    console.log("✅ Connexion réussie, token stocké !");
  } else {
    console.warn("⚠️ Aucun token reçu après connexion !");
  }

  return response.data;
}


// 2) Register
export async function signup(payload) {
  const response = await api.post("/user/auth/signup", payload);
  return response.data;
}

// 3) Forgot Password
export async function forgotPassword(emailAddress) {
  const url = `/user/auth/forgot-password?emailAddress=${encodeURIComponent(emailAddress)}`;
  const response = await api.post(url);
  return response.data;
}

// 4) Reset Password
export async function resetPassword({ confirmationKey, newPassword }) {
  const url = `/user/auth/reset-password?confirmationKey=${confirmationKey}&newPassword=${newPassword}`;
  const response = await api.post(url);
  return response.data;
}

// 5) Récupération du profil utilisateur
export async function getProfile() {
  try {
    const response = await api.get("/user/auth/profile"); // ✅ Le token est ajouté automatiquement
    return response.data;
  } catch (error) {
    console.error("🚨 Erreur lors de la récupération du profil :", error);
    throw error;
  }
}

