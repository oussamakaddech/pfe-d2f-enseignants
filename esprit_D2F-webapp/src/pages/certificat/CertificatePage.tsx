// src/pages/CertificatePage.jsx
import  { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import CertificateService from "@/services/certificat/CertificateService";
import CertificateEditorViewerItem from "./CertificateEditorViewerItem";
import {
  Table,
  Input,
  Space,
  message,
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
import { AppPageHeader, brand, neutral } from "@/components/common";
import "@/styles/pages/certificate-page.css";

const { Search } = Input;

export default function CertificatePage() {
  const { formationId } = useParams();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState({
    nom: "",
    prenom: "",
    email: "",
    role: "",
  });

  useEffect(() => {
    const fetchCertificates = async () => {
      setLoading(true);
      try {
        const response = await CertificateService.getCertificatesByFormation(
          formationId
        );
        setCertificates(response.data);
      } catch (error) {
        console.error(error);
        message.error("Impossible de récupérer les certificats.");
      } finally {
        setLoading(false);
      }
    };
    fetchCertificates();
  }, [formationId]);

  const handleSearchChange = (field, value) => {
    setSearch((prev) => ({ ...prev, [field]: value }));
  };

  const filteredData = certificates.filter((cert) =>
    cert.nomEnseignant.toLowerCase().includes(search.nom.toLowerCase()) &&
    cert.prenomEnseignant.toLowerCase().includes(search.prenom.toLowerCase()) &&
    cert.mailEnseignant.toLowerCase().includes(search.email.toLowerCase()) &&
    cert.roleEnFormation.toLowerCase().includes(search.role.toLowerCase())
  );

  const handleCertUpdate = useCallback((updatedCert) => {
    setCertificates((prev) =>
      prev.map((c) =>
        c.idCertificate === updatedCert.idCertificate ? updatedCert : c
      )
    );
  }, []);

  const columns = [
    {
      title: "Nom",
      dataIndex: "nomEnseignant",
      key: "nomEnseignant",
      sorter: (a, b) => a.nomEnseignant.localeCompare(b.nomEnseignant),
    },
    {
      title: "Prénom",
      dataIndex: "prenomEnseignant",
      key: "prenomEnseignant",
      sorter: (a, b) => a.prenomEnseignant.localeCompare(b.prenomEnseignant),
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
      render: (role) => {
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
      onFilter: (value, record) =>
        record.roleEnFormation
          .toLowerCase()
          .includes(value.toLowerCase()),
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
          expandedRowRender: (record) => (
            <CertificateEditorViewerItem
              certificate={record}
              onUpdate={handleCertUpdate}
            />
          ),
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











