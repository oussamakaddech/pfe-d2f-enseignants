// src/pages/CertificatesByEmailPage.js
import { useEffect, useState } from "react";
import { Row, Col, Card, Typography } from "antd";
import { FilePdfOutlined } from "@ant-design/icons";
import CertificateService from "../services/CertificateService";
import CertificatePdfViewer from "./CertificatePdfViewer";

const { Title, Text } = Typography;

function CertificatesByEmailPage() {
  const [certificates, setCertificates] = useState([]);
  const [selectedCertificate, setSelectedCertificate] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await CertificateService.getCertificatesByEmail();
        setCertificates(response.data);
      } catch (error) {
        console.error("Erreur lors de la récupération des certificats :", error);
      }
    }
    fetchData();
  }, []);

  const handleSelectCertificate = (cert) => {
    setSelectedCertificate(cert);
  };

  return (
    <div style={{ padding: 20 }}>
      <Title level={4}>Mes Certificats</Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
        {certificates.map((cert) => {
          const isSelected =
            selectedCertificate &&
            selectedCertificate.idCertificate === cert.idCertificate;

          return (
            <Col xs={24} sm={12} md={6} key={cert.idCertificate}>
              <Card
                hoverable
                onClick={() => handleSelectCertificate(cert)}
                style={{
                  height: 200,
                  display: "flex",
                  flexDirection: "column",
                  backgroundColor: isSelected ? "#e0f7fa" : "inherit",
                  cursor: "pointer",
                }}
                bodyStyle={{
                  flex: "1 0 auto",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  padding: 10,
                }}
              >
                <FilePdfOutlined style={{ fontSize: 50, color: "#e53935" }} />
                <div
                  style={{
                    backgroundColor: "#f5f5f5",
                    padding: "8px 10px",
                    textAlign: "center",
                    width: "100%",
                    marginTop: 12,
                    borderRadius: 4,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  <Text strong>{cert.titreFormation || "Certificat"}</Text>
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>

      {selectedCertificate && (
        <div style={{ marginTop: 30, height: 600 }}>
          <Title level={5}>Visualisation du Certificat</Title>
          <CertificatePdfViewer certificate={selectedCertificate} />
        </div>
      )}
    </div>
  );
}

export default CertificatesByEmailPage;
