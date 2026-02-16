// src/pages/CertificatePage.jsx
import  { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import CertificateService from "../services/CertificateService";
import CertificateEditorViewerItem from "./CertificateEditorViewerItem";
import {
  Table,
  Input,
  Typography,
  Space,
  message,
  Card,

} from "antd";

const { Title } = Typography;
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

  return (
    <Card style={{ margin: 24 }} bordered={false}>
      <Title level={2}>Certificats pour la formation {formationId}</Title>

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
        pagination={{ pageSize: 10, showSizeChanger: true }}
        expandable={{
          expandedRowRender: (record) => (
            <CertificateEditorViewerItem
              certificate={record}
              onUpdate={(updatedCert) => {
                setCertificates((prev) =>
                  prev.map((c) =>
                    c.idCertificate === updatedCert.idCertificate
                      ? updatedCert
                      : c
                  )
                );
              }}
            />
          ),
          expandRowByClick: true,
        }}
        locale={{
          emptyText: "Aucun certificat trouvé pour ces critères.",
        }}
      />
    </Card>
  );
}
