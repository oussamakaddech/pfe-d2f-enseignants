import { useCallback, useEffect, useMemo, useState } from "react";
import { ApartmentOutlined, BookOutlined } from "@ant-design/icons";
import { message, Switch, Tag, Tooltip } from "antd";
import CompetenceService from "../services/competenceFeatureApi";
import { NIVEAU_SAVOIR_OPTIONS, TYPE_SAVOIR_OPTIONS } from "../constants/competenceOptions";

export default function useCompetenceCrud({ onInvalidateStructure, onSavoirMutated, onSavoirsChanged }) {
  const [msgApi, msgCtx] = message.useMessage();

  const [domaines, setDomaines] = useState([]);
  const [domainesLoading, setDomainesLoading] = useState(false);
  const [domaineModal, setDomaineModal] = useState(false);
  const [editingDomaine, setEditingDomaine] = useState(null);

  const [competences, setCompetences] = useState([]);
  const [compLoading, setCompLoading] = useState(false);
  const [compModal, setCompModal] = useState(false);
  const [editingComp, setEditingComp] = useState(null);

  const [sousComps, setSousComps] = useState([]);
  const [scLoading, setScLoading] = useState(false);
  const [scModal, setScModal] = useState(false);
  const [editingSc, setEditingSc] = useState(null);
  const [scCreateTarget, setScCreateTarget] = useState(null);

  const [savoirs, setSavoirs] = useState([]);
  const [savoirsLoading, setSavoirsLoading] = useState(false);
  const [savoirModal, setSavoirModal] = useState(false);
  const [editingSavoir, setEditingSavoir] = useState(null);
  const [savoirMode, setSavoirMode] = useState("sc");

  const loadDomaines = useCallback(async () => {
    setDomainesLoading(true);
    try {
      const data = await CompetenceService.domaine.getAll();
      setDomaines(data);
    } catch (err) {
      console.error("[CompetencePage] loadDomaines error:", err?.response?.status, err?.message);
      msgApi.error(err?.response?.data?.message || "Erreur lors du chargement des domaines");
    } finally {
      setDomainesLoading(false);
    }
  }, [msgApi]);

  const loadCompetences = useCallback(async () => {
    setCompLoading(true);
    try {
      const data = await CompetenceService.competence.getAll();
      setCompetences(data);
    } catch (err) {
      console.error("[CompetencePage] loadCompetences error:", err?.response?.status, err?.message);
      msgApi.error(err?.response?.data?.message || "Erreur lors du chargement des compétences");
    } finally {
      setCompLoading(false);
    }
  }, [msgApi]);

  const loadSousCompetences = useCallback(async () => {
    setScLoading(true);
    try {
      const data = await CompetenceService.sousCompetence.getAll();
      setSousComps(data);
    } catch (err) {
      console.error("[CompetencePage] loadSousCompetences error:", err?.response?.status, err?.message);
      msgApi.error(err?.response?.data?.message || "Erreur lors du chargement des sous-compétences");
    } finally {
      setScLoading(false);
    }
  }, [msgApi]);

  const loadSavoirs = useCallback(async () => {
    setSavoirsLoading(true);
    try {
      const data = await CompetenceService.savoir.getAll();
      setSavoirs(data);
      if (onSavoirsChanged) onSavoirsChanged(data);
    } catch (err) {
      console.error("[CompetencePage] loadSavoirs error:", err?.response?.status, err?.message);
      msgApi.error(err?.response?.data?.message || "Erreur lors du chargement des savoirs");
    } finally {
      setSavoirsLoading(false);
    }
  }, [msgApi, onSavoirsChanged]);

  useEffect(() => {
    loadDomaines();
    loadCompetences();
    loadSousCompetences();
    loadSavoirs();
  }, [loadDomaines, loadCompetences, loadSousCompetences, loadSavoirs]);

  const openDomaineModal = useCallback((form, record = null) => {
    setEditingDomaine(record);
    form.setFieldsValue(record || { nom: "", description: "", actif: true });
    setDomaineModal(true);
  }, []);

  const handleDomaineSubmit = useCallback(async (form) => {
    try {
      const values = await form.validateFields();
      if (!editingDomaine) {
        values.code = values.nom
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, "_")
          .replace(/^_|_$/g, "")
          .substring(0, 30);
      } else {
        values.code = editingDomaine.code;
      }
      if (editingDomaine) {
        await CompetenceService.domaine.update(editingDomaine.id, values);
        msgApi.success("Domaine mis à jour");
      } else {
        await CompetenceService.domaine.create(values);
        msgApi.success("Domaine créé");
      }
      onInvalidateStructure();
      setDomaineModal(false);
      loadDomaines();
    } catch (err) {
      if (err?.errorFields) return;
      msgApi.error(err?.response?.data?.message || "Erreur lors de la sauvegarde");
    }
  }, [editingDomaine, loadDomaines, msgApi, onInvalidateStructure]);

  const handleDomaineDelete = useCallback(async (id) => {
    try {
      await CompetenceService.domaine.delete(id);
      msgApi.success("Domaine supprimé");
      onInvalidateStructure();
      loadDomaines();
      loadCompetences();
    } catch (err) {
      msgApi.error(err.response?.data?.message || "Erreur lors de la suppression");
    }
  }, [loadCompetences, loadDomaines, msgApi, onInvalidateStructure]);

  const splitDescriptionAndPrerequisites = useCallback((description) => {
    const marker = "Prerequis (manuel):";
    const raw = description || "";
    const idx = raw.indexOf(marker);
    if (idx === -1) {
      return { descriptionCore: raw, prerequisiteManual: "" };
    }

    const descriptionCore = raw.slice(0, idx).trimEnd();
    const prerequisiteManual = raw.slice(idx + marker.length).trim();
    return { descriptionCore, prerequisiteManual };
  }, []);

  const buildDescriptionWithPrerequisites = useCallback((descriptionCore, prerequisiteManual) => {
    const base = (descriptionCore || "").trim();
    const manual = (prerequisiteManual || "").trim();

    if (!manual) return base;
    return `${base ? `${base}\n\n` : ""}Prerequis (manuel):\n${manual}`;
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
      if (editingComp) {
        await CompetenceService.competence.update(editingComp.id, payload);
        msgApi.success("Compétence mise à jour");
      } else {
        await CompetenceService.competence.create(domaineId, payload);
        msgApi.success("Compétence créée");
      }
      onInvalidateStructure();
      setCompModal(false);
      loadCompetences();
    } catch (err) {
      if (err?.errorFields) return;
      msgApi.error(err.response?.data?.message || "Erreur lors de la sauvegarde");
    }
  }, [editingComp, loadCompetences, msgApi, onInvalidateStructure]);

  const handleCompDelete = useCallback(async (id) => {
    // Vérifier si la compétence a des sous-compétences ou savoirs
    const competence = competences.find(c => String(c.id) === String(id));
    const sousCompsCount = sousComps.filter(sc => String(sc.competenceId) === String(id)).length;
    const savoirsDirectsCount = savoirs.filter(s => String(s.competenceId) === String(id) && !s.sousCompetenceId).length;
    
    if (sousCompsCount > 0 || savoirsDirectsCount > 0) {
      const sousCompsText = `${sousCompsCount} sous-compétence${sousCompsCount > 1 ? 's' : ''}`;
      const savoirsText = savoirsDirectsCount > 0 
        ? `${savoirsDirectsCount} savoir${savoirsDirectsCount > 1 ? 's' : ''} direct${savoirsDirectsCount > 1 ? 's' : ''}`
        : 'aucun savoir direct';
      
      let message = `Cette compétence contient ${sousCompsText}`;
      if (savoirsDirectsCount > 0) {
        message += ` et ${savoirsText}. Veuillez supprimer ${sousCompsCount > 1 ? 'ces' : 'cette'} sous-compétence${sousCompsCount > 1 ? 's' : ''}`;
        message += ` et ${savoirsDirectsCount > 1 ? 'ces' : 'ce'} savoir${savoirsDirectsCount > 1 ? 's' : ''} direct${savoirsDirectsCount > 1 ? 's' : ''}`;
      } else {
        message += `. Veuillez supprimer ${sousCompsCount > 1 ? 'ces' : 'cette'} sous-compétence${sousCompsCount > 1 ? 's' : ''}`;
      }
      message += ` avant de supprimer la compétence. Les lignes de prérequis liées seront supprimées automatiquement.`;
      
      msgApi.error(message);
      return;
    }
    
    try {
      await CompetenceService.competence.delete(id);
      msgApi.success("Compétence supprimée");
      onInvalidateStructure();
      loadCompetences();
      loadSousCompetences();
      loadDomaines();
    } catch (err) {
      msgApi.error(err.response?.data?.message || "Erreur lors de la suppression");
    }
  }, [loadCompetences, loadDomaines, loadSousCompetences, msgApi, onInvalidateStructure, competences, sousComps, savoirs]);

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
      if (editingSc) {
        await CompetenceService.sousCompetence.update(editingSc.id, payload);
        msgApi.success("Sous-compétence mise à jour");
      } else {
        if (scCreateTarget?.type === "sousCompetence") {
          await CompetenceService.sousCompetence.createEnfant(scCreateTarget.id, payload);
        } else {
          await CompetenceService.sousCompetence.create(competenceId, payload);
        }
        msgApi.success("Sous-compétence créée");
      }
      onInvalidateStructure();
      setScModal(false);
      setScCreateTarget(null);
      loadSousCompetences();
      loadCompetences();
    } catch (err) {
      if (err?.errorFields) return;
      msgApi.error(err.response?.data?.message || "Erreur lors de la sauvegarde");
    }
  }, [editingSc, loadCompetences, loadSousCompetences, msgApi, onInvalidateStructure, scCreateTarget]);

  const handleScDelete = useCallback(async (id) => {
    try {
      await CompetenceService.sousCompetence.delete(id);
      msgApi.success("Sous-compétence supprimée");
      onInvalidateStructure();
      loadSousCompetences();
      loadSavoirs();
      loadCompetences();
    } catch (err) {
      msgApi.error(err.response?.data?.message || "Erreur lors de la suppression");
    }
  }, [loadCompetences, loadSavoirs, loadSousCompetences, msgApi, onInvalidateStructure]);

  const openSavoirModal = useCallback((form, record = null, targetSousComp = null) => {
    setEditingSavoir(record);
    const detectedMode = record ? (record.sousCompetenceId ? "sc" : "direct") : "sc";
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
      codeSuffix = "";
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
    const flat = flattenSousComps(sousComps);
    const unique = new Map();
    flat.forEach((sc) => {
      if (!unique.has(sc.id)) unique.set(sc.id, sc);
    });
    return Array.from(unique.values()).filter((sc) => !sc.enfants || sc.enfants.length === 0);
  }, [flattenSousComps, sousComps]);

  const handleSavoirSubmit = useCallback(async (form) => {
    try {
      const values = await form.validateFields();
      const { sousCompetenceId, competenceId, codePrefix, codeSuffix, ...rest } = values;
      const payload = {
        ...rest,
        code: `${codePrefix ?? ""}${codeSuffix ?? ""}`,
      };
      if (editingSavoir) {
        await CompetenceService.savoir.update(editingSavoir.id, payload);
        msgApi.success("Savoir mis à jour");
      } else {
        if (savoirMode === "direct") {
          await CompetenceService.savoir.createForCompetence(competenceId, payload);
        } else {
          await CompetenceService.savoir.create(sousCompetenceId, payload);
        }
        msgApi.success("Savoir créé");
      }
      onInvalidateStructure();
      setSavoirModal(false);
      loadSavoirs();
      loadSousCompetences();
      if (savoirMode === "direct") loadCompetences();
      if (onSavoirMutated) onSavoirMutated();
    } catch (err) {
      msgApi.error(err.response?.data?.message || "Erreur lors de la sauvegarde");
    }
  }, [editingSavoir, loadCompetences, loadSavoirs, loadSousCompetences, msgApi, onInvalidateStructure, onSavoirMutated, savoirMode]);

  const handleSavoirDelete = useCallback(async (id) => {
    try {
      await CompetenceService.savoir.delete(id);
      msgApi.success("Savoir supprimé");
      onInvalidateStructure();
      loadSavoirs();
      loadSousCompetences();
      loadCompetences();
      if (onSavoirMutated) onSavoirMutated();
    } catch (err) {
      msgApi.error(err.response?.data?.message || "Erreur lors de la suppression");
    }
  }, [loadCompetences, loadSavoirs, loadSousCompetences, msgApi, onInvalidateStructure, onSavoirMutated]);

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
            try {
              await CompetenceService.domaine.toggleActif(record.id);
              loadDomaines();
            } catch {
              msgApi.error("Erreur lors du changement de statut");
            }
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
  ], [loadDomaines, msgApi]);

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
      filters: domaines.map((d) => ({ text: d.nom, value: d.nom })),
      onFilter: (v, r) => r.domaineNom === v,
    },
    {
      title: "Structure",
      key: "structure",
      width: 140,
      render: (_, r) => {
        const countSousComp = (nodes) => (nodes ?? []).reduce(
          (sum, node) => sum + 1 + countSousComp(node.enfants),
          0,
        );
        const nbSc = countSousComp(r.sousCompetences);
        const nbDirectFromComp = r.savoirs?.length ?? 0;
        const nbDirectFromList = savoirs.filter(
          (s) => String(s.competenceId) === String(r.id) && !s.sousCompetenceId,
        ).length;
        const nbDirect = nbDirectFromComp || nbDirectFromList;
        return nbSc > 0
          ? <Tag color="geekblue" icon={<ApartmentOutlined />}>{nbSc} filles</Tag>
          : <Tag color="gold" icon={<BookOutlined />}>{nbDirect} directs</Tag>;
      },
    },
  ], [domaines, savoirs]);

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
    msgCtx,
    domaines,
    domainesLoading,
    domaineModal,
    editingDomaine,
    competences,
    compLoading,
    compModal,
    editingComp,
    sousComps,
    scLoading,
    scModal,
    editingSc,
    savoirs,
    savoirsLoading,
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
    loadDomaines,
    loadCompetences,
    loadSousCompetences,
    loadSavoirs,
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
