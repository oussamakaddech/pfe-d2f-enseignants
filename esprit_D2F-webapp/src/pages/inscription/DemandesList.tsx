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
import type { TableColumnsType } from "antd";
import type { FilterDropdownProps } from "antd/es/table/interface";
import type { InputRef } from "antd";
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
import type { Id } from "@/models/common";

const { Text } = Typography;

type EtatDemande = "APPROVED" | "REJECTED" | "PENDING";

interface EnseignantRef {
  nom?: string;
  prenom?: string;
  mail?: string;
  deptLibelle?: string;
  upLibelle?: string;
}

interface Demande {
  id: Id;
  etat: EtatDemande;
  dateDemande: string;
  enseignant: EnseignantRef;
}

const ETAT_CONFIG: Record<EtatDemande, { color: "success" | "error" | "warning"; icon: React.ReactNode; text: string }> = {
  APPROVED: { color: "success", icon: <CheckCircleOutlined />, text: "Approuvé" },
  REJECTED: { color: "error",   icon: <CloseCircleOutlined />, text: "Rejeté" },
  PENDING:  { color: "warning", icon: <ClockCircleOutlined />, text: "En attente" },
};

export default function DemandesList() {
  const { id: formationId } = useParams();
  const navigate = useNavigate();
  const [searchedColumn, setSearchedColumn] = useState("");
  const searchInput = useRef<InputRef>(null);
  const { message: msgApi } = useAppNotification();

  const { data: rawDemandes = [], isLoading: loading, refetch } = useInscriptionsByFormation(formationId);
  const demandes = rawDemandes as Demande[];
  const traiterMut = useTraiterDemande();

  const handleTraitement = async (id: Id, approuver: boolean) => {
    try {
      await traiterMut.mutateAsync({ id, approuver });
      msgApi.success(approuver ? "✅ Demande approuvée" : "❌ Demande rejetée");
      void refetch();
    } catch {
      msgApi.error("Erreur lors du traitement");
    }
  };

  const handleSearch = (selectedKeys: React.Key[], confirm: FilterDropdownProps["confirm"], dataIndex: string) => {
    confirm();
    setSearchedColumn(dataIndex);
  };

  const handleReset = (clearFilters: (() => void) | undefined) => {
    clearFilters?.();
  };

  const getColumnSearchProps = (dataIndex: keyof EnseignantRef) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: FilterDropdownProps) => (
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
    filterIcon: (filtered: boolean) => (
      <SearchOutlined style={{ color: filtered ? "#B51200" : undefined }} />
    ),
    onFilter: (value: boolean | React.Key, record: Demande) =>
      record.enseignant[dataIndex]?.toString().toLowerCase().includes(String(value).toLowerCase()) ?? false,
    filterDropdownProps: {
      onOpenChange: (visible: boolean) => {
        if (visible) setTimeout(() => searchInput.current?.select(), 100);
      },
    },
    render: (text: string) =>
      searchedColumn === dataIndex ? (
        <span style={{ backgroundColor: "#ffc069", padding: "0 4px", borderRadius: 4 }}>{text}</span>
      ) : (
        text
      ),
  });

  const exportToExcel = () => {
    const approved = demandes.filter((r) => r.etat === "APPROVED");
    const rows = approved.map((r) => ({
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
      `inscriptions_formation_${formationId}_${isoDate()}.xlsx`,
    );
  };

  const total = demandes.length;
  const approvedCount = demandes.filter((d) => d.etat === "APPROVED").length;
  const pendingCount = demandes.filter((d) => d.etat === "PENDING").length;
  const rejectedCount = demandes.filter((d) => d.etat === "REJECTED").length;

  if (loading) return <Spin style={{ display: "block", margin: "4rem auto" }} size="large" />;
  if (!demandes.length)
    return <Empty description="Aucune inscription pour cette formation" style={{ marginTop: 80 }} />;

  const columns: TableColumnsType<Demande> = [
    {
      title: "Enseignant",
      key: "enseignant",
      render: (_, r) => (
        <Space>
          <Avatar style={{ backgroundColor: brand[500] }} icon={<UserOutlined />}>
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
      render: (val: string) => (
        <Tag icon={<ApartmentOutlined />} color="processing">{val || "—"}</Tag>
      ),
      sorter: (a, b) => (a.enseignant.deptLibelle || "").localeCompare(b.enseignant.deptLibelle || ""),
    },
    {
      title: "UP",
      dataIndex: ["enseignant", "upLibelle"],
      key: "upLibelle",
      ...getColumnSearchProps("upLibelle"),
      render: (val: string) => (
        <Tag icon={<TeamOutlined />} color="default">{val || "—"}</Tag>
      ),
      sorter: (a, b) => (a.enseignant.upLibelle || "").localeCompare(b.enseignant.upLibelle || ""),
    },
    {
      title: "Date demande",
      dataIndex: "dateDemande",
      key: "dateDemande",
      render: (d: string) => (
        <Text type="secondary">
          <ClockCircleOutlined style={{ marginRight: 6 }} />
          {new Date(d).toLocaleDateString("fr-FR")}
        </Text>
      ),
      sorter: (a, b) => new Date(a.dateDemande).getTime() - new Date(b.dateDemande).getTime(),
    },
    {
      title: "État",
      dataIndex: "etat",
      key: "etat",
      filters: [
        { text: "En attente", value: "PENDING" },
        { text: "Approuvé",   value: "APPROVED" },
        { text: "Rejeté",     value: "REJECTED" },
      ],
      onFilter: (value, record) => record.etat === value,
      render: (etat: EtatDemande) => {
        const c = ETAT_CONFIG[etat] ?? ETAT_CONFIG.PENDING;
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
            onClick={() => void handleTraitement(r.id, true)}
            style={r.etat === "APPROVED" ? {} : { backgroundColor: "#1D6F42", borderColor: "#1D6F42" }}
          >
            Approuver
          </Button>
          <Button
            danger
            size="small"
            icon={<CloseCircleOutlined />}
            disabled={r.etat === "REJECTED"}
            onClick={() => void handleTraitement(r.id, false)}
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
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>Retour</Button>
              <Button icon={<ReloadOutlined />} onClick={() => void refetch()} loading={loading}>Actualiser</Button>
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

        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} md={6}>
            <Card size="small">
              <Statistic title="Total" value={total} valueStyle={{ color: "#1890ff", fontWeight: 700 }} />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small">
              <Statistic title="Approuvés" value={approvedCount} valueStyle={{ color: "#52c41a", fontWeight: 700 }} prefix={<CheckCircleOutlined />} />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small">
              <Statistic title="En attente" value={pendingCount} valueStyle={{ color: "#faad14", fontWeight: 700 }} prefix={<ClockCircleOutlined />} />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small">
              <Statistic title="Rejetés" value={rejectedCount} valueStyle={{ color: "#ff4d4f", fontWeight: 700 }} prefix={<CloseCircleOutlined />} />
            </Card>
          </Col>
        </Row>

        <Card style={{ borderRadius: 12 }}>
          <Table<Demande>
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
