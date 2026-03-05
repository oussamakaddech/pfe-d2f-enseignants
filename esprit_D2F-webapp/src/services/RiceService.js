// src/services/RiceService.js
import axios from "axios";
import { config } from "../config/env";

const RICE_BASE       = `${config.RICE_URL}/rice`;     // direct to Python :8001 (no gateway – avoids codec size limit for file uploads)
const AI_BASE         = `${config.AI_URL}/ai`;          // gateway /api/ai/**  → Python :8000 (recommandation)
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
   * @param {string} departement  Department code: "gc" (Génie Civil), "info", "ge", …
   */
  analyze: async (files, enseignants, departement = "gc") => {
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    form.append("enseignants", JSON.stringify(enseignants));
    form.append("departement", departement);
    const res = await axios.post(`${RICE_BASE}/analyze`, form, {
      headers: { ...authHeader() },   // Content-Type set automatically for FormData
      timeout: 300000,                // 5 min – AI analysis can be slow
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

  /**
   * Retrieve the history of all past RICE imports (from the competence service).
   */
  getImportHistory: async () => {
    const res = await axios.get(
      `${COMPETENCE_BASE}/rice/imports`,
      { headers: authHeader() },
    );
    return res.data;
  },
};

export default RiceService;
