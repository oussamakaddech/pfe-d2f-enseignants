// Custom hook that owns all HTML5 drag-and-drop state and event handlers
// for the RICE step-2 review panel.
//
// Two drag scenarios are supported:
//   1. Assign   – drag a SavoirCard (left panel) → drop on an enseignant (right)
//   2. Transfer – drag an assigned savoir TAG (right panel) → drop on another enseignant

import { useState, useRef, useCallback } from "react";
import type { MessageInstance } from "antd/es/message/interface";
import type { RiceDomaine, RiceSavoir } from "@/models/competence";

interface SavoirDragInfo {
  di: number;
  ci: number;
  sci: number;
  si: number;
  nom: string;
  type: string;
  fromEnsId?: string;
}

interface EnseignantRef {
  id?: string | number;
  enseignantId?: string | number;
  nom?: string;
  prenom?: string;
  _fromExtraction?: boolean;
  _matched?: boolean;
}

interface UseDragAndDropParams {
  tree: RiceDomaine[];
  toggleEnsAssign: (di: number, ci: number, sci: number, si: number, ensId: string) => void;
  updateTree: (updater: (t: RiceDomaine[]) => void) => void;
  effectiveEnseignants: EnseignantRef[];
  msgApi: MessageInstance;
}

const getSavoir = (t: RiceDomaine[], di: number, ci: number, sci: number, si: number): RiceSavoir | undefined => {
  if (sci === -1) return t[di]?.competences?.[ci]?.savoirs?.[si];
  return t[di]?.competences?.[ci]?.sousCompetences?.[sci]?.savoirs?.[si];
};

export function useDragAndDrop({ tree, toggleEnsAssign, updateTree, effectiveEnseignants, msgApi }: UseDragAndDropParams) {
  const dragInfo = useRef<SavoirDragInfo | null>(null);
  const [dragOverEns, setDragOverEns] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedSavoirInfo, setDraggedSavoirInfo] = useState<{ nom: string; type: string } | null>(null);

  // ── drag START from a SavoirCard (assign scenario) ────────────────────────
  const onSavoirDragStart = useCallback(
    (e: React.DragEvent, di: number, ci: number, sci: number, si: number) => {
      const savoir = sci === -1
        ? tree[di]?.competences?.[ci]?.savoirs?.[si]
        : tree[di]?.competences?.[ci]?.sousCompetences?.[sci]?.savoirs?.[si];
      const info: SavoirDragInfo = {
        di, ci, sci, si,
        nom: savoir?.nom ?? "",
        type: savoir?.type ?? "THEORIQUE",
      };
      dragInfo.current = info;
      setDraggedSavoirInfo({ nom: info.nom, type: info.type });
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
    (e: React.DragEvent, fromEnsId: string, s: SavoirDragInfo) => {
      e.stopPropagation();
      const info: SavoirDragInfo = {
        di: s.di, ci: s.ci, sci: s.sci, si: s.si,
        nom: s.nom, type: s.type,
        fromEnsId,
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
  const onEnsDragOver = useCallback((e: React.DragEvent, ensId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverEns(ensId);
  }, []);

  // ── drag LEAVE enseignant card ─────────────────────────────────────────────
  const onEnsDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverEns(null);
    }
  }, []);

  // ── DROP on enseignant card ────────────────────────────────────────────────
  const parseDropInfo = (e: React.DragEvent): SavoirDragInfo | null => {
    let info = dragInfo.current;
    if (!info) {
      try { info = JSON.parse(e.dataTransfer.getData("application/json")) as SavoirDragInfo; }
      catch { return null; }
    }
    return info;
  };

  const resolveEnsName = useCallback((ensObj: EnseignantRef | undefined, fallback: string) => {
    if (!ensObj) return fallback;
    return ensObj.prenom ? `${ensObj.prenom} ${ensObj.nom}` : (ensObj.nom ?? fallback);
  }, []);

  const handleMove = useCallback((info: SavoirDragInfo, di: number, ci: number, sci: number, si: number, ensId: string, ensName: string) => {
    updateTree((t) => {
      const s = getSavoir(t, di, ci, sci, si);
      if (!s) return;
      if (!s.enseignantsSuggeres) s.enseignantsSuggeres = [];
      const srcIdx = s.enseignantsSuggeres.indexOf(info.fromEnsId!);
      if (srcIdx !== -1) s.enseignantsSuggeres.splice(srcIdx, 1);
      if (!s.enseignantsSuggeres.includes(ensId)) s.enseignantsSuggeres.push(ensId);
    });
    const srcObj = effectiveEnseignants.find(
      (en) => String(en.id ?? en.enseignantId) === info.fromEnsId,
    );
    const srcName = resolveEnsName(srcObj, info.fromEnsId ?? "");
    msgApi.success(`« ${info.nom} » déplacé de ${srcName} → ${ensName}`);
  }, [updateTree, effectiveEnseignants, msgApi, resolveEnsName]);

  const onEnsDrop = useCallback(
    (e: React.DragEvent, ensId: string) => {
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
    [toggleEnsAssign, effectiveEnseignants, msgApi, handleMove, resolveEnsName],
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
