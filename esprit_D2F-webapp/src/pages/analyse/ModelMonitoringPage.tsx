import { Row, Col, Card, Button, Space, Alert, Tag, Descriptions, App } from 'antd';
import {
  ReloadOutlined,
  RollbackOutlined,
  WarningOutlined,
  MonitorOutlined,
} from '@ant-design/icons';
import {
  useModelStatus,
  useModelDrift,
  useModelRetrain,
  useModelRollback,
} from '@/hooks/analytics/useAnalyticsQueries';
import { ModelStatusPanel } from '@/components/analytics';
import { AppPageHeader } from '@/components/common';

/**
 * Étiquette du statut de dérive.
 *
 * `null` = contrôle non exécuté : affiché comme tel, jamais en « Stable ».
 * Le panneau présentait auparavant un vert rassurant alors qu'aucun test
 * n'avait tourné.
 */
function driftTag(detected: boolean | null) {
  if (detected === null || detected === undefined) return <Tag>NON CONTRÔLÉE</Tag>;
  return detected ? <Tag color="red">DÉRIVE</Tag> : <Tag color="green">AUCUNE</Tag>;
}

/**
 * Page de monitoring modèle (ADMIN) : dérive, statut, retraining, rollback.
 */
export default function ModelMonitoringPage() {
  const { message } = App.useApp();
  const status = useModelStatus();
  const drift = useModelDrift();
  const retrain = useModelRetrain();
  const rollback = useModelRollback();

  const onRetrain = () => {
    retrain.mutate(undefined, {
      onSuccess: (r) =>
        message.success(`Réentraînement ${r.statut} — accuracy ${r.accuracy_apres ?? '?'}`),
      onError: () => message.error('Échec du réentraînement'),
    });
  };

  const onRollback = () => {
    rollback.mutate(undefined, {
      onSuccess: (r) => message.info(`Rollback ${r.statut} — version ${r.ancienne_version}`),
      onError: () => message.error('Échec du rollback'),
    });
  };

  return (
    <div style={{ padding: 24 }}>
      <AppPageHeader
        icon={<MonitorOutlined />}
        title="Monitoring du modèle"
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} loading={retrain.isPending} onClick={onRetrain}>
              Réentraîner
            </Button>
            <Button
              danger
              icon={<RollbackOutlined />}
              loading={rollback.isPending}
              onClick={onRollback}
            >
              Rollback
            </Button>
          </Space>
        }
      />

      {drift.data?.drift_detected === true && (
        <Alert
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          message="Dérive du modèle détectée"
          description={drift.data.message}
          style={{ marginBottom: 16 }}
        />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <ModelStatusPanel status={status.data} loading={status.isLoading} />
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Rapport de dérive" style={{ borderRadius: 12 }}>
            {(() => {
              if (drift.isLoading) return <div>Chargement…</div>;
              if (drift.data)
                return (
                  <Descriptions column={1} size="small" bordered>
                    <Descriptions.Item label="Métrique">{drift.data.metric}</Descriptions.Item>
                    <Descriptions.Item label="Valeur actuelle">
                      {drift.data.valeur_actuelle.toFixed(4)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Seuil">
                      {drift.data.seuil.toFixed(4)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Jours depuis entraînement">
                      {drift.data.jours_depuis_entrainement}
                    </Descriptions.Item>
                    <Descriptions.Item label="Statut">
                      {driftTag(drift.data.drift_detected)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Interprétation">
                      {drift.data.message}
                    </Descriptions.Item>
                  </Descriptions>
                );
              return <Alert type="error" message="Rapport de dérive indisponible" />;
            })()}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
