import { useState, useRef } from "react";
import {
  Table,
  Button,
  Space,
  Input,
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
import { writeExcel, exportDateLabel, isoDate } from "utils/helpers/excelExport";
import { useInscriptionsByFormation, useTraiterDemande } from "@/hooks/formation";
import useAppNotification from "@/hooks/ui/useAppNotification";
import { AppPageHeader, brand } from "@/components/common";
import "@/styles/pages/demandes-list.css";

const { Title, Text } = Typography;

export default function DemandesList() {
  const { id: formationId } = useParams();
  const navigate = useNavigate();
  const [searchedColumn, setSearchedColumn] = useState("");
  const searchInput = useRef<any>(null);
  const { message: msgApi } = useAppNotification();

  const { data: demandes = [], isLoading: loading, refetch } = useInscriptionsByFormation(formationId);
  const traiterMut = useTraiterDemande();

  const handleTraitement = async (id: any, approuver: any) => {
    try {
      await traiterMut.mutateAsync({ id, approuver });
      msgApi.success(approuver ? "✅ Demande approuvée" : "❌ Demande rejetée");
      void refetch();
    } catch {
      msgApi.error("Erreur lors du traitement");
    }
  };

  const handleSearch = (selectedKeys: any, confirm: any, dataIndex: any) => {
    confirm();
    setSearchedColumn(dataIndex);
  };

  const handleReset = (clearFilters: any) => {
    clearFilters();
  };

  const getColumnSearchProps = (dataIndex: any) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: any) => (
      <div style={{ padding: 8 }}>
        <Input
          ref={searchInput}
          placeholder={`Rechercher ${dataIndex}`}
          value={selectedKeys[0]}
          onChange={(e: any) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
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
    filterIcon: (filtered: any) => (
      <SearchOutlined style={{ color: filtered ? "#B51200" : undefined }} />
    ),
    onFilter: (value: any, record: any) =>
      record[dataIndex]?.toString().toLowerCase().includes(value.toLowerCase()),
    filterDropdownProps: {
      onOpenChange: (visible: any) => {
        if (visible) setTimeout(() => searchInput.current?.select(), 100);
      },
    },
    render: (text: any) =>
      searchedColumn === dataIndex ? (
        <span style={{ backgroundColor: "#ffc069", padding: "0 4px", borderRadius: 4 }}>{text}</span>
      ) : (
        text
      ),
  });

  const exportToExcel = () => {
    const approved = demandes.filter((r: any) => r.etat === "APPROVED");
    const rows = approved.map((r: any) => ({
      Nom:         r.enseignant.nom,
      Prénom:      r.enseignant.prenom,
      Email:       r.enseignant.mail,
      Département: r.enseignant.deptLibelle || "—",
      UP:          r.enseignant.upLibelle || "—",
      État:        r.etat,
      Date:        new Date(r.dateDemande).toLocaleString("fr-FR"),
    }));
    writeExcel(
      [{ name: "Inscriptions", rows, title: "Inscriptions approuvées", subtitle: exportDateLabel() }],
      `inscriptions_formation_${formationId}_${isoDate()}.xlsx`
    );
  };

  // Statistiques
  const total = demandes.length;
  const approvedCount = demandes.filter((d: any) => d.etat === "APPROVED").length;
  const pendingCount = demandes.filter((d: any) => d.etat === "PENDING").length;
  const rejectedCount = demandes.filter((d: any) => d.etat === "REJECTED").length;

  if (loading) return <Spin style={{ display: "block", margin: "4rem auto" }} size="large" />;
  if (!demandes.length)
    return (
      <Empty
        description="Aucune inscription pour cette formation"
        style={{ marginTop: 80 }}
      />
    );

  const columns: any[] = [
    {
      title: "Enseignant",
      key: "enseignant",
      render: (_: any, r: any) => (
        <Space>
          <Avatar
            style={{ backgroundColor: brand[500] }}
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
      ...getColumnSearchProps("deptLibelle"),
      render: (val: any) => (
        <Tag icon={<ApartmentOutlined />} color="processing">
          {val || "—"}
        </Tag>
      ),
      sorter: (a: any, b: any) =>
        (a.enseignant.deptLibelle || "").localeCompare(b.enseignant.deptLibelle || ""),
    },
    {
      title: "UP",
      dataIndex: ["enseignant", "upLibelle"],
      key: "upLibelle",
      ...getColumnSearchProps("upLibelle"),
      render: (val: any) => (
        <Tag icon={<TeamOutlined />} color="default">
          {val || "—"}
        </Tag>
      ),
      sorter: (a: any, b: any) =>
        (a.enseignant.upLibelle || "").localeCompare(b.enseignant.upLibelle || ""),
    },
    {
      title: "Date demande",
      dataIndex: "dateDemande",
      key: "dateDemande",
      render: (d: any) => (
        <Text type="secondary">
          <ClockCircleOutlined style={{ marginRight: 6 }} />
          {new Date(d).toLocaleDateString("fr-FR")}
        </Text>
      ),
      sorter: (a: any, b: any) => new Date(a.dateDemande).getTime() - new Date(b.dateDemande).getTime(),
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
      onFilter: (value: any, record: any) => record.etat === value,
      render: (etat: any) => {
        const config = {
          APPROVED: { color: "success", icon: <CheckCircleOutlined />, text: "Approuvé" },
          REJECTED: { color: "error", icon: <CloseCircleOutlined />, text: "Rejeté" },
          PENDING:  { color: "warning", icon: <ClockCircleOutlined />, text: "En attente" },
        };
        const c = (config as any)[etat] || config.PENDING;
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
      render: (_: any, r: any) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<CheckCircleOutlined />}
            disabled={r.etat === "APPROVED"}
            onClick={() => handleTraitement(r.id, true)}
            style={r.etat === "APPROVED" ? {} : { backgroundColor: "#1D6F42", borderColor: "#1D6F42" }}
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
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <AppPageHeader
          icon={<UserOutlined />}
          title={`Demandes d'inscription — Formation #${formationId}`}
          subtitle="Gérer et traiter les demandes d'inscription des enseignants"
          actions={
            <Space>
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
                Retour
              </Button>
              <Button icon={<ReloadOutlined />} onClick={() => void refetch()} loading={loading}>
                Actualiser
              </Button>
              <Button
                type="primary"
                icon={<FileExcelOutlined />}
                onClick={exportToExcel}
                style={{ backgroundColor: "#1D6F42", borderColor: "#1D6F42" }}
              >
                Exporter approuvées
              </Button>
            </Space>
          }
        />

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
  );
}




