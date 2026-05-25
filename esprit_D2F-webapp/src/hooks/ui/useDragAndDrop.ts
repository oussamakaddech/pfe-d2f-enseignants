// Custom hook that owns all HTML5 drag-and-drop state and event handlers
// for the RICE step-2 review panel.
//
// Two drag scenarios are supported:
//   1. Assign   – drag a SavoirCard (left panel) → drop on an enseignant (right)
//   2. Transfer – drag an assigned savoir TAG (right panel) → drop on another enseignant

import { useState, useRef, useCallback } from "react";

export function useDragAndDrop({ tree, toggleEnsAssign, updateTree, effectiveEnseignants, msgApi }) {
  const dragInfo = useRef(null);
  const [dragOverEns, setDragOverEns] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedSavoirInfo, setDraggedSavoirInfo] = useState(null); // { nom, type, … }

  // ── low-level accessor (duplicated here to avoid circular deps) ────────────
  const getSavoir = (t, di, ci, sci, si) => {
    if (sci === -1) return t[di].competences[ci].savoirs[si];
    return t[di].competences[ci].sousCompetences[sci].savoirs[si];
  };

  // ── drag START from a SavoirCard (assign scenario) ────────────────────────
  const onSavoirDragStart = useCallback(
    (e, di, ci, sci, si) => {
      const savoir = sci === -1
        ? tree[di]?.competences?.[ci]?.savoirs?.[si]
        : tree[di]?.competences?.[ci]?.sousCompetences?.[sci]?.savoirs?.[si];
      const info = {
        di, ci, sci, si,
        nom: savoir?.nom ?? "",
        type: savoir?.type ?? "THEORIQUE",
      };
      dragInfo.current = info;
      setDraggedSavoirInfo(info);
      setIsDragging(true);
      try {
        e.dataTransfer.setData("application/json", JSON.stringify(info));
        e.dataTransfer.effectAllowed = "move";
      } catch { /* ignore – Firefox may block setData in some contexts */ }
    },
    [tree],
  );

  // ── drag END (both scenarios) ──────────────────────────────────────────────
  const onSavoirDragEnd = useCallback(() => {
    setIsDragging(false);
    setDraggedSavoirInfo(null);
    setDragOverEns(null);
    dragInfo.current = null;
  }, []);

  // ── drag START from an assigned savoir TAG (transfer scenario) ────────────
  const onTagDragStart = useCallback(
    (e, fromEnsId, s) => {
      e.stopPropagation(); // don't bubble to the parent SavoirCard draggable
      const info = {
        di: s.di, ci: s.ci, sci: s.sci, si: s.si,
        nom: s.nom, type: s.type,
        fromEnsId, // presence of fromEnsId marks this as MOVE operation
      };
      dragInfo.current = info;
      setDraggedSavoirInfo({ nom: s.nom, type: s.type });
      setIsDragging(true);
      try {
        e.dataTransfer.setData("application/json", JSON.stringify(info));
        e.dataTransfer.effectAllowed = "move";
      } catch { /* ignore */ }
    },
    [],
  );

  // ── drag OVER enseignant card ──────────────────────────────────────────────
  const onEnsDragOver = useCallback((e, ensId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverEns(ensId);
  }, []);

  // ── drag LEAVE enseignant card ─────────────────────────────────────────────
  const onEnsDragLeave = useCallback((e) => {
    // Only clear if we actually left the card (not just entering a child element)
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverEns(null);
    }
  }, []);

  // ── DROP on enseignant card ────────────────────────────────────────────────
  const parseDropInfo = (e) => {
    let info = dragInfo.current;
    if (!info) {
      try { info = JSON.parse(e.dataTransfer.getData("application/json")); }
      catch { return null; }
    }
    return info;
  };

  const resolveEnsName = useCallback((ensObj, fallback) => {
    if (!ensObj) return fallback;
    return ensObj.prenom ? `${ensObj.prenom} ${ensObj.nom}` : ensObj.nom;
  }, []);

  const handleMove = useCallback((info, di, ci, sci, si, ensId, ensName) => {
    updateTree((t) => {
      const s = getSavoir(t, di, ci, sci, si);
      if (!s.enseignantsSuggeres) s.enseignantsSuggeres = [];
      const srcIdx = s.enseignantsSuggeres.indexOf(info.fromEnsId);
      if (srcIdx !== -1) s.enseignantsSuggeres.splice(srcIdx, 1);
      if (!s.enseignantsSuggeres.includes(ensId)) s.enseignantsSuggeres.push(ensId);
    });
    const srcObj = effectiveEnseignants.find(
      (en) => String(en.id ?? en.enseignantId) === info.fromEnsId,
    );
    const srcName = resolveEnsName(srcObj, info.fromEnsId);
    msgApi.success(`« ${info.nom} » déplacé de ${srcName} → ${ensName}`);
  }, [updateTree, effectiveEnseignants, msgApi, resolveEnsName]);

  const onEnsDrop = useCallback(
    (e, ensId) => {
      e.preventDefault();
      setDragOverEns(null);
      setIsDragging(false);
      setDraggedSavoirInfo(null);

      const info = parseDropInfo(e);
      if (!info) return;

      const { di, ci, sci, si, nom } = info;
      dragInfo.current = null;

      const ensObj = effectiveEnseignants.find(
        (en) => String(en.id ?? en.enseignantId) === ensId,
      );

      if (ensObj?._fromExtraction && !ensObj?._matched) {
        msgApi.warning(
          `« ${ensObj?.nom ?? ensId} » n'est pas identifié en base — impossible d'assigner un savoir.`,
        );
        return;
      }

      const ensName = resolveEnsName(ensObj, ensId);

      if (info.fromEnsId && info.fromEnsId !== ensId) {
        handleMove(info, di, ci, sci, si, ensId, ensName);
      } else {
        toggleEnsAssign(di, ci, sci, si, ensId);
        msgApi.success(`« ${nom} » assigné à ${ensName}`);
      }
    },
    [toggleEnsAssign, updateTree, effectiveEnseignants, msgApi, handleMove, resolveEnsName],
  );

  return {
    dragOverEns,
    isDragging,
    draggedSavoirInfo,
    onSavoirDragStart,
    onSavoirDragEnd,
    onTagDragStart,
    onEnsDragOver,
    onEnsDragLeave,
    onEnsDrop,
  };
}




