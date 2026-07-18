import { Card, Descriptions, Tag, Alert, Statistic, Row, Col } from "antd";
import { CheckCircleOutlined, WarningOutlined } from "@ant-design/icons";
import type { ModelStatus } from "@/models/analyse/analyticsFeature";

interface ModelStatusPanelProps {
  readonly status: ModelStatus | undefined;
  readonly loading?: boolean;
}

/** Panneau de statut du modèle (intégrité, drift, source). */
export default function ModelStatusPanel({ status, loading }: ModelStatusPanelProps) {
  if (loading) return <Card loading />;
  if (!status) return <Alert type="error" message="Statut du modèle indisponible" />;

  const integrityOk = status.integrite_ok && status.disponible;
  return (
    <Card title="Statut du modèle" style={{ borderRadius: 12 }}>
      <Row gutter={16} style={{ marginBottom: 12 }}>
        <Col span={8}>
          <Statistic title="Algorithme" value={status.algorithme} valueStyle={{ fontSize: 18 }} />
        </Col>
        <Col span={8}>
          <Statistic
            title="Accuracy"
            value={status.accuracy ?? "—"}
            precision={status.accuracy !== null ? 3 : undefined}
            valueStyle={{ fontSize: 18 }}
          />
        </Col>
        <Col span={8}>
          <Statistic title="Features" value={status.features_count} valueStyle={{ fontSize: 18 }} />
        </Col>
      </Row>
      <Descriptions column={1} size="small" bordered>
        <Descriptions.Item label="Version">{status.version}</Descriptions.Item>
        <Descriptions.Item label="Entraîné le">
          {status.entraîné_le ?? "—"}
        </Descriptions.Item>
        <Descriptions.Item label="Intégrité">
          {integrityOk ? (
            <Tag color="green" icon={<CheckCircleOutlined />}>
              OK (SHA-256 vérifié)
            </Tag>
          ) : (
            <Tag color="red" icon={<WarningOutlined />}>
              INTÉGRITÉ NON VÉRIFIÉE
            </Tag>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Drift">
          {status.drift_detected ? (
            <Tag color="red">Détecté</Tag>
          ) : (
            <Tag color="green">Stable</Tag>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Source">
          {status.source === "heuristique" ? (
            <Tag color="orange">Fallback heuristique</Tag>
          ) : (
            <Tag color="blue">Modèle ML</Tag>
          )}
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );
}
