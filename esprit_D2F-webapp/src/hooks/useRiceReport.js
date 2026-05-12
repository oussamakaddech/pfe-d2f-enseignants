// src/hooks/useRiceReport.js
// Custom hook that owns the Step-3 import/report state.
// Handles payload construction, the RiceService call, coverage fallback,
// and lazy-loading of import history.

import { useState, useCallback } from "react";
import RiceService from "../services/RiceService";

export function useRiceReport({ tree, departement, msgApi, onImportSuccess }) {
  const [importing, setImporting] = useState(false);
  const [report, setReport] = useState(null);
  const [importHistory, setImportHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const countSavoirsInArray = (savoirs) => {
    let total = 0;
    let covered = 0;
    for (const s of savoirs ?? []) {
      total++;
      const realIds = (s.enseignantsSuggeres ?? []).filter(
        (id) => !String(id).startsWith("ext_") && !String(id).startsWith("manual_"),
      );
      if (realIds.length > 0) covered++;
    }
    return { total, covered };
  };

  const buildSavoirPayload = (savoirs) => (savoirs ?? []).map((s) => ({
    code: s.code,
    nom: s.nom,
    description: s.description ?? null,
    type: s.type,
    niveau: s.niveau,
    enseignantIds: (s.enseignantsSuggeres ?? []).filter(
      (id) => !String(id).startsWith("ext_") && !String(id).startsWith("manual_"),
    ),
  }));

  // ── client-side coverage fallback ─────────────────────────────────────────
  // Used when the Java service returns empty tauxCouvertureParDomaine (old version).
  const computeClientCoverage = useCallback(() => {
    const result = {};
    for (const d of tree) {
      let total = 0;
      let covered = 0;
      for (const c of d.competences ?? []) {
        const allSavoirs = [
          ...(c.savoirs ?? []),
          ...(c.sousCompetences ?? []).flatMap((sc) => sc.savoirs ?? []),
        ];
        const r = countSavoirsInArray(allSavoirs);
        total += r.total;
        covered += r.covered;
      }
      if (total > 0) result[d.nom] = Math.round((covered * 1000) / total) / 10;
    }
    return result;
  }, [tree]);

  // ── import to DB ──────────────────────────────────────────────────────────
  const handleImport = useCallback(async () => {
    setImporting(true);
    try {
      const payload = {
        domaines: tree.map((d) => ({
          code: d.code,
          nom: d.nom,
          description: d.description ?? null,
          competences: (d.competences ?? []).map((c) => ({
            code: c.code,
            nom: c.nom,
            description: c.description ?? null,
            ordre: c.ordre ?? 1,
            savoirs: buildSavoirPayload(c.savoirs),
            sousCompetences: (c.sousCompetences ?? []).map((sc) => ({
              code: sc.code,
              nom: sc.nom,
              description: sc.description ?? null,
              savoirs: buildSavoirPayload(sc.savoirs),
            })),
          })),
        })),
      };

      const result = await RiceService.importToDb(payload);

      // Enrich with client-side coverage rate if the server didn't return any
      const serverTaux = result.tauxCouvertureParDomaine;
      if (!serverTaux || Object.keys(serverTaux).length === 0) {
        result.tauxCouvertureParDomaine = computeClientCoverage();
      }

      msgApi.success(
        result.affectationsCreated > 0
          ? `Import réussi ! ${result.affectationsCreated} affectation(s) créée(s).`
          : "Import réussi !",
      );
      setReport(result);
      if (onImportSuccess) onImportSuccess(result);
    } catch (err) {
      msgApi.error(
        err.response?.data?.message ?? "Erreur lors de l'import en base",
      );
    } finally {
      setImporting(false);
    }
  }, [tree, computeClientCoverage, msgApi, onImportSuccess]);

  // ── lazy-load import history ───────────────────────────────────────────────
  const loadImportHistory = useCallback(() => {
    setHistoryLoading(true);
    RiceService.getImportHistory()
      .then((data) => setImportHistory(Array.isArray(data) ? data : []))
      .catch(() => setImportHistory([]))
      .finally(() => setHistoryLoading(false));
  }, []);

  // ── expose CSV export helper ───────────────────────────────────────────────
  const exportReportJson = useCallback(() => {
    if (!report) return;
    const summary = {
      generatedAt: report.generatedAt,
      departement,
      domaines: report.domainesCreated,
      competences: report.competencesCreated,
      sousCompetences: report.sousCompetencesCreated,
      savoirs: report.savoirsCreated,
      affectations: report.affectationsCreated,
      enseignantsCovered: report.enseignantsCovered,
      tauxCouvertureParDomaine: report.tauxCouvertureParDomaine,
    };
    const blob = new Blob([JSON.stringify(summary, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rice_rapport_${departement}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [report, departement]);

  return {
    importing, report, setReport,
    importHistory, setImportHistory,
    historyLoading,
    handleImport,
    loadImportHistory,
    computeClientCoverage,
    exportReportJson,
  };
}
