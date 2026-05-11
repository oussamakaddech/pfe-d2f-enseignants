// GeneratedCertificates.js
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { List, Typography, Button, Space } from "antd";
import { ArrowLeftOutlined, FilePdfOutlined } from "@ant-design/icons";
import CertificateService from "../services/CertificateService";
import { config } from "../config/env";

function GeneratedCertificates() {
  const { formationId } = useParams();
  const [pdfFiles, setPdfFiles] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchGeneratedCertificates() {
      try {
        console.log(`🔍 Génération des certificats pour la formation ${formationId}...`);
        const data = await CertificateService.generateCertificates(formationId);
        console.log("✅ Fichiers générés :", data);
        setPdfFiles(data);
      } catch (error) {
        console.error("❌ Erreur lors de la génération des certificats :", error);
      }
    }
    fetchGeneratedCertificates();
  }, [formationId]);

  return (
    <div style={{ padding: 16 }}>
      <Typography.Title level={4}>Certificats générés</Typography.Title>
      <Typography.Text type="secondary">Formation ID : {formationId}</Typography.Text>
      <List
        style={{ marginTop: 16 }}
        dataSource={pdfFiles}
        renderItem={(pdfFile) => (
          <List.Item>
            <a href={`${config.CERTF_URL}/certificat/${pdfFile}`} target="_blank" rel="noopener noreferrer">
              <Space>
                <FilePdfOutlined />
                {pdfFile}
              </Space>
            </a>
          </List.Item>
        )}
      />
      <Button type="primary" icon={<ArrowLeftOutlined />} onClick={() => navigate("/home/certificate")} style={{ marginTop: 16 }}>
        Retour
      </Button>
    </div>
  );
}

export default GeneratedCertificates;
