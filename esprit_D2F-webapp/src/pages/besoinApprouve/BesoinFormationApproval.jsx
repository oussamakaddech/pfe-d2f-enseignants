import { useEffect, useState } from "react";
import {
  Table,
  Select,
  Button,
  Space,
  message,
  Typography,
  Card,
  Row,
  Col,
  Tag,
  Empty,
  Tooltip,
  Skeleton,
} from "antd";
import {
  CheckCircleOutlined,
  ReloadOutlined,
  FilterOutlined,
  ReadOutlined,
  TrophyOutlined,
  TeamOutlined,
  ApartmentOutlined,
  FileTextOutlined,
  CalendarOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import BesoinFormationService from "../../services/BesoinFormationService";
import DeptService from "../../services/DeptService";
import UpService from "../../services/upService";
import "./BesoinFormationApproval.css";

const { Option } = Select;
const { Title, Text } = Typography;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

export default function BesoinFormationApproval() {
  const navigate = useNavigate();
  const [msgApi, msgCtx] = message.useMessage();
  const [besoins, setBesoins] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [departements, setDepartements] = useState([]);
  const [ups, setUps] = useState([]);
  const [types, setTypes] = useState([]);
  const [filters, setFilters] = useState({ deptId: null, upId: null, type: null });
  const [loading, setLoading] = useState(false);
  const [approvingId, setApprovingId] = useState(null);

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { applyFilters(); }, [besoins, filters]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [approvedBesoins, depts, upsData] = await Promise.all([
        BesoinFormationService.getApprovedBesoinFormations(),
        DeptService.getAllDepts(),
        UpService.getAllUps(),
      ]);
      setBesoins(approvedBesoins);
      setFiltered(approvedBesoins);
      setDepartements(depts);
      setUps(upsData);
      setTypes([...new Set(approvedBesoins.map((b) => b.typeBesoin).filter(Boolean))]);
    } catch {
      msgApi.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let res = [...besoins];
    if (filters.deptId) res = res.filter((b) => Number(b.departement) === filters.deptId);
    if (filters.upId)   res = res.filter((b) => Number(b.up) === filters.upId);
    if (filters.type)   res = res.filter((b) => b.typeBesoin === filters.type);
    setFiltered(res);
  };

  const handleApprove = async (id) => {
    setApprovingId(id);
    try {
      await BesoinFormationService.approveBesoin(id);
      msgApi.success("Formation créée avec succès !");
      setBesoins((prev) =>
        prev.map((b) => (b.idBesoinFormation === id ? { ...b, eventPublished: true } : b))
      );
      setFiltered((prev) =>
        prev.map((b) => (b.idBesoinFormation === id ? { ...b, eventPublished: true } : b))
      );
    } catch {
      msgApi.error("Erreur lors de la création de la formation");
    } finally {
      setApprovingId(null);
    }
  };

  // Stats
  const total = besoins.length;
  const createdCount = besoins.filter((b) => b.eventPublished).length;
  const pendingCount = total - createdCount;

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
          {r.objectifFormation && r.titre && (
            <div className="formation-cell-desc">{r.objectifFormation}</div>
          )}
        </div>
      ),
      sorter: (a, b) => (a.titre || a.objectifFormation || "").localeCompare(b.titre || b.objectifFormation || ""),
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
      render: (v) => v || <Text type="secondary">—</Text>,
    },
    {
      title: "Date création",
      dataIndex: "dateCreation",
      width: 130,
      render: (d) =>
        d ? (
          <span style={{ fontSize: 12, color: "#8c8c8c", fontWeight: 500 }}>
            <CalendarOutlined style={{ marginRight: 4 }} />
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
        r.eventPublished ? (
          <span className="status-created">
            <span className="status-dot" />
            Créé
          </span>
        ) : (
          <span className="status-pending">
            <span className="status-dot" />
            En attente
          </span>
        ),
    },
    {
      title: "Action",
      key: "action",
      width: 160,
      fixed: "right",
      render: (_, record) => (
        <Tooltip title={record.eventPublished ? "Formation déjà créée" : "Créer la formation"}>
          <Button
            type={record.eventPublished ? "default" : "primary"}
            disabled={record.eventPublished}
            loading={approvingId === record.idBesoinFormation}
            onClick={() => handleApprove(record.idBesoinFormation)}
            icon={record.eventPublished ? <CheckCircleOutlined /> : <TrophyOutlined />}
            size="small"
            className={record.eventPublished ? "btn-created" : "btn-create"}
          >
            {record.eventPublished ? "Déjà créé" : "Créer formation"}
          </Button>
        </Tooltip>
      ),
    },
  ];

  if (loading && besoins.length === 0) {
    return (
      <div className="approval-container">
        <Skeleton active paragraph={{ rows: 4 }} className="besoin-skeleton" />
        <Skeleton active paragraph={{ rows: 8 }} className="besoin-skeleton" />
      </div>
    );
  }

  if (!besoins.length) {
    return (
      <div className="approval-container">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Empty
            description="Aucun besoin approuvé"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ marginTop: 80 }}
          >
            <Button type="primary" className="btn-brand" icon={<PlusOutlined />} onClick={() => navigate("/home/besoins")}>
              Voir les besoins
            </Button>
          </Empty>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      {msgCtx}
      <motion.div
        className="approval-container"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="approval-header">
          <Row justify="space-between" align="middle">
            <Col>
              <div className="approval-header-title">
                <ReadOutlined style={{ fontSize: 32, color: "#B51200" }} />
                <div>
                  <Title level={2} style={{ margin: 0, fontWeight: 700 }}>
                    Besoins de Formation Approuvés
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
                  onClick={() => navigate("/home/besoins")}
                  size="large"
                  className="btn-brand"
                >
                  Voir les besoins
                </Button>
              </Space>
            </Col>
          </Row>
        </motion.div>

        {/* Stats */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} md={8}>
            <motion.div variants={itemVariants}>
              <Card className="approval-stat-card total" size="small">
                <div className="approval-stat-icon total">
                  <TrophyOutlined />
                </div>
                <div className="approval-stat-value" style={{ color: "#1890ff" }}>{total}</div>
                <div className="approval-stat-label">Total approuvés</div>
              </Card>
            </motion.div>
          </Col>
          <Col xs={12} md={8}>
            <motion.div variants={itemVariants}>
              <Card className="approval-stat-card created" size="small">
                <div className="approval-stat-icon created">
                  <CheckCircleOutlined />
                </div>
                <div className="approval-stat-value" style={{ color: "#52c41a" }}>{createdCount}</div>
                <div className="approval-stat-label">Formations créées</div>
              </Card>
            </motion.div>
          </Col>
          <Col xs={12} md={8}>
            <motion.div variants={itemVariants}>
              <Card className="approval-stat-card pending" size="small">
                <div className="approval-stat-icon pending">
                  <TrophyOutlined />
                </div>
                <div className="approval-stat-value" style={{ color: "#fa8c16" }}>{pendingCount}</div>
                <div className="approval-stat-label">En attente de création</div>
              </Card>
            </motion.div>
          </Col>
        </Row>

        {/* Filtres */}
        <motion.div variants={itemVariants}>
          <Card className="approval-filter-card" size="small">
            <Space wrap size="middle" align="center">
              <div className="approval-filter-icon">
                <FilterOutlined />
              </div>
              <Select
                allowClear
                placeholder="Filtrer par département"
                style={{ width: 200 }}
                value={filters.deptId}
                onChange={(v) => setFilters((f) => ({ ...f, deptId: v }))}
                size="middle"
              >
                {departements.map((d) => (
                  <Option key={d.id} value={d.id}>{d.name || d.libelle}</Option>
                ))}
              </Select>
              <Select
                allowClear
                placeholder="Filtrer par UP"
                style={{ width: 200 }}
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
                placeholder="Filtrer par type"
                style={{ width: 200 }}
                value={filters.type}
                onChange={(v) => setFilters((f) => ({ ...f, type: v }))}
                size="middle"
              >
                {types.map((t) => (
                  <Option key={t} value={t}>{t?.replace(/_/g, " ")}</Option>
                ))}
              </Select>
              <Button icon={<ReloadOutlined />} onClick={() => setFilters({ deptId: null, upId: null, type: null })} size="middle">
                Réinitialiser
              </Button>
            </Space>
          </Card>
        </motion.div>

        {/* Table */}
        <motion.div variants={itemVariants}>
          <Card className="approval-table-card">
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
              scroll={{ x: 1200 }}
              size="middle"
              rowClassName={() => "animate-slide-in"}
            />
          </Card>
        </motion.div>
      </motion.div>
    </>
  );
}
