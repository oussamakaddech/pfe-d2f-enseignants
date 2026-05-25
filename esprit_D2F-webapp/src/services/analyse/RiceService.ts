import { defaultApi as axios } from "@/utils/helpers/httpClient";
import { config } from "@/config/env";

const RICE_BASE       = `${config.RICE_URL}/rice`;     // direct to Python :8001 (no gateway – avoids codec size limit for file uploads)
const COMPETENCE_BASE = `${config.COMPETENCE_URL}/competence`;
const FORMATION_ENS_BASE = `${config.FORMATION_URL}/formation/enseignants`;

const normalizeEnseignantsPayload = <T>(payload: T[] | { content?: T[]; data?: T[] }): T[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const normalizeSavoirsPayload = <T>(payload: T[] | { content?: T[]; data?: T[]; savoirs?: T[] | Record<string, T> }): T[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.savoirs)) return payload.savoirs;
  if (payload?.savoirs && typeof payload.savoirs === "object") {
    return Object.values(payload.savoirs);
  }
  return [];
};

const normalizeAssignmentsPayload = <T>(payload: T[] | { content?: T[]; data?: T[] }): T[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const fetchAllPages = async (url: string, baseParams = "") => {
  const first = await axios.get(`${url}${baseParams}`);
  const data = first?.data;

    const d = data as { content?: unknown[]; totalPages?: number };
    if (!Array.isArray(d?.content) || !Number.isInteger(d?.totalPages) || d.totalPages <= 1) {
    return data;
  }

  const pageJoiner = baseParams.includes("?") ? "&" : "?";
  const requests = [];
  for (let page = 1; page < d.totalPages; page++) {
    requests.push(axios.get(`${url}${baseParams}${pageJoiner}page=${page}`));
  }

  const rest = await Promise.all(requests);
  const mergedContent = [
    ...(d.content ?? []),
    ...rest.flatMap((r) => (Array.isArray((r?.data as { content?: unknown[] })?.content) ? (r.data as { content?: unknown[] }).content : [])),
  ];

  return {
    ...data,
    content: mergedContent,
  } as typeof data;
};

const RiceService = {

  analyze: async (files: File[], enseignants: Record<string, unknown>[], departement = "gc") => {
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    form.append("enseignants", JSON.stringify(enseignants));
    form.append("departement", departement);
    const res = await axios.post(`${RICE_BASE}/analyze`, form, {
      timeout: 300000, // 5 min – AI analysis can be slow
    });
    return res.data;
  },


  importToDb: async (payload: Record<string, unknown>) => {
    const res = await axios.post(`${COMPETENCE_BASE}/rice/import`, payload);
    return res.data;
  },


  getImportHistory: async () => {
    const res = await axios.get(`${COMPETENCE_BASE}/rice/imports`);
    return res.data;
  },


  getEnseignants: async (departement: string | null = null) => {
    const params = departement ? `?departement=${departement}` : "";

    try {
      const res = await axios.get(FORMATION_ENS_BASE);
      const list = normalizeEnseignantsPayload(res.data);
      if (!departement) return list;
      const deptNorm = String(departement).toLowerCase();
      return list.filter((e) => String(e?.departement ?? e?.department ?? "").toLowerCase() === deptNorm);
    } catch (err) {
      // Compatibility fallback: some deployments expose teachers via competence service,
      // and some secured deployments reject the formation endpoint while still allowing
      // the competence endpoint with the same token.
      try {
        const data = await fetchAllPages(`${COMPETENCE_BASE}/enseignants`, params);
        return normalizeEnseignantsPayload(data);
      } catch (fallbackErr) {
        throw fallbackErr?.response?.status ? fallbackErr : err;
      }
    }
  },


  getEnseignantAffectations: async () => {
    const res = await axios.get(`${COMPETENCE_BASE}/enseignant-competences`);
    return res.data;
  },


  getSavoirs: async (departement: string | null = null) => {
    const params = departement ? `?departement=${departement}` : "";
    try {
      const data = await fetchAllPages(`${COMPETENCE_BASE}/savoirs`, params);
      return normalizeSavoirsPayload(data);
    } catch (err) {
      // Fallback to rice referential endpoint if present
      try {
        const res2 = await axios.get(`${RICE_BASE}/referential${params}`);
        // expected shape: { savoirs: {...}|[], enseignant_affectations: {...} }
        const savoirs = normalizeSavoirsPayload(res2.data);
        if (savoirs.length > 0) return savoirs;
      } catch {
        // ignore
      }
      throw err;
    }
  },


  saveAssignments: async (payload: { add?: Record<string, unknown>[]; remove?: Record<string, unknown>[] }) => {
    const add = Array.isArray(payload?.add) ? payload.add : [];
    const remove = Array.isArray(payload?.remove) ? payload.remove : [];

    if (add.length === 0 && remove.length === 0) {
      return { added: 0, removed: 0 };
    }

    let removed = 0;
    if (remove.length > 0) {
      const existingRes = await axios.get(`${COMPETENCE_BASE}/enseignant-competences`);
      const existing = normalizeAssignmentsPayload(existingRes.data);
      const idByPair = new Map<string, number>(
        existing.map((ec) => [
          `${String(ec?.savoirId)}|${String(ec?.enseignantId)}`,
          Number(ec?.id),
        ]),
      );

      for (const item of remove) {
        const key = `${String(item?.savoirId)}|${String(item?.enseignantId)}`;
        const ecId = idByPair.get(key);
        if (ecId == null) continue;
        await axios.delete(`${COMPETENCE_BASE}/enseignant-competences/${ecId}`);
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
      );
      added += 1;
    }

    return { added, removed };
  },

  assignCompetence: async (payload: Record<string, unknown>) => {
    const res = await axios.post(`${COMPETENCE_BASE}/enseignant-competences`, payload);
    return res.data;
  },

  removeAssignment: async (id: number | string) => {
    const res = await axios.delete(`${COMPETENCE_BASE}/enseignant-competences/${id}`);
    return res.data;
  },

  createEnseignant: async (data: Record<string, unknown>) => {
    const res = await axios.post(`${COMPETENCE_BASE}/enseignants`, data);
    return res.data;
  },

  updateEnseignant: async (id: number | string, data: Record<string, unknown>) => {
    const res = await axios.put(`${COMPETENCE_BASE}/enseignants/${id}`, data);
    return res.data;
  },

  deactivateEnseignant: async (id: number | string) => {
    const res = await axios.patch(`${COMPETENCE_BASE}/enseignants/${id}`, { etat: "I" });
    return res.data;
  },
};

export default RiceService;




