// src/pages/competence/CompetencePage.jsx
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import PropTypes from "prop-types";
import {
  Tabs,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Tag,
  Space,
  Typography,
  Popconfirm,
  message,
  Tooltip,
  Alert,
  Statistic,
  Row,
  Col,
  Card,
  Tree,
  Badge,
  Collapse,
  Empty,
  Descriptions,
  Spin,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ApartmentOutlined,
  CheckSquareOutlined,
  CloseOutlined,
  TeamOutlined,
  SearchOutlined,
  BookOutlined,
  BulbOutlined,
  ExperimentOutlined,
  FolderOpenOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import CompetenceService from "../../services/CompetenceService";

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

// ─── Types & niveaux ───────────────────────────────────────────────────────
const TYPE_SAVOIR_OPTIONS = ["THEORIQUE", "PRATIQUE"];

const NIVEAU_SAVOIR_OPTIONS = [
  { value: "N1_DEBUTANT",      label: "N1 – Débutant",      color: "default" },
  { value: "N2_ELEMENTAIRE",   label: "N2 – Élémentaire",   color: "blue" },
  { value: "N3_INTERMEDIAIRE", label: "N3 – Intermédiaire", color: "cyan" },
  { value: "N4_AVANCE",        label: "N4 – Avancé",        color: "green" },
  { value: "N5_EXPERT",        label: "N5 – Expert",        color: "gold" },
];

const NIVEAU_LABELS = {
  N1_DEBUTANT:      { label: "N1 – Débutant",      color: "#ff4d4f" },
  N2_ELEMENTAIRE:   { label: "N2 – Élémentaire",   color: "#fa8c16" },
  N3_INTERMEDIAIRE: { label: "N3 – Intermédiaire", color: "#fadb14" },
  N4_AVANCE:        { label: "N4 – Avancé",        color: "#52c41a" },
  N5_EXPERT:        { label: "N5 – Expert",        color: "#1890ff" },
};

const NIVEAU_OPTIONS = Object.entries(NIVEAU_LABELS).map(([key, val]) => ({
  value: key,
  label: val.label,
}));

// ─── Generic CRUD Tab component ────────────────────────────────────────────
function CrudTab({ columns, data, loading, onAdd, onEdit, onDelete, onBulkDelete, addLabel }) {
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [selectionMode, setSelectionMode] = useState(false);

  const selectedRows = data.filter((r) => selectedRowKeys.includes(r.id));
  const hasSelection = selectedRowKeys.length > 0;

  const toggleSelectionMode = () => {
    if (selectionMode) {
      setSelectedRowKeys([]);
    }
    setSelectionMode((prev) => !prev);
  };

  const handleBulkDelete = async () => {
    if (onBulkDelete) {
      await onBulkDelete(selectedRowKeys);
    } else {
      for (const id of selectedRowKeys) {
        await onDelete(id);
      }
    }
    setSelectedRowKeys([]);
    setSelectionMode(false);
  };

  const handleBulkEdit = () => {
    if (selectedRows.length === 1) {
      onEdit(selectedRows[0]);
      setSelectedRowKeys([]);
      setSelectionMode(false);
    }
  };

  const rowSelection = selectionMode
    ? {
        selectedRowKeys,
        onChange: (keys) => setSelectedRowKeys(keys),
        selections: [
          Table.SELECTION_ALL,
          Table.SELECTION_INVERT,
          Table.SELECTION_NONE,
        ],
      }
    : undefined;

  return (
    <div>
      <Space style={{ marginBottom: 16 }} wrap>
        <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
          {addLabel}
        </Button>
        <Button
          icon={selectionMode ? <CloseOutlined /> : <CheckSquareOutlined />}
          onClick={toggleSelectionMode}
          type={selectionMode ? "default" : "dashed"}
        >
          {selectionMode ? "Annuler la sélection" : "Sélectionner"}
        </Button>
        {selectionMode && hasSelection && (
          <>
            {selectedRowKeys.length === 1 && (
              <Button
                icon={<EditOutlined />}
                onClick={handleBulkEdit}
              >
                Modifier
              </Button>
            )}
            <Popconfirm
              title={`Supprimer ${selectedRowKeys.length} élément(s) ?`}
              description="Cette action est irréversible."
              okText="Oui, supprimer"
              cancelText="Non"
              okButtonProps={{ danger: true }}
              onConfirm={handleBulkDelete}
            >
              <Button danger icon={<DeleteOutlined />}>
                Supprimer ({selectedRowKeys.length})
              </Button>
            </Popconfirm>
          </>
        )}
      </Space>

      {selectionMode && hasSelection && (
        <Alert
          message={`${selectedRowKeys.length} élément(s) sélectionné(s)`}
          type="info"
          showIcon
          closable
          onClose={() => setSelectedRowKeys([])}
          style={{ marginBottom: 12 }}
        />
      )}

      <Table
        dataSource={data}
        columns={[
          ...columns,
          {
            title: "Actions",
            key: "actions",
            width: 120,
            render: (_, record) => (
              <Space>
                <Tooltip title="Modifier">
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => onEdit(record)}
                  />
                </Tooltip>
                <Tooltip title="Supprimer">
                  <Popconfirm
                    title="Confirmer la suppression ?"
                    okText="Oui"
                    cancelText="Non"
                    onConfirm={() => onDelete(record.id)}
                  >
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Tooltip>
              </Space>
            ),
          },
        ]}
        rowKey="id"
        rowSelection={rowSelection}
        loading={loading}
        pagination={{ pageSize: 10 }}
        size="small"
      />
    </div>
  );
}

CrudTab.propTypes = {
  columns: PropTypes.arrayOf(PropTypes.object).isRequired,
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
  loading: PropTypes.bool,
  onAdd: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onBulkDelete: PropTypes.func,
  addLabel: PropTypes.string.isRequired,
};

CrudTab.defaultProps = {
  loading: false,
  onBulkDelete: null,
};

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function CompetencePage() {
  const [msgApi, msgCtx] = message.useMessage();

  // ─ Domaines ─
  const [domaines, setDomaines] = useState([]);
  const [domainesLoading, setDomainesLoading] = useState(false);
  const [domaineModal, setDomaineModal] = useState(false);
  const [editingDomaine, setEditingDomaine] = useState(null);
  const [domaineForm] = Form.useForm();

  // ─ Compétences ─
  const [competences, setCompetences] = useState([]);
  const [compLoading, setCompLoading] = useState(false);
  const [compModal, setCompModal] = useState(false);
  const [editingComp, setEditingComp] = useState(null);
  const [compForm] = Form.useForm();

  // ─ Sous-Compétences ─
  const [sousComps, setSousComps] = useState([]);
  const [scLoading, setScLoading] = useState(false);
  const [scModal, setScModal] = useState(false);
  const [editingSc, setEditingSc] = useState(null);
  const [scForm] = Form.useForm();

  // ─ Savoirs ─
  const [savoirs, setSavoirs] = useState([]);
  const [savoirsLoading, setSavoirsLoading] = useState(false);
  const [savoirModal, setSavoirModal] = useState(false);
  const [editingSavoir, setEditingSavoir] = useState(null);
  const [savoirForm] = Form.useForm();

  // ─ Hiérarchie / Structure ─
  const [structure, setStructure] = useState(null);
  const [structureLoading, setStructureLoading] = useState(false);
  const [structureLoaded, setStructureLoaded] = useState(false);

  // ─ Recherche dans la structure ─
  const [searchResults, setSearchResults] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedDomaine, setSelectedDomaine] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [structureActiveTab, setStructureActiveTab] = useState("tree");

  // ─ Niveaux de définition (modal) ─
  const [niveauModalVisible, setNiveauModalVisible] = useState(false);
  const [niveauTarget, setNiveauTarget] = useState(null);
  const [niveauData, setNiveauData] = useState({});
  const [niveauLoading, setNiveauLoading] = useState(false);
  const [addNiveauForm] = Form.useForm();
  const [allSavoirsHierarchie, setAllSavoirsHierarchie] = useState([]);

  // ─── Data loading ────────────────────────────────────────────────────────
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
    } catch (err) {
      console.error("[CompetencePage] loadSavoirs error:", err?.response?.status, err?.message);
      msgApi.error(err?.response?.data?.message || "Erreur lors du chargement des savoirs");
    } finally {
      setSavoirsLoading(false);
    }
  }, [msgApi]);

  useEffect(() => {
    loadDomaines();
    loadCompetences();
    loadSousCompetences();
    loadSavoirs();
  }, [loadDomaines, loadCompetences, loadSousCompetences, loadSavoirs]);

  // ─── HIÉRARCHIE / STRUCTURE ───────────────────────────────────────────────
  const loadStructure = useCallback(async () => {
    if (structureLoaded) return;
    setStructureLoading(true);
    try {
      const data = await CompetenceService.structure.getArbreComplet();
      setStructure(data);
      setStructureLoaded(true);
    } catch (err) {
      message.error("Erreur lors du chargement de la structure");
      console.error(err);
    } finally {
      setStructureLoading(false);
    }
  }, [structureLoaded]);

  // ─── RECHERCHE dans la structure ─────────────────────────────────────────
  const debounceRef = useRef(null);

  const doSearch = useCallback(
    async (keyword, domaine) => {
      if (!keyword || keyword.trim().length < 2) {
        setSearchResults(null);
        return;
      }
      setSearchLoading(true);
      try {
        let data;
        if (domaine) {
          data = await CompetenceService.structure.rechercheParDomaine(domaine, keyword.trim());
        } else {
          data = await CompetenceService.structure.rechercheGlobale(keyword.trim());
        }
        setSearchResults(data);
        setStructureActiveTab("search");
      } catch (err) {
        message.error("Erreur de recherche");
        console.error(err);
      } finally {
        setSearchLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchKeyword || searchKeyword.trim().length < 2) {
      setSearchResults(null);
      return;
    }
    debounceRef.current = setTimeout(() => {
      doSearch(searchKeyword, selectedDomaine);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [searchKeyword]); // eslint-disable-line react-hooks/exhaustive-deps

  const prevDomaineRef = useRef(undefined);
  useEffect(() => {
    if (prevDomaineRef.current === undefined) {
      prevDomaineRef.current = selectedDomaine;
      return;
    }
    prevDomaineRef.current = selectedDomaine;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchKeyword && searchKeyword.trim().length >= 2) {
      doSearch(searchKeyword, selectedDomaine);
    }
  }, [selectedDomaine]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = useCallback(
    (value) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      doSearch(value, selectedDomaine);
    },
    [selectedDomaine, doSearch]
  );

  const handleClearSearch = useCallback(() => {
    setSearchKeyword("");
    setSearchResults(null);
  }, []);

  // ─── NIVEAUX DÉFINITION (Modal) ───────────────────────────────────────────
  const openNiveauModal = useCallback(async (type, id, nom) => {
    setNiveauTarget({ type, id, nom });
    setNiveauModalVisible(true);
    setNiveauLoading(true);
    try {
      let data;
      if (type === "competence") {
        data = await CompetenceService.niveauDefinition.getByCompetence(id);
      } else {
        data = await CompetenceService.niveauDefinition.getBySousCompetence(id);
      }
      setNiveauData(data);
    } catch (err) {
      message.error("Erreur lors du chargement des niveaux");
      console.error(err);
    } finally {
      setNiveauLoading(false);
    }
  }, []);

  const handleAddNiveauSavoir = useCallback(async (values) => {
    try {
      const request = {
        niveau: values.niveau,
        savoirId: values.savoirId,
        description: values.description,
      };
      if (niveauTarget.type === "competence") {
        request.competenceId = niveauTarget.id;
      } else {
        request.sousCompetenceId = niveauTarget.id;
      }
      await CompetenceService.niveauDefinition.add(request);
      message.success("Savoir requis ajouté au niveau");
      addNiveauForm.resetFields();
      openNiveauModal(niveauTarget.type, niveauTarget.id, niveauTarget.nom);
    } catch (err) {
      message.error(err.response?.data?.message || "Erreur lors de l'ajout");
      console.error(err);
    }
  }, [niveauTarget, addNiveauForm, openNiveauModal]);

  const handleRemoveNiveauSavoir = useCallback(async (id) => {
    try {
      await CompetenceService.niveauDefinition.remove(id);
      message.success("Savoir requis supprimé du niveau");
      openNiveauModal(niveauTarget.type, niveauTarget.id, niveauTarget.nom);
    } catch (err) {
      message.error("Erreur lors de la suppression");
      console.error(err);
    }
  }, [niveauTarget, openNiveauModal]);

  // ─── Tree data for hierarchy tab ──────────────────────────────────────────
  const treeData = useMemo(() => {
    if (!structure?.domaines) return [];
    return structure.domaines.map((domaine) => ({
      key: `dom-${domaine.id}`,
      title: (
        <Space>
          <FolderOpenOutlined style={{ color: "#1890ff" }} />
          <Text strong>{domaine.nom}</Text>
          <Tag color="blue">{domaine.code}</Tag>
          <Badge count={domaine.nombreCompetences} showZero style={{ backgroundColor: "#52c41a" }}
            overflowCount={99} title="Compétences" />
          <Tooltip title={`${domaine.nombreEnseignants} enseignant(s)`}>
            <Tag icon={<TeamOutlined />} color="purple">{domaine.nombreEnseignants}</Tag>
          </Tooltip>
          {!domaine.actif && <Tag color="red">Inactif</Tag>}
        </Space>
      ),
      children: domaine.competences?.map((comp) => ({
        key: `comp-${comp.id}`,
        title: (
          <Space>
            <ApartmentOutlined style={{ color: "#52c41a" }} />
            <Text>{comp.nom}</Text>
            <Tag color="green">{comp.code}</Tag>
            <Tooltip title={`${comp.nombreSousCompetences} sous-compétences, ${comp.nombreSavoirs} savoirs`}>
              <Tag>{comp.nombreSousCompetences} SC / {comp.nombreSavoirs} S</Tag>
            </Tooltip>
            <Tooltip title={`${comp.nombreEnseignants} enseignant(s)`}>
              <Tag icon={<TeamOutlined />} color="purple">{comp.nombreEnseignants}</Tag>
            </Tooltip>
            <Tooltip title="Voir les niveaux">
              <Button size="small" type="link" icon={<InfoCircleOutlined />}
                onClick={(e) => { e.stopPropagation(); openNiveauModal("competence", comp.id, comp.nom); }}
              />
            </Tooltip>
          </Space>
        ),
        children: [
          ...(comp.sousCompetences?.map((sc) => ({
            key: `sc-${sc.id}`,
            title: (
              <Space>
                <BulbOutlined style={{ color: "#fa8c16" }} />
                <Text>{sc.nom}</Text>
                <Tag color="orange">{sc.code}</Tag>
                <Tooltip title={`${sc.nombreSavoirs} savoir(s)`}>
                  <Tag icon={<BookOutlined />}>{sc.nombreSavoirs}</Tag>
                </Tooltip>
                <Tooltip title={`${sc.nombreEnseignants} enseignant(s)`}>
                  <Tag icon={<TeamOutlined />} color="purple">{sc.nombreEnseignants}</Tag>
                </Tooltip>
                <Tooltip title="Voir les niveaux">
                  <Button size="small" type="link" icon={<InfoCircleOutlined />}
                    onClick={(e) => { e.stopPropagation(); openNiveauModal("sousCompetence", sc.id, sc.nom); }}
                  />
                </Tooltip>
              </Space>
            ),
            children: sc.savoirs?.map((s) => ({
              key: `sav-${s.id}`,
              title: (
                <Space>
                  {s.type === "THEORIQUE" ? <BookOutlined style={{ color: "#722ed1" }} /> : <ExperimentOutlined style={{ color: "#13c2c2" }} />}
                  <Text type="secondary">{s.nom}</Text>
                  <Tag color={s.type === "THEORIQUE" ? "purple" : "cyan"}>
                    {s.type === "THEORIQUE" ? "Théorique" : "Pratique"}
                  </Tag>
                  <Tag>{s.code}</Tag>
                </Space>
              ),
              isLeaf: true,
            })),
          })) || []),
          ...(comp.savoirsDirect?.map((s) => ({
            key: `sav-direct-${s.id}`,
            title: (
              <Space>
                {s.type === "THEORIQUE" ? <BookOutlined style={{ color: "#722ed1" }} /> : <ExperimentOutlined style={{ color: "#13c2c2" }} />}
                <Text type="secondary">{s.nom}</Text>
                <Tag color={s.type === "THEORIQUE" ? "purple" : "cyan"}>
                  {s.type === "THEORIQUE" ? "Théorique" : "Pratique"}
                </Tag>
                <Tag>{s.code}</Tag>
                <Tag color="gold">Direct</Tag>
              </Space>
            ),
            isLeaf: true,
          })) || []),
        ],
      })) || [],
    }));
  }, [structure, openNiveauModal]);

  useEffect(() => {
    CompetenceService.savoir.getAll().then(setAllSavoirsHierarchie).catch(() => {});
  }, []);

  // ─── DOMAINES CRUD ───────────────────────────────────────────────────────
  const openDomaineModal = (record = null) => {
    setEditingDomaine(record);
    domaineForm.setFieldsValue(record || { nom: "", description: "", actif: true });
    setDomaineModal(true);
  };

  const handleDomaineSubmit = async () => {
    try {
      const values = await domaineForm.validateFields();
      // Auto-generate code from nom (backend requires it)
      if (!editingDomaine) {
        values.code = values.nom
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, "_")
          .replace(/^_|_$/g, "")
          .substring(0, 30);
      } else {
        // Keep existing code on update
        values.code = editingDomaine.code;
      }
      if (editingDomaine) {
        await CompetenceService.domaine.update(editingDomaine.id, values);
        msgApi.success("Domaine mis à jour");
      } else {
        await CompetenceService.domaine.create(values);
        msgApi.success("Domaine créé");
      }
      setDomaineModal(false);
      loadDomaines();
    } catch (err) {
      if (err?.errorFields) return;
      const msg = err.response?.data?.message || "Erreur lors de la sauvegarde";
      msgApi.error(msg);
    }
  };

  const handleDomaineDelete = async (id) => {
    try {
      await CompetenceService.domaine.delete(id);
      msgApi.success("Domaine supprimé");
      loadDomaines();
      loadCompetences();
    } catch (err) {
      const msg = err.response?.data?.message || "Erreur lors de la suppression";
      msgApi.error(msg);
    }
  };

  const domaineColumns = [
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
      render: (_, record) => (
        <Tag color="blue">{record.competences?.length ?? 0}</Tag>
      ),
    },
  ];

  // ─── COMPÉTENCES CRUD ────────────────────────────────────────────────────
  const openCompModal = (record = null) => {
    setEditingComp(record);
    compForm.setFieldsValue(
      record
        ? { code: record.code, nom: record.nom, description: record.description, domaineId: record.domaineId }
        : { code: "", nom: "", description: "", domaineId: null }
    );
    setCompModal(true);
  };

  const handleCompSubmit = async () => {
    try {
      const values = await compForm.validateFields();
      const { domaineId, ...rest } = values;
      if (editingComp) {
        await CompetenceService.competence.update(editingComp.id, rest);
        msgApi.success("Compétence mise à jour");
      } else {
        await CompetenceService.competence.create(domaineId, rest);
        msgApi.success("Compétence créée");
      }
      setCompModal(false);
      loadCompetences();
    } catch (err) {
      if (err?.errorFields) return;
      const msg = err.response?.data?.message || "Erreur lors de la sauvegarde";
      msgApi.error(msg);
    }
  };

  const handleCompDelete = async (id) => {
    try {
      await CompetenceService.competence.delete(id);
      msgApi.success("Compétence supprimée");
      loadCompetences();
      loadSousCompetences();
      loadDomaines();
    } catch (err) {
      const msg = err.response?.data?.message || "Erreur lors de la suppression";
      msgApi.error(msg);
    }
  };

  const compColumns = [
    { title: "Code", dataIndex: "code", key: "code", width: 100 },
    { title: "Nom", dataIndex: "nom", key: "nom", sorter: (a, b) => a.nom.localeCompare(b.nom) },
    { title: "Description", dataIndex: "description", key: "description", ellipsis: true },
    { title: "Domaine", dataIndex: "domaineNom", key: "domaineNom", filters: domaines.map((d) => ({ text: d.nom, value: d.nom })), onFilter: (v, r) => r.domaineNom === v },
    { title: "Sous-Comp.", key: "nbSc", width: 110, render: (_, r) => <Tag color="geekblue">{r.sousCompetences?.length ?? 0}</Tag> },
  ];

  // ─── SOUS-COMPÉTENCES CRUD ───────────────────────────────────────────────
  const openScModal = (record = null) => {
    setEditingSc(record);
    scForm.setFieldsValue(
      record
        ? { code: record.code, nom: record.nom, description: record.description, competenceId: record.competenceId }
        : { code: "", nom: "", description: "", competenceId: null }
    );
    setScModal(true);
  };

  const handleScSubmit = async () => {
    try {
      const values = await scForm.validateFields();
      const { competenceId, ...rest } = values;
      if (editingSc) {
        await CompetenceService.sousCompetence.update(editingSc.id, rest);
        msgApi.success("Sous-compétence mise à jour");
      } else {
        await CompetenceService.sousCompetence.create(competenceId, rest);
        msgApi.success("Sous-compétence créée");
      }
      setScModal(false);
      loadSousCompetences();
    } catch (err) {
      if (err?.errorFields) return;
      const msg = err.response?.data?.message || "Erreur lors de la sauvegarde";
      msgApi.error(msg);
    }
  };

  const handleScDelete = async (id) => {
    try {
      await CompetenceService.sousCompetence.delete(id);
      msgApi.success("Sous-compétence supprimée");
      loadSousCompetences();
      loadSavoirs();
      loadCompetences();
    } catch (err) {
      const msg = err.response?.data?.message || "Erreur lors de la suppression";
      msgApi.error(msg);
    }
  };

  const scColumns = [
    { title: "Code", dataIndex: "code", key: "code", width: 100 },
    { title: "Nom", dataIndex: "nom", key: "nom", sorter: (a, b) => a.nom.localeCompare(b.nom) },
    { title: "Description", dataIndex: "description", key: "description", ellipsis: true },
    { title: "Compétence", dataIndex: "competenceNom", key: "competenceNom", filters: competences.map((c) => ({ text: c.nom, value: c.nom })), onFilter: (v, r) => r.competenceNom === v },
    { title: "Savoirs", key: "nbSav", width: 90, render: (_, r) => <Tag color="cyan">{r.savoirs?.length ?? 0}</Tag> },
  ];

  // ─── SAVOIRS CRUD ─────────────────────────────────────────────────────────
  const openSavoirModal = (record = null) => {
    setEditingSavoir(record);
    savoirForm.setFieldsValue(
      record
        ? { code: record.code, nom: record.nom, description: record.description, type: record.type, niveau: record.niveau, sousCompetenceId: record.sousCompetenceId }
        : { code: "", nom: "", description: "", type: null, niveau: "N2_ELEMENTAIRE", sousCompetenceId: null }
    );
    setSavoirModal(true);
  };

  const handleSavoirSubmit = async () => {
    try {
      const values = await savoirForm.validateFields();
      const { sousCompetenceId, ...rest } = values;
      if (editingSavoir) {
        await CompetenceService.savoir.update(editingSavoir.id, rest);
        msgApi.success("Savoir mis à jour");
      } else {
        await CompetenceService.savoir.create(sousCompetenceId, rest);
        msgApi.success("Savoir créé");
      }
      setSavoirModal(false);
      loadSavoirs();
    } catch (err) {
      const msg = err.response?.data?.message || "Erreur lors de la sauvegarde";
      msgApi.error(msg);
    }
  };

  const handleSavoirDelete = async (id) => {
    try {
      await CompetenceService.savoir.delete(id);
      msgApi.success("Savoir supprimé");
      loadSavoirs();
      loadSousCompetences();
    } catch (err) {      if (err?.errorFields) return;      const msg = err.response?.data?.message || "Erreur lors de la suppression";
      msgApi.error(msg);
    }
  };

  const savoirColumns = [
    { title: "Code", dataIndex: "code", key: "code", width: 100 },
    { title: "Nom", dataIndex: "nom", key: "nom", sorter: (a, b) => a.nom.localeCompare(b.nom) },
    { title: "Description", dataIndex: "description", key: "description", ellipsis: true },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      width: 110,
      render: (type) => (
        <Tag color={type === "THEORIQUE" ? "purple" : "orange"}>{type}</Tag>
      ),
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
        return opt ? <Tag color={opt.color}>{opt.label}</Tag> : <Tag>{niveau ?? "—"}</Tag>;
      },
      filters: NIVEAU_SAVOIR_OPTIONS.map((n) => ({ text: n.label, value: n.value })),
      onFilter: (v, r) => r.niveau === v,
    },
    { title: "Sous-Compétence", dataIndex: "sousCompetenceNom", key: "sousCompetenceNom" },
  ];

  // ─── URL-driven tab activation (from RICE import redirect) ───────────────
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(
    () => searchParams.get("tab") ?? "domaines",
  );
  useEffect(() => {
    const t = searchParams.get("tab");
    if (t) setActiveTab(t);
  }, [searchParams]);

  // ─── Tabs ─────────────────────────────────────────────────────────────────
  const tabs = [
    {
      key: "domaines",
      label: "Domaines",
      children: (
        <CrudTab
          columns={domaineColumns}
          data={domaines}
          loading={domainesLoading}
          onAdd={() => openDomaineModal()}
          onEdit={openDomaineModal}
          onDelete={handleDomaineDelete}
          addLabel="Ajouter un domaine"
        />
      ),
    },
    {
      key: "competences",
      label: "Compétences",
      children: (
        <CrudTab
          columns={compColumns}
          data={competences}
          loading={compLoading}
          onAdd={() => openCompModal()}
          onEdit={openCompModal}
          onDelete={handleCompDelete}
          addLabel="Ajouter une compétence"
        />
      ),
    },
    {
      key: "sousCompetences",
      label: "Sous-Compétences",
      children: (
        <CrudTab
          columns={scColumns}
          data={sousComps}
          loading={scLoading}
          onAdd={() => openScModal()}
          onEdit={openScModal}
          onDelete={handleScDelete}
          addLabel="Ajouter une sous-compétence"
        />
      ),
    },
    {
      key: "savoirs",
      label: "Savoirs",
      children: (
        <CrudTab
          columns={savoirColumns}
          data={savoirs}
          loading={savoirsLoading}
          onAdd={() => openSavoirModal()}
          onEdit={openSavoirModal}
          onDelete={handleSavoirDelete}
          addLabel="Ajouter un savoir"
        />
      ),
    },
    {
      key: "hierarchie",
      label: (
        <span><ApartmentOutlined /> Hiérarchie</span>
      ),
      children: (
        <div>
          {structureLoading ? (
            <div style={{ textAlign: "center", padding: 60 }}>
              <Spin size="large" tip="Chargement de la structure..." />
            </div>
          ) : (
            <>
              {/* Stats */}
              {structure?.statistiques && (
                <Row gutter={16} style={{ marginBottom: 16 }}>
                  <Col span={4}><Card size="small"><Statistic title="Domaines" value={structure.statistiques.totalDomaines} prefix={<FolderOpenOutlined />} valueStyle={{ color: "#1890ff" }} /></Card></Col>
                  <Col span={4}><Card size="small"><Statistic title="Compétences" value={structure.statistiques.totalCompetences} prefix={<ApartmentOutlined />} valueStyle={{ color: "#52c41a" }} /></Card></Col>
                  <Col span={4}><Card size="small"><Statistic title="Sous-Compétences" value={structure.statistiques.totalSousCompetences} prefix={<BulbOutlined />} valueStyle={{ color: "#fa8c16" }} /></Card></Col>
                  <Col span={4}><Card size="small"><Statistic title="Savoirs" value={structure.statistiques.totalSavoirs} prefix={<BookOutlined />} valueStyle={{ color: "#722ed1" }} /></Card></Col>
                  <Col span={4}><Card size="small"><Statistic title="Théoriques" value={structure.statistiques.totalSavoirsTheoriques} prefix={<BookOutlined />} valueStyle={{ color: "#722ed1" }} /></Card></Col>
                  <Col span={4}><Card size="small"><Statistic title="Pratiques" value={structure.statistiques.totalSavoirsPratiques} prefix={<ExperimentOutlined />} valueStyle={{ color: "#13c2c2" }} /></Card></Col>
                </Row>
              )}
              {/* Tree */}
              <Card>
                {treeData.length > 0 ? (
                  <Tree
                    treeData={treeData}
                    defaultExpandedKeys={treeData.map((d) => d.key)}
                    showLine={{ showLeafIcon: false }}
                    blockNode
                    style={{ fontSize: 14 }}
                  />
                ) : (
                  <Empty description="Aucune donnée dans la structure" />
                )}
              </Card>
            </>
          )}
        </div>
      ),
    },
    {
      key: "recherche",
      label: (
        <span><SearchOutlined /> Recherche</span>
      ),
      children: (
        <Card>
          <Space style={{ marginBottom: 16, width: "100%" }} direction="vertical">
            <Row gutter={16}>
              <Col span={6}>
                <Select
                  allowClear
                  placeholder="Filtrer par domaine"
                  style={{ width: "100%" }}
                  value={selectedDomaine}
                  onChange={(val) => setSelectedDomaine(val)}
                >
                  {structure?.domaines?.map((d) => (
                    <Option key={d.id} value={d.id}>{d.nom} ({d.code})</Option>
                  ))}
                </Select>
              </Col>
              <Col span={18}>
                <Search
                  placeholder="Rechercher par mot-clé, code, description..."
                  enterButton={searchLoading ? "Recherche..." : "Rechercher"}
                  loading={searchLoading}
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  onSearch={handleSearch}
                  allowClear
                  onClear={handleClearSearch}
                />
              </Col>
            </Row>
            {searchKeyword.trim().length > 0 && searchKeyword.trim().length < 2 && (
              <Text type="secondary" style={{ fontSize: 12 }}>Saisissez au moins 2 caractères</Text>
            )}
            {selectedDomaine && (
              <Space size={4}>
                <SearchOutlined style={{ color: "#1890ff" }} />
                <Text type="secondary" style={{ fontSize: 12 }}>Filtrage dans le domaine :</Text>
                <Tag color="blue" closable onClose={() => setSelectedDomaine(null)}>
                  {structure?.domaines?.find((d) => d.id === selectedDomaine)?.nom}
                </Tag>
              </Space>
            )}
          </Space>
          {searchLoading ? (
            <Spin />
          ) : searchResults ? (
            <StructureSearchResultsView results={searchResults} />
          ) : (
            <Empty description="Saisissez un mot-clé (min. 2 caractères) pour lancer la recherche" />
          )}
        </Card>
      ),
    },
  ];

  return (
    <>
      {msgCtx}
      <div style={{ padding: 16 }}>
        <Title level={4}>
          <ApartmentOutlined /> Gestion des Compétences
        </Title>

        <Tabs
          items={tabs}
          activeKey={activeTab}
          onChange={(key) => {
            setActiveTab(key);
            if (key === "hierarchie" || key === "recherche") {
              loadStructure();
            }
          }}
        />

        {/* ─ Domaine Modal ─ */}
        <Modal
          forceRender
          title={editingDomaine ? "Modifier le domaine" : "Nouveau domaine"}
          open={domaineModal}
          onOk={handleDomaineSubmit}
          onCancel={() => setDomaineModal(false)}
          afterClose={() => { domaineForm.resetFields(); setEditingDomaine(null); }}
          okText="Enregistrer"
          cancelText="Annuler"
        >
          <Form form={domaineForm} layout="vertical">
            <Form.Item name="nom" label="Nom" rules={[{ required: true, message: "Nom obligatoire" }]}>
              <Input placeholder="ex: Informatique" />
            </Form.Item>
            <Form.Item name="description" label="Description">
              <Input.TextArea rows={2} />
            </Form.Item>
            <Form.Item name="actif" label="Actif" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Form>
        </Modal>

        {/* ─ Compétence Modal ─ */}
        <Modal
          forceRender
          title={editingComp ? "Modifier la compétence" : "Nouvelle compétence"}
          open={compModal}
          onOk={handleCompSubmit}
          onCancel={() => setCompModal(false)}
          afterClose={() => { compForm.resetFields(); setEditingComp(null); }}
          okText="Enregistrer"
          cancelText="Annuler"
        >
          <Form form={compForm} layout="vertical">
            <Form.Item name="domaineId" label="Domaine" rules={[{ required: !editingComp, message: "Domaine obligatoire" }]}>
              <Select placeholder="Sélectionner un domaine" disabled={!!editingComp} showSearch optionFilterProp="children">
                {domaines.map((d) => (
                  <Option key={d.id} value={d.id}>{d.nom}</Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="code" label="Code" rules={[{ required: true, message: "Code obligatoire" }]}>
              <Input placeholder="ex: INF-01" />
            </Form.Item>
            <Form.Item name="nom" label="Nom" rules={[{ required: true, message: "Nom obligatoire" }]}>
              <Input />
            </Form.Item>
            <Form.Item name="description" label="Description">
              <Input.TextArea rows={2} />
            </Form.Item>
          </Form>
        </Modal>

        {/* ─ Sous-Compétence Modal ─ */}
        <Modal
          forceRender
          title={editingSc ? "Modifier la sous-compétence" : "Nouvelle sous-compétence"}
          open={scModal}
          onOk={handleScSubmit}
          onCancel={() => setScModal(false)}
          afterClose={() => { scForm.resetFields(); setEditingSc(null); }}
          okText="Enregistrer"
          cancelText="Annuler"
        >
          <Form form={scForm} layout="vertical">
            <Form.Item name="competenceId" label="Compétence" rules={[{ required: !editingSc, message: "Compétence obligatoire" }]}>
              <Select placeholder="Sélectionner une compétence" disabled={!!editingSc} showSearch optionFilterProp="children">
                {competences.map((c) => (
                  <Option key={c.id} value={c.id}>{c.nom} ({c.domaineNom})</Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="code" label="Code" rules={[{ required: true, message: "Code obligatoire" }]}>
              <Input />
            </Form.Item>
            <Form.Item name="nom" label="Nom" rules={[{ required: true, message: "Nom obligatoire" }]}>
              <Input />
            </Form.Item>
            <Form.Item name="description" label="Description">
              <Input.TextArea rows={2} />
            </Form.Item>
          </Form>
        </Modal>

        {/* ─ Savoir Modal ─ */}
        <Modal
          forceRender
          title={editingSavoir ? "Modifier le savoir" : "Nouveau savoir"}
          open={savoirModal}
          onOk={handleSavoirSubmit}
          onCancel={() => setSavoirModal(false)}
          afterClose={() => { savoirForm.resetFields(); setEditingSavoir(null); }}
          okText="Enregistrer"
          cancelText="Annuler"
        >
          <Form form={savoirForm} layout="vertical">
            <Form.Item name="sousCompetenceId" label="Sous-Compétence" rules={[{ required: !editingSavoir, message: "Sous-compétence obligatoire" }]}>
              <Select placeholder="Sélectionner une sous-compétence" disabled={!!editingSavoir} showSearch optionFilterProp="children">
                {sousComps.map((sc) => (
                  <Option key={sc.id} value={sc.id}>{sc.nom} ({sc.competenceNom})</Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="code" label="Code" rules={[{ required: true, message: "Code obligatoire" }]}>
              <Input />
            </Form.Item>
            <Form.Item name="nom" label="Nom" rules={[{ required: true, message: "Nom obligatoire" }]}>
              <Input />
            </Form.Item>
            <Form.Item name="description" label="Description">
              <Input.TextArea rows={2} />
            </Form.Item>
            <Form.Item name="type" label="Type" rules={[{ required: true, message: "Type obligatoire" }]}>
              <Select placeholder="Type de savoir">
                {TYPE_SAVOIR_OPTIONS.map((t) => (
                  <Option key={t} value={t}>{t}</Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="niveau" label="Niveau" rules={[{ required: true, message: "Niveau obligatoire" }]}>
              <Select placeholder="Niveau de complexité">
                {NIVEAU_SAVOIR_OPTIONS.map((n) => (
                  <Option key={n.value} value={n.value}>{n.label}</Option>
                ))}
              </Select>
            </Form.Item>
          </Form>
        </Modal>

        {/* ─ Niveau Définition Modal ─ */}
        <Modal
          forceRender
          title={`Niveaux de compétence — ${niveauTarget?.nom || ""}`}
          open={niveauModalVisible}
          onCancel={() => setNiveauModalVisible(false)}
          footer={null}
          width={800}
        >
          {niveauLoading ? (
            <Spin />
          ) : (
            <div>
              <Collapse
                defaultActiveKey={Object.keys(NIVEAU_LABELS)}
                items={Object.entries(NIVEAU_LABELS).map(([key, val]) => {
                  const levelItems = niveauData[key] || [];
                  return {
                    key,
                    label: (
                      <Space>
                        <Badge color={val.color} />
                        <Text strong>{val.label}</Text>
                        <Tag>{levelItems.length} savoir(s) requis</Tag>
                      </Space>
                    ),
                    children: levelItems.length > 0 ? (
                      <Table
                        size="small"
                        dataSource={levelItems}
                        rowKey="id"
                        pagination={false}
                        columns={[
                          { title: "Code", dataIndex: "savoirCode", width: 100 },
                          { title: "Savoir", dataIndex: "savoirNom" },
                          { title: "Description", dataIndex: "description", ellipsis: true },
                          {
                            title: "",
                            width: 50,
                            render: (_, record) => (
                              <Popconfirm
                                title="Supprimer ce savoir requis ?"
                                onConfirm={() => handleRemoveNiveauSavoir(record.id)}
                              >
                                <Button size="small" danger icon={<DeleteOutlined />} />
                              </Popconfirm>
                            ),
                          },
                        ]}
                      />
                    ) : (
                      <Text type="secondary">Aucun savoir requis défini pour ce niveau</Text>
                    ),
                  };
                })}
              />
              <Card size="small" title="Ajouter un savoir requis" style={{ marginTop: 16 }}>
                <Form form={addNiveauForm} layout="inline" onFinish={handleAddNiveauSavoir}>
                  <Form.Item name="niveau" rules={[{ required: true, message: "Requis" }]}>
                    <Select placeholder="Niveau" style={{ width: 180 }}>
                      {NIVEAU_OPTIONS.map((opt) => (
                        <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                  <Form.Item name="savoirId" rules={[{ required: true, message: "Requis" }]}>
                    <Select placeholder="Savoir" showSearch optionFilterProp="children" style={{ width: 250 }}>
                      {allSavoirsHierarchie.map((s) => (
                        <Option key={s.id} value={s.id}>{s.code} — {s.nom}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                  <Form.Item name="description">
                    <Input placeholder="Description (optionnel)" style={{ width: 200 }} />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>Ajouter</Button>
                  </Form.Item>
                </Form>
              </Card>
            </div>
          )}
        </Modal>
      </div>
    </>
  );
}

// ─── Sub-component: Search Results for Hierarchy tab ────────────────────────
function StructureSearchResultsView({ results }) {
  const { domaines = [], competences = [], sousCompetences = [], savoirs = [] } = results;
  const hasResults = domaines.length || competences.length || sousCompetences.length || savoirs.length;

  if (!hasResults) {
    return <Empty description="Aucun résultat trouvé" />;
  }

  return (
    <Space direction="vertical" style={{ width: "100%" }} size="middle">
      {domaines.length > 0 && (
        <Card size="small" title={<><FolderOpenOutlined /> Domaines ({domaines.length})</>}>
          {domaines.map((d) => (
            <Tag key={d.id} color="blue" style={{ margin: 4, padding: "4px 8px" }}>
              <strong>{d.code}</strong> — {d.nom}
            </Tag>
          ))}
        </Card>
      )}
      {competences.length > 0 && (
        <Card size="small" title={<><ApartmentOutlined /> Compétences ({competences.length})</>}>
          <Descriptions column={1} size="small" bordered>
            {competences.map((c) => (
              <Descriptions.Item key={c.id} label={<Tag color="green">{c.code}</Tag>}>
                <strong>{c.nom}</strong>
                {c.domaineNom && <Typography.Text type="secondary"> — {c.domaineNom}</Typography.Text>}
                {c.description && <div><Typography.Text type="secondary">{c.description}</Typography.Text></div>}
              </Descriptions.Item>
            ))}
          </Descriptions>
        </Card>
      )}
      {sousCompetences.length > 0 && (
        <Card size="small" title={<><BulbOutlined /> Sous-Compétences ({sousCompetences.length})</>}>
          <Descriptions column={1} size="small" bordered>
            {sousCompetences.map((sc) => (
              <Descriptions.Item key={sc.id} label={<Tag color="orange">{sc.code}</Tag>}>
                <strong>{sc.nom}</strong>
                {sc.competenceNom && <Typography.Text type="secondary"> — {sc.competenceNom}</Typography.Text>}
                {sc.description && <div><Typography.Text type="secondary">{sc.description}</Typography.Text></div>}
              </Descriptions.Item>
            ))}
          </Descriptions>
        </Card>
      )}
      {savoirs.length > 0 && (
        <Card size="small" title={<><BookOutlined /> Savoirs ({savoirs.length})</>}>
          <Descriptions column={1} size="small" bordered>
            {savoirs.map((s) => (
              <Descriptions.Item
                key={s.id}
                label={
                  <Space>
                    <Tag>{s.code}</Tag>
                    <Tag color={s.type === "THEORIQUE" ? "purple" : "cyan"}>
                      {s.type === "THEORIQUE" ? "Th." : "Pr."}
                    </Tag>
                  </Space>
                }
              >
                <strong>{s.nom}</strong>
                {s.sousCompetenceNom && <Typography.Text type="secondary"> — {s.sousCompetenceNom}</Typography.Text>}
                {s.competenceNom && <Typography.Text type="secondary"> — {s.competenceNom}</Typography.Text>}
                {s.description && <div><Typography.Text type="secondary">{s.description}</Typography.Text></div>}
              </Descriptions.Item>
            ))}
          </Descriptions>
        </Card>
      )}
    </Space>
  );
}
