import { useEffect, useState, useRef } from "react";
import {
  Table,
  Button,
  Space,
  Input,
  message,
  Typography,
  Spin,
  Empty,
  Card,
  Row,
  Col,
  Badge,
  Tag,
  Avatar,
  Statistic,
} from "antd";
import {
  SearchOutlined,
  FileExcelOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  UserOutlined,
  MailOutlined,
  ApartmentOutlined,
  TeamOutlined,
  ReloadOutlined,
  ArrowLeftOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { useParams, useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import InscriptionService from "../../services/InscriptionService";

const { Title, Text } = Typography;

export default function DemandesList() {
  const { id: formationId } = useParams();
  const navigate = useNavigate();
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [, setSearchText] = useState("");
  const [searchedColumn, setSearchedColumn] = useState("");
  const searchInput = useRef(null);
  const [msgApi, msgCtx] = message.useMessage();

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await InscriptionService.getInscriptionsByFormation(formationId);
      setDemandes(data);
    } catch {
      msgApi.error("Impossible de charger les inscriptions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formationId]);

  const handleTraitement = async (id, approuver) => {
    try {
      await InscriptionService.traiterDemande(id, approuver);
      msgApi.success(approuver ? "✅ Demande approuvée" : "❌ Demande rejetée");
      await fetchData();
    } catch {
      msgApi.error("Erreur lors du traitement");
    }
  };

  const handleSearch = (selectedKeys, confirm, dataIndex) => {
    confirm();
    setSearchText(selectedKeys[0] || "");
    setSearchedColumn(dataIndex);
  };

  const handleReset = (clearFilters) => {
    clearFilters();
    setSearchText("");
  };

  const getColumnSearchProps = (dataIndex) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
      <div style={{ padding: 8 }}>
        <Input
          ref={searchInput}
          placeholder={`Rechercher ${dataIndex}`}
          value={selectedKeys[0]}
          onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => handleSearch(selectedKeys, confirm, dataIndex)}
          style={{ marginBottom: 8, display: "block" }}
        />
        <Space>
          <Button
            type="primary"
            onClick={() => handleSearch(selectedKeys, confirm, dataIndex)}
            icon={<SearchOutlined />}
            size="small"
          >
            OK
          </Button>
          <Button onClick={() => handleReset(clearFilters)} size="small">
            Réinitialiser
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered) => (
      <SearchOutlined style={{ color: filtered ? "#B51200" : undefined }} />
    ),
    onFilter: (value, record) =>
      record[dataIndex]?.toString().toLowerCase().includes(value.toLowerCase()),
    onFilterDropdownVisibleChange: (visible) => {
      if (visible) setTimeout(() => searchInput.current?.select(), 100);
    },
    render: (text) =>
      searchedColumn === dataIndex ? (
        <span style={{ backgroundColor: "#ffc069", padding: "0 4px", borderRadius: 4 }}>{text}</span>
      ) : (
        text
      ),
  });

  const exportToExcel = () => {
    const approved = demandes.filter((r) => r.etat === "APPROVED");
    const exportData = approved.map((r) => ({
      Email: r.enseignant.mail,
      Prénom: r.enseignant.prenom,
      Nom: r.enseignant.nom,
      Département: r.enseignant.deptLibelle,
      UP: r.enseignant.upLibelle,
      État: r.etat,
      Date: new Date(r.dateDemande).toLocaleString("fr-FR"),
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inscriptions");
    XLSX.writeFile(wb, `inscriptions_formation_${formationId}.xlsx`);
  };

  // Statistiques
  const total = demandes.length;
  const approvedCount = demandes.filter((d) => d.etat === "APPROVED").length;
  const pendingCount = demandes.filter((d) => d.etat === "PENDING").length;
  const rejectedCount = demandes.filter((d) => d.etat === "REJECTED").length;

  if (loading) return <Spin style={{ display: "block", margin: "4rem auto" }} size="large" />;
  if (!demandes.length)
    return (
      <Empty
        description="Aucune inscription pour cette formation"
        style={{ marginTop: 80 }}
      />
    );

  const columns = [
    {
      title: "Enseignant",
      key: "enseignant",
      render: (_, r) => (
        <Space>
          <Avatar
            style={{ backgroundColor: "#B51200" }}
            icon={<UserOutlined />}
          >
            {r.enseignant.prenom?.[0]}{r.enseignant.nom?.[0]}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600 }}>
              {r.enseignant.prenom} {r.enseignant.nom}
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              <MailOutlined style={{ marginRight: 4 }} />
              {r.enseignant.mail}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: "Département",
      dataIndex: ["enseignant", "deptLibelle"],
      key: "deptLibelle",
      render: (val) => (
        <Tag icon={<ApartmentOutlined />} color="processing">
          {val || "—"}
        </Tag>
      ),
      sorter: (a, b) =>
        (a.enseignant.deptLibelle || "").localeCompare(b.enseignant.deptLibelle || ""),
      ...getColumnSearchProps("deptLibelle"),
    },
    {
      title: "UP",
      dataIndex: ["enseignant", "upLibelle"],
      key: "upLibelle",
      render: (val) => (
        <Tag icon={<TeamOutlined />} color="default">
          {val || "—"}
        </Tag>
      ),
      sorter: (a, b) =>
        (a.enseignant.upLibelle || "").localeCompare(b.enseignant.upLibelle || ""),
      ...getColumnSearchProps("upLibelle"),
    },
    {
      title: "Date demande",
      dataIndex: "dateDemande",
      key: "dateDemande",
      render: (d) => (
        <Text type="secondary">
          <ClockCircleOutlined style={{ marginRight: 6 }} />
          {new Date(d).toLocaleDateString("fr-FR")}
        </Text>
      ),
      sorter: (a, b) => new Date(a.dateDemande) - new Date(b.dateDemande),
    },
    {
      title: "État",
      dataIndex: "etat",
      key: "etat",
      filters: [
        { text: "En attente", value: "PENDING" },
        { text: "Approuvé", value: "APPROVED" },
        { text: "Rejeté", value: "REJECTED" },
      ],
      onFilter: (value, record) => record.etat === value,
      render: (etat) => {
        const config = {
          APPROVED: { color: "success", icon: <CheckCircleOutlined />, text: "Approuvé" },
          REJECTED: { color: "error", icon: <CloseCircleOutlined />, text: "Rejeté" },
          PENDING:  { color: "warning", icon: <ClockCircleOutlined />, text: "En attente" },
        };
        const c = config[etat] || config.PENDING;
        return (
          <Badge
            status={c.color}
            text={
              <Tag color={c.color} icon={c.icon} style={{ fontWeight: 500 }}>
                {c.text}
              </Tag>
            }
          />
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 220,
      render: (_, r) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<CheckCircleOutlined />}
            disabled={r.etat === "APPROVED"}
            onClick={() => handleTraitement(r.id, true)}
            style={r.etat === "APPROVED" ? {} : { backgroundColor: "#52c41a", borderColor: "#52c41a" }}
          >
            Approuver
          </Button>
          <Button
            danger
            size="small"
            icon={<CloseCircleOutlined />}
            disabled={r.etat === "REJECTED"}
            onClick={() => handleTraitement(r.id, false)}
          >
            Rejeter
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      {msgCtx}
      <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
        {/* Header */}
        <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
          <Col>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(-1)}
              style={{ marginBottom: 8 }}
            >
              Retour
            </Button>
            <Title level={3} style={{ margin: 0 }}>
              <UserOutlined style={{ marginRight: 10, color: "#B51200" }} />
              Demandes d&apos;inscription
            </Title>
            <Text type="secondary">Formation #{formationId}</Text>
          </Col>
          <Col>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
                Actualiser
              </Button>
              <Button
                type="primary"
                icon={<FileExcelOutlined />}
                onClick={exportToExcel}
                style={{ backgroundColor: "#B51200", borderColor: "#B51200" }}
              >
                Exporter approuvées
              </Button>
            </Space>
          </Col>
        </Row>

        {/* Statistiques */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} md={6}>
            <Card size="small">
              <Statistic
                title="Total"
                value={total}
                valueStyle={{ color: "#1890ff", fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small">
              <Statistic
                title="Approuvés"
                value={approvedCount}
                valueStyle={{ color: "#52c41a", fontWeight: 700 }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small">
              <Statistic
                title="En attente"
                value={pendingCount}
                valueStyle={{ color: "#faad14", fontWeight: 700 }}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small">
              <Statistic
                title="Rejetés"
                value={rejectedCount}
                valueStyle={{ color: "#ff4d4f", fontWeight: 700 }}
                prefix={<CloseCircleOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {/* Table */}
        <Card style={{ borderRadius: 12 }}>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={demandes}
            pagination={{ pageSize: 8, showSizeChanger: true, pageSizeOptions: [8, 16, 32] }}
            scroll={{ x: 900 }}
            size="middle"
          />
        </Card>
      </div>
    </>
  );
}
