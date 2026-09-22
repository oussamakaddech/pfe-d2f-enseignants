import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import RiceService from '@/services/analyse/RiceService';
import type {
  RiceDomaine,
  RiceCompetence,
  RiceSousCompetence,
  RiceSavoir,
  EnseignantId,
} from '@/models/competence/riceTree';

interface MsgApi {
  success: (msg: string) => void;
  error: (msg: string) => void;
}

interface ImportReport {
  tauxCouvertureParDomaine?: Record<string, number>;
  affectationsCreated?: number;
  generatedAt?: string;
  domainesCreated?: number;
  competencesCreated?: number;
  sousCompetencesCreated?: number;
  savoirsCreated?: number;
  enseignantsCovered?: number;
  errors?: unknown[];
  importStats?: { errors?: unknown[] };
}

interface UseRiceReportProps {
  tree: RiceDomaine[];
  departement: string;
  msgApi: MsgApi;
  onImportSuccess?: (result: ImportReport) => void;
}

/** Un enseignant « réel » exclut les ajouts externes et manuels du RICE. */
const isRealEnseignantId = (id: EnseignantId): boolean =>
  !String(id).startsWith('ext_') && !String(id).startsWith('manual_');

// Helpers PURS : aucune dépendance à l'état du hook. Définis au niveau du
// module, ils gardent une identité stable d'un rendu à l'autre et n'ont donc
// pas à figurer dans les tableaux de dépendances des useCallback.
const countSavoirsInArray = (savoirs: RiceSavoir[] | undefined) => {
  let total = 0;
  let covered = 0;
  for (const s of savoirs ?? []) {
    total++;
    if ((s.enseignantsSuggeres ?? []).filter(isRealEnseignantId).length > 0) covered++;
  }
  return { total, covered };
};

const buildSavoirPayload = (savoirs: RiceSavoir[] | undefined) =>
  (savoirs ?? []).map((s: RiceSavoir) => ({
    code: s.code,
    nom: s.nom,
    description: s.description ?? null,
    type: s.type,
    niveau: s.niveau,
    enseignantIds: (s.enseignantsSuggeres ?? []).filter(isRealEnseignantId),
  }));

const buildSousCompetencePayload = (sc: RiceSousCompetence) => ({
  code: sc.code,
  nom: sc.nom,
  description: sc.description ?? null,
  savoirs: buildSavoirPayload(sc.savoirs),
});

const buildCompetencePayload = (c: RiceCompetence) => ({
  code: c.code,
  nom: c.nom,
  description: c.description ?? null,
  ordre: c.ordre ?? 1,
  savoirs: buildSavoirPayload(c.savoirs),
  sousCompetences: (c.sousCompetences ?? []).map(buildSousCompetencePayload),
});

export function useRiceReport({ tree, departement, msgApi, onImportSuccess }: UseRiceReportProps) {
  const [report, setReport] = useState<ImportReport | null>(null);
  const queryClient = useQueryClient();

  const computeClientCoverage = useCallback(() => {
    const result: Record<string, number> = {};
    for (const d of tree) {
      let total = 0;
      let covered = 0;
      for (const c of d.competences ?? []) {
        const allSavoirs = [
          ...(c.savoirs ?? []),
          ...(c.sousCompetences ?? []).flatMap((sc: RiceSousCompetence) => sc.savoirs ?? []),
        ];
        const r = countSavoirsInArray(allSavoirs);
        total += r.total;
        covered += r.covered;
      }
      if (total > 0) result[d.nom] = Math.round((covered * 1000) / total) / 10;
    }
    return result;
  }, [tree]);

  const importMutation = useMutation<ImportReport, Error, Record<string, unknown>>({
    mutationFn: (payload: Record<string, unknown>) =>
      RiceService.importToDb(payload) as Promise<ImportReport>,
  });

  const historyQuery = useQuery({
    queryKey: ['rice-import-history'],
    queryFn: () =>
      RiceService.getImportHistory().then((data: unknown) => (Array.isArray(data) ? data : [])),
    enabled: false,
    staleTime: 5 * 60 * 1000,
  });

  const setImportHistory = useCallback(
    (data: unknown) => {
      queryClient.setQueryData(['rice-import-history'], data);
    },
    [queryClient],
  );

  const handleImport = useCallback(async () => {
    const payload: Record<string, unknown> = {
      domaines: tree.map((d: RiceDomaine) => ({
        code: d.code,
        nom: d.nom,
        description: d.description ?? null,
        competences: (d.competences ?? []).map(buildCompetencePayload),
      })),
      departement: departement === 'auto' ? undefined : departement,
    };

    try {
      const result = await importMutation.mutateAsync(payload);
      const serverTaux = result.tauxCouvertureParDomaine;
      if (!serverTaux || Object.keys(serverTaux).length === 0) {
        result.tauxCouvertureParDomaine = computeClientCoverage();
      }
      msgApi.success(
        result.affectationsCreated != null && result.affectationsCreated > 0
          ? `Import réussi ! ${result.affectationsCreated} affectation(s) créée(s).`
          : 'Import réussi !',
      );
      setReport(result);
      if (onImportSuccess) onImportSuccess(result);
      queryClient.invalidateQueries({ queryKey: ['rice-import-history'] });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      msgApi.error(e.response?.data?.message ?? "Erreur lors de l'import en base");
    }
    // `departement` EST lu dans la charge utile et doit donc figurer ici.
    // L'omission ne produisait pas de bug visible car `importMutation` change
    // d'identite a chaque rendu et forcait deja la recreation du callback :
    // la justesse reposait sur une dependance instable, pas sur le code. Si
    // cette identite se stabilise, le callback figerait le departement du
    // rendu precedent et l'import partirait sur le mauvais perimetre.
  }, [
    tree,
    departement,
    computeClientCoverage,
    msgApi,
    onImportSuccess,
    importMutation,
    queryClient,
  ]);

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
    const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
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
