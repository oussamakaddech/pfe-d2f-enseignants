export interface RiceSavoirEntry extends Record<string, unknown> {
  id?: string | number;
  code?: string;
  nom?: string;
  niveau?: string;
  domaine?: { code?: string; nom?: string } | string;
  enseignants?: (string | number)[];
  enseignantIds?: (string | number)[];
}

export interface RiceEnseignantEntry extends Record<string, unknown> {
  id?: string | number;
  prenom?: string;
  nom?: string;
  departement?: string;
  grade?: string;
}

export interface PendingItem {
  savoirId: string;
  enseignantId: string;
  niveau?: string;
}

export interface MatchingFilters {
  departement: string;
  domaine: string;
  search: string;
  showUnassignedOnly: boolean;
}

export interface MatchingState {
  savoirs: RiceSavoirEntry[];
  enseignants: RiceEnseignantEntry[];
  assignments: Record<string, string[]>;
  pendingChanges: { add: PendingItem[]; remove: PendingItem[] };
  filters: MatchingFilters;
  loading: { data: boolean; saving: boolean };
  error: string | null;
}

export type MatchingAction =
  | { type: "LOAD_SUCCESS"; payload: { savoirs: RiceSavoirEntry[]; enseignants: RiceEnseignantEntry[]; assignments: Record<string, string[]> } }
  | { type: "ASSIGN_SAVOIR"; payload: { savoirId: string; enseignantId: string } }
  | { type: "UNASSIGN_SAVOIR"; payload: { savoirId: string; enseignantId: string } }
  | { type: "SAVE_SUCCESS" }
  | { type: "SET_FILTER"; payload: { key: keyof MatchingFilters; value: string | boolean } }
  | { type: "SET_LOADING"; payload: { key: keyof MatchingState["loading"]; value: boolean } }
  | { type: "SET_ERROR"; payload: { error: string } }
  | { type: "RESET_PENDING" };

export const initialState: MatchingState = {
  savoirs: [],
  enseignants: [],
  assignments: {},
  pendingChanges: { add: [], remove: [] },
  filters: { departement: "all", domaine: "all", search: "", showUnassignedOnly: false },
  loading: { data: false, saving: false },
  error: null,
};

export const getAvatarColor = (id: string | number) => {
  const colors = ["#fa8c16", "#faad14", "#52c41a", "#1890ff", "#722ed1", "#13c2c2", "#eb2f96", "#2f54eb", "#a0d911", "#f5222d"];
  let hash = 0;
  const str = String(id);
  for (let i = 0; i < str.length; i++) {
    hash = (str.codePointAt(i) ?? 0) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const normalizePending = (pending: { add: PendingItem[]; remove: PendingItem[] }) => {
  const key = (item: PendingItem) => `${item.savoirId}|${item.enseignantId}`;
  const adds = new Map<string, PendingItem>();
  const removes = new Map<string, PendingItem>();
  (pending?.add || []).forEach((item) => {
    if (item?.savoirId && item?.enseignantId) adds.set(key(item), item);
  });
  (pending?.remove || []).forEach((item) => {
    if (item?.savoirId && item?.enseignantId) removes.set(key(item), item);
  });
  for (const k of adds.keys()) {
    if (removes.has(k)) { adds.delete(k); removes.delete(k); }
  }
  return { add: Array.from(adds.values()), remove: Array.from(removes.values()) };
};

export const normalizeNiveauForAssignment = (niveau: unknown): string => {
  const raw = String(niveau ?? "").trim().toUpperCase();
  if (!raw) return "N1_DEBUTANT";
  if (["N1_DEBUTANT", "N2_ELEMENTAIRE", "N3_INTERMEDIAIRE", "N4_AVANCE", "N5_EXPERT"].includes(raw)) return raw;
  if (raw === "N1") return "N1_DEBUTANT";
  if (raw === "N2") return "N2_ELEMENTAIRE";
  if (raw === "N3") return "N3_INTERMEDIAIRE";
  if (raw === "N4") return "N4_AVANCE";
  if (raw === "N5") return "N5_EXPERT";
  return "N1_DEBUTANT";
};

export function reducer(state: MatchingState, action: MatchingAction): MatchingState {
  switch (action.type) {
    case "LOAD_SUCCESS": {
      const { savoirs, enseignants, assignments } = action.payload;
      return { ...state, savoirs, enseignants, assignments: assignments || {}, loading: { ...state.loading, data: false }, error: null };
    }
    case "ASSIGN_SAVOIR": {
      const { savoirId, enseignantId } = action.payload;
      const sId = String(savoirId);
      const eId = String(enseignantId);
      const assignments = { ...state.assignments };
      assignments[sId] = Array.from(new Set([...(assignments[sId] ?? []), eId]));
      const pending = { add: [...state.pendingChanges.add], remove: [...state.pendingChanges.remove] };
      const removeIdx = pending.remove.findIndex((p) => String(p.savoirId) === sId && String(p.enseignantId) === eId);
      if (removeIdx === -1) {
        const exists = pending.add.some((p) => String(p.savoirId) === sId && String(p.enseignantId) === eId);
        if (!exists) pending.add.push({ savoirId: sId, enseignantId: eId });
      } else {
        pending.remove.splice(removeIdx, 1);
      }
      return { ...state, assignments, pendingChanges: pending };
    }
    case "UNASSIGN_SAVOIR": {
      const { savoirId, enseignantId } = action.payload;
      const sId = String(savoirId);
      const eId = String(enseignantId);
      const assignments = { ...state.assignments };
      assignments[sId] = (assignments[sId] ?? []).filter((id) => String(id) !== eId);
      const pending = { add: [...state.pendingChanges.add], remove: [...state.pendingChanges.remove] };
      const addIdx = pending.add.findIndex((p) => String(p.savoirId) === sId && String(p.enseignantId) === eId);
      if (addIdx === -1) {
        const exists = pending.remove.some((p) => String(p.savoirId) === sId && String(p.enseignantId) === eId);
        if (!exists) pending.remove.push({ savoirId: sId, enseignantId: eId });
      } else {
        pending.add.splice(addIdx, 1);
      }
      return { ...state, assignments, pendingChanges: pending };
    }
    case "SAVE_SUCCESS":
      return { ...state, pendingChanges: { add: [], remove: [] }, loading: { ...state.loading, saving: false } };
    case "SET_FILTER":
      return { ...state, filters: { ...state.filters, [action.payload.key]: action.payload.value } };
    case "SET_LOADING":
      return { ...state, loading: { ...state.loading, [action.payload.key]: action.payload.value } };
    case "SET_ERROR":
      return { ...state, error: action.payload.error, loading: { data: false, saving: false } };
    case "RESET_PENDING":
      return { ...state, pendingChanges: { add: [], remove: [] } };
    default:
      return state;
  }
}
