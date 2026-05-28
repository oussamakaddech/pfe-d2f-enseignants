// GeneratedCertificates.js
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { List, Button, Card, Tag, Empty, Spin } from "antd";
import {
  ArrowLeftOutlined,
  FilePdfOutlined,
  DownloadOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { useGenerateCertificates } from "@/hooks/certificat";
import { config } from "@/config/env";
import { AppPageHeader } from "@/components/common";
import "@/styles/pages/generated-certificates.css";

function GeneratedCertificates() {
  const { formationId } = useParams();
  const navigate = useNavigate();
  const generateMut = useGenerateCertificates();
  const [pdfFiles, setPdfFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!formationId) return;
    setLoading(true);
    generateMut.mutateAsync(formationId)
      .then((data) => setPdfFiles(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        {(() => {
          if (loading) return (
            <div style={{ textAlign: "center", padding: 40 }}>
              <Spin size="large" />
            </div>
          );
          if (pdfFiles.length === 0) return (
            <Empty
              description="Aucun certificat généré"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          );
          return (
          <List
            dataSource={pdfFiles}
            renderItem={(pdfFile: string) => (
              <List.Item
                className="generated-certs-list-item"
                actions={[
                  <Button
                    key="download"
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
          );
        })()}
      </Card>
    </div>
  );
}

export default GeneratedCertificates;








