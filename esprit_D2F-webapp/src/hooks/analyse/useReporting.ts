import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { message } from "antd";
import AnalyticsService from "@/services/analyse/AnalyticsService";
import type {
  AnalyticsDepartementResponse, AnalyticsUP,
  EnseignantsInactifsParams, EnseignantsInactifsResponse,
  ExportExcelType, ExportPdfType,
  FormationsParPeriodeParams, FormationsParPeriodeResponse,
} from "@/models/analyse/reporting";

/** Déclenche le téléchargement navigateur d'un Blob. */
function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

// ── Feature 1 — Enseignants inactifs ─────────────────────────
export function useEnseignantsInactifs(params: EnseignantsInactifsParams) {
  return useQuery<EnseignantsInactifsResponse>({
    queryKey: ["analytics", "inactifs", params],
    queryFn: () => AnalyticsService.getEnseignantsSansFormation(params),
  });
}

// ── Feature 2 — Formations par période ───────────────────────
export function useFormationsParPeriode(params: FormationsParPeriodeParams) {
  return useQuery<FormationsParPeriodeResponse>({
    queryKey: ["analytics", "par-periode", params],
    queryFn: () => AnalyticsService.getFormationsParPeriode(params),
  });
}

// ── Feature 3 — Analyse par UP ───────────────────────────────
export function useFormationsParUp(opts: { annee?: number; departement?: string } = {}) {
  return useQuery<{ items: AnalyticsUP[] }>({
    queryKey: ["analytics", "par-up", opts],
    queryFn: () => AnalyticsService.getFormationsParUp(opts),
  });
}

// ── Feature 4 — Analyse par département ───────────────────────
export function useFormationsParDepartement(opts: { annee?: number } = {}) {
  return useQuery<AnalyticsDepartementResponse>({
    queryKey: ["analytics", "par-dept", opts],
    queryFn: () => AnalyticsService.getFormationsParDepartement(opts),
  });
}

// ── Feature 7 — Export (avec spinner) ────────────────────────
export function useAnalyticsExport() {
  const [exporting, setExporting] = useState(false);

  const exportExcel = useCallback(async (
    type: ExportExcelType,
    opts: { mois?: number; annee?: number; departement?: string; up?: string } = {},
  ) => {
    setExporting(true);
    try {
      const blob = await AnalyticsService.exportExcel(type, opts);
      downloadBlob(blob, `rapport_${type.toLowerCase()}.xlsx`);
    } catch {
      message.error("Échec de l'export Excel.");
    } finally {
      setExporting(false);
    }
  }, []);

  const exportPdf = useCallback(async (type: ExportPdfType, opts: { annee?: number } = {}) => {
    setExporting(true);
    try {
      const blob = await AnalyticsService.exportPdf(type, opts);
      downloadBlob(blob, `rapport_${type.toLowerCase()}.pdf`);
    } catch {
      message.error("Échec de l'export PDF.");
    } finally {
      setExporting(false);
    }
  }, []);

  return { exporting, exportExcel, exportPdf };
}
