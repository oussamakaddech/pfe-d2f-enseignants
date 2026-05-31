import { useEffect, useMemo, useState } from "react";
import { useSeancePresences, useBatchUpdatePresences, useMarkAllPresences } from "@/hooks/presence";
import useAppNotification from "@/hooks/ui/useAppNotification";
import { writeExcel, exportDateLabel, isoDate } from "utils/helpers/excelExport";
import type { PresenceRecord } from "../components/PresenceTableColumns";

export function usePresenceList(seanceId: number | string) {
  const { message: msgApi } = useAppNotification();
  const [presences, setPresences] = useState<PresenceRecord[]>([]);
  const [originalById, setOriginalById] = useState<Record<number, { presence: boolean; commentaire: string }>>({});
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const { data: rawPresences = [], isLoading: loading } = useSeancePresences(seanceId);
  const batchUpdateMut = useBatchUpdatePresences();
  const markAllMut = useMarkAllPresences();

  useEffect(() => {
    const list = Array.isArray(rawPresences) ? rawPresences : [];
    const normalized = list.map((p) => {
      const r = p as Record<string, unknown>;
      return { ...r, presence: typeof r.present === "boolean" ? r.present : !!r.presence } as PresenceRecord;
    });
    setPresences(normalized);
    const map: Record<number, { presence: boolean; commentaire: string }> = {};
    normalized.forEach((p) => {
      map[p.idParticipation] = { presence: p.presence, commentaire: p.commentaire || "" };
    });
    setOriginalById(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawPresences]);

  const togglePresence = (idParticipation: number, nextPresence: boolean) => {
    setPresences((prev) =>
      prev.map((p) =>
        p.idParticipation === idParticipation ? { ...p, presence: nextPresence } : p
      )
    );
  };

  const setCommentaire = (idParticipation: number, value: string) => {
    setPresences((prev) =>
      prev.map((p) =>
        p.idParticipation === idParticipation ? { ...p, commentaire: value } : p
      )
    );
  };

  const dirtyIds = useMemo(() => {
    return presences
      .filter((p) => {
        const o = originalById[p.idParticipation];
        if (!o) return false;
        return !!o.presence !== !!p.presence || (o.commentaire || "") !== (p.commentaire || "");
      })
      .map((p) => p.idParticipation);
  }, [presences, originalById]);

  const filtered = useMemo(() => {
    if (!search.trim()) return presences;
    const s = search.toLowerCase();
    return presences.filter((p) =>
      (p.enseignant?.nom || "").toLowerCase().includes(s) ||
      (p.enseignant?.prenom || "").toLowerCase().includes(s) ||
      (p.enseignant?.mail || "").toLowerCase().includes(s)
    );
  }, [presences, search]);

  const total = presences.length;
  const presents = useMemo(() => presences.filter((p) => p.presence).length, [presences]);
  const absents = total - presents;
  const taux = total === 0 ? 0 : Math.round((presents * 100) / total);

  const handleSave = async () => {
    if (dirtyIds.length === 0) { msgApi.info("Aucune modification à enregistrer"); return; }
    setSaving(true);
    try {
      const updates = presences
        .filter((p) => dirtyIds.includes(p.idParticipation))
        .map((p) => ({ idParticipation: p.idParticipation, present: !!p.presence, commentaire: p.commentaire || "" }));
      await batchUpdateMut.mutateAsync({ seanceId, updates });
      msgApi.success(`${dirtyIds.length} présence(s) enregistrée(s)`);
    } catch (err: unknown) {
      msgApi.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || "Erreur lors de l'enregistrement");
    } finally { setSaving(false); }
  };

  const handleMarkAll = async (present: boolean) => {
    setSaving(true);
    try {
      await markAllMut.mutateAsync({ seanceId, present });
      msgApi.success(present ? "Tous les enseignants marqués présents" : "Tous les enseignants marqués absents");
    } catch (err: unknown) {
      msgApi.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || "Erreur lors de l'opération groupée");
    } finally { setSaving(false); }
  };

  const exportExcel = () => {
    const rows = presences.map((p) => ({
      Nom: p.enseignant?.nom || "",
      Prénom: p.enseignant?.prenom || "",
      Email: p.enseignant?.mail || "",
      Type: (() => {
        const type = p.enseignant?.type;
        if (type === "P") return "Permanent";
        if (type === "V") return "Vacataire";
        return type || "";
      })(),
      Statut: p.presence ? "Présent" : "Absent",
      Commentaire: p.commentaire || "",
    }));
    writeExcel(
      [{ name: "Présences", rows, title: "Feuille de Présence — Esprit", subtitle: exportDateLabel() }],
      `presences_seance_${seanceId}_${isoDate()}.xlsx`
    );
    msgApi.success("Export Excel réussi");
  };

  return {
    presences, filtered, loading, saving, search, setSearch,
    dirtyIds, total, presents, absents, taux,
    togglePresence, setCommentaire, handleSave, handleMarkAll, exportExcel,
  };
}
