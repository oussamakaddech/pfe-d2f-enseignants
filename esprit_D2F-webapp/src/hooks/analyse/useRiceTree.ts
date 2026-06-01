// Custom hook that owns the entire RICE competence tree state.
// Provides all mutation helpers (rename, delete, toggle type/niveau, assign,
// merge, etc.) and derived memos (allSavoirsFlat, liveStats, treeFilteredIndices).

import { useState, useCallback, useMemo } from "react";
import { useImmer } from "use-immer";
import type { MessageInstance } from "antd/es/message/interface";
import { cloneDeep } from "@/pages/competence/rice/constants";
import type {
  RiceDomaine,
  RiceCompetence,
  RiceSousCompetence,
  RiceSavoir,
  RiceFlatSavoir,
  RiceEditingNom,
  RiceMergeRef,
  RiceTreePath,
  EnseignantId,
} from "@/models/competence";

// ── low-level accessor ────────────────────────────────────────────────────────
const getSavoir = (t: RiceDomaine[], di: number, ci: number, sci: number, si: number): RiceSavoir => {
  const comp = t[di].competences![ci];
  if (sci === -1) return comp.savoirs![si];
  return comp.sousCompetences![sci].savoirs![si];
};

const pushSavoirFlat = (
  list: RiceFlatSavoir[],
  s: RiceSavoir,
  si: number,
  d: RiceDomaine,
  di: number,
  c: { code?: string; nom: string },
  ci: number,
  sc: { code?: string; nom: string } | null,
  sci: number,
) => {
  list.push({
    ...s,
    di, ci, sci, si,
    domaineCode: d.code,
    domaineNom: d.nom,
    competenceCode: c.code,
    competenceNom: c.nom,
    sousCompetenceCode: sc?.code ?? null,
    sousCompetenceNom: sc?.nom ?? null,
    label: sc
      ? `${d.nom} › ${c.nom} › ${sc.nom} › ${s.nom}`
      : `${d.nom} › ${c.nom} › ${s.nom}`,
  });
};

const savoirMatchesQuery = (s: RiceSavoir, q: string) =>
  s.nom.toLowerCase().includes(q) || (s.code ?? "").toLowerCase().includes(q);

type TreeUpdater = (t: RiceDomaine[]) => void;

export function useRiceTree(msgApi: MessageInstance) {
  // ── core tree state ───────────────────────────────────────────────────────
  const [tree, setTree] = useImmer<RiceDomaine[]>([]);
  const [treeSearch, setTreeSearch] = useState("");
  const [editingNom, setEditingNom] = useState<RiceEditingNom | null>(null);
  const [mergeModal, setMergeModal] = useState(false);
  const [mergeSrc, setMergeSrc] = useState<RiceMergeRef | null>(null);
  const [mergeDst, setMergeDst] = useState<RiceMergeRef | null>(null);

  // ── generic updater (cloneDeep for immer compatibility) ───────────────────
  const updateTree = useCallback((updater: TreeUpdater) => {
    setTree((prev) => {
      const next = cloneDeep(prev) as RiceDomaine[];
      updater(next);
      return next;
    });
  }, [setTree]);

  // ── rename ────────────────────────────────────────────────────────────────
  const startRename = useCallback(
    (path: RiceTreePath, currentVal: string) => setEditingNom({ path, value: currentVal }),
    [],
  );

  const commitRename = useCallback(() => {
    if (!editingNom) return;
    const { path, value } = editingNom;
    updateTree((t) => {
      const [di, ci, sci, si] = path;
      if (si !== undefined) getSavoir(t, di, ci, sci, si).nom = value;
      else if (sci !== undefined) t[di].competences![ci].sousCompetences![sci].nom = value;
      else if (ci === undefined) t[di].nom = value;
      else t[di].competences![ci].nom = value;
    });
    setEditingNom(null);
  }, [editingNom, updateTree]);

  // ── delete ────────────────────────────────────────────────────────────────
  const deleteSavoir = useCallback(
    (di: number, ci: number, sci: number, si: number) =>
      updateTree((t) => {
        if (sci === -1) t[di].competences![ci].savoirs!.splice(si, 1);
        else t[di].competences![ci].sousCompetences![sci].savoirs!.splice(si, 1);
      }),
    [updateTree],
  );
  const deleteSC = useCallback(
    (di: number, ci: number, sci: number) =>
      updateTree((t) => { t[di].competences![ci].sousCompetences!.splice(sci, 1); }),
    [updateTree],
  );
  const deleteComp = useCallback(
    (di: number, ci: number) => updateTree((t) => { t[di].competences!.splice(ci, 1); }),
    [updateTree],
  );
  const deleteDomaine = useCallback(
    (di: number) => updateTree((t) => { t.splice(di, 1); }),
    [updateTree],
  );

  // ── create (add) ──────────────────────────────────────────────────────────
  const addDomaine = useCallback((domaine?: Partial<RiceDomaine>) => {
    const d = domaine ?? { code: "NEW", nom: "Nouvel Domaine" };
    updateTree((t) => {
      const idx = t.push({ nom: "Nouvel Domaine", ...d, competences: [] }) - 1;
      setEditingNom({ path: [idx], value: d.nom ?? "" });
    });
  }, [updateTree, setEditingNom]);

  const addCompetence = useCallback((di: number, competence?: Partial<RiceCompetence>) => {
    const c = competence ?? { code: "NEW_C", nom: "Nouvelle compétence" };
    updateTree((t) => {
      const comps = t[di].competences ?? (t[di].competences = []);
      const ci = comps.push({ nom: "Nouvelle compétence", ...c, sousCompetences: [], savoirs: [] }) - 1;
      setEditingNom({ path: [di, ci], value: c.nom ?? "" });
    });
  }, [updateTree, setEditingNom]);

  const addSousCompetence = useCallback((di: number, ci: number, sousComp?: Partial<RiceSousCompetence>) => {
    const sc = sousComp ?? { code: "NEW_SC", nom: "Nouvelle sous-comp" };
    updateTree((t) => {
      const comp = t[di].competences![ci];
      const scs = comp.sousCompetences ?? (comp.sousCompetences = []);
      const sci = scs.push({ nom: "Nouvelle sous-comp", ...sc, savoirs: [] }) - 1;
      setEditingNom({ path: [di, ci, sci], value: sc.nom ?? "" });
    });
  }, [updateTree, setEditingNom]);

  // ── create (add savoir) ────────────────────────────────────────────────────
  const addSavoir = useCallback((di: number, ci: number, sci = -1, savoir?: Partial<RiceSavoir>) => {
    const s = savoir ?? { code: null, nom: "Nouveau savoir", type: "THEORIQUE", niveau: null, enseignantsSuggeres: [] };
    updateTree((t) => {
      const target = sci === -1 ? t[di].competences![ci] : t[di].competences![ci].sousCompetences![sci];
      const list = target.savoirs ?? (target.savoirs = []);
      const tmpId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const si = list.push({ nom: "Nouveau savoir", ...s, tmpId }) - 1;
      setEditingNom({ path: [di, ci, sci, si], value: s.nom ?? "" });
    });
  }, [updateTree, setEditingNom]);

  // ── type / niveau ─────────────────────────────────────────────────────────
  const toggleType = useCallback(
    (di: number, ci: number, sci: number, si: number) =>
      updateTree((t) => {
        const s = getSavoir(t, di, ci, sci, si);
        s.type = s.type === "THEORIQUE" ? "PRATIQUE" : "THEORIQUE";
      }),
    [updateTree],
  );

  const setNiveau = useCallback(
    (di: number, ci: number, sci: number, si: number, niveau: string) =>
      updateTree((t) => { getSavoir(t, di, ci, sci, si).niveau = niveau; }),
    [updateTree],
  );

  // ── enseignant assignment ─────────────────────────────────────────────────
  const toggleEnsAssign = useCallback(
    (di: number, ci: number, sci: number, si: number, ensId: EnseignantId) =>
      updateTree((t) => {
        const s = getSavoir(t, di, ci, sci, si);
        const ids = s.enseignantsSuggeres ?? [];
        const idx = ids.indexOf(ensId);
        if (idx === -1) ids.push(ensId);
        else ids.splice(idx, 1);
        s.enseignantsSuggeres = ids;
      }),
    [updateTree],
  );

  const setEnseignants = useCallback(
    (di: number, ci: number, sci: number, si: number, ids: EnseignantId[]) =>
      updateTree((t) => { getSavoir(t, di, ci, sci, si).enseignantsSuggeres = ids; }),
    [updateTree],
  );

  // ── clear all assignments ──────────────────────────────────────────────────
  const clearAllAssignments = useCallback(() => {
    updateTree((t) => {
      for (const d of t)
        for (const c of d.competences ?? []) {
          for (const s of c.savoirs ?? [])
            s.enseignantsSuggeres = [];
          for (const sc of c.sousCompetences ?? [])
            for (const s of sc.savoirs ?? [])
              s.enseignantsSuggeres = [];
        }
    });
    msgApi.success("Toutes les affectations ont été supprimées — glissez les savoirs manuellement.");
  }, [updateTree, msgApi]);

  // ── remap enseignant ID in tree (called after identifing an ext_ teacher) ─
  const replaceIdInArray = (ids: EnseignantId[] | undefined, from: EnseignantId, to: EnseignantId): void => {
    if (!ids) return;
    const idx = ids.indexOf(from);
    if (idx !== -1) ids[idx] = to;
  };

  const remapInTree = useCallback(
    (extId: EnseignantId, realId: EnseignantId) => {
      updateTree((t) => {
        for (const d of t)
          for (const c of d.competences ?? []) {
            for (const s of c.savoirs ?? []) replaceIdInArray(s.enseignantsSuggeres, extId, realId);
            for (const sc of c.sousCompetences ?? [])
              for (const s of sc.savoirs ?? []) replaceIdInArray(s.enseignantsSuggeres, extId, realId);
          }
      });
    },
    [updateTree],
  );

  // ── merge ─────────────────────────────────────────────────────────────────
  const openMerge = useCallback(
    (di: number, ci: number, sci: number, si: number) => setMergeSrc({ di, ci, sci, si }),
    [],
  );

  const confirmMerge = useCallback(() => {
    if (!mergeSrc || !mergeDst) return;
    const { di, ci, sci, si } = mergeSrc;
    const { di: di2, ci: ci2, sci: sci2, si: si2 } = mergeDst;
    updateTree((t) => {
      const src = getSavoir(t, di, ci, sci, si);
      const dst = getSavoir(t, di2, ci2, sci2, si2);
      dst.enseignantsSuggeres = Array.from(
        new Set([...(src.enseignantsSuggeres ?? []), ...(dst.enseignantsSuggeres ?? [])]),
      );
      dst.nom = `${dst.nom} / ${src.nom}`;
      if (sci === -1) t[di].competences![ci].savoirs!.splice(si, 1);
      else t[di].competences![ci].sousCompetences![sci].savoirs!.splice(si, 1);
    });
    setMergeModal(false);
    setMergeSrc(null);
    setMergeDst(null);
    msgApi.success("Savoirs fusionnés avec succès");
  }, [mergeSrc, mergeDst, updateTree, msgApi]);

  // ── derived: flat savoir list ──────────────────────────────────────────────
  const allSavoirsFlat = useMemo(() => {
    const list: RiceFlatSavoir[] = [];
    tree.forEach((d, di) => {
      (d.competences ?? []).forEach((c, ci) => {
        for (const [si, s] of (c.savoirs ?? []).entries())
          pushSavoirFlat(list, s, si, d, di, c, ci, null, -1);
        for (const [sci, sc] of (c.sousCompetences ?? []).entries())
          for (const [si, s] of (sc.savoirs ?? []).entries())
            pushSavoirFlat(list, s, si, d, di, c, ci, sc, sci);
      });
    });
    return list;
  }, [tree]);

  // ── derived: live stats ────────────────────────────────────────────────────
  const liveStats = useMemo(() => {
    const totalSavoirs = allSavoirsFlat.length;
    const assignedEns = new Set(
      allSavoirsFlat.flatMap((s) => s.enseignantsSuggeres ?? []),
    );
    const totalDomaines = tree.length;
    const totalComp = tree.reduce((a, d) => a + (d.competences?.length ?? 0), 0);
    const totalSC = tree.reduce(
      (a, d) => a + (d.competences ?? []).reduce((b, c) => b + (c.sousCompetences?.length ?? 0), 0),
      0,
    );
    return { totalDomaines, totalComp, totalSC, totalSavoirs, enseignantsAssigned: assignedEns.size };
  }, [tree, allSavoirsFlat]);

  // ── derived: tree filter indices ──────────────────────────────────────────
  const treeFilteredIndices = useMemo(() => {
    if (!treeSearch.trim()) return null;
    const q = treeSearch.trim().toLowerCase();
    const visibleDi = new Set<number>();
    const visibleCi = new Set<string>();
    const visibleSci = new Set<string>();
    tree.forEach((d, di) => {
      const mD = d.nom.toLowerCase().includes(q) || (d.code ?? "").toLowerCase().includes(q);
      (d.competences ?? []).forEach((c, ci) => {
        const mC = c.nom.toLowerCase().includes(q) || (c.code ?? "").toLowerCase().includes(q);
        let hasDirectSav = false;
        for (const s of c.savoirs ?? [])
          if (savoirMatchesQuery(s, q)) { hasDirectSav = true; break; }
        for (const [sci, sc] of (c.sousCompetences ?? []).entries()) {
          const mSc = sc.nom.toLowerCase().includes(q) || (sc.code ?? "").toLowerCase().includes(q);
          let hasSav = false;
          for (const s of sc.savoirs ?? [])
            if (savoirMatchesQuery(s, q)) { hasSav = true; break; }
          if (mD || mC || mSc || hasSav || hasDirectSav) {
            visibleDi.add(di);
            visibleCi.add(`${di}-${ci}`);
            visibleSci.add(`${di}-${ci}-${sci}`);
          }
        }
        if (mD || mC || hasDirectSav) { visibleDi.add(di); visibleCi.add(`${di}-${ci}`); }
      });
      if (mD) visibleDi.add(di);
    });
    return { visibleDi, visibleCi, visibleSci };
  }, [tree, treeSearch]);

  return {
    // state
    tree, setTree, treeSearch, setTreeSearch,
    editingNom, setEditingNom,
    mergeModal, setMergeModal,
    mergeSrc, setMergeSrc,
    mergeDst, setMergeDst,
    // tree utilities
    updateTree,
    // create
    addDomaine, addCompetence, addSousCompetence, addSavoir,
    // rename
    startRename, commitRename,
    // delete
    deleteSavoir, deleteSC, deleteComp, deleteDomaine,
    // modify
    toggleType, setNiveau, toggleEnsAssign, setEnseignants,
    clearAllAssignments, remapInTree,
    // merge
    openMerge, confirmMerge,
    // derived
    allSavoirsFlat, liveStats, treeFilteredIndices,
  };
}
