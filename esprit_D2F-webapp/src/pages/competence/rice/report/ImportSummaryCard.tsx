// ImportSummaryCard — summary statistics for the RICE import report.
// Extracted from ReportStep.tsx for DSI 200-line compliance.

import { Alert, Card, Col, Collapse, Row, Space, Typography } from "antd";
import { WarningOutlined } from "@ant-design/icons";

const { Text } = Typography;

interface ImportStats {
  upserted_domaines?: number;
  upserted_competences?: number;
  inserted_savoirs?: number;
  updated_savoirs?: number;
  inserted_enseignant_links?: number;
  errors?: string[];
}

interface ImportSummaryCardProps {
  importStats: ImportStats;
}

export default function ImportSummaryCard({ importStats }: Readonly<ImportSummaryCardProps>) {
  const errorCount = importStats.errors?.length ?? 0;
  return (
    <>
      <Card title="Résumé de l'import" size="small" style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]}>
          <Col xs={12} md={8} lg={4}><Card size="small">✅ Domaines importés : <Text strong>{importStats.upserted_domaines}</Text></Card></Col>
          <Col xs={12} md={8} lg={4}><Card size="small">✅ Compétences : <Text strong>{importStats.upserted_competences}</Text></Card></Col>
          <Col xs={12} md={8} lg={4}><Card size="small">✅ Savoirs insérés : <Text strong>{importStats.inserted_savoirs}</Text></Card></Col>
          <Col xs={12} md={8} lg={4}><Card size="small">🔄 Savoirs mis à jour : <Text strong>{importStats.updated_savoirs}</Text></Card></Col>
          <Col xs={12} md={8} lg={4}><Card size="small">👨‍🏫 Liens enseignants : <Text strong>{importStats.inserted_enseignant_links}</Text></Card></Col>
          <Col xs={12} md={8} lg={4}>
            <Card size="small" style={{ borderColor: errorCount > 0 ? "#ff4d4f" : undefined }}>
              ⚠️ Erreurs : <Text strong style={{ color: errorCount > 0 ? "#ff4d4f" : undefined }}>{errorCount}</Text>
            </Card>
          </Col>
        </Row>
      </Card>

      {errorCount > 0 && (
        <Collapse style={{ marginBottom: 16 }} items={[{
          key: "errs",
          label: `Voir les erreurs (${importStats.errors!.length})`,
          children: (
            <Space direction="vertical" style={{ width: "100%" }}>
              {importStats.errors!.map((err, idx) => (
                <Alert key={`${idx}-${err}`} type="warning" showIcon icon={<WarningOutlined />} message={String(err)} />
              ))}
            </Space>
          ),
        }]} />
      )}
    </>
  );
}
