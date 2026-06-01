import { useReducer, useCallback, useMemo } from "react";
import {
  useRiceSavoirs, useRiceEnseignants, useRiceEnseignantAffectations,
  useRiceRemoveAssignment, useRiceAssignCompetence,
  useRiceCreateEnseignant, useRiceUpdateEnseignant, useRiceDeactivateEnseignant,
} from "@/hooks/analyse/useRiceService";
import useAppNotification from "@/hooks/ui/useAppNotification";

export const DEFAULT_ASSIGN_LEVEL = "N2_ELEMENTAIRE";

export interface Savoir { id: number | string; code?: string; nom?: string; type?: string; niveau?: string | number; domaine?: string; [key: string]: unknown }
export interface Enseignant { id: number | string; nom?: string; prenom?: string; email?: string; departement?: string; grade?: string; etat?: string; [key: string]: unknown }
export interface PendingItem { savoirId: number | string; enseignantId: number | string }

export interface MatchState {
  savoirs: Savoir[];
  enseignants: Enseignant[];
  assignments: Map<number | string, Set<number | string>>;
  assignmentIds: Map<string, number | string>;
  pendingChanges: { add: PendingItem[]; remove: PendingItem[] };
  filters: { departement: string | null; domaine: string; type: string; statut: string; search: string };
  loading: { savoirs: boolean; enseignants: boolean; saving: boolean };
  error: unknown;
}

export type MatchAction =
  | { type: "SET_LOADING"; key: string; value: boolean }
  | { type: "SET_SAVOIRS"; savoirs: Savoir[] }
  | { type: "SET_ENSEIGNANTS"; enseignants: Enseignant[] }
  | { type: "SET_ASSIGNMENTS"; assignments: Map<number | string, Set<number | string>> }
  | { type: "SET_ASSIGNMENT_IDS"; assignmentIds: Map<string, number | string> }
  | { type: "ASSIGN_CHANGE"; savoirId: number | string; newSet: (number | string)[] }
  | { type: "CLEAR_PENDING" }
  | { type: "SAVE_START" }
  | { type: "SAVE_SUCCESS" }
  | { type: "SET_ERROR"; error: unknown }
  | { type: "CREATE_TEACHER"; teacher: Enseignant }
  | { type: "UPDATE_TEACHER"; teacher: Enseignant }
  | { type: "DEACTIVATE_TEACHER"; id: number | string }
  | { type: "SET_FILTER"; filters: Partial<MatchState["filters"]> };

export const normalizeNiveau = (value: unknown): string => {
  const mapping: Record<number, string> = { 1: "N1_DEBUTANT", 2: "N2_ELEMENTAIRE", 3: "N3_INTERMEDIAIRE", 4: "N4_AVANCE", 5: "N5_EXPERT" };
  if (typeof value === "string" && /^N[1-5]_[A-Z_]+$/.test(value)) return value;
  return mapping[Number(value)] || DEFAULT_ASSIGN_LEVEL;
};

const initialState: MatchState = {
  savoirs: [], enseignants: [],
  assignments: new Map(), assignmentIds: new Map(),
  pendingChanges: { add: [], remove: [] },
  filters: { departement: null, domaine: "all", type: "all", statut: "all", search: "" },
  loading: { savoirs: false, enseignants: false, saving: false },
  error: null,
};

function reducer(state: MatchState, action: MatchAction): MatchState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: { ...state.loading, [action.key]: action.value } };
    case "SET_SAVOIRS":
      return { ...state, savoirs: action.savoirs };
    case "SET_ENSEIGNANTS":
      return { ...state, enseignants: action.enseignants };
    case "SET_ASSIGNMENTS":
      return { ...state, assignments: action.assignments };
    case "SET_ASSIGNMENT_IDS":
      return { ...state, assignmentIds: action.assignmentIds };
    case "ASSIGN_CHANGE": {
      const { savoirId, newSet } = action;
      const assignments = new Map(state.assignments);
      assignments.set(savoirId, new Set(newSet));
      const prev = state.assignments.get(savoirId) || new Set();
      const added = newSet.filter((id) => !prev.has(id)).map((enseignantId) => ({ savoirId, enseignantId }));
      const removed = [...prev].filter((id) => !newSet.includes(id)).map((enseignantId) => ({ savoirId, enseignantId }));
      return { ...state, assignments, pendingChanges: { add: [...state.pendingChanges.add, ...added], remove: [...state.pendingChanges.remove, ...removed] } };
    }
    case "CLEAR_PENDING":
      return { ...state, pendingChanges: { add: [], remove: [] } };
    case "SAVE_START":
      return { ...state, loading: { ...state.loading, saving: true } };
    case "SAVE_SUCCESS":
      return { ...state, loading: { ...state.loading, saving: false }, pendingChanges: { add: [], remove: [] } };
    case "SET_ERROR":
      return { ...state, error: action.error, loading: { ...state.loading, saving: false } };
    case "CREATE_TEACHER":
      return { ...state, enseignants: [action.teacher, ...state.enseignants] };
    case "UPDATE_TEACHER":
      return { ...state, enseignants: state.enseignants.map((e) => (e.id === action.teacher.id ? action.teacher : e)) };
    case "DEACTIVATE_TEACHER": {
      const id = action.id;
      const assignments = new Map(state.assignments);
      const extraRemoves: PendingItem[] = [];
      for (const [sId, setOf] of assignments.entries()) {
        if (setOf.has(id)) { setOf.delete(id); extraRemoves.push({ savoirId: sId, enseignantId: id }); }
      }
      return { ...state, enseignants: state.enseignants.map((e) => (e.id === id ? { ...e, etat: "I" } : e)), assignments, pendingChanges: { add: [...state.pendingChanges.add], remove: [...state.pendingChanges.remove, ...extraRemoves] } };
    }
    case "SET_FILTER":
      return { ...state, filters: { ...state.filters, ...action.filters } };
    default:
      return state;
  }
}

export function buildSavoirCodeMap(savoirs: Savoir[]): Map<string, string> {
  const map = new Map<string, string>();
  savoirs.forEach((s) => map.set(String(s.id), s.code || String(s.id)));
  return map;
}

export function useMatchmaking() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { message: msgApi } = useAppNotification();

  const removeAssignment       = useRiceRemoveAssignment();
  const assignCompetence       = useRiceAssignCompetence();
  const createEnseignantHook   = useRiceCreateEnseignant();
  const updateEnseignantHook   = useRiceUpdateEnseignant();
  const deactivateEnseignantHook = useRiceDeactivateEnseignant();

  const { data: savoirsData = [] }      = useRiceSavoirs(state.filters.departement);
  const { data: enseignantsData = [] }  = useRiceEnseignants(state.filters.departement);
  const { data: affectationsData }      = useRiceEnseignantAffectations();

  const hydrateFromHooks = useCallback(() => {
    dispatch({ type: "SET_SAVOIRS", savoirs: savoirsData as Savoir[] });
    dispatch({ type: "SET_ENSEIGNANTS", enseignants: enseignantsData as Enseignant[] });

    const assignments = new Map<number | string, Set<number | string>>();
    const assignmentIds = new Map<string, number | string>();

    interface AffectationItem { id?: number; ecId?: number; enseignantCompetenceId?: number; savoirId?: number; savoir_id?: number; savoir?: number; enseignantId?: number; enseignant_id?: number; enseignant?: number }
    let affectationList: AffectationItem[];
    if (Array.isArray(affectationsData)) affectationList = affectationsData as AffectationItem[];
    else if (Array.isArray((affectationsData as Record<string, unknown>)?.content)) affectationList = (affectationsData as Record<string, AffectationItem[]>).content;
    else if (Array.isArray((affectationsData as Record<string, unknown>)?.data)) affectationList = (affectationsData as Record<string, AffectationItem[]>).data;
    else affectationList = [];

    if (affectationList.length > 0) {
      affectationList.forEach((a) => {
        const ecId = a.id ?? a.ecId ?? a.enseignantCompetenceId;
        const sId = a.savoirId ?? a.savoir_id ?? a.savoir;
        const eId = a.enseignantId ?? a.enseignant_id ?? a.enseignant;
        if (!sId || !eId) return;
        if (!assignments.has(sId)) assignments.set(sId, new Set());
        assignments.get(sId)!.add(eId);
        if (ecId != null) assignmentIds.set(`${String(sId)}|${String(eId)}`, ecId);
      });
    }

    dispatch({ type: "SET_ASSIGNMENTS", assignments });
    dispatch({ type: "SET_ASSIGNMENT_IDS", assignmentIds });
  }, [savoirsData, enseignantsData, affectationsData]);

  const domaineOptions = useMemo(() => {
    const all = new Set(state.savoirs.map((s) => s.domaine).filter(Boolean));
    return Array.from(all) as string[];
  }, [state.savoirs]);

  const filteredSavoirs = useMemo(() => {
    let list = state.savoirs;
    const f = state.filters;
    if (f.domaine !== "all") list = list.filter((s) => s.domaine === f.domaine);
    if (f.type !== "all") list = list.filter((s) => (s.type || s.type_savoir) === f.type);
    if (f.statut !== "all") {
      if (f.statut === "assigned") list = list.filter((s) => (state.assignments.get(s.id) || new Set()).size > 0);
      else list = list.filter((s) => (state.assignments.get(s.id) || new Set()).size === 0);
    }
    if (f.search) {
      const q = f.search.toLowerCase();
      list = list.filter((s) => `${String(s.code || "")} ${String(s.nom || "")}`.toLowerCase().includes(q));
    }
    return list;
  }, [state.savoirs, state.filters, state.assignments]);

  const handleSave = async () => {
    const key = (p: PendingItem) => `${String(p.savoirId)}|${String(p.enseignantId)}`;
    const norm = (p: PendingItem) => ({
      savoirId: typeof p.savoirId === "string" && /^\d+$/.test(p.savoirId) ? Number(p.savoirId) : p.savoirId,
      enseignantId: typeof p.enseignantId === "string" && /^\d+$/.test(p.enseignantId) ? Number(p.enseignantId) : p.enseignantId,
    });

    const adds = new Map<string, PendingItem>();
    const removes = new Map<string, PendingItem>();
    state.pendingChanges.add.forEach((p) => { if (p.savoirId != null && p.enseignantId != null) adds.set(key(p), norm(p)); });
    state.pendingChanges.remove.forEach((p) => { if (p.savoirId != null && p.enseignantId != null) removes.set(key(p), norm(p)); });
    for (const k of Array.from(adds.keys())) { if (removes.has(k)) { adds.delete(k); removes.delete(k); } }

    const payload = { add: Array.from(adds.values()), remove: Array.from(removes.values()) };
    if (payload.add.length === 0 && payload.remove.length === 0) {
      msgApi.info("Aucune modification à sauvegarder");
      dispatch({ type: "CLEAR_PENDING" });
      return;
    }

    dispatch({ type: "SAVE_START" });
    try {
      for (const item of payload.remove) {
        const ecId = state.assignmentIds.get(`${String(item.savoirId)}|${String(item.enseignantId)}`);
        if (ecId == null) throw new Error(`Affectation introuvable: savoir ${item.savoirId}, enseignant ${item.enseignantId}`);
        await removeAssignment.mutateAsync(ecId);
      }
      for (const item of payload.add) {
        const savoir = state.savoirs.find((s) => String(s.id) === String(item.savoirId));
        await assignCompetence.mutateAsync({ enseignantId: String(item.enseignantId), savoirId: Number(item.savoirId), niveau: normalizeNiveau(savoir?.niveau) });
      }
      dispatch({ type: "SAVE_SUCCESS" });
      msgApi.success(`${payload.add.length + payload.remove.length} affectation(s) sauvegardée(s)`);
      hydrateFromHooks();
    } catch (err: unknown) {
      dispatch({ type: "SET_ERROR", error: err });
      const e = err as Record<string, unknown>;
      const msg = (e?.response as Record<string, unknown>)?.data ?? e?.message ?? String(err);
      msgApi.error(`Erreur lors de la sauvegarde: ${String(msg)}`);
    }
  };

  const handleCreateTeacher = async (values: Record<string, unknown>) => {
    try {
      const created = await createEnseignantHook.mutateAsync(values);
      dispatch({ type: "CREATE_TEACHER", teacher: created as Enseignant });
      msgApi.success("Enseignant créé");
    } catch (err: unknown) {
      const e = err as Record<string, unknown>;
      msgApi.error(`Erreur: ${(e?.response as Record<string, unknown>)?.data ?? e?.message}`);
    }
  };

  const handleUpdateTeacher = async (id: number | string, values: Record<string, unknown>) => {
    try {
      const updated = await updateEnseignantHook.mutateAsync({ id, data: values });
      dispatch({ type: "UPDATE_TEACHER", teacher: updated as Enseignant });
      msgApi.success("Enseignant mis à jour");
    } catch (err: unknown) {
      const e = err as Record<string, unknown>;
      msgApi.error(`Erreur: ${(e?.response as Record<string, unknown>)?.data ?? e?.message}`);
    }
  };

  const handleDeactivateTeacher = async (id: number | string) => {
    try {
      await deactivateEnseignantHook.mutateAsync(id);
      dispatch({ type: "DEACTIVATE_TEACHER", id });
      msgApi.success("Enseignant désactivé");
    } catch (err: unknown) {
      const e = err as Record<string, unknown>;
      msgApi.error(`Erreur: ${(e?.response as Record<string, unknown>)?.data ?? e?.message}`);
    }
  };

  return {
    state,
    dispatch,
    hydrateFromHooks,
    domaineOptions,
    filteredSavoirs,
    handleSave,
    handleCreateTeacher,
    handleUpdateTeacher,
    handleDeactivateTeacher,
  };
}
