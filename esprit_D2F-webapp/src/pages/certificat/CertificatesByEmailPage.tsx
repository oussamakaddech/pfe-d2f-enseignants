import { useState } from "react";
import { Row, Col, Card, Typography, Tag, Empty, Statistic } from "antd";
import {
  FilePdfOutlined,
  SafetyCertificateOutlined,
  EyeOutlined,
  FileProtectOutlined,
} from "@ant-design/icons";
import { useCertificatesByEmail } from "@/hooks/certificat/useCertificats";
import CertificatePdfViewer, { type CertificatePdfViewerProps } from "./CertificatePdfViewer";
import type { Certificate as CertificateModel } from "@/models/certificat";
import { AppPageHeader, brand } from "@/components/common";
import "@/styles/pages/certificates-by-email-page.css";

const { Text, Title } = Typography;

function CertificatesByEmailPage() {
  const { data: certificates = [] } = useCertificatesByEmail();
  const [selectedCertificate, setSelectedCertificate] = useState<CertificateModel | null>(null);

  const handleSelectCertificate = (cert: CertificateModel) => {
    setSelectedCertificate(cert);
  };

  return (
    <div>
      <AppPageHeader
        icon={<SafetyCertificateOutlined />}
        title="Mes Certificats"
        subtitle="Consulter et télécharger vos certificats de formation"
      />

      {/* Statistique */}
      {certificates.length > 0 && (
        <Card size="small" className="certs-email-stat-card">
          <Statistic
            title="Certificats obtenus"
            value={certificates.length}
            prefix={<FileProtectOutlined style={{ color: brand[500] }} />}
            valueStyle={{ color: brand[500], fontWeight: 700 }}
          />
        </Card>
      )}

      {certificates.length === 0 ? (
        <Empty
          description="Aucun certificat disponible"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ marginTop: 60 }}
        />
      ) : (
        <Row gutter={[20, 20]} style={{ marginBottom: 32 }}>
          {certificates.map((cert: CertificateModel) => {
            const isSelected =
              selectedCertificate &&
              selectedCertificate.idCertificate === cert.idCertificate;

            return (
              <Col xs={24} sm={12} md={8} lg={6} key={cert.idCertificate}>
                <button
                  type="button"
                  onClick={() => handleSelectCertificate(cert)}
                  className={`certs-email-card ${isSelected ? "certs-email-card--selected" : ""}`}
                >
                  <div className={`certs-email-icon ${isSelected ? "certs-email-icon--selected" : ""}`}>
                    <FilePdfOutlined
                      style={{
                        fontSize: 28,
                        color: isSelected ? "#fff" : "#e53935",
                      }}
                    />
                  </div>
                  <Text
                    strong
                    className={`certs-email-title ${isSelected ? "certs-email-title--selected" : ""}`}
                  >
                    {cert.titreFormation || "Certificat"}
                  </Text>
                  {cert.roleEnFormation && (
                    <Tag
                      color={cert.roleEnFormation.toLowerCase().includes("animateur") ? "#059669" : "#2563eb"}
                      className="certs-email-role-tag"
                    >
                      {cert.roleEnFormation}
                    </Tag>
                  )}
                  {isSelected && (
                    <div style={{ marginTop: 12 }}>
                      <Tag
                        icon={<EyeOutlined />}
                        color="processing"
                        className="certs-email-preview-tag"
                      >
                        Aperçu actif
                      </Tag>
                    </div>
                  )}
                </button>
              </Col>
            );
          })}
        </Row>
      )}

      {selectedCertificate && (
        <Card
          className="certs-email-viewer-card"
          title={
            <span className="certs-email-viewer-title">
              <EyeOutlined style={{ marginRight: 8, color: brand[500] }} />
              Visualisation du Certificat
            </span>
          }
        >
          <div style={{ height: 600 }}>
            <CertificatePdfViewer certificate={selectedCertificate as CertificatePdfViewerProps["certificate"]} />
          </div>
        </Card>
      )}
    </div>
  );
}

export default CertificatesByEmailPage;











