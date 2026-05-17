// GeneratedCertificates.js
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { List, Typography, Button, Space, Card, Tag, Empty, Spin } from "antd";
import {
  ArrowLeftOutlined,
  FilePdfOutlined,
  FileProtectOutlined,
  DownloadOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import CertificateService from "../services/CertificateService";
import { config } from "../config/env";
import { AppPageHeader, brand } from "../theme";
import "./GeneratedCertificates.css";

function GeneratedCertificates() {
  const { formationId } = useParams();
  const [pdfFiles, setPdfFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchGeneratedCertificates() {
      setLoading(true);
      try {
        const data = await CertificateService.generateCertificates(formationId);
        setPdfFiles(data);
      } catch (error) {
        console.error("Erreur lors de la génération des certificats :", error);
      } finally {
        setLoading(false);
      }
    }
    fetchGeneratedCertificates();
  }, [formationId]);

  return (
    <div>
      <AppPageHeader
        icon={<SafetyCertificateOutlined />}
        title="Certificats générés"
        subtitle={`Formation #${formationId} — ${pdfFiles.length} certificat${pdfFiles.length !== 1 ? "s" : ""}`}
        actions={
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/home/certificate")}
            className="generated-certs-btn-back"
          >
            Retour
          </Button>
        }
      />

      <Card className="generated-certs-card">
        {loading ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <Spin size="large" />
          </div>
        ) : pdfFiles.length === 0 ? (
          <Empty
            description="Aucun certificat généré"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <List
            dataSource={pdfFiles}
            renderItem={(pdfFile) => (
              <List.Item
                className="generated-certs-list-item"
                actions={[
                  <Button
                    type="text"
                    icon={<DownloadOutlined />}
                    href={`${config.CERTF_URL}/certificat/${pdfFile}`}
                    target="_blank"
                    className="generated-certs-btn-download"
                  >
                    Télécharger
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <div className="generated-certs-pdf-avatar">
                      <FilePdfOutlined style={{ fontSize: 20, color: "#e53935" }} />
                    </div>
                  }
                  title={
                    <span className="generated-certs-file-title">{pdfFile}</span>
                  }
                  description={
                    <Tag color="red" className="generated-certs-pdf-tag">PDF</Tag>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
}

export default GeneratedCertificates;
