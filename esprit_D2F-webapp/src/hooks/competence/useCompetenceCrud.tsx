import { useCallback, useMemo, useState } from "react";
import { Switch, Tag, Tooltip } from "antd";
import { ApartmentOutlined, BookOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import useAppNotification from "@/hooks/ui/useAppNotification";
import CompetenceService from "@/services/competence/CompetenceService";
import { NIVEAU_SAVOIR_OPTIONS, TYPE_SAVOIR_OPTIONS } from "@/utils/constants/competenceOptions";

function buildCompDeleteErrorMessage(sousCompsCount, savoirsDirectsCount) {
  const pl = (n, w) => `${n} ${w}${n > 1 ? 's' : ''}`;
  const scLabel = pl(sousCompsCount, 'sous-compétence');
  const scRef = `${sousCompsCount > 1 ? 'ces' : 'cette'} sous-compétence${sousCompsCount > 1 ? 's' : ''}`;

  if (savoirsDirectsCount === 0) {
    return `Cette compétence contient ${scLabel}. Veuillez supprimer ${scRef} avant de supprimer la compétence. Les lignes de prérequis liées seront supprimées automatiquement.`;
  }

  const sdLabel = pl(savoirsDirectsCount, 'savoir') + `${savoirsDirectsCount > 1 ? 's direct' : ' direct'}`;
  const sdRef = `${savoirsDirectsCount > 1 ? 'ces' : 'ce'} savoir${savoirsDirectsCount > 1 ? 's' : ''} direct${savoirsDirectsCount > 1 ? 's' : ''}`;
  return `Cette compétence contient ${scLabel} et ${sdLabel}. Veuillez supprimer ${scRef} et ${sdRef} avant de supprimer la compétence. Les lignes de prérequis liées seront supprimées automatiquement.`;
}

function countSousComp(nodes) {
  return (nodes ?? []).reduce((sum, node) => sum + 1 + countSousComp(node.enfants), 0);
}

export default function useCompetenceCrud() {
  const { message: msgApi } = useAppNotification();
  const qc = useQueryClient();

  const [domaineModal, setDomaineModal] = useState(false);
  const [editingDomaine, setEditingDomaine] = useState(null);

  const [compModal, setCompModal] = useState(false);
  const [editingComp, setEditingComp] = useState(null);

  const [scModal, setScModal] = useState(false);
  const [editingSc, setEditingSc] = useState(null);
  const [scCreateTarget, setScCreateTarget] = useState(null);

  const [savoirModal, setSavoirModal] = useState(false);
  const [editingSavoir, setEditingSavoir] = useState(null);
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

  const domaineMutation = useMutation({
    mutationFn: ({ id, payload }) =>
      id ? CompetenceService.domaine.update(id, payload) : CompetenceService.domaine.create(payload),
    onSuccess: (_, variables) => {
      msgApi.success(variables.id ? "Domaine mis à jour" : "Domaine créé");
      invalidateAfterDomainMutation();
    },
  });

  const domaineDeleteMutation = useMutation({
    mutationFn: (id) => CompetenceService.domaine.delete(id),
    onSuccess: () => {
      msgApi.success("Domaine supprimé");
      invalidateAfterDomainMutation();
      qc.invalidateQueries({ queryKey: ["competences"] });
    },
  });

  const domaineToggleActifMutation = useMutation({
    mutationFn: (id) => CompetenceService.domaine.toggleActif(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["domaines"] });
    },
  });

  const competenceMutation = useMutation({
    mutationFn: ({ id, domaineId, payload }) => {
      if (id) return CompetenceService.competence.update(id, payload);
      return CompetenceService.competence.create(domaineId, payload);
    },
    onSuccess: (_, variables) => {
      msgApi.success(variables.id ? "Compétence mise à jour" : "Compétence créée");
      invalidateAfterCompetenceMutation();
    },
  });

  const competenceDeleteMutation = useMutation({
    mutationFn: (id) => CompetenceService.competence.delete(id),
    onSuccess: () => {
      msgApi.success("Compétence supprimée");
      invalidateAfterCompetenceMutation();
      qc.invalidateQueries({ queryKey: ["sousCompetences"] });
      qc.invalidateQueries({ queryKey: ["domaines"] });
    },
  });

  const sousCompetenceMutation = useMutation({
    mutationFn: ({ id, payload, scCreateTarget }) => {
      if (id) return CompetenceService.sousCompetence.update(id, payload);
      if (scCreateTarget?.type === "sousCompetence") return CompetenceService.sousCompetence.createEnfant(scCreateTarget.id, payload);
      return CompetenceService.sousCompetence.create(payload.competenceId, payload);
    },
    onSuccess: (_, variables) => {
      msgApi.success(variables.id ? "Sous-compétence mise à jour" : "Sous-compétence créée");
      invalidateAfterScMutation();
    },
  });

  const sousCompetenceDeleteMutation = useMutation({
    mutationFn: (id) => CompetenceService.sousCompetence.delete(id),
    onSuccess: () => {
      msgApi.success("Sous-compétence supprimée");
      invalidateAfterScMutation();
    },
  });

  const savoirMutation = useMutation({
    mutationFn: ({ id, payload, savoirMode, sousCompetenceId, competenceId }) => {
      if (id) return CompetenceService.savoir.update(id, payload);
      if (savoirMode === "direct") return CompetenceService.savoir.createForCompetence(competenceId, payload);
      return CompetenceService.savoir.create(sousCompetenceId, payload);
    },
    onSuccess: (_, variables) => {
      msgApi.success(variables.id ? "Savoir mis à jour" : "Savoir créé");
      invalidateAfterSavoirMutation();
    },
  });

  const savoirDeleteMutation = useMutation({
    mutationFn: (id) => CompetenceService.savoir.delete(id),
    onSuccess: () => {
      msgApi.success("Savoir supprimé");
      invalidateAfterSavoirMutation();
    },
  });

  const openDomaineModal = useCallback((form, record = null) => {
    setEditingDomaine(record);
    form.setFieldsValue(
      record
        ? {
            code: record.code ?? "",
            nom: record.nom ?? record.nomDomaine ?? "",
            description: record.description ?? "",
            actif: record.actif ?? true,
            upId: record.upId ?? undefined,
            departementId: record.departementId ?? undefined,
          }
        : { code: "", nom: "", description: "", actif: true, upId: undefined, departementId: undefined }
    );
    setDomaineModal(true);
  }, []);

  const handleDomaineSubmit = useCallback(async (form) => {
    try {
      const values = await form.validateFields();
      const payload = {
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
      if (err?.errorFields) return;
      msgApi.error(err?.response?.data?.message || "Erreur lors de la sauvegarde");
    }
  }, [editingDomaine, domaineMutation, msgApi]);

  const handleDomaineDelete = useCallback(async (id) => {
    try {
      await domaineDeleteMutation.mutateAsync(id);
    } catch (err: unknown) {
      msgApi.error(err.response?.data?.message || "Erreur lors de la suppression");
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

  const openCompModal = useCallback((form, record = null) => {
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

  const handleCompSubmit = useCallback(async (form) => {
    try {
      const values = await form.validateFields();
      const { domaineId, prerequisiteManual, ...rest } = values;
      const payload = {
        ...rest,
        prerequisiteManual: (prerequisiteManual || "").trim() || null,
      };
      await competenceMutation.mutateAsync({
        id: editingComp?.id,
        domaineId: editingComp ? undefined : domaineId,
        payload,
      });
      setCompModal(false);
    } catch (err: unknown) {
      if (err?.errorFields) return;
      msgApi.error(err.response?.data?.message || "Erreur lors de la sauvegarde");
    }
  }, [editingComp, competenceMutation, msgApi]);

  const handleCompDelete = useCallback(async (id) => {
    const sousCompsCount = (sousCompsQuery.data ?? []).filter(sc => String(sc.competenceId) === String(id)).length;
    const savoirsDirectsCount = (savoirsQuery.data ?? []).filter(s => String(s.competenceId) === String(id) && !s.sousCompetenceId).length;

    if (sousCompsCount > 0 || savoirsDirectsCount > 0) {
      msgApi.error(buildCompDeleteErrorMessage(sousCompsCount, savoirsDirectsCount));
      return;
    }

    try {
      await competenceDeleteMutation.mutateAsync(id);
    } catch (err: unknown) {
      msgApi.error(err.response?.data?.message || "Erreur lors de la suppression");
    }
  }, [competenceDeleteMutation, msgApi, sousCompsQuery.data, savoirsQuery.data]);

  const openScModal = useCallback((form, target = null, record = null) => {
    setEditingSc(record ?? null);
    setScCreateTarget(record ? null : target);

    const isParentSousComp = target?.type === "sousCompetence";
    const targetCompetenceId = target?.competenceId ?? target?.id ?? null;
    const splitCode = (code = "") => {
      const idx = code.lastIndexOf(".");
      if (idx === -1) return { codePrefix: "", codeSuffix: code };
      return {
        codePrefix: code.slice(0, idx + 1),
        codeSuffix: code.slice(idx + 1),
      };
    };
    const buildCreatePrefix = (parentCode) => (parentCode ? `${parentCode}.` : "");
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

  const handleScSubmit = useCallback(async (form) => {
    try {
      const values = await form.validateFields();
      const { competenceId, codePrefix, codeSuffix, ...rest } = values;
      const payload = {
        ...rest,
        code: `${codePrefix ?? ""}${codeSuffix ?? ""}`,
      };
      await sousCompetenceMutation.mutateAsync({
        id: editingSc?.id,
        payload,
        scCreateTarget,
      });
      setScModal(false);
      setScCreateTarget(null);
    } catch (err: unknown) {
      if (err?.errorFields) return;
      msgApi.error(err.response?.data?.message || "Erreur lors de la sauvegarde");
    }
  }, [editingSc, scCreateTarget, sousCompetenceMutation, msgApi]);

  const handleScDelete = useCallback(async (id) => {
    try {
      await sousCompetenceDeleteMutation.mutateAsync(id);
    } catch (err: unknown) {
      msgApi.error(err.response?.data?.message || "Erreur lors de la suppression");
    }
  }, [sousCompetenceDeleteMutation, msgApi]);

  const openSavoirModal = useCallback((form, record = null, targetSousComp = null) => {
    setEditingSavoir(record);
    let detectedMode = "sc";
    if (record) detectedMode = record.sousCompetenceId ? "sc" : "direct";
    setSavoirMode(detectedMode);

    const splitCode = (code = "") => {
      const idx = code.lastIndexOf("-");
      if (idx === -1) return { codePrefix: "", codeSuffix: code };
      return {
        codePrefix: code.slice(0, idx + 1),
        codeSuffix: code.slice(idx + 1),
      };
    };

    const buildCreatePrefix = (sourceObj) => {
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

  const flattenSousComps = useCallback((list) => {
    const acc = [];
    const walk = (items) => {
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
    const unique = new Map();
    flat.forEach((sc) => {
      if (!unique.has(sc.id)) unique.set(sc.id, sc);
    });
    return Array.from(unique.values()).filter((sc) => !sc.enfants || sc.enfants.length === 0);
  }, [flattenSousComps, sousCompsQuery.data]);

  const handleSavoirSubmit = useCallback(async (form) => {
    try {
      const values = await form.validateFields();
      const { sousCompetenceId, competenceId, codePrefix, codeSuffix, ...rest } = values;
      const payload = {
        ...rest,
        code: `${codePrefix ?? ""}${codeSuffix ?? ""}`,
      };
      await savoirMutation.mutateAsync({
        id: editingSavoir?.id,
        payload,
        savoirMode,
        sousCompetenceId,
        competenceId,
      });
      setSavoirModal(false);
    } catch (err: unknown) {
      if (err?.errorFields) return;
      msgApi.error(err.response?.data?.message || "Erreur lors de la sauvegarde");
    }
  }, [editingSavoir, savoirMode, savoirMutation, msgApi]);

  const handleSavoirDelete = useCallback(async (id) => {
    try {
      await savoirDeleteMutation.mutateAsync(id);
    } catch (err: unknown) {
      msgApi.error(err.response?.data?.message || "Erreur lors de la suppression");
    }
  }, [savoirDeleteMutation, msgApi]);

  const domaineColumns = useMemo(() => [
    { title: "Code", dataIndex: "code", key: "code", width: 130 },
    { title: "Nom", dataIndex: "nom", key: "nom", sorter: (a, b) => a.nom.localeCompare(b.nom) },
    { title: "Description", dataIndex: "description", key: "description", ellipsis: true },
    {
      title: "Actif",
      dataIndex: "actif",
      key: "actif",
      width: 80,
      render: (actif, record) => (
        <Switch
          checked={actif}
          size="small"
          onChange={async () => {
            domaineToggleActifMutation.mutate(record.id);
          }}
        />
      ),
    },
    {
      title: "Compétences",
      key: "nbComp",
      width: 110,
      render: (_, record) => <Tag color="blue">{record.competences?.length ?? 0}</Tag>,
    },
  ], [domaineToggleActifMutation]);

  const compColumns = useMemo(() => [
    {
      title: "",
      key: "hint",
      width: 30,
      render: () => (
        <Tooltip title="Déplier pour voir les compétences filles">
          <ApartmentOutlined style={{ color: "#d9d9d9" }} />
        </Tooltip>
      ),
    },
    { title: "Code", dataIndex: "code", key: "code", width: 100 },
    { title: "Nom", dataIndex: "nom", key: "nom", sorter: (a, b) => a.nom.localeCompare(b.nom) },
    { title: "Description", dataIndex: "description", key: "description", ellipsis: true },
    {
      title: "Domaine",
      dataIndex: "domaineNom",
      key: "domaineNom",
      filters: (domainesQuery.data ?? []).map((d) => ({ text: d.nom, value: d.nom })),
      onFilter: (v, r) => r.domaineNom === v,
    },
    {
      title: "Structure",
      key: "structure",
      width: 140,
      render: (_, r) => {
        const nbSc = countSousComp(r.sousCompetences);
        const nbDirectFromComp = r.savoirs?.length ?? 0;
        const nbDirectFromList = (savoirsQuery.data ?? []).filter(
          (s) => String(s.competenceId) === String(r.id) && !s.sousCompetenceId,
        ).length;
        const nbDirect = nbDirectFromComp || nbDirectFromList;
        return nbSc > 0
          ? <Tag color="geekblue" icon={<ApartmentOutlined />}>{nbSc} filles</Tag>
          : <Tag color="gold" icon={<BookOutlined />}>{nbDirect} directs</Tag>;
      },
    },
  ], [domainesQuery.data, savoirsQuery.data]);

  const savoirColumns = useMemo(() => [
    { title: "Code", dataIndex: "code", key: "code", width: 100 },
    { title: "Nom", dataIndex: "nom", key: "nom", sorter: (a, b) => a.nom.localeCompare(b.nom) },
    { title: "Description", dataIndex: "description", key: "description", ellipsis: true },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      width: 110,
      render: (type) => <Tag color={type === "THEORIQUE" ? "purple" : "orange"}>{type}</Tag>,
      filters: TYPE_SAVOIR_OPTIONS.map((t) => ({ text: t, value: t })),
      onFilter: (v, r) => r.type === v,
    },
    {
      title: "Niveau",
      dataIndex: "niveau",
      key: "niveau",
      width: 140,
      render: (niveau) => {
        const opt = NIVEAU_SAVOIR_OPTIONS.find((n) => n.value === niveau);
        return opt ? <Tag color={opt.color}>{opt.label}</Tag> : <Tag>{niveau ?? "-"}</Tag>;
      },
      filters: NIVEAU_SAVOIR_OPTIONS.map((n) => ({ text: n.label, value: n.value })),
      onFilter: (v, r) => r.niveau === v,
    },
    {
      title: "Rattachement",
      key: "rattachement",
      render: (_, record) => {
        if (record.sousCompetenceNom) return <Tag color="cyan">SC: {record.sousCompetenceNom}</Tag>;
        if (record.competenceNom) return <Tag color="gold">Direct: {record.competenceNom}</Tag>;
        return <Tag>-</Tag>;
      },
    },
  ], []);

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
