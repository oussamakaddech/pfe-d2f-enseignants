import { useState } from 'react';
import { Section, Card } from '@/redesign/components/Section';
import CompactKpi from '@/redesign/components/CompactKpi';
import { KpiSkeleton, ErrorState } from '@/redesign/components/States';
import { usePilotageDashboard } from '@/hooks/analyse/usePilotageDashboard';
import {
  RiseOutlined,
  TeamOutlined,
  WarningOutlined,
  NodeIndexOutlined,
  CheckCircleOutlined,
  FallOutlined,
} from '@ant-design/icons';
import { Table, Tag, Progress, Slider, List, Alert, Empty } from 'antd';

const POS_COLOR: Record<string, string> = { AU_DESSUS: 'success', EN_DECA: 'error' };
const SEV_COLOR: Record<string, string> = { INFO: 'blue', WARNING: 'warning', CRITICAL: 'error' };

export default function PilotageDashboardPage() {
  const [horizon, setHorizon] = useState(6);
  const { data, isLoading, isError, refetch } = usePilotageDashboard(horizon);

  return (
    <div style={{ padding: 24 }}>
      <Section
        title="Tableau de bord de pilotage"
        subtitle="Synthèse prévisionnelle, benchmark départements, anomalies live, corrélation besoins ↔ gaps"
        extra={
          <Slider
            min={1}
            max={36}
            value={horizon}
            onChange={setHorizon}
            style={{ width: 180 }}
            tooltip={{ formatter: (v) => `${v} mois` }}
          />
        }
      >
        {isLoading && <KpiSkeleton count={4} />}
        {isError && (
          <ErrorState message="Erreur de chargement du pilotage." onRetry={() => refetch()} />
        )}

        {data && (
          <>
            {/* ── Module 1 : KPIs forecast ── */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 16,
                marginBottom: 24,
              }}
            >
              <CompactKpi
                label="Niveau projeté moyen"
                value={data.forecast_kpis.niveau_projet_moyen}
                unit="custom"
                customText={data.forecast_kpis.niveau_projet_moyen.toFixed(2)}
                icon={<RiseOutlined />}
                accent="#1677ff"
                accentBg="rgba(22,119,255,0.10)"
              />
              <CompactKpi
                label="% objectifs atteignables"
                value={data.forecast_kpis.pct_objectifs_atteignables}
                unit="pct"
                icon={<CheckCircleOutlined />}
                accent="#52c41a"
                accentBg="rgba(82,196,26,0.10)"
              />
              <CompactKpi
                label="Compétences en régression"
                value={data.forecast_kpis.nb_competences_regression}
                unit="int"
                icon={<FallOutlined />}
                accent="#faad14"
                accentBg="rgba(250,173,21,0.10)"
              />
              <CompactKpi
                label="Enseignants suivis"
                value={data.forecast_kpis.nb_enseignants}
                unit="int"
                icon={<TeamOutlined />}
                accent="#722ed1"
                accentBg="rgba(114,46,209,0.10)"
              />
            </div>

            {/* ── Module 2 : Benchmark départements ── */}
            <div style={{ marginTop: 16 }}>
              <Card title="Benchmark par département (écart vs cohorte)" icon={<TeamOutlined />}>
                {data.benchmark_departements.length === 0 ? (
                  <Empty description="Aucune donnée département" />
                ) : (
                  <Table
                    rowKey="departement_id"
                    size="small"
                    pagination={false}
                    dataSource={data.benchmark_departements}
                    columns={[
                      { title: 'Département', dataIndex: 'departement_id', key: 'departement_id' },
                      {
                        title: 'Niveau moyen',
                        dataIndex: 'niveau_moyen',
                        key: 'niveau_moyen',
                        render: (v: number) => v.toFixed(2),
                      },
                      {
                        title: 'Écart vs cohorte',
                        dataIndex: 'ecart_vs_cohorte',
                        key: 'ecart_vs_cohorte',
                        render: (v: number) => (
                          <Tag color={v >= 0 ? 'success' : 'error'}>
                            {v >= 0 ? '+' : ''}
                            {v.toFixed(2)}
                          </Tag>
                        ),
                      },
                      { title: 'Enseignants', dataIndex: 'nb_enseignants', key: 'nb_enseignants' },
                      {
                        title: 'Position',
                        dataIndex: 'position',
                        key: 'position',
                        render: (p: string) => <Tag color={POS_COLOR[p]}>{p}</Tag>,
                      },
                    ]}
                  />
                )}
              </Card>
            </div>

            {/* ── Module 3 : Anomalies live ── */}
            <div style={{ marginTop: 16 }}>
              <Card title="Anomalies live" icon={<WarningOutlined />}>
                <Alert
                  type={data.anomalies_live.nb_anomalies_recentes > 0 ? 'warning' : 'success'}
                  message={`${data.anomalies_live.nb_anomalies_recentes} anomalie(s) sur ${data.anomalies_live.fenetre_jours} jours · ${data.anomalies_live.nb_nouvelles} nouvelle(s)`}
                  style={{ marginBottom: 12 }}
                />
                {data.anomalies_live.alertes.length === 0 ? (
                  <Empty description="Aucune alerte anomalie ouverte" />
                ) : (
                  <List
                    size="small"
                    dataSource={data.anomalies_live.alertes}
                    renderItem={(a) => (
                      <List.Item>
                        <Tag color={SEV_COLOR[a.severite]}>{a.severite}</Tag>
                        <strong>{a.titre}</strong> — {a.message}
                      </List.Item>
                    )}
                  />
                )}
              </Card>
            </div>

            {/* ── Module 4 : Corrélation besoins ↔ gaps ── */}
            <div style={{ marginTop: 16 }}>
              <Card title="Corrélation besoins ↔ gaps" icon={<NodeIndexOutlined />}>
                <div style={{ display: 'flex', gap: 24, alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--rd-muted)' }}>
                      Coefficient de Pearson
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 600 }}>
                      {data.correlation_besoins_gaps.coefficient_pearson == null
                        ? '—'
                        : data.correlation_besoins_gaps.coefficient_pearson.toFixed(2)}
                    </div>
                  </div>
                  <Tag color="blue">{data.correlation_besoins_gaps.interpretation}</Tag>
                </div>
                <Progress
                  percent={Math.round(
                    Math.abs(data.correlation_besoins_gaps.coefficient_pearson ?? 0) * 100,
                  )}
                  showInfo={false}
                  strokeColor="#1677ff"
                />
                {data.correlation_besoins_gaps.top_paires.length > 0 && (
                  <Table
                    rowKey="competence_id"
                    size="small"
                    pagination={false}
                    style={{ marginTop: 12 }}
                    dataSource={data.correlation_besoins_gaps.top_paires}
                    columns={[
                      { title: 'Compétence', dataIndex: 'competence_id', key: 'competence_id' },
                      { title: 'Besoins exprimés', dataIndex: 'nb_besoins', key: 'nb_besoins' },
                      { title: 'Gaps', dataIndex: 'nb_gaps', key: 'nb_gaps' },
                    ]}
                  />
                )}
              </Card>
            </div>
          </>
        )}
      </Section>
    </div>
  );
}
