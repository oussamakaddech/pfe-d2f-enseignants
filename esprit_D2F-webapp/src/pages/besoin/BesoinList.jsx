import { useEffect, useState } from "react";
import {
  Table,
  Button,
  Space,
  message,
  Typography,
  Card,
  Row,
  Col,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  Popconfirm,
  Empty,
  Tooltip,
  Skeleton,
} from "antd";
import {
  ReloadOutlined,
  FilterOutlined,
  ReadOutlined,
  TrophyOutlined,
  TeamOutlined,
  ApartmentOutlined,
  DeleteOutlined,
  EditOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  SearchOutlined,
  FileTextOutlined,
  UserOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import BesoinFormationService from "../../services/BesoinFormationService";
import DeptService from "../../services/DeptService";
import UpService from "../../services/upService";
import "./BesoinList.css";

const { Option } = Select;
const { Title, Text } = Typography;
const { TextArea } = Input;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

export default function BesoinList() {
  const navigate = useNavigate();
  const [msgApi, msgCtx] = message.useMessage();
  const [besoins, setBesoins] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [departements, setDepartements] = useState([]);
  const [ups, setUps] = useState([]);
  const [types, setTypes] = useState([]);
  const [filters, setFilters] = useState({ deptId: null, upId: null, type: null, statut: null });
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");

  const [editingRecord, setEditingRecord] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [allBesoins, depts, upsData] = await Promise.all([
        BesoinFormationService.getAllBesoinFormations(),
        DeptService.getAllDepts(),
        UpService.getAllUps(),
      ]);
      setBesoins(allBesoins);
      setFiltered(allBesoins);
      setDepartements(depts);
      setUps(upsData);
      setTypes([...new Set(allBesoins.map((b) => b.typeBesoin).filter(Boolean))]);
    } catch {
      msgApi.error("Erreur lors du chargement des besoins");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [besoins, filters, searchText]);

  const applyFilters = () => {
    let res = [...besoins];
    if (filters.deptId) res = res.filter((b) => Number(b.departement) === filters.deptId);
    if (filters.upId)   res = res.filter((b) => Number(b.up) === filters.upId);
    if (filters.type)   res = res.filter((b) => b.typeBesoin === filters.type);
    if (filters.statut) {
      if (filters.statut === "approuve") res = res.filter((b) => b.approuveAdmin);
      if (filters.statut === "en_attente") res = res.filter((b) => !b.approuveAdmin);
    }
    if (searchText) {
      const s = searchText.toLowerCase();
      res = res.filter(
        (b) =>
          (b.titre || "").toLowerCase().includes(s) ||
          (b.objectifFormation || "").toLowerCase().includes(s) ||
          (b.username || "").toLowerCase().includes(s)
      );
    }
    setFiltered(res);
  };

  const handleDelete = async (id) => {
    try {
      await BesoinFormationService.removeBesoinFormation(id);
      msgApi.success("Besoin supprimé avec succès");
      setBesoins((prev) => prev.filter((b) => b.idBesoinFormation !== id));
    } catch {
      msgApi.error("Erreur lors de la suppression");
    }
  };

  const handleApprove = async (id) => {
    try {
      await BesoinFormationService.approveBesoin(id);
      msgApi.success("Besoin approuvé — formation créée !");
      setBesoins((prev) =>
        prev.map((b) => (b.idBesoinFormation === id ? { ...b, approuveAdmin: true, eventPublished: true } : b))
      );
    } catch {
      msgApi.error("Erreur lors de l'approbation");
    }
  };

  const openEdit = (record) => {
    setEditingRecord(record);
    editForm.setFieldsValue({
      titre: record.titre || "",
      objectifFormation: record.objectifFormation || "",
      propositionAnimateur: record.propositionAnimateur || "",
      horaireSouhaite: record.horaireSouhaite || "",
      typeBesoin: record.typeBesoin || undefined,
      up: record.up || undefined,
      departement: record.departement || undefined,
    });
    setEditModalOpen(true);
  };

  const handleEditSave = async () => {
    try {
      const values = await editForm.validateFields();
      setSaving(true);
      const payload = {
        idBesoinFormation: editingRecord.idBesoinFormation,
        ...values,
      };
      await BesoinFormationService.modifyBesoinFormation(payload, "Modification depuis l'interface");
      msgApi.success("Besoin modifié avec succès");
      setEditModalOpen(false);
      await fetchData();
    } catch {
      msgApi.error("Erreur lors de la modification");
    } finally {
      setSaving(false);
    }
  };

  // Stats
  const total = besoins.length;
  const approvedCount = besoins.filter((b) => b.approuveAdmin).length;
  const pendingCount = total - approvedCount;

  const columns = [
    {
      title: "Formation",
      key: "formation",
      render: (_, r) => (
        <div>
          <div className="formation-cell-title">
            <FileTextOutlined style={{ marginRight: 6, color: "#B51200" }} />
            {r.titre || r.objectifFormation || "—"}
          </div>
          {r.titre && r.objectifFormation && (
            <div className="formation-cell-desc">{r.objectifFormation}</div>
          )}
        </div>
      ),
      sorter: (a, b) => (a.titre || a.objectifFormation || "").localeCompare(b.titre || b.objectifFormation || ""),
    },
    {
      title: "Demandeur",
      dataIndex: "username",
      key: "username",
      width: 150,
      render: (v) => (
        <Tag icon={<UserOutlined />} style={{ borderRadius: 8, fontWeight: 500 }}>
          {v}
        </Tag>
      ),
      sorter: (a, b) => (a.username || "").localeCompare(b.username || ""),
    },
    {
      title: "Type",
      dataIndex: "typeBesoin",
      width: 150,
      render: (t) => <span className={`type-tag ${t}`}>{t?.replace(/_/g, " ")}</span>,
      sorter: (a, b) => (a.typeBesoin || "").localeCompare(b.typeBesoin || ""),
    },
    {
      title: "UP",
      width: 160,
      render: (_, r) => {
        const upObj = ups.find((u) => u.id === Number(r.up));
        return (
          <Tag icon={<TeamOutlined />} style={{ borderRadius: 8, fontWeight: 500 }}>
            {upObj ? upObj.name || upObj.libelle : r.up}
          </Tag>
        );
      },
    },
    {
      title: "Département",
      width: 160,
      render: (_, r) => {
        const depObj = departements.find((d) => d.id === Number(r.departement));
        return (
          <Tag icon={<ApartmentOutlined />} color="processing" style={{ borderRadius: 8, fontWeight: 500 }}>
            {depObj ? depObj.name || depObj.libelle : r.departement}
          </Tag>
        );
      },
    },
    {
      title: "Formateur proposé",
      dataIndex: "propositionAnimateur",
      width: 160,
      render: (v) => v || <Text type="secondary">—</Text>,
    },
    {
      title: "Horaire",
      dataIndex: "horaireSouhaite",
      width: 130,
      render: (v) =>
        v ? (
          <span style={{ fontSize: 12, color: "#595959" }}>
            <CalendarOutlined style={{ marginRight: 4 }} />
            {v}
          </span>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "Date",
      dataIndex: "dateCreation",
      width: 120,
      render: (d) =>
        d ? (
          <span style={{ fontSize: 12, color: "#8c8c8c", fontWeight: 500 }}>
            {new Date(d).toLocaleDateString("fr-FR")}
          </span>
        ) : (
          "—"
        ),
      sorter: (a, b) => new Date(a.dateCreation || 0) - new Date(b.dateCreation || 0),
    },
    {
      title: "Statut",
      key: "statut",
      width: 140,
      align: "center",
      render: (_, r) =>
        r.approuveAdmin ? (
          <span className="status-badge approved">
            <span className="status-badge-dot" />
            Approuvé
          </span>
        ) : (
          <span className="status-badge pending">
            <span className="status-badge-dot" />
            En attente
          </span>
        ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 220,
      fixed: "right",
      render: (_, r) => (
        <Space>
          <Tooltip title="Modifier">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEdit(r)}
              className="action-btn"
            >
              Modifier
            </Button>
          </Tooltip>
          {!r.approuveAdmin && (
            <Tooltip title="Approuver et créer la formation">
              <Button
                type="primary"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => handleApprove(r.idBesoinFormation)}
                className="action-btn btn-success"
              >
                Approuver
              </Button>
            </Tooltip>
          )}
          <Popconfirm
            title="Supprimer ce besoin ?"
            description="Cette action est irréversible."
            onConfirm={() => handleDelete(r.idBesoinFormation)}
            okText="Oui"
            cancelText="Non"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Supprimer">
              <Button danger size="small" icon={<DeleteOutlined />} className="action-btn" />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (loading && besoins.length === 0) {
    return (
      <div className="besoin-list-container">
        <Skeleton active paragraph={{ rows: 4 }} className="besoin-skeleton" />
        <Skeleton active paragraph={{ rows: 8 }} className="besoin-skeleton" />
      </div>
    );
  }

  return (
    <>
      {msgCtx}
      <motion.div
        className="besoin-list-container"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="besoin-header">
          <Row justify="space-between" align="middle">
            <Col>
              <div className="besoin-header-title">
                <ReadOutlined style={{ fontSize: 32, color: "#B51200" }} />
                <div>
                  <Title level={2} style={{ margin: 0, fontWeight: 700 }}>
                    Gestion des Besoins de Formation
                  </Title>
                  <Text type="secondary" style={{ fontSize: 14 }}>
                    {filtered.length} résultat{filtered.length > 1 ? "s" : ""} sur {total}
                  </Text>
                </div>
              </div>
            </Col>
            <Col>
              <Space>
                <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading} size="large">
                  Actualiser
                </Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => navigate("/home/besoins/ajouter")}
                  size="large"
                  className="btn-brand"
                >
                  Ajouter un besoin
                </Button>
              </Space>
            </Col>
          </Row>
        </motion.div>

        {/* Stats */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} md={8}>
            <motion.div variants={itemVariants}>
              <Card className="besoin-stat-card total" size="small">
                <div className="besoin-stat-icon total">
                  <TrophyOutlined />
                </div>
                <div className="besoin-stat-value" style={{ color: "#1890ff" }}>{total}</div>
                <div className="besoin-stat-label">Total des besoins</div>
              </Card>
            </motion.div>
          </Col>
          <Col xs={12} md={8}>
            <motion.div variants={itemVariants}>
              <Card className="besoin-stat-card approved" size="small">
                <div className="besoin-stat-icon approved">
                  <CheckCircleOutlined />
                </div>
                <div className="besoin-stat-value" style={{ color: "#52c41a" }}>{approvedCount}</div>
                <div className="besoin-stat-label">Besoins approuvés</div>
              </Card>
            </motion.div>
          </Col>
          <Col xs={12} md={8}>
            <motion.div variants={itemVariants}>
              <Card className="besoin-stat-card pending" size="small">
                <div className="besoin-stat-icon pending">
                  <ClockCircleOutlined />
                </div>
                <div className="besoin-stat-value" style={{ color: "#faad14" }}>{pendingCount}</div>
                <div className="besoin-stat-label">En attente</div>
              </Card>
            </motion.div>
          </Col>
        </Row>

        {/* Filtres */}
        <motion.div variants={itemVariants}>
          <Card className="besoin-filter-card" size="small">
            <Space wrap size="middle" align="center">
              <div className="besoin-filter-icon">
                <FilterOutlined />
              </div>
              <Input
                placeholder="Rechercher..."
                allowClear
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 240 }}
                prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
                size="middle"
              />
              <Select
                allowClear
                placeholder="Type"
                style={{ width: 160 }}
                value={filters.type}
                onChange={(v) => setFilters((f) => ({ ...f, type: v }))}
                size="middle"
              >
                {types.map((t) => (
                  <Option key={t} value={t}>{t?.replace(/_/g, " ")}</Option>
                ))}
              </Select>
              <Select
                allowClear
                placeholder="Statut"
                style={{ width: 160 }}
                value={filters.statut}
                onChange={(v) => setFilters((f) => ({ ...f, statut: v }))}
                size="middle"
              >
                <Option value="approuve">Approuvé</Option>
                <Option value="en_attente">En attente</Option>
              </Select>
              <Select
                allowClear
                placeholder="UP"
                style={{ width: 180 }}
                value={filters.upId}
                onChange={(v) => setFilters((f) => ({ ...f, upId: v }))}
                size="middle"
              >
                {ups.map((u) => (
                  <Option key={u.id} value={u.id}>{u.name || u.libelle}</Option>
                ))}
              </Select>
              <Select
                allowClear
                placeholder="Département"
                style={{ width: 180 }}
                value={filters.deptId}
                onChange={(v) => setFilters((f) => ({ ...f, deptId: v }))}
                size="middle"
              >
                {departements.map((d) => (
                  <Option key={d.id} value={d.id}>{d.name || d.libelle}</Option>
                ))}
              </Select>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => { setFilters({ deptId: null, upId: null, type: null, statut: null }); setSearchText(""); }}
                size="middle"
              >
                Réinitialiser
              </Button>
            </Space>
          </Card>
        </motion.div>

        {/* Table */}
        <motion.div variants={itemVariants}>
          <Card className="besoin-table-card">
            <AnimatePresence>
              {filtered.length === 0 && !loading ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <Empty
                    description="Aucun besoin ne correspond à vos critères"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    style={{ padding: "40px 0" }}
                  />
                </motion.div>
              ) : (
                <Table
                  dataSource={filtered}
                  columns={columns}
                  rowKey="idBesoinFormation"
                  loading={loading}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (t, range) => `${range[0]}-${range[1]} sur ${t} besoins`,
                    style: { marginTop: 16 },
                  }}
                  scroll={{ x: 1400 }}
                  size="middle"
                  rowClassName={() => "animate-slide-in"}
                />
              )}
            </AnimatePresence>
          </Card>
        </motion.div>
      </motion.div>

      {/* Modal d'édition */}
      <Modal
        title="Modifier le besoin"
        open={editModalOpen}
        onOk={handleEditSave}
        onCancel={() => setEditModalOpen(false)}
        confirmLoading={saving}
        okText="Enregistrer"
        cancelText="Annuler"
        width={720}
        className="besoin-modal"
        okButtonProps={{ className: "btn-brand" }}
      >
        <Form form={editForm} layout="vertical">
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="Nom de la formation" name="titre" rules={[{ required: true }]}>
                <Input placeholder="Ex: Formation Angular avancé" size="large" prefix={<FileTextOutlined style={{ color: "#B51200" }} />} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Type" name="typeBesoin" rules={[{ required: true }]}>
                <Select placeholder="Sélectionner le type" size="large">
                  <Option value="INDIVIDUEL">Individuel</Option>
                  <Option value="COLLECTIF">Collectif</Option>
                  <Option value="ANIMER_UNE_FORMATION">Animer une formation</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label="Objectif" name="objectifFormation" rules={[{ required: true }]}>
                <TextArea rows={3} placeholder="Décrire l'objectif de la formation" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="UP" name="up" rules={[{ required: true }]}>
                <Select placeholder="Sélectionner l'UP" size="large">
                  {ups.map((u) => (
                    <Option key={u.id} value={String(u.id)}>{u.name || u.libelle}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Département" name="departement" rules={[{ required: true }]}>
                <Select placeholder="Sélectionner le département" size="large">
                  {departements.map((d) => (
                    <Option key={d.id} value={String(d.id)}>{d.name || d.libelle}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Formateur proposé" name="propositionAnimateur">
                <Input placeholder="Nom du formateur proposé (optionnel)" size="large" prefix={<UserOutlined style={{ color: "#B51200" }} />} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Horaire souhaité" name="horaireSouhaite">
                <Input placeholder="Ex: Lundi 9h-12h" size="large" prefix={<CalendarOutlined style={{ color: "#B51200" }} />} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </>
  );
}
