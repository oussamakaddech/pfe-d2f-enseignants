import { useCallback, useMemo, useState } from "react";
import type { FormInstance, TableColumnsType } from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import useAppNotification from "@/hooks/ui/useAppNotification";
import CompetenceService from "@/services/competence/CompetenceService";
import { buildDomaineColumns, buildCompColumns, buildSavoirColumns } from "@/components/competence/columns/CompetenceColumns";
import type { Domaine, Competence, SousCompetence, Savoir } from "@/models/competence";
import type { Id } from "@/models/common";

interface ScTarget {
  type?: "sousCompetence" | "competence";
  id?: Id;
  competenceId?: Id;
  code?: string;
  nom?: string;
}

interface DomaineFormValues {
  code: string;
  nom: string;
  description: string;
  actif: boolean;
  upId?: Id;
  departementId?: Id;
}

interface CompetenceFormValues {
  code: string;
  nom: string;
  description: string;
  domaineId?: Id;
  prerequisiteManual?: string;
}

interface SousCompetenceFormValues {
  codePrefix: string;
  codeSuffix: string;
  nom: string;
  description: string;
  competenceId?: Id;
  parentNom?: string | null;
}

interface SavoirFormValues {
  codePrefix: string;
  codeSuffix: string;
  nom: string;
  description: string;
  type?: string | null;
  niveau?: string;
  sousCompetenceId?: Id | null;
  competenceId?: Id | null;
}

interface DomaineMutVars { id?: Id; payload: Partial<Domaine>; }
interface CompMutVars { id?: Id; domaineId?: Id; payload: Partial<Competence>; }
interface ScMutVars { id?: Id; payload: Partial<SousCompetence> & { competenceId?: Id; code?: string }; scCreateTarget: ScTarget | null; }
interface SavoirMutVars { id?: Id; payload: Partial<Savoir> & { code?: string }; savoirMode: string; sousCompetenceId?: Id; competenceId?: Id; }

const axisErrMsg = (err: unknown, fallback: string): string =>
  (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? fallback;

function buildCompDeleteErrorMessage(sousCompsCount: number, savoirsDirectsCount: number) {
  const pl = (n: number, w: string) => `${n} ${w}${n > 1 ? 's' : ''}`;
  const scLabel = pl(sousCompsCount, 'sous-compétence');
  const scRef = `${sousCompsCount > 1 ? 'ces' : 'cette'} sous-compétence${sousCompsCount > 1 ? 's' : ''}`;

  if (savoirsDirectsCount === 0) {
    return `Cette compétence contient ${scLabel}. Veuillez supprimer ${scRef} avant de supprimer la compétence. Les lignes de prérequis liées seront supprimées automatiquement.`;
  }

  const sdLabel = pl(savoirsDirectsCount, 'savoir') + `${savoirsDirectsCount > 1 ? 's direct' : ' direct'}`;
  const sdRef = `${savoirsDirectsCount > 1 ? 'ces' : 'ce'} savoir${savoirsDirectsCount > 1 ? 's' : ''} direct${savoirsDirectsCount > 1 ? 's' : ''}`;
  return `Cette compétence contient ${scLabel} et ${sdLabel}. Veuillez supprimer ${scRef} et ${sdRef} avant de supprimer la compétence. Les lignes de prérequis liées seront supprimées automatiquement.`;
}

export default function useCompetenceCrud() {
  const { message: msgApi } = useAppNotification();
  const qc = useQueryClient();

  const [domaineModal, setDomaineModal] = useState(false);
  const [editingDomaine, setEditingDomaine] = useState<Domaine | null>(null);

  const [compModal, setCompModal] = useState(false);
  const [editingComp, setEditingComp] = useState<Competence | null>(null);

  const [scModal, setScModal] = useState(false);
  const [editingSc, setEditingSc] = useState<SousCompetence | null>(null);
  const [scCreateTarget, setScCreateTarget] = useState<ScTarget | null>(null);

  const [savoirModal, setSavoirModal] = useState(false);
  const [editingSavoir, setEditingSavoir] = useState<Savoir | null>(null);
  const [savoirMode, setSavoirMode] = useState("sc");

  const domainesQuery = useQuery({
    queryKey: ["domaines"],
    queryFn: () => CompetenceService.domaine.getAll(),
  });

  const competencesQuery = useQuery({
    queryKey: ["competences"],
    queryFn: () => CompetenceService.competence.getAll(),
  });

  const sousCompsQuery = useQuery({
    queryKey: ["sousCompetences"],
    queryFn: () => CompetenceService.sousCompetence.getAll(),
  });

  const savoirsQuery = useQuery({
    queryKey: ["all-savoirs"],
    queryFn: () => CompetenceService.savoir.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  const invalidateAfterDomainMutation = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["domaines"] });
    qc.invalidateQueries({ queryKey: ["structure"] });
  }, [qc]);

  const invalidateAfterCompetenceMutation = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["competences"] });
    qc.invalidateQueries({ queryKey: ["structure"] });
  }, [qc]);

  const invalidateAfterScMutation = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["sousCompetences"] });
    qc.invalidateQueries({ queryKey: ["competences"] });
    qc.invalidateQueries({ queryKey: ["structure"] });
    qc.invalidateQueries({ queryKey: ["all-savoirs"] });
  }, [qc]);

  const invalidateAfterSavoirMutation = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["all-savoirs"] });
    qc.invalidateQueries({ queryKey: ["sousCompetences"] });
    qc.invalidateQueries({ queryKey: ["competences"] });
    qc.invalidateQueries({ queryKey: ["structure"] });
  }, [qc]);

  const domaineMutation = useMutation<Domaine, Error, DomaineMutVars>({
    mutationFn: ({ id, payload }) =>
      id ? CompetenceService.domaine.update(id, payload) : CompetenceService.domaine.create(payload),
    onSuccess: (_, variables) => {
      msgApi.success(variables.id ? "Domaine mis à jour" : "Domaine créé");
      invalidateAfterDomainMutation();
    },
  });

  const domaineDeleteMutation = useMutation<{ data: unknown }, Error, Id>({
    mutationFn: (id) => CompetenceService.domaine.delete(id),
    onSuccess: () => {
      msgApi.success("Domaine supprimé");
      invalidateAfterDomainMutation();
      qc.invalidateQueries({ queryKey: ["competences"] });
    },
  });

  const domaineToggleActifMutation = useMutation<Domaine, Error, Id>({
    mutationFn: (id) => CompetenceService.domaine.toggleActif(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["domaines"] });
    },
  });

  const competenceMutation = useMutation<Competence, Error, CompMutVars>({
    mutationFn: ({ id, domaineId, payload }) => {
      if (id) return CompetenceService.competence.update(id, payload);
      return CompetenceService.competence.create(domaineId!, payload);
    },
    onSuccess: (_, variables) => {
      msgApi.success(variables.id ? "Compétence mise à jour" : "Compétence créée");
      invalidateAfterCompetenceMutation();
    },
  });

  const competenceDeleteMutation = useMutation<{ data: unknown }, Error, Id>({
    mutationFn: (id) => CompetenceService.competence.delete(id),
    onSuccess: () => {
      msgApi.success("Compétence supprimée");
      invalidateAfterCompetenceMutation();
      qc.invalidateQueries({ queryKey: ["sousCompetences"] });
      qc.invalidateQueries({ queryKey: ["domaines"] });
    },
  });

  const sousCompetenceMutation = useMutation<SousCompetence, Error, ScMutVars>({
    mutationFn: ({ id, payload, scCreateTarget: target }) => {
      if (id) return CompetenceService.sousCompetence.update(id, payload);
      if (target?.type === "sousCompetence") return CompetenceService.sousCompetence.createEnfant(target.id!, payload);
      return CompetenceService.sousCompetence.create(payload.competenceId!, payload);
    },
    onSuccess: (_, variables) => {
      msgApi.success(variables.id ? "Sous-compétence mise à jour" : "Sous-compétence créée");
      invalidateAfterScMutation();
    },
  });

  const sousCompetenceDeleteMutation = useMutation<{ data: unknown }, Error, Id>({
    mutationFn: (id) => CompetenceService.sousCompetence.delete(id),
    onSuccess: () => {
      msgApi.success("Sous-compétence supprimée");
      invalidateAfterScMutation();
    },
  });

  const savoirMutation = useMutation<Savoir, Error, SavoirMutVars>({
    mutationFn: ({ id, payload, savoirMode: mode, sousCompetenceId, competenceId }) => {
      if (id) return CompetenceService.savoir.update(id, payload);
      if (mode === "direct") return CompetenceService.savoir.createForCompetence(competenceId!, payload);
      return CompetenceService.savoir.create(sousCompetenceId!, payload);
    },
    onSuccess: (_, variables) => {
      msgApi.success(variables.id ? "Savoir mis à jour" : "Savoir créé");
      invalidateAfterSavoirMutation();
    },
  });

  const savoirDeleteMutation = useMutation<{ data: unknown }, Error, Id>({
    mutationFn: (id) => CompetenceService.savoir.delete(id),
    onSuccess: () => {
      msgApi.success("Savoir supprimé");
      invalidateAfterSavoirMutation();
    },
  });

  const openDomaineModal = useCallback((form: FormInstance, record: Domaine | null = null) => {
    setEditingDomaine(record);
    form.setFieldsValue(
      record
        ? {
            code: record.code ?? "",
            nom: record.nom ?? "",
            description: record.description ?? "",
            actif: record.actif ?? true,
            upId: record.upId ?? undefined,
            departementId: record.departementId ?? undefined,
          }
        : { code: "", nom: "", description: "", actif: true, upId: undefined, departementId: undefined }
    );
    setDomaineModal(true);
  }, []);

  const handleDomaineSubmit = useCallback(async (form: FormInstance) => {
    try {
      const values = (await form.validateFields()) as DomaineFormValues;
      const payload: Partial<Domaine> = {
        code: (values.code ?? "").trim(),
        nom: (values.nom ?? "").trim(),
        description: (values.description ?? "").trim(),
        actif: values.actif ?? true,
        upId: values.upId,
        departementId: values.departementId,
      };
      await domaineMutation.mutateAsync({ id: editingDomaine?.id, payload });
      setDomaineModal(false);
    } catch (err: unknown) {
      if ((err as Record<string, unknown>)?.errorFields) return;
      msgApi.error(axisErrMsg(err, "Erreur lors de la sauvegarde"));
    }
  }, [editingDomaine, domaineMutation, msgApi]);

  const handleDomaineDelete = useCallback(async (id: Id) => {
    try {
      await domaineDeleteMutation.mutateAsync(id);
    } catch (err: unknown) {
      msgApi.error(axisErrMsg(err, "Erreur lors de la suppression"));
    }
  }, [domaineDeleteMutation, msgApi]);

  const splitDescriptionAndPrerequisites = useCallback((description = "") => {
    const marker = "Prerequis (manuel):";
    const idx = description.indexOf(marker);
    if (idx === -1) {
      return { descriptionCore: description, prerequisiteManual: "" };
    }

    const descriptionCore = description.slice(0, idx).trimEnd();
    const prerequisiteManual = description.slice(idx + marker.length).trim();
    return { descriptionCore, prerequisiteManual };
  }, []);

  const openCompModal = useCallback((form: FormInstance, record: Competence | null = null) => {
    setEditingComp(record);
    const { descriptionCore, prerequisiteManual } = splitDescriptionAndPrerequisites(record?.description);
    const effectivePrerequisiteManual = (record?.prerequisiteManual || "").trim() || prerequisiteManual;
    form.setFieldsValue(
      record
        ? {
          code: record.code,
          nom: record.nom,
          description: descriptionCore,
          domaineId: record.domaineId,
          prerequisiteManual: effectivePrerequisiteManual,
        }
        : { code: "", nom: "", description: "", domaineId: null, prerequisiteManual: "" }
    );
    setCompModal(true);
  }, [splitDescriptionAndPrerequisites]);

  const handleCompSubmit = useCallback(async (form: FormInstance) => {
    try {
      const values = (await form.validateFields()) as CompetenceFormValues;
      const { domaineId, prerequisiteManual, ...rest } = values;
      const payload: Partial<Competence> = {
        ...rest,
        prerequisiteManual: (prerequisiteManual || "").trim() || undefined,
      };
      await competenceMutation.mutateAsync({
        id: editingComp?.id,
        domaineId: editingComp ? undefined : domaineId,
        payload,
      });
      setCompModal(false);
    } catch (err: unknown) {
      if ((err as Record<string, unknown>)?.errorFields) return;
      msgApi.error(axisErrMsg(err, "Erreur lors de la sauvegarde"));
    }
  }, [editingComp, competenceMutation, msgApi]);

  const handleCompDelete = useCallback(async (id: Id) => {
    const sousCompsCount = (sousCompsQuery.data ?? []).filter(
      (sc) => String(sc.competenceId) === String(id),
    ).length;
    const savoirsDirectsCount = (savoirsQuery.data ?? []).filter(
      (s) => String(s.competenceId) === String(id) && !s.sousCompetenceId,
    ).length;

    if (sousCompsCount > 0 || savoirsDirectsCount > 0) {
      msgApi.error(buildCompDeleteErrorMessage(sousCompsCount, savoirsDirectsCount));
      return;
    }

    try {
      await competenceDeleteMutation.mutateAsync(id);
    } catch (err: unknown) {
      msgApi.error(axisErrMsg(err, "Erreur lors de la suppression"));
    }
  }, [competenceDeleteMutation, msgApi, sousCompsQuery.data, savoirsQuery.data]);

  const openScModal = useCallback((form: FormInstance, target: ScTarget | null = null, record: SousCompetence | null = null) => {
    setEditingSc(record ?? null);
    setScCreateTarget(record ? null : target);

    const isParentSousComp = target?.type === "sousCompetence";
    const targetCompetenceId = target?.competenceId ?? target?.id ?? null;
    const splitCode = (code = "") => {
      const idx = code.lastIndexOf(".");
      if (idx === -1) return { codePrefix: "", codeSuffix: code };
      return { codePrefix: code.slice(0, idx + 1), codeSuffix: code.slice(idx + 1) };
    };
    const buildCreatePrefix = (parentCode: string | undefined) => (parentCode ? `${parentCode}.` : "");
    const { codePrefix, codeSuffix } = record
      ? splitCode(record.code)
      : { codePrefix: buildCreatePrefix(target?.code), codeSuffix: "" };

    form.setFieldsValue(
      record
        ? {
          codePrefix,
          codeSuffix,
          nom: record.nom,
          description: record.description,
          competenceId: record.competenceId,
        }
        : {
          codePrefix,
          codeSuffix,
          nom: "",
          description: "",
          competenceId: targetCompetenceId,
          parentNom: isParentSousComp ? target?.nom : null,
        }
    );
    setScModal(true);
  }, []);

  const handleScSubmit = useCallback(async (form: FormInstance) => {
    try {
      const values = (await form.validateFields()) as SousCompetenceFormValues;
      const { competenceId, codePrefix, codeSuffix, ...rest } = values;
      const payload: Partial<SousCompetence> & { competenceId?: Id; code?: string } = {
        ...rest,
        competenceId,
        code: `${codePrefix ?? ""}${codeSuffix ?? ""}`,
      };
      await sousCompetenceMutation.mutateAsync({ id: editingSc?.id, payload, scCreateTarget });
      setScModal(false);
      setScCreateTarget(null);
    } catch (err: unknown) {
      if ((err as Record<string, unknown>)?.errorFields) return;
      msgApi.error(axisErrMsg(err, "Erreur lors de la sauvegarde"));
    }
  }, [editingSc, scCreateTarget, sousCompetenceMutation, msgApi]);

  const handleScDelete = useCallback(async (id: Id) => {
    try {
      await sousCompetenceDeleteMutation.mutateAsync(id);
    } catch (err: unknown) {
      msgApi.error(axisErrMsg(err, "Erreur lors de la suppression"));
    }
  }, [sousCompetenceDeleteMutation, msgApi]);

  const openSavoirModal = useCallback((form: FormInstance, record: Savoir | null = null, targetSousComp: SousCompetence | null = null) => {
    setEditingSavoir(record);
    let detectedMode = "sc";
    if (record) detectedMode = record.sousCompetenceId ? "sc" : "direct";
    setSavoirMode(detectedMode);

    const splitCode = (code = "") => {
      const idx = code.lastIndexOf("-");
      if (idx === -1) return { codePrefix: "", codeSuffix: code };
      return { codePrefix: code.slice(0, idx + 1), codeSuffix: code.slice(idx + 1) };
    };

    const buildCreatePrefix = (sourceObj: SousCompetence | null) => {
      if (!sourceObj) return "";
      return sourceObj.code ? `${sourceObj.code}-` : "";
    };

    let codePrefix = "";
    let codeSuffix = "";

    if (record) {
      const { codePrefix: cp, codeSuffix: cs } = splitCode(record.code);
      codePrefix = cp;
      codeSuffix = cs;
    } else if (targetSousComp) {
      codePrefix = buildCreatePrefix(targetSousComp);
    }

    form.setFieldsValue(
      record
        ? {
          codePrefix,
          codeSuffix,
          nom: record.nom,
          description: record.description,
          type: record.type,
          niveau: record.niveau,
          sousCompetenceId: record.sousCompetenceId ?? null,
          competenceId: record.competenceId ?? null,
        }
        : {
          codePrefix,
          codeSuffix,
          nom: "",
          description: "",
          type: null,
          niveau: "N2_ELEMENTAIRE",
          sousCompetenceId: targetSousComp?.id ?? null,
          competenceId: null,
        }
    );
    setSavoirModal(true);
  }, []);

  const flattenSousComps = useCallback((list: SousCompetence[]) => {
    const acc: SousCompetence[] = [];
    const walk = (items: SousCompetence[]) => {
      (items ?? []).forEach((item) => {
        acc.push(item);
        if (item.enfants?.length) walk(item.enfants);
      });
    };
    walk(list);
    return acc;
  }, []);

  const leafSousComps = useMemo(() => {
    const flat = flattenSousComps(sousCompsQuery.data ?? []);
    const unique = new Map<Id, SousCompetence>();
    flat.forEach((sc) => {
      if (sc.id !== undefined && !unique.has(sc.id)) unique.set(sc.id, sc);
    });
    return Array.from(unique.values()).filter((sc) => !sc.enfants || sc.enfants.length === 0);
  }, [flattenSousComps, sousCompsQuery.data]);

  const handleSavoirSubmit = useCallback(async (form: FormInstance) => {
    try {
      const values = (await form.validateFields()) as SavoirFormValues;
      const { sousCompetenceId, competenceId, codePrefix, codeSuffix, type, ...rest } = values;
      const payload: Partial<Savoir> & { code?: string } = {
        ...rest,
        type: type ?? undefined,
        code: `${codePrefix ?? ""}${codeSuffix ?? ""}`,
      };
      await savoirMutation.mutateAsync({
        id: editingSavoir?.id,
        payload,
        savoirMode,
        sousCompetenceId: sousCompetenceId ?? undefined,
        competenceId: competenceId ?? undefined,
      });
      setSavoirModal(false);
    } catch (err: unknown) {
      if ((err as Record<string, unknown>)?.errorFields) return;
      msgApi.error(axisErrMsg(err, "Erreur lors de la sauvegarde"));
    }
  }, [editingSavoir, savoirMode, savoirMutation, msgApi]);

  const handleSavoirDelete = useCallback(async (id: Id) => {
    try {
      await savoirDeleteMutation.mutateAsync(id);
    } catch (err: unknown) {
      msgApi.error(axisErrMsg(err, "Erreur lors de la suppression"));
    }
  }, [savoirDeleteMutation, msgApi]);

  const domaineColumns = useMemo<TableColumnsType<Domaine>>(
    () => buildDomaineColumns((id) => domaineToggleActifMutation.mutate(id)),
    [domaineToggleActifMutation],
  );

  const compColumns = useMemo<TableColumnsType<Competence>>(
    () => buildCompColumns(
      domainesQuery.data ?? [],
      (competenceId) => (savoirsQuery.data ?? []).filter(
        (s) => String(s.competenceId) === String(competenceId) && !s.sousCompetenceId,
      ).length,
    ),
    [domainesQuery.data, savoirsQuery.data],
  );

  const savoirColumns = useMemo<TableColumnsType<Savoir>>(
    () => buildSavoirColumns(),
    [],
  );

  return {
    domaines: domainesQuery.data ?? [],
    domainesLoading: domainesQuery.isLoading,
    domaineModal,
    editingDomaine,
    competences: competencesQuery.data ?? [],
    compLoading: competencesQuery.isLoading,
    compModal,
    editingComp,
    sousComps: sousCompsQuery.data ?? [],
    scLoading: sousCompsQuery.isLoading,
    scModal,
    editingSc,
    savoirs: savoirsQuery.data ?? [],
    savoirsLoading: savoirsQuery.isLoading,
    savoirModal,
    editingSavoir,
    savoirMode,
    setSavoirMode,
    setDomaineModal,
    setCompModal,
    setScModal,
    setSavoirModal,
    setEditingDomaine,
    setEditingComp,
    setEditingSc,
    setEditingSavoir,
    loadDomaines: () => domainesQuery.refetch(),
    loadCompetences: () => competencesQuery.refetch(),
    loadSousCompetences: () => sousCompsQuery.refetch(),
    loadSavoirs: () => savoirsQuery.refetch(),
    openDomaineModal,
    handleDomaineSubmit,
    handleDomaineDelete,
    domaineColumns,
    openCompModal,
    handleCompSubmit,
    handleCompDelete,
    compColumns,
    openScModal,
    handleScSubmit,
    handleScDelete,
    scCreateTarget,
    setScCreateTarget,
    leafSousComps,
    openSavoirModal,
    handleSavoirSubmit,
    handleSavoirDelete,
    savoirColumns,
    prerequisite: CompetenceService.prerequisite,
  };
}
