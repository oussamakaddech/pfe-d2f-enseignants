import { Card, Descriptions, Tag, Alert, Statistic, Row, Col } from 'antd';
import { CheckCircleOutlined, WarningOutlined } from '@ant-design/icons';
import type { ModelStatus } from '@/models/analyse/analyticsFeature';

interface ModelStatusPanelProps {
  readonly status: ModelStatus | undefined;
  readonly loading?: boolean;
}

/**
 * Rendu honnête de l'état de dérive.
 *
 * `null` signifie « pas encore contrôlé » (fenêtre de serving insuffisante) :
 * l'afficher en vert « Stable », comme le faisait ce panneau, revenait à
 * présenter une absence de mesure comme une absence de dérive.
 */
function renderDrift(status: ModelStatus) {
  if (status.drift_detected === null || status.drift_detected === undefined) {
    return (
      <Tag color="default" title={status.drift_reason ?? undefined}>
        Non contrôlée
      </Tag>
    );
  }
  return status.drift_detected ? (
    <Tag color="red" title={status.drift_reason ?? undefined}>
      Détectée
    </Tag>
  ) : (
    <Tag color="green" title={status.drift_reason ?? undefined}>
      Aucune
    </Tag>
  );
}

/** Panneau de statut du modèle (intégrité, dérive, source). */
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
            title="Prédictions à ±1 niveau"
            value={status.accuracy !== null ? `${(status.accuracy * 100).toFixed(1)} %` : '—'}
            valueStyle={{ fontSize: 18 }}
          />
        </Col>
        <Col span={8}>
          <Statistic title="Features" value={status.features_count} valueStyle={{ fontSize: 18 }} />
        </Col>
      </Row>
      <Descriptions column={1} size="small" bordered>
        <Descriptions.Item label="Version">{status.version}</Descriptions.Item>
        <Descriptions.Item label="Entraîné le">{status.entraîné_le ?? '—'}</Descriptions.Item>
        <Descriptions.Item label="Intégrité">
          {integrityOk ? (
            <Tag color="green" icon={<CheckCircleOutlined />}>
              OK (SHA-256 vérifié au chargement)
            </Tag>
          ) : (
            <Tag color="red" icon={<WarningOutlined />}>
              ARTEFACT NON CHARGÉ — INTÉGRITÉ NON VÉRIFIÉE
            </Tag>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Dérive de distribution">
          {renderDrift(status)}
        </Descriptions.Item>
        {status.r2 !== null && status.r2 !== undefined && (
          <Descriptions.Item label="R² (variance expliquée)">
            {status.r2.toFixed(4)}
            {status.rmse != null ? ` · RMSE ${status.rmse.toFixed(4)}` : ''}
          </Descriptions.Item>
        )}
        {status.accuracy_pm05 != null && (
          <Descriptions.Item label="Prédictions à ±0,5 niveau">
            {(status.accuracy_pm05 * 100).toFixed(1)} %
          </Descriptions.Item>
        )}
        {status.fallback_reason && (
          <Descriptions.Item label="Raison du repli">{status.fallback_reason}</Descriptions.Item>
        )}
        {!!status.inert_features?.length && (
          <Descriptions.Item label="Features sans information">
            {status.inert_features.join(', ')}
          </Descriptions.Item>
        )}
        <Descriptions.Item label="Source">
          {status.source === 'heuristique' ? (
            <Tag color="orange">Fallback heuristique</Tag>
          ) : (
            <Tag color="blue">Modèle ML</Tag>
          )}
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );
}
