// src/services/RiceService.js
import { defaultApi as axios } from "../utils/httpClient";
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

const normalizeSavoirsPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.savoirs)) return payload.savoirs;
  if (payload?.savoirs && typeof payload.savoirs === "object") {
    return Object.values(payload.savoirs);
  }
  return [];
};

const normalizeAssignmentsPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const fetchAllPages = async (url, headers, baseParams = "") => {
  const first = await axios.get(`${url}${baseParams}`, { headers });
  const data = first?.data;

  if (!Array.isArray(data?.content) || !Number.isInteger(data?.totalPages) || data.totalPages <= 1) {
    return data;
  }

  const pageJoiner = baseParams.includes("?") ? "&" : "?";
  const requests = [];
  for (let page = 1; page < data.totalPages; page++) {
    requests.push(axios.get(`${url}${baseParams}${pageJoiner}page=${page}`, { headers }));
  }

  const rest = await Promise.all(requests);
  const mergedContent = [
    ...(data.content ?? []),
    ...rest.flatMap((r) => (Array.isArray(r?.data?.content) ? r.data.content : [])),
  ];

  return {
    ...data,
    content: mergedContent,
  };
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
      const res = await axios.get(FORMATION_ENS_BASE, { headers });
      const list = normalizeEnseignantsPayload(res.data);
      if (!departement) return list;
      const deptNorm = String(departement).toLowerCase();
      return list.filter((e) => String(e?.departement ?? e?.department ?? "").toLowerCase() === deptNorm);
    } catch (err) {
      // Compatibility fallback: some deployments expose teachers via competence service,
      // and some secured deployments reject the formation endpoint while still allowing
      // the competence endpoint with the same token.
      try {
        const data = await fetchAllPages(`${COMPETENCE_BASE}/enseignants`, headers, params);
        return normalizeEnseignantsPayload(data);
      } catch (fallbackErr) {
        throw fallbackErr?.response?.status ? fallbackErr : err;
      }
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

  /**
   * Charger tous les savoirs (avec hiérarchie) depuis le service competence
   * @param {string|null} departement
   */
  getSavoirs: async (departement = null) => {
    const params = departement ? `?departement=${departement}` : "";
    const headers = requireAuthHeader();
    try {
      const data = await fetchAllPages(`${COMPETENCE_BASE}/savoirs`, headers, params);
      return normalizeSavoirsPayload(data);
    } catch (err) {
      // Fallback to rice referential endpoint if present
      try {
        const res2 = await axios.get(`${RICE_BASE}/referential${params}`, { headers });
        // expected shape: { savoirs: {...}|[], enseignant_affectations: {...} }
        const savoirs = normalizeSavoirsPayload(res2.data);
        if (savoirs.length > 0) return savoirs;
      } catch (e) {
        // ignore
      }
      throw err;
    }
  },

  /**
   * Save batch assignments (add/remove pairs)
   * @param {{add: Array, remove: Array}} payload
   */
  saveAssignments: async (payload) => {
    const headers = { ...requireAuthHeader(), "Content-Type": "application/json" };

    const add = Array.isArray(payload?.add) ? payload.add : [];
    const remove = Array.isArray(payload?.remove) ? payload.remove : [];

    if (add.length === 0 && remove.length === 0) {
      return { added: 0, removed: 0 };
    }

    let removed = 0;
    if (remove.length > 0) {
      const existingRes = await axios.get(
        `${COMPETENCE_BASE}/enseignant-competences`,
        { headers: requireAuthHeader() },
      );
      const existing = normalizeAssignmentsPayload(existingRes.data);
      const idByPair = new Map(
        existing.map((ec) => [
          `${String(ec?.savoirId)}|${String(ec?.enseignantId)}`,
          ec?.id,
        ]),
      );

      for (const item of remove) {
        const key = `${String(item?.savoirId)}|${String(item?.enseignantId)}`;
        const ecId = idByPair.get(key);
        if (ecId == null) continue;
        await axios.delete(`${COMPETENCE_BASE}/enseignant-competences/${ecId}`, {
          headers: requireAuthHeader(),
        });
        removed += 1;
      }
    }

    let added = 0;
    for (const item of add) {
      await axios.post(
        `${COMPETENCE_BASE}/enseignant-competences`,
        {
          enseignantId: String(item?.enseignantId),
          savoirId: Number(item?.savoirId),
          niveau: item?.niveau ?? "N1_DEBUTANT",
        },
        { headers },
      );
      added += 1;
    }

    return { added, removed };
  },

  assignCompetence: async (payload) => {
    const res = await axios.post(
      `${COMPETENCE_BASE}/enseignant-competences`,
      payload,
      { headers: { ...requireAuthHeader(), "Content-Type": "application/json" } },
    );
    return res.data;
  },

  removeAssignment: async (id) => {
    const res = await axios.delete(
      `${COMPETENCE_BASE}/enseignant-competences/${id}`,
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
  updateEnseignant: async (id, data) => {
    const res = await axios.put(
      `${COMPETENCE_BASE}/enseignants/${id}`,
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

  deactivateEnseignant: async (id) => {
    const res = await axios.patch(
      `${COMPETENCE_BASE}/enseignants/${id}`,
      { etat: "I" },
      { headers: { ...requireAuthHeader(), "Content-Type": "application/json" } },
    );
    return res.data;
  },
};

export default RiceService;
