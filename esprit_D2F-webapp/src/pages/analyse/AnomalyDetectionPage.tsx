import { useState } from 'react';
import { Card, Section } from '@/redesign/components/Section';
import { ErrorState } from '@/redesign/components/States';
import { useDetectAnomalies, useDetectAnomaliesDepartment } from '@/hooks/analyse/useNewFeatures';
import { useAuth } from '@/hooks/auth/useAuth';
import { normalizeRole } from '@/utils/constants/roles';
import { InputNumber, Button, Tag, Empty, List, Alert } from 'antd';
import { WarningOutlined, ThunderboltOutlined } from '@ant-design/icons';

const SEV_COLOR: Record<string, string> = {
  INFO: 'blue',
  WARNING: 'warning',
  CRITICAL: 'error',
};

export default function AnomalyDetectionPage() {
  const { user } = useAuth();
  const roleKey = normalizeRole(user?.role);
  const [enseignantId, setEnseignantId] = useState<string | null>(
    user?.id ? String(user.id) : null,
  );
  const [departementId, setDepartementId] = useState<string | null>(null);

  const detectTeacher = useDetectAnomalies();
  const detectDept = useDetectAnomaliesDepartment();

  const isAdmin = roleKey === 'admin' || roleKey === 'cup';

  return (
    <div style={{ padding: 24 }}>
      <Section
        title="Détection d'anomalies"
        subtitle="Chute soudaine de niveau, pic d'inactivité, régression de compétence (PFE)"
      >
        <Card title="Analyse d'un enseignant" icon={<WarningOutlined />}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
            {roleKey === 'enseignant' ? null : (
              <InputNumber
                placeholder="ID enseignant"
                value={enseignantId ?? undefined}
                onChange={(v) => setEnseignantId(v == null ? null : String(v))}
                style={{ width: 200 }}
              />
            )}
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              loading={detectTeacher.isPending}
              onClick={() => enseignantId && detectTeacher.mutate(enseignantId)}
            >
              Détecter
            </Button>
          </div>
          {detectTeacher.isError && (
            <ErrorState
              message="Erreur lors de la détection."
              onRetry={() => enseignantId && detectTeacher.mutate(enseignantId)}
            />
          )}
          {detectTeacher.data &&
            (detectTeacher.data.nb_anomalies === 0 ? (
              <Alert type="success" message="Aucune anomalie détectée." />
            ) : (
              <List
                dataSource={detectTeacher.data.anomalies}
                renderItem={(a) => (
                  <List.Item>
                    <Tag color={SEV_COLOR[a.severite]}>{a.severite}</Tag>
                    <strong>{a.titre}</strong> — {a.message}
                  </List.Item>
                )}
              />
            ))}
          {!detectTeacher.data && !detectTeacher.isError && (
            <Empty description="Lancez la détection" />
          )}
        </Card>

        {isAdmin && (
          <Card title="Analyse d'un département" icon={<ThunderboltOutlined />}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <InputNumber
                placeholder="ID département"
                value={departementId ?? undefined}
                onChange={(v) => setDepartementId(v == null ? null : String(v))}
                style={{ width: 200 }}
              />
              <Button
                type="primary"
                danger
                loading={detectDept.isPending}
                onClick={() => departementId && detectDept.mutate(departementId)}
              >
                Scanner le département
              </Button>
            </div>
            {detectDept.data && (
              <Alert
                style={{ marginTop: 12 }}
                type={detectDept.data.nb_anomalies > 0 ? 'warning' : 'success'}
                message={`${detectDept.data.nb_anomalies} anomalie(s) sur ${detectDept.data.nb_enseignants_scannes} enseignants scannés.`}
              />
            )}
          </Card>
        )}
      </Section>
    </div>
  );
}
