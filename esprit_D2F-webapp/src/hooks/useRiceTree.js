// src/hooks/useRiceTree.js
// Custom hook that owns the entire RICE competence tree state.
// Provides all mutation helpers (rename, delete, toggle type/niveau, assign,
// merge, etc.) and derived memos (allSavoirsFlat, liveStats, treeFilteredIndices).

import { useState, useCallback, useMemo } from "react";
import { useImmer } from "use-immer";
import { cloneDeep } from "../pages/competence/rice/constants.jsx";

// ── low-level accessor ────────────────────────────────────────────────────────
const getSavoir = (t, di, ci, sci, si) => {
  if (sci === -1) return t[di].competences[ci].savoirs[si];
  return t[di].competences[ci].sousCompetences[sci].savoirs[si];
};

export function useRiceTree(msgApi) {
  // ── core tree state ───────────────────────────────────────────────────────
  const [tree, setTree] = useImmer([]);
  const [treeSearch, setTreeSearch] = useState("");
  const [editingNom, setEditingNom] = useState(null);   // { path, value }
  const [mergeModal, setMergeModal] = useState(false);
  const [mergeSrc, setMergeSrc] = useState(null);
  const [mergeDst, setMergeDst] = useState(null);

  // ── generic updater (cloneDeep for immer compatibility) ───────────────────
  const updateTree = useCallback((updater) => {
    setTree((prev) => {
      const next = cloneDeep(prev);
      updater(next);
      return next;
    });
  }, [setTree]);

  // ── rename ────────────────────────────────────────────────────────────────
  const startRename = useCallback(
    (path, currentVal) => setEditingNom({ path, value: currentVal }),
    [],
  );

  const commitRename = useCallback(() => {
    if (!editingNom) return;
    const { path, value } = editingNom;
    updateTree((t) => {
      const [di, ci, sci, si] = path;
      if (si !== undefined) getSavoir(t, di, ci, sci, si).nom = value;
      else if (sci !== undefined) t[di].competences[ci].sousCompetences[sci].nom = value;
      else if (ci !== undefined) t[di].competences[ci].nom = value;
      else t[di].nom = value;
    });
    setEditingNom(null);
  }, [editingNom, updateTree]);

  // ── delete ────────────────────────────────────────────────────────────────
  const deleteSavoir = useCallback(
    (di, ci, sci, si) =>
      updateTree((t) => {
        if (sci === -1) t[di].competences[ci].savoirs.splice(si, 1);
        else t[di].competences[ci].sousCompetences[sci].savoirs.splice(si, 1);
      }),
    [updateTree],
  );
  const deleteSC = useCallback(
    (di, ci, sci) =>
      updateTree((t) => t[di].competences[ci].sousCompetences.splice(sci, 1)),
    [updateTree],
  );
  const deleteComp = useCallback(
    (di, ci) => updateTree((t) => t[di].competences.splice(ci, 1)),
    [updateTree],
  );
  const deleteDomaine = useCallback(
    (di) => updateTree((t) => t.splice(di, 1)),
    [updateTree],
  );

  // ── type / niveau ─────────────────────────────────────────────────────────
  const toggleType = useCallback(
    (di, ci, sci, si) =>
      updateTree((t) => {
        const s = getSavoir(t, di, ci, sci, si);
        s.type = s.type === "THEORIQUE" ? "PRATIQUE" : "THEORIQUE";
      }),
    [updateTree],
  );

  const setNiveau = useCallback(
    (di, ci, sci, si, niveau) =>
      updateTree((t) => { getSavoir(t, di, ci, sci, si).niveau = niveau; }),
    [updateTree],
  );

  // ── enseignant assignment ─────────────────────────────────────────────────
  const toggleEnsAssign = useCallback(
    (di, ci, sci, si, ensId) =>
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
    (di, ci, sci, si, ids) =>
      updateTree((t) => { getSavoir(t, di, ci, sci, si).enseignantsSuggeres = ids; }),
    [updateTree],
  );

  // ── clear all assignments ──────────────────────────────────────────────────
  const clearAllAssignments = useCallback(() => {
    updateTree((t) => {
      for (const d of t)
        for (const c of d.competences ?? [])
          for (const s of c.savoirs ?? [])
            s.enseignantsSuggeres = [];
      for (const d of t)
        for (const c of d.competences ?? [])
          for (const sc of c.sousCompetences ?? [])
            for (const s of sc.savoirs ?? [])
              s.enseignantsSuggeres = [];
    });
    msgApi.success("Toutes les affectations ont été supprimées — glissez les savoirs manuellement.");
  }, [updateTree, msgApi]);

  // ── remap enseignant ID in tree (called after identifing an ext_ teacher) ─
  const remapInTree = useCallback(
    (extId, realId) => {
      updateTree((t) => {
        for (const d of t)
          for (const c of d.competences ?? [])
            for (const s of c.savoirs ?? []) {
              if (!s.enseignantsSuggeres) continue;
              const idx = s.enseignantsSuggeres.indexOf(extId);
              if (idx !== -1) s.enseignantsSuggeres[idx] = realId;
            }
        for (const d of t)
          for (const c of d.competences ?? [])
            for (const sc of c.sousCompetences ?? [])
              for (const s of sc.savoirs ?? []) {
                if (!s.enseignantsSuggeres) continue;
                const idx = s.enseignantsSuggeres.indexOf(extId);
                if (idx !== -1) s.enseignantsSuggeres[idx] = realId;
              }
      });
    },
    [updateTree],
  );

  // ── merge ─────────────────────────────────────────────────────────────────
  const openMerge = useCallback(
    (di, ci, sci, si) => setMergeSrc({ di, ci, sci, si }),
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
      if (sci === -1) t[di].competences[ci].savoirs.splice(si, 1);
      else t[di].competences[ci].sousCompetences[sci].savoirs.splice(si, 1);
    });
    setMergeModal(false);
    setMergeSrc(null);
    setMergeDst(null);
    msgApi.success("Savoirs fusionnés avec succès");
  }, [mergeSrc, mergeDst, updateTree, msgApi]);

  // ── derived: flat savoir list ──────────────────────────────────────────────
  const allSavoirsFlat = useMemo(() => {
    const list = [];
    tree.forEach((d, di) => {
      (d.competences ?? []).forEach((c, ci) => {
        (c.savoirs ?? []).forEach((s, si) => {
          list.push({
            ...s,
            di, ci, sci: -1, si,
            domaineCode: d.code,
            domaineNom: d.nom,
            competenceCode: c.code,
            competenceNom: c.nom,
            sousCompetenceCode: null,
            sousCompetenceNom: null,
            label: `${d.nom} › ${c.nom} › ${s.nom}`,
          });
        });

        (c.sousCompetences ?? []).forEach((sc, sci) => {
          (sc.savoirs ?? []).forEach((s, si) => {
            list.push({
              ...s,
              di, ci, sci, si,
              domaineCode: d.code,
              domaineNom: d.nom,
              competenceCode: c.code,
              competenceNom: c.nom,
              sousCompetenceCode: sc.code,
              sousCompetenceNom: sc.nom,
              label: `${d.nom} › ${c.nom} › ${sc.nom} › ${s.nom}`,
            });
          });
        });
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
    const visibleDi = new Set();
    const visibleCi = new Set();
    const visibleSci = new Set();
    tree.forEach((d, di) => {
      const mD = d.nom.toLowerCase().includes(q) || (d.code ?? "").toLowerCase().includes(q);
      (d.competences ?? []).forEach((c, ci) => {
        const mC = c.nom.toLowerCase().includes(q) || (c.code ?? "").toLowerCase().includes(q);
        const hasDirectSav = (c.savoirs ?? []).some(
          (s) => s.nom.toLowerCase().includes(q) || s.code.toLowerCase().includes(q),
        );
        (c.sousCompetences ?? []).forEach((sc, sci) => {
          const mSc = sc.nom.toLowerCase().includes(q) || (sc.code ?? "").toLowerCase().includes(q);
          const hasSav = (sc.savoirs ?? []).some(
            (s) => s.nom.toLowerCase().includes(q) || s.code.toLowerCase().includes(q),
          );
          if (mD || mC || mSc || hasSav || hasDirectSav) {
            visibleDi.add(di);
            visibleCi.add(`${di}-${ci}`);
            visibleSci.add(`${di}-${ci}-${sci}`);
          }
        });
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
