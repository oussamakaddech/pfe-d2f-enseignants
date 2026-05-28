import { useState, useCallback, type Key } from "react";
import { useParams } from "react-router-dom";
import { useCertificatesByFormation, useUpdateCertificate } from "@/hooks/certificat/useCertificats";
import CertificateEditorViewerItem from "./CertificateEditorViewerItem";
import type { Certificate } from "@/models/certificat";
import {
  Table,
  Input,
  Space,
  Card,
  Tag,
  Row,
  Col,
  Statistic,
} from "antd";
import {
  SafetyCertificateOutlined,
  UserOutlined,
  TeamOutlined,
  FileProtectOutlined,
} from "@ant-design/icons";
import { AppPageHeader } from "@/components/common";
import { brand } from "@/styles/themes/tokens";
import "@/styles/pages/certificate-page.css";

const { Search } = Input;

export default function CertificatePage() {
  const { formationId } = useParams<string>();
  const { data: certificates = [], isLoading: loading } = useCertificatesByFormation(formationId);
  const updateMutation = useUpdateCertificate();
  const [search, setSearch] = useState({
    nom: "",
    prenom: "",
    email: "",
    role: "",
  });

  const handleSearchChange = (field: string, value: string) => {
    setSearch((prev) => ({ ...prev, [field]: value }));
  };

  const filteredData = certificates.filter((cert: Certificate) =>
    (cert.nomEnseignant || "").toLowerCase().includes(search.nom.toLowerCase()) &&
    (cert.prenomEnseignant || "").toLowerCase().includes(search.prenom.toLowerCase()) &&
    ((cert as Record<string, string>).mailEnseignant || "").toLowerCase().includes(search.email.toLowerCase()) &&
    (cert.roleEnFormation || "").toLowerCase().includes(search.role.toLowerCase())
  );

  const handleCertUpdate = useCallback((updatedCert: Certificate) => {
    if (updatedCert.idCertificate) {
      updateMutation.mutate({ id: updatedCert.idCertificate, data: updatedCert });
    }
  }, [updateMutation]);

  const renderExpandedRow = useCallback((record: Certificate) => (
    <CertificateEditorViewerItem certificate={record} onUpdate={handleCertUpdate} />
  ), [handleCertUpdate]);

  const columns = [
    {
      title: "Nom",
      dataIndex: "nomEnseignant",
      key: "nomEnseignant",
      sorter: (a: Certificate, b: Certificate) => (a.nomEnseignant || "").localeCompare(b.nomEnseignant || ""),
    },
    {
      title: "Prénom",
      dataIndex: "prenomEnseignant",
      key: "prenomEnseignant",
      sorter: (a: Certificate, b: Certificate) => (a.prenomEnseignant || "").localeCompare(b.prenomEnseignant || ""),
    },
    {
      title: "Email",
      dataIndex: "mailEnseignant",
      key: "mailEnseignant",
    },
    {
      title: "Rôle",
      dataIndex: "roleEnFormation",
      key: "roleEnFormation",
      render: (role: string) => {
        const isAnimateur = role?.toLowerCase().includes("animateur");
        return (
          <Tag
            color={isAnimateur ? "#059669" : "#2563eb"}
            className="certificate-role-tag"
          >
            {role || "—"}
          </Tag>
        );
      },
      filters: [
        { text: "ANIMATEUR", value: "animateur" },
        { text: "PARTICIPANT", value: "participant" },
      ],
      onFilter: (value: boolean | Key, record: Certificate) =>
        (record.roleEnFormation || "")
          .toLowerCase()
          .includes(String(value).toLowerCase()),
    },
  ];

  const animateurCount = certificates.filter(c => c.roleEnFormation?.toLowerCase().includes("animateur")).length;
  const participantCount = certificates.filter(c => c.roleEnFormation?.toLowerCase().includes("participant")).length;

  return (
    <div>
      <AppPageHeader
        icon={<SafetyCertificateOutlined />}
        title={`Certificats — Formation #${formationId}`}
        subtitle="Consulter et modifier les certificats des participants"
      />

      {/* Statistiques */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <Card size="small" className="certificate-stat-card">
            <Statistic
              title="Total Certificats"
              value={certificates.length}
              prefix={<FileProtectOutlined style={{ color: brand[500] }} />}
              valueStyle={{ color: brand[500], fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" className="certificate-stat-card">
            <Statistic
              title="Animateurs"
              value={animateurCount}
              prefix={<UserOutlined style={{ color: "#059669" }} />}
              valueStyle={{ color: "#059669", fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" className="certificate-stat-card">
            <Statistic
              title="Participants"
              value={participantCount}
              prefix={<TeamOutlined style={{ color: "#2563eb" }} />}
              valueStyle={{ color: "#2563eb", fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        variant="borderless"
        className="certificate-main-card"
      >
      <Space
        wrap
        style={{ marginBottom: 16, display: "flex", gap: "8px" }}
      >
        <Search
          placeholder="Rechercher par nom"
          allowClear
          onSearch={(v) => handleSearchChange("nom", v)}
          style={{ width: 200 }}
        />
        <Search
          placeholder="Rechercher par prénom"
          allowClear
          onSearch={(v) => handleSearchChange("prenom", v)}
          style={{ width: 200 }}
        />
        <Search
          placeholder="Rechercher par email"
          allowClear
          onSearch={(v) => handleSearchChange("email", v)}
          style={{ width: 250 }}
        />
        <Search
          placeholder="Rechercher par rôle"
          allowClear
          onSearch={(v) => handleSearchChange("role", v)}
          style={{ width: 200 }}
        />
      </Space>

      <Table
        rowKey="idCertificate"
        dataSource={filteredData}
        columns={columns}
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `${total} certificat${total !== 1 ? "s" : ""}` }}
        expandable={{
          expandedRowRender: renderExpandedRow,
          expandRowByClick: true,
        }}
        locale={{
          emptyText: "Aucun certificat trouvé pour ces critères.",
        }}
      />
      </Card>
    </div>
  );
}











