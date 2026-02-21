// src/services/RiceService.js
import axios from "axios";
import { config } from "../config/env";

const AI_BASE         = `${config.AI_URL}/ai`;          // gateway /api/ai/** → Python :8000 (StripPrefix=2 → /rice/…)
const COMPETENCE_BASE = `${config.COMPETENCE_URL}/competence`;

const authHeader = () => {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const RiceService = {
  /**
   * Send uploaded files + enseignants JSON to the Python AI service.
   * @param {File[]} files
   * @param {Array}  enseignants  [{id, nom, prenom, modules:[...]}]
   */
  analyze: async (files, enseignants) => {
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    form.append("enseignants", JSON.stringify(enseignants));
    const res = await axios.post(`${AI_BASE}/rice/analyze`, form, {
      headers: { ...authHeader() },   // Content-Type set automatically for FormData
    });
    return res.data;
  },

  /**
   * Persist the validated RICE structure to the competence service DB.
   * @param {Object} payload  { domaines: [...] }
   */
  importToDb: async (payload) => {
    const res = await axios.post(
      `${COMPETENCE_BASE}/rice/import`,
      payload,
      { headers: { ...authHeader(), "Content-Type": "application/json" } },
    );
    return res.data;
  },
};

export default RiceService;
