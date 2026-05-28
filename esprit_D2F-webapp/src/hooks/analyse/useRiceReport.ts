import { useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import RiceService from "@/services/analyse/RiceService";

export function useRiceReport({ tree, departement, msgApi, onImportSuccess }: any) {
  const [report, setReport] = useState<any>(null);
  const queryClient = useQueryClient();

  const countSavoirsInArray = (savoirs: any) => {
    let total = 0;
    let covered = 0;
    for (const s of savoirs ?? []) {
      total++;
      const realIds = (s.enseignantsSuggeres ?? []).filter(
        (id: any) => !String(id).startsWith("ext_") && !String(id).startsWith("manual_"),
      );
      if (realIds.length > 0) covered++;
    }
    return { total, covered };
  };

  const buildSavoirPayload = (savoirs: any) => (savoirs ?? []).map((s: any) => ({
    code: s.code,
    nom: s.nom,
    description: s.description ?? null,
    type: s.type,
    niveau: s.niveau,
    enseignantIds: (s.enseignantsSuggeres ?? []).filter(
      (id: any) => !String(id).startsWith("ext_") && !String(id).startsWith("manual_"),
    ),
  }));

  const computeClientCoverage = useCallback(() => {
    const result = {};
    for (const d of tree) {
      let total = 0;
      let covered = 0;
      for (const c of (d.competences ?? [])) {
        const allSavoirs = [
          ...(c.savoirs ?? []),
          ...(c.sousCompetences ?? []).flatMap((sc: any) => sc.savoirs ?? []),
        ];
        const r = countSavoirsInArray(allSavoirs);
        total += r.total;
        covered += r.covered;
      }
      if (total > 0) (result as any)[d.nom] = Math.round((covered * 1000) / total) / 10;
    }
    return result;
  }, [tree]);

  const importMutation = useMutation<any, Error, any>({
    mutationFn: (payload: any) => RiceService.importToDb(payload),
  });

  const historyQuery = useQuery({
    queryKey: ["rice-import-history"],
    queryFn: () => RiceService.getImportHistory().then((data: any) => Array.isArray(data) ? data : []),
    enabled: false,
    staleTime: 5 * 60 * 1000,
  });

  const setImportHistory = useCallback((data: any) => {
    queryClient.setQueryData(["rice-import-history"], data);
  }, [queryClient]);

  const handleImport = useCallback(async () => {
    const payload = {
      domaines: tree.map((d: any) => ({
        code: d.code,
        nom: d.nom,
        description: d.description ?? null,
        competences: (d.competences ?? []).map((c: any) => ({
          code: c.code,
          nom: c.nom,
          description: c.description ?? null,
          ordre: c.ordre ?? 1,
          savoirs: buildSavoirPayload(c.savoirs),
          sousCompetences: (c.sousCompetences ?? []).map((sc: any) => ({
            code: sc.code,
            nom: sc.nom,
            description: sc.description ?? null,
            savoirs: buildSavoirPayload(sc.savoirs),
          })),
        })),
      })),
      departement: departement !== "auto" ? departement : undefined,
    };

    try {
      const result = await importMutation.mutateAsync(payload);
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
      queryClient.invalidateQueries({ queryKey: ["rice-import-history"] });
    } catch (err: unknown) {
      msgApi.error((err as any).response?.data?.message ?? "Erreur lors de l'import en base");
    }
  }, [tree, computeClientCoverage, msgApi, onImportSuccess, importMutation, queryClient]);

  const loadImportHistory = useCallback(() => {
    historyQuery.refetch();
  }, [historyQuery]);

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
    importing: importMutation.isPending,
    report,
    setReport,
    importHistory: historyQuery.data ?? null,
    setImportHistory,
    historyLoading: historyQuery.isFetching,
    handleImport,
    loadImportHistory,
    computeClientCoverage,
    exportReportJson,
  };
}




