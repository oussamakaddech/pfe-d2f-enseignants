// src/services/RiceService.js
import axios from "axios";
import { config } from "../config/env";
import { requireAuthHeader } from "./authHeaders";

const RICE_BASE       = `${config.RICE_URL}/rice`;     // direct to Python :8001 (no gateway – avoids codec size limit for file uploads)
const AI_BASE         = `${config.AI_URL}/ai`;          // gateway /api/ai/**  → Python :8000 (recommandation)
const COMPETENCE_BASE = `${config.COMPETENCE_URL}/competence`;
const FORMATION_ENS_BASE = `${config.FORMATION_URL}/formation/enseignants`;

const normalizeEnseignantsPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
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
      headers: { ...requireAuthHeader() },   // Content-Type set automatically for FormData
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
      {
        headers: {
          ...requireAuthHeader(),
          "Content-Type": "application/json",
        },
      },
    );
    return res.data;
  },

  /**
   * Retrieve the history of all past RICE imports (from the competence service).
   */
  getImportHistory: async () => {
    const res = await axios.get(
      `${COMPETENCE_BASE}/rice/imports`,
      { headers: requireAuthHeader() },
    );
    return res.data;
  },

  /**
   * Charger tous les enseignants depuis le service competence.
   * @param {string|null} departement
   */
  getEnseignants: async (departement = null) => {
    const params = departement ? `?departement=${departement}` : "";
    const headers = requireAuthHeader();

    try {
      const res = await axios.get(
        `${COMPETENCE_BASE}/enseignants${params}`,
        { headers },
      );
      return normalizeEnseignantsPayload(res.data);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        throw err;
      }

      // Compatibility fallback: some deployments still expose teachers via formation service.
      const resFallback = await axios.get(FORMATION_ENS_BASE, { headers });
      const list = normalizeEnseignantsPayload(resFallback.data);
      if (!departement) return list;
      const deptNorm = String(departement).toLowerCase();
      return list.filter((e) => String(e?.departement ?? e?.department ?? "").toLowerCase() === deptNorm);
    }
  },

  /**
   * Charger les affectations existantes enseignant -> savoirs.
   */
  getEnseignantAffectations: async () => {
    const res = await axios.get(
      `${COMPETENCE_BASE}/enseignant-competences`,
      { headers: requireAuthHeader() },
    );
    return res.data;
  },

  createEnseignant: async (data) => {
    const res = await axios.post(
      `${COMPETENCE_BASE}/enseignants`,
      data,
      {
        headers: {
          ...requireAuthHeader(),
          "Content-Type": "application/json",
        },
      },
    );
    return res.data;
  },
};

export default RiceService;
